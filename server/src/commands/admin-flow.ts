/**
 * Administration journeys:
 *  E2E-08 payroll run: Inputs → Review → Approve → Lock (maker ≠ checker, explicit lock, reversal by approval)
 *  Users & Access: invite with a one-time activation link, role permissions, deactivation.
 * Rules mirror the browser mock exactly (prototype/src/modules/{payroll,users,hr}/commands.ts).
 */
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, can, fail, nextId, today, type Actor } from "../core";
import type { Tx } from "../db/client";
import * as s from "../db/schema";
import { read } from "../read";
import { command } from "./registry";

const id = z.string().min(3).max(40);
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Same constants as prototype/src/modules/payroll/commands.ts. */
export const BANK_CHECK = "New joiners have bank details";
export const JOINERS_THIS_PERIOD = 5;
const FINANCE_OWNER = "ROLE-07";
const ACK_MIN = 12;
const REASON_MIN = 12;
const INVITE_DAYS = 7;

const MODULES = ["dashboard", "insights", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll", "users", "reports"] as const;
const LEVELS = ["none", "view", "edit", "approve", "admin"] as const;

async function lockRun(tx: Tx, runId: string) {
  const [run] = await tx.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, runId)).for("update");
  if (!run) throw fail.notFound("Pay run", runId);
  return run;
}
const runView = async (tx: Tx, runId: string) => (await read.payrollRuns(tx)).find((r) => r.id === runId);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The bank-details check follows the joiners: it passes when none is still pending verification. */
async function refreshBankCheck(tx: Tx, actor: Actor) {
  const joiners = (await tx.select({ joining: s.people.joining }).from(s.people)).filter((p) => p.joining);
  const pending = joiners.filter((p) => p.joining?.bank === "Pending").length;
  const open = await tx.select().from(s.payrollRuns).where(eq(s.payrollRuns.status, "Collecting inputs")).for("update");
  for (const run of open) {
    const [c] = await tx.select().from(s.payrollChecks).where(and(eq(s.payrollChecks.runId, run.id), eq(s.payrollChecks.name, BANK_CHECK))).for("update");
    if (!c) continue;
    const status = pending ? "Blocked" : "Pass";
    const detail = pending ? `${pending} of ${JOINERS_THIS_PERIOD} joiners missing verified bank account` : `All ${JOINERS_THIS_PERIOD} joiners have a verified bank account`;
    if (c.status === status && c.detail === detail) continue;
    await tx.update(s.payrollChecks).set({ status, detail }).where(and(eq(s.payrollChecks.runId, run.id), eq(s.payrollChecks.seq, c.seq)));
    if (status === "Pass") await audit(tx, actor, `cleared “${BANK_CHECK}” on`, run.id, "payroll");
  }
}

/* ================================================================ E2E-08 · payroll run */
export const resolveCheck = command({
  name: "payroll.resolveCheck",
  module: "payroll",
  level: "edit",
  input: z.object({ runId: id, check: z.string().min(2).max(200), note: z.string().max(2000).default("") }),
  async run({ tx, actor }, { runId, check, note }) {
    if (!can(actor, "hr", "edit")) throw fail.forbidden(`Payroll warnings are acknowledged by HR & payroll. Your role (${actor.roleName}) can review them but not carry them.`);
    const run = await lockRun(tx, runId);
    if (run.status !== "Collecting inputs") throw fail.blocked(`${runId} is ${run.status.toLowerCase()}; its inputs are frozen.`);
    const [c] = await tx.select().from(s.payrollChecks).where(and(eq(s.payrollChecks.runId, runId), eq(s.payrollChecks.name, check))).for("update");
    if (!c) throw fail.notFound("Precheck", check);
    if (c.status === "Pass") throw fail.blocked(`“${check}” already passes.`);
    if (c.status === "Blocked") throw fail.blocked(`“${check}” is blocked and can't be acknowledged. It clears only when its cause is fixed: ${c.detail.toLowerCase()}.`);
    if (c.ackBy) throw fail.blocked(`“${check}” was already acknowledged by ${c.ackBy}.`);
    if (note.trim().length < ACK_MIN) throw fail.validation(`Say why this warning can go to review (at least ${ACK_MIN} characters). The checker reads it.`);
    await tx.update(s.payrollChecks).set({ ackBy: actor.name, ackAt: new Date().toISOString(), ackNote: note.trim() }).where(and(eq(s.payrollChecks.runId, runId), eq(s.payrollChecks.seq, c.seq)));
    await audit(tx, actor, `acknowledged warning “${check}” on`, runId, "payroll", { note: note.trim() });
    return runView(tx, runId);
  },
});

