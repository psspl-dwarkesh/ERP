import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Drawer, EmptyState, KeyValues, LoadingRows, RecordLink, Status } from "../../ds/components";

export function ClaimDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const claims = useQuery(api.claims);
  const approvals = useQuery(api.approvals);
  const [open, setOpen] = useState<Approval | null>(null);
  const c = claims.data?.find((x) => x.id === id);
  const a = approvals.data?.find((x) => x.reference === id);
  const [ref, ...rest] = c?.reference.split(" · ") ?? [""];
  return (
    <>
      <Drawer
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        id={id}
        status={c ? <Status>{c.status}</Status> : undefined}
        title={c ? `${c.kind} claim · ${inr(c.amount, { compact: false })}` : claims.loading ? "Loading claim…" : "Claim not found"}
        subtitle={c ? `${c.person} · submitted ${date(c.submitted)}` : undefined}
        footer={a?.status === "Pending" ? <Button variant="primary" onClick={() => setOpen(a)}>Review & decide</Button> : undefined}
      >
        {!c ? (
          claims.loading ? <LoadingRows rows={4} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
        ) : (
          <>
            <KeyValues
              columns={2}
              items={[
                { label: "Claimant", value: <RecordLink id={c.personId}>{c.person}</RecordLink> },
                { label: "Against", value: <span><RecordLink id={ref} /> {rest.join(" · ")}</span> },
                { label: "Amount", value: <span className="t-num t-strong">{inr(c.amount, { compact: false })}</span> },
                { label: "Approver", value: a ? `${a.level} · raised ${ago(a.submitted)}` : "Reporting manager" },
              ]}
            />
            {a && (
              <section className="stack-sm stack">
                <h3 className="hr-h">Receipts & evidence</h3>
                <ul className="divider-list">
                  {a.evidence.map((e) => (
                    <li key={e} className="list-row hr-small">{e}</li>
                  ))}
                </ul>
              </section>
            )}
            <p className="hr-small t-muted">Payout route (payroll or payables) is decision PAY-013. The traveller can't approve their own claim.</p>
          </>
        )}
      </Drawer>
      <ApprovalDialog approval={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}

export function LeaveDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const leave = useQuery(api.leaveRequests);
  const l = leave.data?.find((x) => x.id === id);
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      status={l ? <Status>{l.status}</Status> : undefined}
      title={l ? `${l.kind} leave · ${l.days} day${l.days > 1 ? "s" : ""}` : leave.loading ? "Loading leave…" : "Leave request not found"}
      subtitle={l ? `${l.person} · ${date(l.from)}${l.days > 1 ? ` – ${date(l.to)}` : ""}` : undefined}
    >
      {!l ? (
        leave.loading ? <LoadingRows rows={3} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
      ) : (
        <KeyValues
          columns={2}
          items={[
            { label: "Employee", value: <RecordLink id={l.personId}>{l.person}</RecordLink> },
            { label: "Reason", value: l.reason },
            { label: "Decision", value: l.status === "Pending" ? "Waiting for reporting manager" : l.status },
            { label: "Payroll input", value: l.status === "Approved" ? "Counted in payable days" : "Not counted until approved" },
          ]}
        />
      )}
    </Drawer>
  );
}
