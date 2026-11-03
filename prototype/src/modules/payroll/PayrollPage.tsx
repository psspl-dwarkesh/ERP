import { AlertTriangle, ArrowRight, CheckCircle2, FileLock2, Landmark, Lock, OctagonAlert, Send, UserRoundX } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date, inr, num } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { PayrollRun } from "../../api/types";
import { ModuleFrame } from "../../app/Shell";
import { href, navigate, useRoute } from "../../app/router";
import {
  Button,
  ButtonLink,
  Callout,
  ComingSoon,
  SoonButton,
  Card,
  CardHeader,
  DataTable,
  Drawer,
  EmptyState,
  KeyValues,
  LoadingRows,
  PageHeader,
  Status,
  Stepper,
  Switch,
  Tooltip,
  cx,
  useToast,
  type Column,
} from "../../ds/components";
import { chasePayrollInput } from "./commands";
import "./payroll.css";

const CURRENT = "PAY-2026-11";

/** Where each precheck is fixed, and by whom. Owners are illustrative. */
const CHECK_META: Record<string, { owner: string; to?: string; toLabel?: string }> = {
  "Attendance locked": { owner: "Kavya Iyer · HR", to: href.module("hr", "leave"), toLabel: "Attendance exceptions" },
  "Leave balances synced": { owner: "System" },
  "New joiners have bank details": { owner: "Kavya Iyer · HR" },
  "Site allowances approved": { owner: "Project managers" },
  "Claims cut-off": { owner: "Reporting managers", to: href.module("hr", "claims"), toLabel: "Pending claims" },
};

/** The two joiners behind the blocked check. Illustrative — new joiners aren't in the demo directory. */
const JOINERS = [
  { name: "Aditi Rane", role: "Graduate engineer · Pune", joined: "2026-11-02", issue: "Bank proof uploaded, penny-drop verification not run" },
  { name: "Farhan Ali", role: "Field technician · Nashik", joined: "2026-11-02", issue: "No bank account on file" },
];

/** Illustrative lock trail for past runs (PAY-016). */
const LOCKS: Record<string, { by: string; on: string; checker: string }> = {
  "PAY-2026-10": { by: "Kavya Iyer", on: "2026-10-29", checker: "Finance owner" },
  "PAY-2026-09": { by: "Kavya Iyer", on: "2026-09-28", checker: "Finance owner" },
};