export const verifyBankDetails = command({
  name: "hr.verifyBankDetails",
  module: "hr",
  level: "edit",
  input: z.object({ personId: id }),
  async run({ tx, actor }, { personId }) {
    const [p] = await tx.select().from(s.people).where(eq(s.people.id, personId)).for("update");
    if (!p) throw fail.notFound("Person", personId);
    if (!p.joining) throw fail.blocked(`${p.name} isn't a joiner in the open pay period; bank changes for existing staff go through a change request.`);
    if (p.joining.bank === "Verified") throw fail.blocked(`${p.name}'s bank account is already verified.`);
    await tx.update(s.people).set({ joining: { bank: "Verified", note: `Verified by ${actor.name} on ${today()}` } }).where(eq(s.people.id, personId));
    await audit(tx, actor, "verified bank details for", personId, "hr");
    await refreshBankCheck(tx, actor);
    return (await read.people(tx)).find((x) => x.id === personId);
  },
});

export const submitForReview = command({
  name: "payroll.submitForReview",
  module: "payroll",
  level: "edit",
  input: z.object({ runId: id }),
  async run({ tx, actor }, { runId }) {
    const run = await lockRun(tx, runId);
    if (run.status !== "Collecting inputs") throw fail.blocked(`${runId} is already ${run.status.toLowerCase()}.`);
    const checks = await tx.select().from(s.payrollChecks).where(eq(s.payrollChecks.runId, runId));
    const blocked = checks.filter((c) => c.status === "Blocked");
    if (blocked.length) throw fail.blocked(`Can't submit while ${plural(blocked.length, "check is", "checks are")} blocked: ${blocked.map((c) => c.detail.toLowerCase()).join("; ")}.`);
    const open = checks.filter((c) => c.status === "Warning" && !c.ackBy);
    if (open.length) throw fail.blocked(`Acknowledge ${plural(open.length, "warning")} with a note first: ${open.map((c) => c.name).join(", ")}.`);
    await tx.update(s.payrollRuns).set({ status: "Ready for review", preparedBy: actor.name, preparedAt: new Date().toISOString() }).where(eq(s.payrollRuns.id, runId));
    await audit(tx, actor, "submitted for review", runId, "payroll");
    return runView(tx, runId);
  },
});

export const approveRun = command({
  name: "payroll.approveRun",
  module: "payroll",
  level: "approve",
  input: z.object({ runId: id, note: z.string().max(2000).default("") }),
  async run({ tx, actor }, { runId, note }) {
    if (actor.roleId !== FINANCE_OWNER) throw fail.forbidden(`A pay run is approved by the Finance owner role. Your role (${actor.roleName}) can't approve it.`);
    const run = await lockRun(tx, runId);
    if (run.status !== "Ready for review") throw fail.blocked(run.status === "Collecting inputs" ? `${runId} hasn't been submitted for review yet.` : `${runId} is already ${run.status.toLowerCase()}.`);
    if (run.preparedBy === actor.name) throw fail.forbidden("You prepared this run, so someone else has to approve it (maker ≠ checker).");
    await tx.update(s.payrollRuns).set({ status: "Approved", approvedBy: actor.name, approvedAt: new Date().toISOString(), approvalNote: note.trim() || null }).where(eq(s.payrollRuns.id, runId));
    await audit(tx, actor, "approved pay run", runId, "payroll", note.trim() ? { note: note.trim() } : undefined);
    return runView(tx, runId);
  },
});

