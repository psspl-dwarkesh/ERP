import { CalendarCheck2, Check, Clock4, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date } from "../../api/format";
import type { LeaveRequest, Person } from "../../api/types";
import { href } from "../../app/router";
import { Button, ButtonLink, Card, CardHeader, EmptyState, LoadingRows, Person as PersonChip, RecordLink, Status, Tag, cx, useToast } from "../../ds/components";
import { buildBookings } from "./Deployment";

/** Illustrative leave balances (HR-005). */
const BALANCE: Record<string, Record<string, number>> = {
  "EMP-0091": { Earned: 14, Casual: 4, Sick: 6 },
  "EMP-0063": { Earned: 9, Casual: 2, Sick: 7 },
  "EMP-0129": { Earned: 3, Casual: 1, Sick: 2 },
};

/** Illustrative attendance corrections waiting for approval — the 11 that payroll's precheck counts. */
const EXCEPTIONS = [
  { kind: "Missed punch-out", count: 5, example: "Imran Sheikh · 30 Oct", approver: "Nikhil Joshi" },
  { kind: "Site attendance from field app", count: 4, example: "Vikram Shah · Nandesari · 29–31 Oct", approver: "Ananya Rao" },
  { kind: "Late arrival regularisation", count: 2, example: "Deepa Kulkarni · 28 Oct", approver: "Reporting manager" },
];

export function LeaveView({ leave, people, loading, onOpen, activeId }: { leave: LeaveRequest[]; people: Person[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);
  const pending = leave.filter((l) => l.status === "Pending");
  const decided = leave.filter((l) => l.status !== "Pending");
  const bookings = loading ? [] : buildBookings(people, leave).filter((b) => b.kind !== "leave");

  const decide = async (l: LeaveRequest, status: "Approved" | "Rejected") => {
    setBusy(`${l.id}-${status}`);
    setError(null);
    try {
      await api.decideLeave(l.id, status);
      toast({
        title: status === "Approved" ? `${l.person}'s leave approved` : `${l.person}'s leave rejected`,
        body: status === "Approved" ? `${l.days} day${l.days > 1 ? "s" : ""} ${l.kind.toLowerCase()} leave · reaches payroll as an approved input.` : "The request returns to the employee with your decision.",
        tone: status === "Approved" ? "ok" : "warn",
      });
    } catch (e) {
      setError({ id: l.id, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-main-aside hr-layout">
      <div className="stack" style={{ gap: "var(--space-5)" }}>
        <Card>
          <CardHeader title="Leave waiting for you" description="Checked against deployments before you decide" icon={CalendarCheck2} />
          {loading ? (
            <LoadingRows rows={2} columns={4} />
          ) : pending.length === 0 ? (
            <EmptyState icon={Check} title="No leave requests waiting">New requests appear here with their overlap check.</EmptyState>
          ) : (
            <ul className="hr-leave-list">
              {pending.map((l) => {
                const overlaps = bookings.filter((b) => b.personId === l.personId && !(b.to < l.from || b.from > l.to));
                const bal = BALANCE[l.personId]?.[l.kind];
                return (
                  <li key={l.id} className={cx("hr-leave", activeId === l.id && "is-active")}>
                    <div className="hr-leave-main">
                      <div className="row" style={{ gap: 8 }}>
                        <PersonChip name={l.person} size="xs" />
                        <button className="hr-link mono" onClick={() => onOpen(l.id)}>{l.id}</button>
                      </div>
                      <div className="hr-leave-when">
                        <b>
                          {date(l.from, true)}
                          {l.days > 1 ? ` – ${date(l.to, true)}` : ""}
                        </b>{" "}
                        · {l.days} day{l.days > 1 ? "s" : ""} {l.kind.toLowerCase()}
                        {bal !== undefined && <span className="t-muted"> · {bal} days balance</span>}
                      </div>
                      <p className="hr-small t-muted">“{l.reason}”</p>
                      {overlaps.length ? (
                        <Tag tone="warn">Overlaps {overlaps.map((o) => o.ref).join(", ")}</Tag>
                      ) : (
                        <Tag tone="ok">No deployment overlap</Tag>
                      )}
                      {error?.id === l.id && <p className="field-error" role="alert">{error.msg}</p>}
                    </div>
                    <div className="hr-leave-act">
                      <Button size="sm" variant="ghost" icon={X} loading={busy === `${l.id}-Rejected`} disabled={!!busy} onClick={() => decide(l, "Rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" variant="primary" icon={Check} loading={busy === `${l.id}-Approved`} disabled={!!busy} onClick={() => decide(l, "Approved")}>
                        Approve
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Decided this month" />
          <ul className="divider-list">
            {decided.map((l) => (
              <li key={l.id} className="list-row">
                <PersonChip name={l.person} size="xs" />
                <div className="list-row-main list-row-sub">
                  {date(l.from, true)}
                  {l.days > 1 ? `–${date(l.to, true)}` : ""} · {l.days} d {l.kind.toLowerCase()} · <RecordLink id={l.id} quiet />
                </div>
                <Status>{l.status}</Status>
              </li>
            ))}
            {decided.length === 0 && <li className="list-row hr-small t-muted">Nothing decided yet.</li>}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Attendance exceptions" description="11 corrections must be approved before payroll locks attendance" icon={Clock4} actions={<ButtonLink to={href.module("payroll")} size="sm" variant="ghost">Payroll prechecks</ButtonLink>} />
        <ul className="divider-list">
          {EXCEPTIONS.map((e) => (
            <li key={e.kind} className="list-row hr-exc">
              <span className="hr-exc-count t-num">{e.count}</span>
              <div className="list-row-main">
                <div className="list-row-title">{e.kind}</div>
                <div className="list-row-sub">
                  e.g. {e.example} · approver {e.approver}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="hr-small t-muted" style={{ marginTop: "var(--space-3)" }}>
          Illustrative counts. Device or import source for attendance is still undecided (HR-UI-02); corrections reach payroll only once approved.
        </p>
      </Card>
    </div>
  );
}