export default function PayrollPage() {
  const route = useRoute();
  const toast = useToast();
  const runs = useQuery(api.payrollRuns);
  const [show, setShow] = useState(false);
  const [chasing, setChasing] = useState<string | null>(null);

  const run = runs.data?.find((r) => r.id === CURRENT);
  const prev = runs.data?.find((r) => r.id === "PAY-2026-10");
  const blocked = run?.checks.filter((c) => c.status === "Blocked") ?? [];
  const warnings = run?.checks.filter((c) => c.status === "Warning") ?? [];
  const money = (v: number) => (show ? inr(v) : "₹ •••••");
  const recordId = route.recordId && route.recordId !== CURRENT ? route.recordId : undefined;

  const chase = async (check: string) => {
    setChasing(check);
    try {
      await chasePayrollInput(CURRENT, check);
      toast({ title: "HR asked to resolve it", body: `“${check}” · logged against ${CURRENT}. No email or SMS is sent from the demo.`, tone: "info" });
    } catch (e) {
      toast({ title: "Couldn't log the request", body: e instanceof Error ? e.message : String(e), tone: "risk" });
    } finally {
      setChasing(null);
    }
  };

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
    { key: "gross", header: "Gross", align: "right", cell: (r) => <span className={cx("cell-num pay-nowrap", !show && "pay-masked")}>{money(r.gross)}</span>, priority: 2 },
    { key: "net", header: "Net pay", align: "right", cell: (r) => <span className={cx("cell-num pay-nowrap", !show && "pay-masked")}>{money(r.net)}</span> },
    { key: "lock", header: "Locked", cell: (r) => (LOCKS[r.id] ? <span className="pay-small">{date(LOCKS[r.id].on, true)} · {LOCKS[r.id].by}</span> : <span className="t-muted pay-small">Not locked</span>), priority: 3 },
    { key: "status", header: "Status", sort: (r) => r.status, cell: (r) => <Status>{r.status}</Status> },
  ];

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "People" }, { label: "Payroll" }]}
        title="Payroll"
        description={run ? (blocked.length ? `November 2026 can't move to review yet — ${blocked[0].detail.toLowerCase()}.` : "November 2026 inputs are complete and ready for review.") : "Loading the pay period…"}
        meta={
          <>
            <span className="pay-restricted">
              <Lock size={13} aria-hidden /> Salary data visible to HR &amp; payroll role only
            </span>
            <span>Preparer: Kavya Iyer · Checker: Finance owner</span>
          </>
        }
        actions={<Switch checked={show} onChange={setShow} label="Show amounts" />}
      />

      {runs.loading || !run ? (
        <LoadingRows rows={6} columns={4} />
      ) : (
        <div className="grid grid-main-aside pay-layout">
          <Card>
            <CardHeader
              eyebrow={run.id}
              title={`${run.period} run readiness`}
              description="Prechecks that must pass before the run is computed."
              actions={<Status>{run.status}</Status>}
            />
            <Stepper
              steps={[
                { key: "inputs", label: "Inputs", status: "Active", detail: `${run.checks.filter((c) => c.status === "Pass").length} of ${run.checks.length} checks pass` },
                { key: "review", label: "Review", status: "Waiting", detail: "Preview per employee" },
                { key: "approve", label: "Approve", status: "Waiting", detail: "Finance owner · maker ≠ checker" },
                { key: "lock", label: "Lock", status: "Waiting", detail: "Explicit; reversal needs reason" },
              ]}
            />

            {blocked.length > 0 && (
              <div className="pay-gap">
                <Callout tone="risk" title={`Can't move to review: ${blocked[0].detail.replace(/ of \d+ joiners/, " joiners")}`}>
                  Salary can't be paid to an unverified account, so the run stops here instead of computing with gaps. Clear the blocked check; warnings can be carried with a note.
                </Callout>
              </div>
            )}

            <ul className="pay-checks" aria-label="Prechecks">
              {run.checks.map((c) => {
                const meta = CHECK_META[c.name];
                const Icon = c.status === "Pass" ? CheckCircle2 : c.status === "Warning" ? AlertTriangle : OctagonAlert;
                const tone = c.status === "Pass" ? "ok" : c.status === "Warning" ? "warn" : "risk";
                return (
                  <li key={c.name} className={cx("pay-check", `tone-${tone}`)}>
                    <Icon size={18} aria-hidden className="pay-check-icon" />
                    <div className="pay-check-main">
                      <div className="pay-check-title">
                        {c.name} <Status size="sm">{c.status}</Status>
                      </div>
                      <div className="pay-check-detail">{c.detail}</div>
                      <div className="pay-check-owner">Owner: {meta?.owner ?? "HR"}</div>
                      {c.name === "New joiners have bank details" && (
                        <ul className="pay-joiners">
                          {JOINERS.map((j) => (
                            <li key={j.name}>
                              <UserRoundX size={14} aria-hidden />
                              <span>
                                <b>{j.name}</b> · {j.role} · joined {date(j.joined, true)} — {j.issue}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="pay-check-act">
                      {meta?.to && (
                        <ButtonLink to={meta.to} size="sm" variant="ghost" iconRight={ArrowRight}>
                          {meta.toLabel}
                        </ButtonLink>
                      )}
                      {c.status !== "Pass" && (
                        <Button size="sm" icon={Send} loading={chasing === c.name} onClick={() => chase(c.name)}>
                          Ask HR
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="pay-submit">
              <span className="pay-small t-muted">
                {blocked.length} blocked · {warnings.length} warning{warnings.length === 1 ? "" : "s"}. Warnings can go to review with a note; blocked checks can't.
              </span>
              {blocked.length ? (
                <Tooltip content={`Blocked: ${blocked.map((b) => b.detail).join("; ")}. Clear it to submit.`}>
                  <span tabIndex={0} className="pay-submit-wrap">
                    <Button variant="primary" iconRight={ArrowRight} disabled>
                      Submit for review
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <SoonButton icon={ArrowRight} what="Send the computed preview to the Finance owner for review.">Submit for review</SoonButton>
              )}
            </div>
          </Card>

          <div className="stack" style={{ gap: "var(--space-5)" }}>
            <Card>
              <CardHeader title="Provisional totals" description={show ? "Visible to you because you hold the HR & payroll role" : "Masked by default — switch on to reveal"} icon={FileLock2} />
              <dl className="pay-totals">
                <div>
                  <dt>Employees</dt>
                  <dd className="t-num">{num(run.employees)}</dd>
                  <span className="pay-delta">{prev ? `+${run.employees - prev.employees} vs Oct` : ""}</span>
                </div>
                <div>
                  <dt>Gross</dt>
                  <dd className={cx("t-num", !show && "pay-masked")}>{money(run.gross)}</dd>
                  <span className="pay-delta">{show && prev ? `${inr(run.gross - prev.gross)} vs Oct` : ""}</span>
                </div>
                <div>
                  <dt>Deductions</dt>
                  <dd className={cx("t-num", !show && "pay-masked")}>{money(run.deductions)}</dd>
                  <span className="pay-delta">Illustrative · not calculated</span>
                </div>
                <div className="is-net">
                  <dt>Net pay</dt>
                  <dd className={cx("t-num", !show && "pay-masked")}>{money(run.net)}</dd>
                  <span className="pay-delta">{show && prev ? `${inr(run.net - prev.net)} vs Oct` : ""}</span>
                </div>
              </dl>
            </Card>

            <Callout tone="warn" title="Statutory rules aren't calculated here">
              PF, ESIC, professional tax and TDS are not computed. Deduction totals are placeholders and nothing is filed.
            </Callout>

            <ComingSoon icon={Landmark} title="Payslips, bank file & journal">Generated once a run is approved and locked. Pay calculation isn't part of this release.</ComingSoon>
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

      <RunDrawer id={recordId} runs={runs.data} loading={runs.loading} show={show} onClose={() => navigate("/app/payroll")} />
    </ModuleFrame>
  );
}

function RunDrawer({ id, runs, loading, show, onClose }: { id?: string; runs?: PayrollRun[]; loading: boolean; show: boolean; onClose: () => void }) {
  const r = runs?.find((x) => x.id === id);
  const lock = id ? LOCKS[id] : undefined;
  const money = (v: number) => (show ? inr(v) : "₹ •••••");
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      status={r ? <Status>{r.status}</Status> : undefined}
      title={r ? `${r.period} pay run` : loading ? "Loading pay run…" : "Pay run not found"}
      subtitle={lock ? `Locked ${date(lock.on)} by ${lock.by} · approved by ${lock.checker}` : undefined}
      footer={
        r?.status === "Locked" ? (
          <SoonButton what="Raise a reversal with a reason; the locked run stays intact until the Finance owner approves.">Request reversal</SoonButton>
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
              { label: "Gross", value: <span className={cx("t-num", !show && "pay-masked")}>{money(r.gross)}</span> },
              { label: "Deductions", value: <span className={cx("t-num", !show && "pay-masked")}>{money(r.deductions)}</span> },
              { label: "Net pay", value: <span className={cx("t-num", !show && "pay-masked")}>{money(r.net)}</span> },
              { label: "Prepared by", value: lock?.by ?? "—" },
              { label: "Approved by", value: lock?.checker ?? "—" },
            ]}
          />
          <Callout tone="neutral" icon={Lock} title="Locked — read only">
            Payslips and the register for this period are frozen. Corrections go into the next run as arrears, or through an approved reversal with a reason (PAY-016).
          </Callout>
          {!show && <p className="pay-small t-muted">Amounts are masked. Use “Show amounts” in the page header to reveal them.</p>}
        </>
      )}
    </Drawer>
  );
}