export const lockRunCmd = command({
  name: "payroll.lockRun",
  module: "payroll",
  level: "edit",
  input: z.object({ runId: id }),
  async run({ tx, actor }, { runId }) {
    const run = await lockRun(tx, runId);
    if (run.status === "Locked") throw fail.blocked(`${runId} is already locked.`);
    if (run.status !== "Approved") throw fail.blocked(`${runId} can be locked only after the Finance owner approves it.`);
    await tx.update(s.payrollRuns).set({ status: "Locked", lockedBy: actor.name, lockedAt: new Date().toISOString() }).where(eq(s.payrollRuns.id, runId));
    await audit(tx, actor, "locked pay run", runId, "payroll");
    return runView(tx, runId);
  },
});

export const requestReversal = command({
  name: "payroll.requestReversal",
  module: "payroll",
  level: "edit",
  input: z.object({ runId: id, reason: z.string().max(2000).default("") }),
  async run({ tx, actor }, { runId, reason }) {
    const run = await lockRun(tx, runId);
    if (run.status !== "Locked") throw fail.blocked(`Only a locked run is reversed; ${runId} is ${run.status.toLowerCase()}.`);
    if (reason.trim().length < REASON_MIN) throw fail.validation(`Give the reason for the reversal (at least ${REASON_MIN} characters). The Finance owner decides on it.`);
    const [pending] = await tx.select().from(s.approvals).where(and(eq(s.approvals.reference, runId), eq(s.approvals.type, "Payroll reversal"), eq(s.approvals.status, "Pending")));
    if (pending) throw fail.blocked(`A reversal of ${runId} is already waiting on the Finance owner (${pending.id}).`);
    const approvalId = await nextId(tx, "APR");
    await tx.insert(s.approvals).values({
      id: approvalId,
      type: "Payroll reversal",
      module: "payroll",
      reference: runId,
      title: `${run.period} pay run`,
      maker: actor.name,
      value: `${run.employees} employees`,
      submitted: new Date().toISOString(),
      level: "Level 1 of 1 · Finance owner",
      approverRoleId: FINANCE_OWNER,
      status: "Pending",
      evidence: [`Reason: ${reason.trim()}`, run.lockedBy ? `Locked by ${run.lockedBy}` : "Locked", "The locked run stays intact until this is approved"],
    });
    await audit(tx, actor, "requested reversal of", runId, "payroll", { reason: reason.trim(), approval: approvalId });
    return (await read.approvals(tx)).find((a) => a.id === approvalId);
  },
});

/** Called by approvals.decide: an approved reversal reopens the run for correction; a rejected one leaves it locked. */
export async function applyPayrollReversal(tx: Tx, actor: Actor, runId: string, decision: "Approved" | "Rejected") {
  if (decision !== "Approved") return;
  const run = await lockRun(tx, runId);
  if (run.status !== "Locked") return;
  await tx
    .update(s.payrollRuns)
    .set({ status: "Collecting inputs", preparedBy: null, preparedAt: null, approvedBy: null, approvedAt: null, approvalNote: null, lockedBy: null, lockedAt: null })
    .where(eq(s.payrollRuns.id, runId));
  await audit(tx, actor, "reopened after an approved reversal", runId, "payroll");
}

/* ================================================================ Users & Access */
async function roleOf(tx: Tx, roleId: string) {
  const [r] = await tx.select().from(s.roles).where(eq(s.roles.id, roleId));
  if (!r) throw fail.notFound("Role", roleId);
  return r;
}
const userView = async (tx: Tx, userId: string) => (await read.users(tx)).find((u) => u.id === userId);

