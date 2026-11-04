import { ApiError, mutate, defineCommand, type Db } from "../../api/client";
import { PAYROLL_JOINERS_THIS_PERIOD } from "../../api/fixtures";
import { canAccess, getSessionUser, isFullDemoUser, type Level } from "../../api/session";
import type { Approval, ModuleKey, PayrollRun } from "../../api/types";

/*
 * E2E-08 · Inputs → Review → Approve → Lock. Same rules as server/src/commands/admin-flow.ts:
 * blocked checks can't be acknowledged, warnings need a note, maker ≠ checker, only the
 * Finance owner approves, lock is explicit and a locked run is reversed only through an approval.
 */
export const BANK_CHECK = "New joiners have bank details";
export const ACK_MIN = 12;
export const REASON_MIN = 12;
const FINANCE_OWNER = "ROLE-07";

const actorName = () => getSessionUser()?.name ?? "Arjun Mehta";

/** The mock enforces the same module levels the API checks before a command runs. */
export function requireLevel(module: ModuleKey, level: Level) {
  const u = getSessionUser();
  if (!canAccess(u, module, level)) throw new ApiError(`Your role (${u?.role ?? "none"}) has ${u?.permissions[module] ?? "no"} access to ${module}; this needs ${level}.`, "FORBIDDEN");
}

