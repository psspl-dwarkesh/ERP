import { ClipboardCheck, FileCheck2, Landmark, OctagonAlert } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, inr, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Approval, BillingAdvice } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Callout, Card, CardHeader, DataTable, LoadingRows, Menu, RecordLink, Status, type Column, useToast } from "../../ds/components";
import { escalateMismatch } from "./commands";
import { ACCOUNTING, MISMATCH, adviceStatus } from "./shared";

export function BillingView({ onOpen, activeId }: { onOpen: (id: string) => void; activeId?: string }) {
  const toast = useToast();
  const advices = useQuery(api.billingAdvices);
  const approvals = useQuery(api.approvals);
  const projects = useQuery(api.projects);
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);
  const esc = useMutation(escalateMismatch);

  const list = approvals.data ?? [];
  const mismatch = advices.data?.find((b) => b.id === MISMATCH.id);
  const review = advices.data?.find((b) => b.id === "BA-0063");
  const reviewApproval = list.find((a) => a.reference === "BA-0063");
  const reviewState = review ? adviceStatus(review, list) : undefined;

  const upcoming = (projects.data ?? [])
    .filter((p) => p.salesOrder)
    .flatMap((p) => p.milestones.filter((m) => m.billable && m.status !== "Done").map((m) => ({ ...m, project: p })))
    .sort((a, b) => a.due.localeCompare(b.due));

  const columns: Column<BillingAdvice>[] = [
    {
      key: "id",
      header: "Advice",
      sort: (b) => b.id,
      cell: (b) => (
        <div className="cell-primary">
          <span className="cell-title">{b.trigger}</span>
          <span className="cell-sub">
            <span className="mono">{b.id}</span> · {b.customer}
          </span>
        </div>
      ),
    },
    { key: "so", header: "Order", cell: (b) => <RecordLink id={b.salesOrderId} /> },
    { key: "value", header: "Value", align: "right", sort: (b) => b.value, cell: (b) => <span className="cell-num sal-nowrap">{inr(b.value)}</span> },
    { key: "raised", header: "Raised", sort: (b) => b.raised, cell: (b) => <span className="cell-num sal-nowrap">{date(b.raised, true)}</span>, priority: 3 },
    { key: "acc", header: "Accounting reference", priority: 2, cell: (b) => (ACCOUNTING[b.id]?.ref ? <span className="mono sal-small">{ACCOUNTING[b.id].ref}</span> : <span className="t-muted sal-small">None yet</span>) },
    { key: "status", header: "Status", sort: (b) => adviceStatus(b, list), cell: (b) => <Status>{adviceStatus(b, list)}</Status> },
  ];

  const escalate = async (kind: "retention" | "reissue") => {
    const r = await esc.run(MISMATCH.id, kind);
    if (r)
      toast({
        title: kind === "retention" ? "Retention question sent to Finance owner" : "Re-issue request logged for accounting",
        body: `${MISMATCH.id} stays in Mismatch until both sides agree. Nothing was re-sent.`,
        tone: "info",
      });
  };

  const loading = advices.loading || approvals.loading;

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {loading ? (
        <LoadingRows rows={3} columns={3} />
      ) : (
        <div className="grid grid-2 sal-decisions">
          {mismatch && (
            <article className="sal-decision tone-risk">
              <div className="sal-decision-top">
                <span className="sal-decision-icon">
                  <OctagonAlert size={18} aria-hidden />
                </span>
                <RecordLink id={mismatch.id} />
                <span className="sal-decision-kicker">Reconciliation exception · since {date(MISMATCH.detected, true)}</span>
              </div>
              <h3 className="sal-decision-title">Accounting invoiced {inr(MISMATCH.adviceValue - MISMATCH.invoiceValue, { compact: false })} less than the advice</h3>
              <div className="sal-compare">
                <div>
                  <span className="sal-label">Billing advice</span>
                  <span className="t-num t-strong">{inr(MISMATCH.adviceValue)}</span>
                  <span className="sal-small t-muted">{mismatch.trigger}</span>
                </div>
                <div>
                  <span className="sal-label">Accounting invoice</span>
                  <span className="t-num t-strong">{inr(MISMATCH.invoiceValue)}</span>
                  <span className="sal-small t-muted mono">{ACCOUNTING[mismatch.id]?.ref}</span>
                </div>
                <div>
                  <span className="sal-label">Difference</span>
                  <span className="t-num sal-diff">−{inr(MISMATCH.adviceValue - MISMATCH.invoiceValue, { compact: false })}</span>
                  <span className="sal-small t-muted">5.0% of advice</span>
                </div>
              </div>
              <p className="sal-decision-body">{MISMATCH.cause} The advice is held at Mismatch — it is not re-sent automatically, so the customer can't be billed twice.</p>
              {esc.error && <p className="field-error" role="alert">{esc.error}</p>}
              <div className="sal-decision-foot">
                <span className="sal-small t-muted">
                  <RecordLink id={mismatch.salesOrderId} quiet /> · {mismatch.customer}
                </span>
                <Menu
                  trigger={
                    <Button size="sm" variant="primary" loading={esc.pending}>
                      Resolve…
                    </Button>
                  }
                  items={[
                    { heading: "Ask the owner of the gap" },
                    { label: "Confirm retention with Finance owner", detail: "If 5% retention is agreed, record it on SO-0188", onSelect: () => escalate("retention") },
                    { label: "Ask accounting to re-issue", detail: "If retention was never agreed", onSelect: () => escalate("reissue") },
                    { separator: true },
                    { label: "Open billing advice", onSelect: () => onOpen(mismatch.id) },
                  ]}
                />
              </div>
            </article>
          )}

          {review && (
            <article className={`sal-decision ${reviewState === "Approved" ? "tone-ok" : "tone-accent"}`}>
              <div className="sal-decision-top">
                <span className="sal-decision-icon">
                  <ClipboardCheck size={18} aria-hidden />
                </span>
                <RecordLink id={review.id} />
                <span className="sal-decision-kicker">{reviewApproval ? `${reviewApproval.level} · raised ${ago(reviewApproval.submitted)}` : "Ready for review"}</span>
              </div>
              <h3 className="sal-decision-title">
                {review.trigger} — {inr(review.value)}
              </h3>
              <p className="sal-decision-body">
                {review.customer} · <RecordLink id={review.salesOrderId} quiet /> · <RecordLink id="PRJ-0249" quiet />. Eligibility comes from the milestone state: loop checks were completed on 19 Oct and the customer signed the sheets.
              </p>
              <ul className="sal-evidence">
                {(reviewApproval?.evidence ?? []).map((e) => (
                  <li key={e}>
                    <FileCheck2 size={15} aria-hidden /> {e}
                  </li>
                ))}
                <li>
                  <FileCheck2 size={15} aria-hidden /> Basis: MS-2 billable value {inr(528000, { compact: false })} (20% of order)
                </li>
              </ul>
              <div className="sal-decision-foot">
                <span className="sal-small t-muted">Raised by {reviewApproval?.maker ?? "Vikram Shah"} · checker can't be the maker</span>
                {reviewApproval?.status === "Pending" ? (
                  <Button size="sm" variant="primary" onClick={() => setOpenApproval(reviewApproval)}>
                    Review & decide
                  </Button>
                ) : (
                  <Status>{reviewState ?? "Ready for review"}</Status>
                )}
              </div>
            </article>
          )}
        </div>
      )}

      <Callout tone="info" icon={Landmark} title="Threadline raises billing advice. Accounting issues the tax invoice.">
        Accounting returns its invoice reference and the two are reconciled. Nothing in this demo posts to an accounting system.
      </Callout>

      <section className="stack-sm stack">
        <div className="row row-between">
          <h2 className="section-title">Billing advices</h2>
          <span className="sal-small t-muted">{(advices.data ?? []).length} raised since September</span>
        </div>
        <DataTable rows={advices.data ?? []} loading={advices.loading} columns={columns} onRowClick={(b) => onOpen(b.id)} activeId={activeId} caption="Billing advices" />
      </section>

      <Card padded={false}>
        <div className="card-padded" style={{ paddingBottom: 0 }}>
          <CardHeader title="Next billable milestones" description="Advice can be raised only once the milestone passes its gate" />
        </div>
        {projects.loading ? (
          <LoadingRows rows={3} columns={4} />
        ) : (
          <ul className="divider-list sal-upcoming">
            {upcoming.map((m) => (
              <li key={`${m.project.id}-${m.id}`} className="list-row">
                <RecordLink id={m.project.id} />
                <div className="list-row-main">
                  <div className="list-row-title">{m.name}</div>
                  <div className="list-row-sub">
                    {m.project.customer} · {m.gate ?? "Milestone"} · due {date(m.due, true)} ({relativeDay(m.due).toLowerCase()})
                  </div>
                </div>
                <Status>{m.status}</Status>
                <span className="cell-num sal-upcoming-v">{inr(m.billable ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ApprovalDialog approval={openApproval} open={!!openApproval} onOpenChange={(o) => !o && setOpenApproval(null)} />
    </div>
  );
}
