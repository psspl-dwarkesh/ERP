/**
 * E2E-04 · Subcontract material accountability.
 * Material at a partner's shop is still company stock. Every unit issued must end
 * as consumed, returned, damaged or visibly outstanding — never silently zeroed.
 */
import { ClipboardCheck, Factory, PackageCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { date, daysFrom, inr, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { SubcontractIssue, SubcontractLine } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import {
  Button,
  Callout,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  KeyValues,
  LoadingRows,
  RecordLink,
  Status,
  Textarea,
  Tooltip,
  useToast,
} from "../../ds/components";
import { closeSubcontractIssue, outstandingOf, reconcileSubcontractLine } from "./commands";

export function SubcontractView({ highlight }: { highlight?: string }) {
  const issues = useQuery(api.subcontractIssues);
  const approvals = useQuery(api.approvals);
  const [editing, setEditing] = useState<{ si: SubcontractIssue; index: number } | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const list = issues.data ?? [];
  const totals = useMemo(() => {
    return {
      overdue: list.filter((si) => si.status === "Open" && daysFrom(si.reconcileBy) < 0).length,
      noCustodian: list.filter((si) => /no named custodian/i.test(si.custodian)).length,
    };
  }, [list]);
  const review = approvals.data?.find((a) => a.id === reviewId) ?? null;

  if (issues.loading) return <LoadingRows rows={6} columns={6} />;
  if (!list.length) return <EmptyState icon={Factory} title="No material at partner shops">Issues to subcontractors appear here with what was issued, used, returned and still outstanding.</EmptyState>;

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {(totals.overdue > 0 || totals.noCustodian > 0) && (
        <Callout tone="warn" title={`${totals.overdue} reconciliation${totals.overdue === 1 ? "" : "s"} overdue · ${totals.noCustodian} issue without a named custodian`}>
          Material at a partner's shop is still company stock until it is reconciled.
        </Callout>
      )}


      {list.map((si) => (
        <IssueCard
          key={si.id}
          si={si}
          highlighted={highlight === si.id}
          pendingApproval={approvals.data?.find((a) => a.reference === si.id && a.status === "Pending")?.id}
          onEdit={(index) => setEditing({ si, index })}
          onReview={setReviewId}
        />
      ))}

      {editing && <ReconcileDialog si={editing.si} index={editing.index} onClose={() => setEditing(null)} />}
      <ApprovalDialog approval={review} open={!!review} onOpenChange={(o) => !o && setReviewId(null)} />
    </div>
  );
}

function IssueCard({ si, highlighted, pendingApproval, onEdit, onReview }: { si: SubcontractIssue; highlighted: boolean; pendingApproval?: string; onEdit: (index: number) => void; onReview: (approvalId: string) => void }) {
  const toast = useToast();
  const close = useMutation(closeSubcontractIssue);
  const overdue = si.status === "Open" && daysFrom(si.reconcileBy) < 0;
  const outstanding = si.lines.reduce((a, l) => a + outstandingOf(l), 0);

  const submit = async () => {
    const r = await close.run(si.id);
    if (r) {
      toast(
        r.status === "Closed"
          ? { title: `${si.id} reconciled and closed`, body: "Every issued unit is accounted for." }
          : { title: `${si.id} sent for variance approval`, body: "Damaged material needs an approver who didn't record it.", tone: "warn" },
      );
    }
  };
  useEffect(() => {
    if (close.error) toast({ title: "Can't close yet", body: close.error, tone: "risk" });
  }, [close.error, toast]);

  return (
    <Card className={highlighted ? "inv-sc-card is-highlighted" : "inv-sc-card"}>
      <CardHeader
        icon={Factory}
        eyebrow={<span className="mono">{si.id}</span>}
        title={`${si.partner} · ${si.package}`}
        description={
          <span>
            Custodian: <b className={/no named custodian/i.test(si.custodian) ? "t-risk" : undefined}>{si.custodian}</b>
          </span>
        }
        actions={
          <div className="row" style={{ gap: 8 }}>
            {overdue ? <Status tone="risk">{`Overdue · ${relativeDay(si.reconcileBy)}`}</Status> : <Status>{si.status}</Status>}
          </div>
        }
      />
      <KeyValues
        columns={3}
        items={[
          { label: "Purchase order", value: si.poId ? <RecordLink id={si.poId} /> : "—" },
          { label: "Project", value: si.projectId ? <RecordLink id={si.projectId} /> : "—" },
          { label: "Issued", value: `${date(si.issuedOn)} by ${si.issuedBy}` },
          { label: "Reconcile by", value: date(si.reconcileBy) },
          { label: "Partner report", value: si.partnerReport ?? <span className="t-muted">Not recorded</span> },
          { label: "Still outstanding", value: <b className="t-num">{outstanding} units</b> },
        ]}
      />

      <div className="table-wrap inv-sc-table">
        <table className="table">
          <thead>
            <tr>
              <th>Material</th>
              <th style={{ textAlign: "right" }}>Issued</th>
              <th style={{ textAlign: "right" }}>Consumed</th>
              <th style={{ textAlign: "right" }}>Returned</th>
              <th style={{ textAlign: "right" }}>Damaged</th>
              <th style={{ textAlign: "right" }}>Outstanding</th>
              <th style={{ textAlign: "right" }}>Value out</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {si.lines.map((l, i) => (
              <tr key={l.itemId + i}>
                <td>
                  <div className="cell-primary">
                    <span className="cell-title">{l.item}</span>
                    <span className="cell-sub">
                      <span className="mono">{l.itemId}</span> · {l.note}
                    </span>
                  </div>
                </td>
                <td className="cell-num" style={{ textAlign: "right" }}>{l.issued}</td>
                <td className="cell-num" style={{ textAlign: "right" }}>{l.consumed}</td>
                <td className="cell-num" style={{ textAlign: "right" }}>{l.returned}</td>
                <td className="cell-num" style={{ textAlign: "right" }}>{l.damaged ? <span className="t-risk">{l.damaged}</span> : 0}</td>
                <td className="cell-num" style={{ textAlign: "right" }}>
                  <b className={outstandingOf(l) ? "inv-sc-out" : undefined}>{outstandingOf(l)}</b>
                </td>
                <td className="cell-num" style={{ textAlign: "right" }}>{inr(outstandingOf(l) * l.unitValue)}</td>
                <td style={{ textAlign: "right" }}>
                  {si.status === "Open" && (
                    <Button size="sm" variant="ghost" onClick={() => onEdit(i)}>
                      Record
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="inv-sc-foot">
        <span />
        {si.status === "Open" && (
          <Tooltip content={outstanding ? "Everything issued must be accounted for first" : "Close, or send damage for variance approval"}>
            <span>
              <Button variant="primary" icon={PackageCheck} loading={close.pending} disabled={outstanding > 0} onClick={submit}>
                Submit reconciliation
              </Button>
            </span>
          </Tooltip>
        )}
        {si.status === "Variance in approval" && pendingApproval && (
          <Button icon={ClipboardCheck} onClick={() => onReview(pendingApproval)}>
            Review variance
          </Button>
        )}
        {si.status === "Closed" && <Status>Closed</Status>}
      </div>
    </Card>
  );
}

function ReconcileDialog({ si, index, onClose }: { si: SubcontractIssue; index: number; onClose: () => void }) {
  const toast = useToast();
  const line: SubcontractLine = si.lines[index];
  const [f, setF] = useState({ consumed: line.consumed, returned: line.returned, damaged: line.damaged });
  const [report, setReport] = useState("");
  const m = useMutation(reconcileSubcontractLine);
  const accounted = f.consumed + f.returned + f.damaged;
  const out = line.issued - accounted;
  const needsReport = f.damaged > line.damaged && !si.partnerReport;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    m.reset();
    setF({ ...f, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) });
  };

  const save = async () => {
    const r = await m.run(si.id, index, f, report);
    if (r) {
      toast({ title: `${line.itemId} reconciled on ${si.id}`, body: f.returned > line.returned ? `${f.returned - line.returned} returned to ${"store"} — stock movement posted.` : "Figures recorded on the issue." });
      onClose();
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={Factory}
      title={`Reconcile ${line.item}`}
      description={`${si.id} · ${si.partner} · ${line.issued} issued`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={save} disabled={out < 0}>
            Record figures
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="grid grid-3" style={{ gap: "var(--space-3)" }}>
          <Field label="Consumed" htmlFor="sc-c" hint={`Was ${line.consumed}`}>
            <Input id="sc-c" type="number" min={line.consumed} value={f.consumed} onChange={set("consumed")} />
          </Field>
          <Field label="Returned" htmlFor="sc-r" hint={`Was ${line.returned} · posts a stock return`}>
            <Input id="sc-r" type="number" min={line.returned} value={f.returned} onChange={set("returned")} />
          </Field>
          <Field label="Damaged" htmlFor="sc-d" hint={`Was ${line.damaged}`}>
            <Input id="sc-d" type="number" min={line.damaged} value={f.damaged} onChange={set("damaged")} />
          </Field>
        </div>
        <div className={`inv-sc-balance ${out < 0 ? "is-bad" : ""}`}>
          <span>
            {line.issued} issued − {accounted} accounted = <b>{out} outstanding</b>
          </span>
          <span>{inr(Math.max(0, out) * line.unitValue)} still at the partner</span>
        </div>
        {needsReport && (
          <Field label="Partner's damage report" required htmlFor="sc-rep" error={m.error && /report/.test(m.error) ? m.error : null} hint="Recorded on the issue and attached to the variance approval.">
            <Textarea id="sc-rep" rows={3} value={report} onChange={(e) => setReport(e.target.value)} placeholder="What the partner reports happened to the damaged units" />
          </Field>
        )}
        {m.error && !(needsReport && /report/.test(m.error)) && (
          <Callout tone="risk" title="Not recorded" icon={TriangleAlert}>
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}