function findRun(db: Db, runId: string) {
  const run = db.payrollRuns.find((r) => r.id === runId);
  if (!run) throw new ApiError(`Pay run ${runId} not found`, "NOT_FOUND");
  return run;
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The bank-details check follows the joiners: it passes when none is still pending verification. */
export function refreshBankCheck(db: Db) {
  const pending = db.people.filter((p) => p.joining?.bank === "Pending").length;
  for (const run of db.payrollRuns.filter((r) => r.status === "Collecting inputs")) {
    const c = run.checks.find((x) => x.name === BANK_CHECK);
    if (!c) continue;
    c.status = pending ? "Blocked" : "Pass";
    c.detail = pending ? `${pending} of ${PAYROLL_JOINERS_THIS_PERIOD} joiners missing verified bank account` : `All ${PAYROLL_JOINERS_THIS_PERIOD} joiners have a verified bank account`;
  }
}

/** Ask HR to chase a blocked payroll input. Logged; no message actually leaves the demo. */
function chasePayrollInputLocal(runId: string, check: string) {
  return mutate(
    (db) => {
      const run = findRun(db, runId);
      if (run.status === "Locked") throw new ApiError(`${runId} is locked. Inputs can't change after lock.`, "BLOCKED");
      return run;
    },
    { action: `asked HR to resolve “${check}” on`, reference: runId, module: "payroll" },
    300,
  );
}

function resolveCheckLocal(runId: string, check: string, note: string) {
  return mutate(
    (db) => {
      requireLevel("payroll", "edit");
      const u = getSessionUser();
      if (!canAccess(u, "hr", "edit")) throw new ApiError(`Payroll warnings are acknowledged by HR & payroll. Your role (${u?.role}) can review them but not carry them.`, "FORBIDDEN");
      const run = findRun(db, runId);
      if (run.status !== "Collecting inputs") throw new ApiError(`${runId} is ${run.status.toLowerCase()}; its inputs are frozen.`, "BLOCKED");
      const c = run.checks.find((x) => x.name === check);
      if (!c) throw new ApiError(`Precheck ${check} not found`, "NOT_FOUND");
      if (c.status === "Pass") throw new ApiError(`“${check}” already passes.`, "BLOCKED");
      if (c.status === "Blocked") throw new ApiError(`“${check}” is blocked and can't be acknowledged. It clears only when its cause is fixed: ${c.detail.toLowerCase()}.`, "BLOCKED");
      if (c.acknowledged) throw new ApiError(`“${check}” was already acknowledged by ${c.acknowledged.by}.`, "BLOCKED");
      if (note.trim().length < ACK_MIN) throw new ApiError(`Say why this warning can go to review (at least ${ACK_MIN} characters). The checker reads it.`, "VALIDATION");
      c.acknowledged = { by: actorName(), at: new Date().toISOString(), note: note.trim() };
      return run;
    },
    { action: `acknowledged warning “${check}” on`, reference: runId, module: "payroll" },
  );
}

function submitForReviewLocal(runId: string) {
  return mutate(
    (db) => {
      requireLevel("payroll", "edit");
      const run = findRun(db, runId);
      if (run.status !== "Collecting inputs") throw new ApiError(`${runId} is already ${run.status.toLowerCase()}.`, "BLOCKED");
      const blocked = run.checks.filter((c) => c.status === "Blocked");
      if (blocked.length) throw new ApiError(`Can't submit while ${plural(blocked.length, "check is", "checks are")} blocked: ${blocked.map((c) => c.detail.toLowerCase()).join("; ")}.`, "BLOCKED");
      const open = run.checks.filter((c) => c.status === "Warning" && !c.acknowledged);
      if (open.length) throw new ApiError(`Acknowledge ${plural(open.length, "warning")} with a note first: ${open.map((c) => c.name).join(", ")}.`, "BLOCKED");
      Object.assign(run, { status: "Ready for review", preparedBy: actorName(), preparedAt: new Date().toISOString() });
      return run;
    },
    { action: "submitted for review", reference: runId, module: "payroll" },
  );
}

function approveRunLocal(runId: string, note: string) {
  return mutate(
    (db) => {
      requireLevel("payroll", "approve");
      const u = getSessionUser();
      // The full-access demo user stands in for every role; a role you "view as" is held to its own rights.
      if (u && !isFullDemoUser(u) && u.roleId !== FINANCE_OWNER) throw new ApiError(`A pay run is approved by the Finance owner role. Your role (${u.role}) can't approve it.`, "FORBIDDEN");
      const run = findRun(db, runId);
      if (run.status !== "Ready for review") throw new ApiError(run.status === "Collecting inputs" ? `${runId} hasn't been submitted for review yet.` : `${runId} is already ${run.status.toLowerCase()}.`, "BLOCKED");
      if (run.preparedBy === actorName()) throw new ApiError("You prepared this run, so someone else has to approve it (maker ≠ checker).", "FORBIDDEN");
      Object.assign(run, { status: "Approved", approvedBy: actorName(), approvedAt: new Date().toISOString(), approvalNote: note.trim() || undefined });
      return run;
    },
    { action: "approved pay run", reference: runId, module: "payroll" },
  );
}

function lockRunLocal(runId: string) {
  return mutate(
    (db) => {
      requireLevel("payroll", "edit");
      const run = findRun(db, runId);
      if (run.status === "Locked") throw new ApiError(`${runId} is already locked.`, "BLOCKED");
      if (run.status !== "Approved") throw new ApiError(`${runId} can be locked only after the Finance owner approves it.`, "BLOCKED");
      Object.assign(run, { status: "Locked", lockedBy: actorName(), lockedAt: new Date().toISOString() });
      return run;
    },
    { action: "locked pay run", reference: runId, module: "payroll" },
  );
}

function requestReversalLocal(runId: string, reason: string) {
  return mutate(
    (db): Approval => {
      requireLevel("payroll", "edit");
      const run = findRun(db, runId);
      if (run.status !== "Locked") throw new ApiError(`Only a locked run is reversed; ${runId} is ${run.status.toLowerCase()}.`, "BLOCKED");
      if (reason.trim().length < REASON_MIN) throw new ApiError(`Give the reason for the reversal (at least ${REASON_MIN} characters). The Finance owner decides on it.`, "VALIDATION");
      const pending = db.approvals.find((a) => a.reference === runId && a.type === "Payroll reversal" && a.status === "Pending");
      if (pending) throw new ApiError(`A reversal of ${runId} is already waiting on the Finance owner (${pending.id}).`, "BLOCKED");
      const n = Math.max(0, ...db.approvals.map((a) => Number(a.id.split("-")[1]) || 0)) + 1;
      const approval: Approval = {
        id: `APR-${String(n).padStart(4, "0")}`,
        type: "Payroll reversal",
        module: "payroll",
        reference: runId,
        title: `${run.period} pay run`,
        maker: actorName(),
        value: `${run.employees} employees`,
        submitted: new Date().toISOString(),
        level: "Level 1 of 1 · Finance owner",
        status: "Pending",
        evidence: [`Reason: ${reason.trim()}`, run.lockedBy ? `Locked by ${run.lockedBy}` : "Locked", "The locked run stays intact until this is approved"],
      };
      db.approvals.unshift(approval);
      return approval;
    },
    { action: "requested reversal of", reference: runId, module: "payroll" },
  );
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const chasePayrollInput = defineCommand("payroll.chaseInput", (runId, check) => ({ runId, check }), chasePayrollInputLocal);
export const resolveCheck = defineCommand<[string, string, string], PayrollRun>("payroll.resolveCheck", (runId, check, note) => ({ runId, check, note }), resolveCheckLocal);
export const submitForReview = defineCommand<[string], PayrollRun>("payroll.submitForReview", (runId) => ({ runId }), submitForReviewLocal);
export const approveRun = defineCommand<[string, string], PayrollRun>("payroll.approveRun", (runId, note) => ({ runId, note }), approveRunLocal);
export const lockRun = defineCommand<[string], PayrollRun>("payroll.lockRun", (runId) => ({ runId }), lockRunLocal);
export const requestReversal = defineCommand<[string, string], Approval>("payroll.requestReversal", (runId, reason) => ({ runId, reason }), requestReversalLocal);
