import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, inr, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Callout, Drawer, EmptyState, KeyValues, LoadingRows, RecordLink, Status, Timeline } from "../../ds/components";
import { ACCOUNTING, MISMATCH, adviceStatus } from "./shared";

export function AdviceDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const advices = useQuery(api.billingAdvices);
  const approvals = useQuery(api.approvals);
  const activity = useQuery(api.activity);
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);
  const b = advices.data?.find((x) => x.id === id);
  const approval = approvals.data?.find((a) => a.reference === id);
  const status = b ? adviceStatus(b, approvals.data ?? []) : undefined;
  const acc = id ? ACCOUNTING[id] : undefined;
  const events = (activity.data ?? []).filter((e) => e.reference === id);

  return (
    <>
      <Drawer
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        id={id}
        status={status ? <Status>{status}</Status> : undefined}
        title={b ? `${b.trigger}` : advices.loading ? "Loading billing advice…" : "Billing advice not found"}
        subtitle={b ? `${b.customer} · raised ${date(b.raised)}` : undefined}
        footer={
          approval?.status === "Pending" ? (
            <Button variant="primary" onClick={() => setOpenApproval(approval)}>
              Review & decide
            </Button>
          ) : undefined
        }
      >
        {!b ? (
          advices.loading ? <LoadingRows rows={5} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
        ) : (
          <>
            {b.id === MISMATCH.id && (
              <Callout tone="risk" title={`Mismatch: accounting invoice is ${inr(MISMATCH.adviceValue - MISMATCH.invoiceValue, { compact: false })} lower`}>
                {MISMATCH.cause} Held at Mismatch until the retention term is confirmed or the invoice is re-issued.
              </Callout>
            )}
            {status === "Approved" && (
              <Callout tone="ok" title="Approved by Finance owner">
                Queued for accounting to raise the tax invoice. Its reference will be attached here when it comes back.
              </Callout>
            )}
            <KeyValues
              columns={2}
              items={[
                { label: "Value (before tax)", value: <span className="t-num t-strong">{inr(b.value)}</span> },
                { label: "Sales order", value: <RecordLink id={b.salesOrderId} /> },
                { label: "Trigger", value: b.trigger },
                { label: "Customer", value: b.customer },
                { label: "Accounting reference", value: acc?.ref ? <span className="mono">{acc.ref}</span> : "None yet" },
                { label: "Accounting value", value: acc?.value ? <span className="t-num">{inr(acc.value)}</span> : "—" },
              ]}
            />
            {acc && <p className="sal-small t-muted">{acc.note}</p>}
            {approval && (
              <section className="stack-sm stack">
                <h3 className="sal-h">Approval</h3>
                <KeyValues
                  columns={2}
                  items={[
                    { label: "Approver", value: approval.level },
                    { label: "Raised by", value: `${approval.maker} · ${ago(approval.submitted)}` },
                  ]}
                />
                <ul className="sal-evidence">
                  {approval.evidence.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </section>
            )}
            {events.length > 0 && (
              <section className="stack-sm stack">
                <h3 className="sal-h">History</h3>
                <Timeline items={events.map((e) => ({ id: e.id, tone: e.action.includes("approved") ? "ok" : "accent", title: `${e.actor} ${e.action}`, meta: `${ago(e.at)} · ${time(e.at)}` }))} />
              </section>
            )}
          </>
        )}
      </Drawer>
      <ApprovalDialog approval={openApproval} open={!!openApproval} onOpenChange={(o) => !o && setOpenApproval(null)} />
    </>
  );
}
