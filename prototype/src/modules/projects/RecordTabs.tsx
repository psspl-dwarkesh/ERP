import { Activity, FileCheck2, FileText, History, ReceiptIndianRupee } from "lucide-react";
import { api } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { ago, date, inr, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { BillingAdvice, Milestone, Project, ProjectDocument, Tone } from "../../api/types";
import { href } from "../../app/router";
import { ButtonLink, Callout, Card, CardHeader, DataTable, EmptyState, LoadingRows, Meter, RecordLink, Status, Tag, Timeline, cx, type Column } from "../../ds/components";
import { daysBetween } from "./util";

/* ================================================================== Documents */
const EXPECTED_DOCS: Record<string, string> = {
  "Turnkey automation": "P&IDs, the control philosophy, FAT and SAT protocols, and the handover dossier",
  "Panel assembly": "the GA drawing, wiring schedule, FAT report and test certificates",
  Instrumentation: "loop drawings, instrument datasheets, calibration certificates and the commissioning certificate",
  Calibration: "calibration procedures and traceable certificates",
  AMC: "the service schedule and visit reports",
  "O&M": "work permits, method statements and shift handover logs",
  "CSV / Manufacturing IT": "the validation master plan, IQ/OQ/PQ protocols with executed results, and the final report",
};

const KIND_TONE: Record<ProjectDocument["kind"], Tone> = { Drawing: "info", Specification: "violet", Protocol: "accent", Certificate: "ok", Transmittal: "neutral" };

export function DocumentsTab({ p }: { p: Project }) {
  const docs = [...p.documents].sort((a, b) => b.updated.localeCompare(a.updated));
  const pending = docs.filter((d) => d.status === "In review" || d.status === "Draft");
  const gates = p.milestones.filter((m) => m.gate && m.status !== "Done");
  const gateDocs = gates.map((m) => ({ m, doc: docs.find((d) => d.name.toLowerCase().includes(m.gate!.toLowerCase())) }));

  const columns: Column<ProjectDocument>[] = [
    {
      key: "name",
      header: "Document",
      sort: (d) => d.name,
      cell: (d) => (
        <div className="cell-primary">
          <span className="cell-title">{d.name}</span>
          <span className="cell-sub mono">{d.id}</span>
        </div>
      ),
    },
    { key: "kind", header: "Kind", sort: (d) => d.kind, cell: (d) => <Tag tone={KIND_TONE[d.kind]}>{d.kind}</Tag> },
    { key: "rev", header: "Revision", sort: (d) => d.revision, cell: (d) => <span className="mono">Rev {d.revision}</span> },
    { key: "status", header: "Status", sort: (d) => d.status, cell: (d) => <Status>{d.status}</Status> },
    {
      key: "updated",
      header: "Updated",
      sort: (d) => d.updated,
      align: "right",
      cell: (d) => (
        <div className="cell-primary prj-right">
          <span className="cell-num">{date(d.updated, true)}</span>
          <span className="cell-sub">{ago(`${d.updated}T09:00:00+05:30`)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-main-aside">
      <div className="stack" style={{ gap: "var(--space-5)" }}>
        {pending.length > 0 && (
          <Callout tone="warn" title={`${pending.length} document${pending.length === 1 ? "" : "s"} not yet approved`}>
            {pending.map((d) => `${d.name} rev ${d.revision} (${d.status.toLowerCase()})`).join(", ")}. Only approved revisions can be issued to site or attached to a gate.
          </Callout>
        )}
        <Card padded={false}>
          <div className="card-padded" style={{ paddingBottom: 0 }}>
            <CardHeader icon={FileText} title="Controlled document register" description="Drawings, specifications, protocols and transmittals. Superseded revisions stay on file for audit." />
          </div>
          <div className="prj-flush">
            <DataTable
              caption="Project documents"
              rows={docs}
              columns={columns}
              empty={
                <EmptyState icon={FileText} title="No controlled documents yet">
                  For {p.vertical} work, expect {EXPECTED_DOCS[p.vertical] ?? "drawings, specifications and protocols"}. They appear here as each revision is issued.
                </EmptyState>
              }
            />
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader icon={FileCheck2} title="Evidence for open gates" description="Each hold point needs its protocol or certificate approved before it can close." />
        {gateDocs.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No open gates">All technical hold points on this project have closed.</EmptyState>
        ) : (
          <ul className="divider-list">
            {gateDocs.map(({ m, doc }) => (
              <li key={m.id} className="list-row">
                <div className="list-row-main">
                  <div className="list-row-title">
                    {m.gate} <span className="t-muted">· {date(m.due, true)}</span>
                  </div>
                  <div className="list-row-sub">{doc ? `${doc.name} · rev ${doc.revision}` : "No protocol on file yet"}</div>
                </div>
                {doc ? <Status size="sm">{doc.status}</Status> : <Status size="sm" tone="warn">Missing</Status>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ================================================================== Billing */
type BillingRow = { id: string; m: Milestone; ba?: BillingAdvice; state: string; tone: Tone; note: string };

export function BillingTab({ p }: { p: Project }) {
  const bas = useQuery(api.billingAdvices);
  if (bas.loading) return <LoadingRows rows={4} columns={5} />;

  const advices = (bas.data ?? []).filter((b) => p.salesOrder && b.salesOrderId === p.salesOrder);
  const billedStates = ["Posted", "Sent to accounting", "Mismatch"];
  let legacy = p.billed - advices.filter((b) => billedStates.includes(b.status)).reduce((s, b) => s + b.value, 0);

  const rows: BillingRow[] = p.milestones
    .filter((m) => m.billable)
    .map((m) => {
      const ba = advices.find((b) => b.trigger.startsWith(`${m.id} `));
      if (ba) return { id: m.id, m, ba, state: ba.status, tone: ba.status === "Posted" ? "ok" : ba.status === "Mismatch" ? "risk" : ba.status === "Ready for review" ? "warn" : "info", note: `Advice raised ${date(ba.raised, true)}` } as BillingRow;
      if (m.status === "Done") {
        if (legacy >= (m.billable ?? 0)) {
          legacy -= m.billable ?? 0;
          return { id: m.id, m, state: "Billed", tone: "ok", note: "Invoiced before Threadline — no advice on record" } as BillingRow;
        }
        return { id: m.id, m, state: "Ready to raise", tone: "warn", note: `Accepted ${date(m.done!, true)} · ${daysBetween(m.done!, TODAY)} days unbilled` } as BillingRow;
      }
      return { id: m.id, m, state: "Not yet earned", tone: "neutral", note: m.status === "Blocked" || m.status === "Late" ? `Milestone ${m.status.toLowerCase()}` : `Due ${date(m.due, true)}` } as BillingRow;
    });

  const billable = rows.reduce((s, r) => s + (r.m.billable ?? 0), 0);
  const sum = (pred: (r: BillingRow) => boolean) => rows.filter(pred).reduce((s, r) => s + (r.m.billable ?? 0), 0);
  const billed = sum((r) => r.state === "Billed" || (!!r.ba && billedStates.includes(r.ba.status)));
  const inReview = sum((r) => r.state === "Ready for review");
  const unraised = sum((r) => r.state === "Ready to raise");
  const future = billable - billed - inReview - unraised;
  const mismatch = rows.find((r) => r.ba?.status === "Mismatch");
  const ready = rows.filter((r) => r.state === "Ready to raise");

  const columns: Column<BillingRow>[] = [
    {
      key: "m",
      header: "Milestone",
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-title">
            {r.m.name} {r.m.gate && <Tag tone="info">{r.m.gate}</Tag>}
          </span>
          <span className="cell-sub">
            <span className="mono">{r.m.id}</span> · {r.m.done ? `done ${date(r.m.done, true)}` : `due ${date(r.m.due, true)}`}
          </span>
        </div>
      ),
    },
    { key: "value", header: "Billable value", align: "right", sort: (r) => r.m.billable ?? 0, cell: (r) => <span className="cell-num">{inr(r.m.billable ?? 0)}</span> },
    { key: "share", header: "Share", align: "right", priority: 3, cell: (r) => <span className="cell-num t-muted">{Math.round(((r.m.billable ?? 0) / p.contractValue) * 100)}%</span> },
    { key: "advice", header: "Billing advice", cell: (r) => (r.ba ? <RecordLink id={r.ba.id} /> : <span className="t-muted">—</span>) },
    {
      key: "state",
      header: "State",
      cell: (r) => (
        <div className="cell-primary prj-state-cell">
          <Status tone={r.tone}>{r.state}</Status>
          <span className="cell-sub">{r.note}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {mismatch && (
        <Callout tone="risk" title={`${mismatch.ba!.id} doesn't match the accounting record`} action={<ButtonLink size="sm" to={href.record(mismatch.ba!.id)}>Open in Sales</ButtonLink>}>
          {mismatch.m.name} was advised at {inr(mismatch.ba!.value)}. Sales resolves the difference; nothing is re-sent automatically.
        </Callout>
      )}
      {ready.length > 0 && (
        <Callout tone="warn" title={`${inr(unraised)} earned but not yet advised`} action={<ButtonLink size="sm" to={href.module("sales", "billing")}>Go to billing advice</ButtonLink>}>
          {ready.map((r) => r.m.name).join(", ")} {ready.length === 1 ? "is" : "are"} accepted. Billing advice is raised in Sales from the milestone evidence.
        </Callout>
      )}
      <Card>
        <CardHeader icon={ReceiptIndianRupee} title="Billing schedule" description={`${inr(billable)} billable across ${rows.length} milestones${p.salesOrder ? ` on ${p.salesOrder}` : ""}`} />
        {rows.length === 0 ? (
          <EmptyState icon={ReceiptIndianRupee} title="No billable milestones">
            This project bills on a schedule outside its milestones. Add billable values to milestones through a change request.
          </EmptyState>
        ) : (
          <>
            <div className="prj-billbar">
              <Meter
                total={billable}
                segments={[
                  { value: billed, tone: "ok", label: "Billed" },
                  { value: inReview, tone: "info", label: "Advice in review" },
                  { value: unraised, tone: "warn", label: "Earned, not advised" },
                  { value: future, tone: "neutral", label: "Not yet earned" },
                ]}
              />
              <div className="prj-billbar-legend">
                <span><i className="prj-sw tone-ok" /> Billed <b className="t-num">{inr(billed)}</b></span>
                {inReview > 0 && <span><i className="prj-sw tone-info" /> Advice in review <b className="t-num">{inr(inReview)}</b></span>}
                {unraised > 0 && <span><i className="prj-sw tone-warn" /> Earned, not advised <b className="t-num">{inr(unraised)}</b></span>}
                <span><i className="prj-sw tone-neutral" /> Not yet earned <b className="t-num">{inr(future)}</b></span>
              </div>
            </div>
            <div className="prj-flush prj-flush-inset">
              <DataTable caption="Billing schedule" rows={rows} columns={columns} />
            </div>
          </>
        )}
        <p className="prj-card-note">Invoices are raised in the external accounting system. How advice reaches it, and who owns retention and tax, are open decisions — this view does not post anything.</p>
      </Card>
    </div>
  );
}

/* ================================================================== Activity */
const KIND_BY_PREFIX: Record<string, string> = { PRJ: "Project", SO: "Sales order", BOM: "BOM", WO: "Work order", AST: "Asset", PR: "Requisition", RFQ: "RFQ", PO: "Purchase order", GRN: "Goods receipt", BA: "Billing advice", SR: "Service ticket", CUS: "Customer" };

export function ActivityTab({ p }: { p: Project }) {
  const activity = useQuery(api.activity);
  const prs = useQuery(api.purchaseRequests);
  const rfqs = useQuery(api.rfqs);
  const pos = useQuery(api.purchaseOrders);
  const bas = useQuery(api.billingAdvices);
  const tickets = useQuery(api.tickets);
  const movements = useQuery(api.movements);

  if (activity.loading) return <LoadingRows rows={6} columns={3} />;

  const poIds = (pos.data ?? []).filter((o) => o.projectId === p.id).map((o) => o.id);
  const refs = new Set<string>(
    [
      p.id,
      p.customerId,
      p.salesOrder,
      p.bom,
      p.workOrder,
      p.installedAsset,
      ...(prs.data ?? []).filter((r) => r.projectId === p.id).map((r) => r.id),
      ...(rfqs.data ?? []).filter((r) => r.projectId === p.id).map((r) => r.id),
      ...poIds,
      ...(bas.data ?? []).filter((b) => p.salesOrder && b.salesOrderId === p.salesOrder).map((b) => b.id),
      ...(tickets.data ?? []).filter((t) => p.installedAsset && t.assetId === p.installedAsset).map((t) => t.id),
      ...(movements.data ?? []).filter((mv) => poIds.some((id) => mv.reference.includes(id)) || mv.to.includes(p.id)).flatMap((mv) => mv.reference.match(/[A-Z]{2,4}-\d{3,4}/g) ?? []),
    ].filter(Boolean) as string[],
  );
  const events = (activity.data ?? []).filter((e) => refs.has(e.reference)).sort((a, b) => b.at.localeCompare(a.at));

  const groups: { day: string; items: typeof events }[] = [];
  events.forEach((e) => {
    const day = e.at.slice(0, 10);
    const label = day === TODAY ? "Today" : daysBetween(day, TODAY) === 1 ? "Yesterday" : date(day);
    const g = groups.find((x) => x.day === label);
    if (g) g.items.push(e);
    else groups.push({ day: label, items: [e] });
  });

  return (
    <Card>
      <CardHeader icon={History} title="Activity" description={`Everything recorded on ${p.id} and its ${refs.size - 1} linked records, newest first.`} />
      {events.length === 0 ? (
        <EmptyState icon={Activity} title="No activity recorded yet">
          Approvals, receipts, stage completions and billing on this project or its linked records will be logged here with who did it and when.
        </EmptyState>
      ) : (
        <div className="prj-activity">
          {groups.map((g) => (
            <section key={g.day} className="prj-activity-day">
              <h4 className="prj-activity-head">{g.day}</h4>
              <Timeline
                items={g.items.map((e) => ({
                  id: e.id,
                  tone: e.action.includes("approved") ? "ok" : e.action.includes("reject") || e.action.includes("QC") ? "warn" : e.action.includes("change request") ? "violet" : "accent",
                  title: (
                    <span>
                      <strong>{e.actor}</strong> {e.action} <RecordLink id={e.reference} />
                    </span>
                  ),
                  meta: (
                    <span className={cx("prj-activity-meta")}>
                      {time(e.at)} · {KIND_BY_PREFIX[e.reference.split("-")[0]] ?? "Record"}
                      {e.reference !== p.id && " linked to this project"}
                    </span>
                  ),
                }))}
              />
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
