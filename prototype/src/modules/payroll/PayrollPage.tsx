import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, FileLock2, Landmark, Lock, MessageSquareText, OctagonAlert, RotateCcw, Send, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "../../api/client";
import { date, inr, num } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { canAccess, isFullDemoUser, useSession } from "../../api/session";
import type { Approval, PayrollCheck, PayrollRun, Person } from "../../api/types";
import { ModuleFrame } from "../../app/Shell";
import { href, navigate, useRoute } from "../../app/router";
import {
  Button,
  ButtonLink,
  Callout,
  ComingSoon,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  KeyValues,
  LoadingRows,
  PageHeader,
  RecordLink,
  Status,
  Stepper,
  Switch,
  Textarea,
  Tooltip,
  cx,
  useToast,
  type Column,
} from "../../ds/components";
import { verifyBankDetails } from "../hr/commands";
import { ACK_MIN, BANK_CHECK, REASON_MIN, approveRun, chasePayrollInput, lockRun, requestReversal, resolveCheck, submitForReview } from "./commands";
import "./payroll.css";

const CURRENT = "PAY-2026-11";
const FINANCE_OWNER = "ROLE-07";

/** Where each precheck is fixed, and by whom. Owners are illustrative. */
const CHECK_META: Record<string, { owner: string; to?: string; toLabel?: string }> = {
  "Attendance locked": { owner: "Kavya Iyer · HR", to: href.module("hr", "leave"), toLabel: "Attendance exceptions" },
  "Leave balances synced": { owner: "System" },
  [BANK_CHECK]: { owner: "Kavya Iyer · HR" },
  "Site allowances approved": { owner: "Project managers" },
  "Claims cut-off": { owner: "Reporting managers", to: href.module("hr", "claims"), toLabel: "Pending claims" },
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A disabled control that still says why, on hover and keyboard focus. */
function Why({ reason, children }: { reason: string; children: ReactNode }) {
  return (
    <Tooltip content={reason}>
      <span tabIndex={0} className="pay-submit-wrap" aria-label={reason}>
        {children}
      </span>
    </Tooltip>
  );
}

export default function PayrollPage() {
  const route = useRoute();
  const toast = useToast();
  const { user } = useSession();
  const runs = useQuery(api.payrollRuns);
  const people = useQuery(api.people);
  const approvals = useQuery(api.approvals);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ack, setAck] = useState<PayrollCheck | null>(null);
  const [verify, setVerify] = useState<Person | null>(null);
  const [dialog, setDialog] = useState<"approve" | "lock" | null>(null);
  const [reverseId, setReverseId] = useState<string | null>(null);

  const canEdit = canAccess(user, "payroll", "edit");
  const canHr = canAccess(user, "hr", "edit");
  const isFinance = !!user && (user.roleId === FINANCE_OWNER || isFullDemoUser(user));
  // Salary figures: masked by default, revealable only by roles that work the run (HR & payroll, Finance owner).
  const mayReveal = canEdit;
  const revealed = show && mayReveal;

  const run = runs.data?.find((r) => r.id === CURRENT);
  const prev = runs.data?.find((r) => r.id === "PAY-2026-10");
  const joiners = (people.data ?? []).filter((p) => p.joining);
  const blocked = run?.checks.filter((c) => c.status === "Blocked") ?? [];
  const warnings = run?.checks.filter((c) => c.status === "Warning") ?? [];
  const openWarnings = warnings.filter((c) => !c.acknowledged);
  const collecting = run?.status === "Collecting inputs";
  const money = (v: number) => (revealed ? inr(v) : "₹ •••••");
  const recordId = route.recordId && route.recordId !== CURRENT ? route.recordId : undefined;
  const pendingReversal = (id: string) => approvals.data?.find((a) => a.reference === id && a.type === "Payroll reversal" && a.status === "Pending");

  const act = async (key: string, fn: () => Promise<unknown>, ok: { title: string; body?: string; tone?: "ok" | "info" }) => {
    setBusy(key);
    try {
      await fn();
      toast({ tone: "ok", ...ok });
      return true;
    } catch (e) {
      toast({ title: "Not done", body: message(e), tone: "risk" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const chase = (check: string) =>
    act(`chase:${check}`, () => chasePayrollInput(CURRENT, check), { title: "HR asked to resolve it", body: `“${check}” · logged against ${CURRENT}. No email or SMS is sent.`, tone: "info" });

  const columns: Column<PayrollRun>[] = [
    {
      key: "period",
      header: "Pay period",
      sort: (r) => r.id,
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-title">{r.period}</span>
          <span className="cell-sub mono">{r.id}</span>
        </div>
      ),
    },
    { key: "emp", header: "Employees", align: "right", sort: (r) => r.employees, cell: (r) => <span className="cell-num">{num(r.employees)}</span> },
    { key: "gross", header: "Gross", align: "right", cell: (r) => <span className={cx("cell-num pay-nowrap", !revealed && "pay-masked")}>{money(r.gross)}</span>, priority: 2 },
    { key: "net", header: "Net pay", align: "right", cell: (r) => <span className={cx("cell-num pay-nowrap", !revealed && "pay-masked")}>{money(r.net)}</span> },
    { key: "lock", header: "Locked", cell: (r) => (r.lockedAt ? <span className="pay-small">{date(r.lockedAt, true)} · {r.lockedBy}</span> : <span className="t-muted pay-small">Not locked</span>), priority: 3 },
    { key: "status", header: "Status", sort: (r) => r.status, cell: (r) => <Status>{r.status}</Status> },
  ];

  const steps = (r: PayrollRun) => {
    const s = r.status;
    const passed = r.checks.filter((c) => c.status === "Pass").length;
    return [
      { key: "inputs", label: "Inputs", status: s === "Collecting inputs" ? (blocked.length ? "Blocked" : "Active") : "Done", detail: s === "Collecting inputs" ? `${passed} of ${r.checks.length} checks pass` : `Submitted by ${r.preparedBy ?? "—"}` },
      { key: "review", label: "Review", status: s === "Ready for review" ? "Active" : s === "Collecting inputs" ? "Waiting" : "Done", detail: s === "Ready for review" ? "With the Finance owner" : "Preview per employee" },
      { key: "approve", label: "Approve", status: s === "Approved" || s === "Locked" ? "Done" : "Waiting", detail: r.approvedBy ? `Approved by ${r.approvedBy}` : "Finance owner · maker ≠ checker" },
      { key: "lock", label: "Lock", status: s === "Locked" ? "Done" : s === "Approved" ? "Active" : "Waiting", detail: r.lockedBy ? `Locked by ${r.lockedBy}` : "Explicit; reversal needs reason" },
    ] as const;
  };

  const headline = !run
    ? "Loading the pay period…"
    : run.status === "Collecting inputs"
      ? blocked.length
        ? `November 2026 can't move to review yet — ${blocked[0].detail.toLowerCase()}.`
        : openWarnings.length
          ? `November 2026 can go to review once ${openWarnings.length === 1 ? "one warning is" : `${openWarnings.length} warnings are`} acknowledged.`
          : "November 2026 inputs are complete and ready for review."
      : run.status === "Ready for review"
        ? `November 2026 is with the Finance owner for review — prepared by ${run.preparedBy}.`
        : run.status === "Approved"
          ? `November 2026 is approved by ${run.approvedBy}. Lock it to freeze inputs.`
          : `November 2026 is locked. Changes now need a reversal with a reason.`;

  /* ---- the one next action for the current stage ---- */
  let nextAction: ReactNode = null;
  if (run?.status === "Collecting inputs") {
    const why = !canEdit
      ? "Submitting is for HR & payroll."
      : blocked.length
        ? `Blocked: ${blocked.map((b) => b.detail).join("; ")}. Clear it to submit.`
        : openWarnings.length
          ? `Acknowledge ${openWarnings.map((c) => `“${c.name}”`).join(" and ")} with a note first.`
          : "";
    const btn = (
      <Button variant="primary" iconRight={ArrowRight} disabled={!!why} loading={busy === "submit"} onClick={() => act("submit", () => submitForReview(CURRENT), { title: "Submitted for review", body: `${CURRENT} is with the Finance owner. You are recorded as the maker.` })}>
        Submit for review
      </Button>
    );
    nextAction = why ? <Why reason={why}>{btn}</Why> : btn;
  } else if (run?.status === "Ready for review") {
    const why = !isFinance ? "Waiting on the Finance owner to approve." : run.preparedBy === user?.name ? "You prepared this run, so someone else has to approve it (maker ≠ checker)." : "";
    const btn = (
      <Button variant="primary" icon={ShieldCheck} disabled={!!why} onClick={() => setDialog("approve")}>
        Approve run
      </Button>
    );
    nextAction = why ? <Why reason={why}>{btn}</Why> : btn;
  } else if (run?.status === "Approved") {
    const btn = (
      <Button variant="primary" icon={Lock} disabled={!canEdit} onClick={() => setDialog("lock")}>
        Lock run
      </Button>
    );
    nextAction = canEdit ? btn : <Why reason="Locking is for HR & payroll or the Finance owner.">{btn}</Why>;
  } else if (run?.status === "Locked") {
    const pending = pendingReversal(run.id);
    nextAction = pending ? (
      <span className="pay-small t-muted">
        Reversal <RecordLink id={pending.id} quiet /> is waiting on the Finance owner
      </span>
    ) : canEdit ? (
      <Button icon={RotateCcw} onClick={() => setReverseId(run.id)}>
        Request reversal
      </Button>
    ) : null;
  }

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "People" }, { label: "Payroll" }]}
        title="Payroll"
        description={headline}
        meta={
          <>
            <span className="pay-restricted">
              <Lock size={13} aria-hidden /> Salary figures visible to HR &amp; payroll and the Finance owner only
            </span>
            <span>Maker: HR &amp; payroll · Checker: Finance owner</span>
          </>
        }
        actions={
          mayReveal ? (
            <Switch checked={show} onChange={setShow} label="Show amounts" />
          ) : (
            <Why reason="Your role can see the run's progress but not salary figures.">
              <span className="pay-small t-muted">Amounts hidden for your role</span>
            </Why>
          )
        }
      />

      {runs.loading || !run ? (
        <LoadingRows rows={6} columns={4} />
      ) : (
        <div className="grid grid-main-aside pay-layout">
          <Card>
            <CardHeader eyebrow={run.id} title={`${run.period} run`} description={collecting ? "Prechecks that must pass before the run goes to review." : "Prechecks as they stood when the run was submitted. Inputs are frozen."} actions={<Status>{run.status}</Status>} />
            <Stepper steps={steps(run).map((s) => ({ ...s }))} />

            {collecting && blocked.length > 0 && (
              <div className="pay-gap">
                <Callout tone="risk" title={`Can't move to review: ${blocked[0].detail.replace(/ of \d+ joiners/, " joiners")}`}>
                  Salary can't be paid to an unverified account, so the run stops here instead of computing with gaps. A blocked check clears only when its cause is fixed; warnings can be carried with a note.
                </Callout>
              </div>
            )}

            <ul className="pay-checks" aria-label="Prechecks">
              {run.checks.map((c) => {
                const meta = CHECK_META[c.name];
                const carried = c.status === "Warning" && c.acknowledged;
                const Icon = c.status === "Pass" ? CheckCircle2 : carried ? MessageSquareText : c.status === "Warning" ? AlertTriangle : OctagonAlert;
                const tone = c.status === "Pass" ? "ok" : c.status === "Warning" ? "warn" : "risk";
                return (
                  <li key={c.name} className={cx("pay-check", `tone-${tone}`)}>
                    <Icon size={18} aria-hidden className="pay-check-icon" />
                    <div className="pay-check-main">
                      <div className="pay-check-title">
                        {c.name} <Status size="sm">{c.status}</Status>
                        {carried && <span className="pay-small t-muted">· carried with a note</span>}
                      </div>
                      <div className="pay-check-detail">{c.detail}</div>
                      {c.acknowledged ? (
                        <div className="pay-ack">
                          “{c.acknowledged.note}” — {c.acknowledged.by}, {date(c.acknowledged.at, true)}
                        </div>
                      ) : (
                        <div className="pay-check-owner">Owner: {meta?.owner ?? "HR"}</div>
                      )}
                      {c.name === BANK_CHECK && joiners.length > 0 && (
                        <ul className="pay-joiners">
                          {joiners.map((j) => {
                            const ok = j.joining?.bank === "Verified";
                            return (
                              <li key={j.id} className={cx(ok && "is-ok")}>
                                {ok ? <UserRoundCheck size={14} aria-hidden /> : <UserRoundX size={14} aria-hidden />}
                                <span className="pay-joiner-text">
                                  <b>{j.name}</b> · {j.role} · {j.location} · joined {date(j.joined, true)} — {j.joining?.note}
                                </span>
                                {!ok && canHr && collecting && (
                                  <Button size="sm" icon={BadgeCheck} onClick={() => setVerify(j)}>
                                    Mark verified
                                  </Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {collecting && c.status !== "Pass" && !c.acknowledged && (
                      <div className="pay-check-act">
                        {meta?.to && (
                          <ButtonLink to={meta.to} size="sm" variant="ghost" iconRight={ArrowRight}>
                            {meta.toLabel}
                          </ButtonLink>
                        )}
                        {c.status === "Warning" && canHr && (
                          <Button size="sm" icon={MessageSquareText} onClick={() => setAck(c)}>
                            Acknowledge
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="ghost" icon={Send} loading={busy === `chase:${c.name}`} onClick={() => chase(c.name)}>
                            Ask HR
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="pay-submit">
              <span className="pay-small t-muted">
                {collecting ? (
                  <>
                    {blocked.length} blocked · {openWarnings.length} open warning{openWarnings.length === 1 ? "" : "s"}. Warnings go to review with a note; blocked checks can't.
                  </>
                ) : (
                  <>
                    Prepared by {run.preparedBy ?? "—"}
                    {run.preparedAt ? ` on ${date(run.preparedAt, true)}` : ""}
                    {run.approvedBy ? ` · approved by ${run.approvedBy}${run.approvalNote ? ` (“${run.approvalNote}”)` : ""}` : ""}
                    {run.lockedBy ? ` · locked by ${run.lockedBy}` : ""}
                  </>
                )}
              </span>
              {nextAction}
            </div>
          </Card>

          <div className="stack" style={{ gap: "var(--space-5)" }}>
            <Card>
              <CardHeader title="Provisional totals" description={!mayReveal ? "Hidden for your role" : show ? "Visible because your role works this run" : "Masked by default — switch on to reveal"} icon={FileLock2} />
              <dl className="pay-totals">
                <div>
                  <dt>Employees</dt>
                  <dd className="t-num">{num(run.employees)}</dd>
                  <span className="pay-delta">{prev ? `+${run.employees - prev.employees} vs Oct` : ""}</span>
                </div>
                <div>
                  <dt>Gross</dt>
                  <dd className={cx("t-num", !revealed && "pay-masked")}>{money(run.gross)}</dd>
                  <span className="pay-delta">{revealed && prev ? `${inr(run.gross - prev.gross)} vs Oct` : ""}</span>
                </div>
                <div>
                  <dt>Deductions</dt>
                  <dd className={cx("t-num", !revealed && "pay-masked")}>{money(run.deductions)}</dd>
                  <span className="pay-delta">Illustrative · not calculated</span>
                </div>
                <div className="is-net">
                  <dt>Net pay</dt>
                  <dd className={cx("t-num", !revealed && "pay-masked")}>{money(run.net)}</dd>
                  <span className="pay-delta">{revealed && prev ? `${inr(run.net - prev.net)} vs Oct` : ""}</span>
                </div>
              </dl>
            </Card>

            <Callout tone="warn" title="Statutory rules aren't calculated here">
              PF, ESIC, professional tax and TDS are not computed. Deduction totals are placeholders and nothing is filed.
            </Callout>

            <ComingSoon icon={Landmark} title="Payslips, bank file & journal">Generated from a locked run once pay calculation is agreed. Today the run is reviewed, approved and locked; no payslip or bank file is produced.</ComingSoon>
          </div>
        </div>
      )}

      <section className="stack-sm stack">
        <div className="row row-between">
          <h2 className="section-title">Run history</h2>
          <span className="pay-small t-muted">Locked runs can't be edited; a reversal needs a reason and the Finance owner</span>
        </div>
        <DataTable rows={runs.data ?? []} loading={runs.loading} columns={columns} onRowClick={(r) => navigate(`/app/payroll/${r.id}`)} activeId={recordId} caption="Pay runs" />
      </section>

      <RunDrawer id={recordId} runs={runs.data} loading={runs.loading} revealed={revealed} pending={recordId ? pendingReversal(recordId) : undefined} canRequest={canEdit} onReverse={setReverseId} onClose={() => navigate("/app/payroll")} />

      <AckDialog
        check={ack}
        onClose={() => setAck(null)}
        onSubmit={(note) => act("ack", () => resolveCheck(CURRENT, ack!.name, note), { title: "Warning carried with your note", body: `“${ack!.name}” goes to review with it. The Finance owner sees the note.` })}
      />

      <Dialog
        open={!!verify}
        onOpenChange={(o) => !o && setVerify(null)}
        title={`Verify ${verify?.name ?? ""}'s bank account`}
        description={verify?.joining?.note}
        icon={BadgeCheck}
        tone="accent"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVerify(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy === "verify"}
              onClick={async () => {
                const p = verify!;
                if (await act("verify", () => verifyBankDetails(p.id), { title: "Bank account verified", body: `${p.name} · recorded against your name. The payroll check updates on its own.` })) setVerify(null);
              }}
            >
              Mark verified
            </Button>
          </>
        }
      >
        <p className="pay-small">Confirm you have matched the account holder name and IFSC against the bank proof (penny-drop or cancelled cheque). The account number itself isn't shown or stored.</p>
      </Dialog>

      <NoteDialog
        open={dialog === "approve"}
        title={`Approve ${CURRENT}`}
        description={run ? `Prepared by ${run.preparedBy}. Approving records you as the checker; the run can then be locked.` : undefined}
        label="Note for the record"
        optional
        min={0}
        confirm="Approve run"
        icon={ShieldCheck}
        onClose={() => setDialog(null)}
        onSubmit={(note) => act("approve", () => approveRun(CURRENT, note), { title: "Pay run approved", body: `${CURRENT} can now be locked.` })}
      />

      <Dialog
        open={dialog === "lock"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Lock ${CURRENT}`}
        description="Locking freezes the inputs and totals for November. After this, any change needs a reversal with a reason that the Finance owner approves."
        icon={Lock}
        tone="warn"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Lock}
              loading={busy === "lock"}
              onClick={async () => {
                if (await act("lock", () => lockRun(CURRENT), { title: "Pay run locked", body: `${CURRENT} is read only.` })) setDialog(null);
              }}
            >
              Lock run
            </Button>
          </>
        }
      />

      <NoteDialog
        open={!!reverseId}
        title={`Request reversal of ${reverseId ?? ""}`}
        description="The locked run stays as it is until the Finance owner approves. An approved reversal reopens it for correction."
        label="Reason"
        min={REASON_MIN}
        confirm="Send for approval"
        icon={RotateCcw}
        onClose={() => setReverseId(null)}
        onSubmit={(reason) => act("reverse", () => requestReversal(reverseId!, reason), { title: "Reversal sent for approval", body: "It waits in the Finance owner's approvals." })}
      />
    </ModuleFrame>
  );
}

function AckDialog({ check, onClose, onSubmit }: { check: PayrollCheck | null; onClose: () => void; onSubmit: (note: string) => Promise<boolean> }) {
  return (
    <NoteDialog
      open={!!check}
      title={`Acknowledge “${check?.name ?? ""}”`}
      description={check ? `${check.detail}. The run can go to review with this warning; your note travels with it to the checker.` : undefined}
      label="Why it can go to review"
      placeholder="e.g. Corrections are for 3–4 Nov and will be paid as arrears in December"
      min={ACK_MIN}
      confirm="Acknowledge"
      icon={MessageSquareText}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

/** A dialog that collects one written note, with the length rule shown up front. */
function NoteDialog({
  open,
  title,
  description,
  label,
  placeholder,
  min,
  optional,
  confirm,
  icon,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  min: number;
  optional?: boolean;
  confirm: string;
  icon: typeof Lock;
  onClose: () => void;
  onSubmit: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setNote("");
    setError(null);
    onClose();
  };
  const submit = async () => {
    if (note.trim().length < min) {
      setError(`Write at least ${min} characters (${note.trim().length} so far).`);
      return;
    }
    setPending(true);
    const ok = await onSubmit(note);
    setPending(false);
    if (ok) close();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title={title}
      description={description}
      icon={icon}
      tone="accent"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={submit}>
            {confirm}
          </Button>
        </>
      }
    >
      <Field label={label} htmlFor="pay-note" optional={optional} error={error} hint={min ? `At least ${min} characters. Recorded in the audit trail.` : "Recorded in the audit trail."}>
        <Textarea id="pay-note" rows={3} value={note} placeholder={placeholder} onChange={(e) => setNote(e.target.value)} invalid={!!error} autoFocus />
      </Field>
    </Dialog>
  );
}

function RunDrawer({
  id,
  runs,
  loading,
  revealed,
  pending,
  canRequest,
  onReverse,
  onClose,
}: {
  id?: string;
  runs?: PayrollRun[];
  loading: boolean;
  revealed: boolean;
  pending?: Approval;
  canRequest: boolean;
  onReverse: (id: string) => void;
  onClose: () => void;
}) {
  const r = runs?.find((x) => x.id === id);
  const money = (v: number) => (revealed ? inr(v) : "₹ •••••");
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      status={r ? <Status>{r.status}</Status> : undefined}
      title={r ? `${r.period} pay run` : loading ? "Loading pay run…" : "Pay run not found"}
      subtitle={r?.lockedAt ? `Locked ${date(r.lockedAt)} by ${r.lockedBy} · approved by ${r.approvedBy ?? "—"}` : undefined}
      footer={
        r?.status === "Locked" && !pending && canRequest ? (
          <Button icon={RotateCcw} onClick={() => onReverse(r.id)}>
            Request reversal
          </Button>
        ) : undefined
      }
    >
      {!r ? (
        loading ? <LoadingRows rows={4} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
      ) : (
        <>
          <KeyValues
            columns={2}
            items={[
              { label: "Employees", value: num(r.employees) },
              { label: "Gross", value: <span className={cx("t-num", !revealed && "pay-masked")}>{money(r.gross)}</span> },
              { label: "Deductions", value: <span className={cx("t-num", !revealed && "pay-masked")}>{money(r.deductions)}</span> },
              { label: "Net pay", value: <span className={cx("t-num", !revealed && "pay-masked")}>{money(r.net)}</span> },
              { label: "Prepared by", value: r.preparedBy ?? "—" },
              { label: "Approved by", value: r.approvedBy ?? "—" },
            ]}
          />
          {pending && (
            <Callout tone="warn" icon={RotateCcw} title={`Reversal waiting on the Finance owner · ${pending.id}`}>
              {pending.evidence[0]}. The run stays locked until it is decided.
            </Callout>
          )}
          {r.status === "Locked" ? (
            <Callout tone="neutral" icon={Lock} title="Locked — read only">
              Payslips and the register for this period are frozen. Corrections go into the next run as arrears, or through an approved reversal with a reason (PAY-016).
            </Callout>
          ) : (
            <Callout tone="info" title={r.status}>
              This run isn't locked yet. Work it from the run card above.
            </Callout>
          )}
          {!revealed && <p className="pay-small t-muted">Amounts are masked. Roles that work the run can use “Show amounts” in the page header.</p>}
        </>
      )}
    </Drawer>
  );
}