export const invite = command({
  name: "users.invite",
  module: "users",
  level: "admin",
  input: z.object({ name: z.string().max(120), email: z.string().max(200), roleId: id }),
  async run({ tx, actor }, { name, email, roleId }) {
    const n = name.trim().replace(/\s+/g, " ");
    const e = email.trim().toLowerCase();
    if (n.length < 2) throw fail.validation("Enter the person's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw fail.validation("Enter a valid work email.");
    const role = await roleOf(tx, roleId);
    const [taken] = await tx.select({ id: s.users.id, status: s.users.status }).from(s.users).where(sql`lower(${s.users.email}) = ${e}`);
    if (taken) throw fail.blocked(`${e} already has an account (${taken.id}, ${taken.status.toLowerCase()}).`);
    // Lock the newest account row so two invites can't take the same id.
    const [last] = await tx.select({ id: s.users.id }).from(s.users).orderBy(desc(s.users.id)).limit(1).for("update");
    const userId = `USR-${String((Number(last?.id.split("-")[1]) || 0) + 1).padStart(4, "0")}`;
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    const [person] = await tx.select({ id: s.people.id }).from(s.people).where(sql`lower(${s.people.email}) = ${e}`);
    await tx.insert(s.users).values({
      id: userId,
      name: n,
      email: e,
      personId: person?.id ?? null,
      roleId,
      passwordHash: "!", // no usable password until the invite is accepted
      status: "Invited",
      inviteTokenHash: sha256(token),
      inviteExpiresAt: expiresAt,
      invitedBy: actor.name,
      note: `Invited ${today()} by ${actor.name}`,
    });
    await audit(tx, actor, `invited ${n} as ${role.name} —`, userId, "users", { email: e, roleId });
    // The token leaves the server once, in this response; only its hash is kept.
    return { user: await userView(tx, userId), activationPath: `#/activate?token=${token}`, expiresAt };
  },
});

export const setPermission = command({
  name: "users.setPermission",
  module: "users",
  level: "admin",
  input: z.object({ roleId: id, module: z.enum(MODULES), level: z.enum(LEVELS) }),
  async run({ tx, actor }, { roleId, module, level }) {
    const role = await roleOf(tx, roleId);
    const [row] = await tx.select().from(s.rolePermissions).where(and(eq(s.rolePermissions.roleId, roleId), eq(s.rolePermissions.module, module))).for("update");
    const before = row?.level ?? "none";
    if (before === level) throw fail.blocked(`${role.name} already has ${level} on ${module}.`);
    if (module === "users" && before === "admin") {
      // Someone active must still be able to administer access after this change.
      // The backstage "Full access (demo)" role (ROLE-00) is a presenter convenience, not a real
      // business admin, so it doesn't count toward keeping a genuine Users & Access admin.
      const others = await tx
        .select({ id: s.users.id })
        .from(s.users)
        .innerJoin(s.rolePermissions, and(eq(s.rolePermissions.roleId, s.users.roleId), eq(s.rolePermissions.module, "users"), eq(s.rolePermissions.level, "admin")))
        .where(and(eq(s.users.status, "Active"), ne(s.users.roleId, roleId), ne(s.users.roleId, "ROLE-00")));
      if (!others.length) throw fail.blocked(`${role.name} holds the last Users & Access admin right. Give another active role admin first, or nobody could manage access.`);
    }
    if (row) await tx.update(s.rolePermissions).set({ level }).where(and(eq(s.rolePermissions.roleId, roleId), eq(s.rolePermissions.module, module)));
    else await tx.insert(s.rolePermissions).values({ roleId, module, level });
    await audit(tx, actor, `changed ${module} access ${before} → ${level} on`, roleId, "users", { module, before, after: level });
    return (await read.roles(tx)).find((r) => r.id === roleId);
  },
});

export const deactivate = command({
  name: "users.deactivate",
  module: "users",
  level: "admin",
  input: z.object({ userId: id }),
  async run({ tx, actor }, { userId }) {
    if (userId === actor.userId) throw fail.forbidden("You can't deactivate your own account. Another administrator has to do it.");
    const [u] = await tx.select().from(s.users).where(eq(s.users.id, userId)).for("update");
    if (!u) throw fail.notFound("User", userId);
    if (u.status === "Deactivated" || u.status === "Disabled") throw fail.blocked(`${u.name} is already deactivated.`);
    await tx.update(s.users).set({ status: "Deactivated", inviteTokenHash: null, inviteExpiresAt: null, note: `Deactivated ${today()} by ${actor.name}` }).where(eq(s.users.id, userId));
    const ended = await tx.delete(s.sessions).where(eq(s.sessions.userId, userId)).returning({ id: s.sessions.id });
    await audit(tx, actor, "deactivated", userId, "users", { sessionsEnded: ended.length });
    return { user: await userView(tx, userId), sessionsEnded: ended.length };
  },
});

export const adminFlowCommands = [resolveCheck, verifyBankDetails, submitForReview, approveRun, lockRunCmd, requestReversal, invite, setPermission, deactivate];
