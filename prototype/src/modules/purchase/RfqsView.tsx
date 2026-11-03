import { ArrowRight, FileSearch } from "lucide-react";
import { date, daysFrom, inr, relativeDay } from "../../api/format";
import type { PurchaseRequest, Rfq } from "../../api/types";
import { href } from "../../app/router";
import { ButtonLink, Callout, Card, DataTable, EmptyState, RecordLink, Status, type Column } from "../../ds/components";
import { openRecord } from "./util";

export function RfqsView({ rfqs, prs, loading }: { rfqs: Rfq[]; prs: PurchaseRequest[]; loading: boolean }) {
  const live = rfqs.filter((r) => r.status === "Open" || r.status === "Evaluating");
  const rows = [...rfqs].sort((a, b) => Number(b.status === "Evaluating" || b.status === "Open") - Number(a.status === "Evaluating" || a.status === "Open") || a.closes.localeCompare(b.closes));

  const columns: Column<Rfq>[] = [
    {
      key: "title",
      header: "Enquiry",
      sort: (r) => r.title,
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-title">{r.title}</span>
          <span className="cell-sub mono">{r.id}</span>
        </div>
      ),
    },
    { key: "pr", header: "Requisition", cell: (r) => <RecordLink id={r.prId} /> },
    { key: "project", header: "Project", priority: 2, cell: (r) => (r.projectId ? <RecordLink id={r.projectId} /> : <span className="t-muted">General</span>) },
    { key: "quotes", header: "Quotes", align: "right", sort: (r) => r.quotes.length, cell: (r) => <span className="cell-num">{r.quotes.length}</span> },
    {
      key: "range",
      header: "Price range",
      align: "right",
      priority: 3,
      cell: (r) => {
        const ps = r.quotes.map((q) => q.price);
        return <span className="cell-num">{ps.length > 1 ? `${inr(Math.min(...ps))} – ${inr(Math.max(...ps))}` : ps.length ? inr(ps[0]) : "—"}</span>;
      },
    },
    {
      key: "closes",
      header: "Closes",
      sort: (r) => r.closes,
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-num">{date(r.closes, true)}</span>
          <span className="cell-sub">{r.status === "Awarded" ? `to ${r.awardedTo}` : relativeDay(r.closes)}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", sort: (r) => r.status, cell: (r) => <Status>{r.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {live.map((r) => {
        const pr = prs.find((p) => p.id === r.prId);
        const d = daysFrom(r.closes);
        return (
          <Callout
            key={r.id}
            tone={d <= 1 ? "warn" : "info"}
            title={`${r.id} closes ${relativeDay(r.closes).toLowerCase()} — ${r.quotes.length} quotes in, not yet awarded`}
            action={
              <ButtonLink to={href.record(r.id)} size="sm" variant="primary" iconRight={ArrowRight}>
                Compare quotes
              </ButtonLink>
            }
          >
            {r.title}
            {pr ? ` for ${pr.id}, needed by ${date(pr.needBy, true)}` : ""}. Quotes run from {inr(Math.min(...r.quotes.map((q) => q.price)))} to {inr(Math.max(...r.quotes.map((q) => q.price)))} with lead times of {Math.min(...r.quotes.map((q) => q.leadDays))}–{Math.max(...r.quotes.map((q) => q.leadDays))} days.
          </Callout>
        );
      })}
      <Card padded={false}>
        <div className="pur-flush pur-flush-top">
          <DataTable
            caption="Requests for quotation"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(r) => openRecord(r.id, "rfqs")}
            empty={
              <EmptyState icon={FileSearch} title="No RFQs yet">
                An RFQ is raised from an approved or in-approval requisition and invites at least two suppliers to quote against the same lines.
              </EmptyState>
            }
          />
        </div>
      </Card>
    </div>
  );
}
