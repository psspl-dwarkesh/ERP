import { ClipboardList, Plus, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ago, date, daysFrom, inr, relativeDay } from "../../api/format";
import type { Approval, PurchaseRequest } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Callout, Card, DataTable, EmptyState, FilterChips, Person, RecordLink, SearchField, Status, Toolbar, type Column } from "../../ds/components";
import { openRecord, prStatus, splitRefs } from "./util";

type Filter = "all" | PurchaseRequest["status"];
const ORDER: PurchaseRequest["status"][] = ["Awaiting approval", "Draft", "Approved", "Converted", "Rejected"];

export function SourceText({ text }: { text: string }) {
  return (
    <span className="pur-source">
      {splitRefs(text).map((t, i) => (t.isId ? <RecordLink key={i} id={t.text} /> : <span key={i}>{t.text}</span>))}
    </span>
  );
}

export function RequisitionsView({ prs, approvals, loading, onNew }: { prs: PurchaseRequest[]; approvals: Approval[]; loading: boolean; onNew: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [review, setReview] = useState<Approval | null>(null);

  const withStatus = useMemo(() => prs.map((p) => ({ ...p, status: prStatus(p, approvals) })), [prs, approvals]);
  const rows = withStatus
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => !q.trim() || `${p.id} ${p.title} ${p.source} ${p.requester} ${p.projectId ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.needBy.localeCompare(b.needBy));
  const pending = approvals.filter((a) => a.status === "Pending" && prs.some((p) => p.id === a.reference));
  const count = (s: PurchaseRequest["status"]) => withStatus.filter((p) => p.status === s).length;

  const columns: Column<PurchaseRequest>[] = [
    {
      key: "title",
      header: "Requisition",
      sort: (p) => p.title,
      cell: (p) => (
        <div className="cell-primary">
          <span className="cell-title">{p.title}</span>
          <span className="cell-sub">
            <span className="mono">{p.id}</span> · {p.lines.length} line{p.lines.length === 1 ? "" : "s"}
          </span>
        </div>
      ),
    },
    { key: "source", header: "Raised from", priority: 2, cell: (p) => <SourceText text={p.source} /> },
    { key: "project", header: "Project", sort: (p) => p.projectId ?? "", cell: (p) => (p.projectId ? <RecordLink id={p.projectId} /> : <span className="t-muted">General</span>) },
    { key: "requester", header: "Requester", sort: (p) => p.requester, priority: 3, cell: (p) => <Person name={p.requester} size="xs" /> },
    {
      key: "needBy",
      header: "Need by",
      sort: (p) => p.needBy,
      cell: (p) => {
        const d = daysFrom(p.needBy);
        const open = p.status === "Draft" || p.status === "Awaiting approval";
        return (
          <div className="cell-primary">
            <span className="cell-num">{date(p.needBy, true)}</span>
            <span className={`cell-sub ${open && d <= 3 ? (d < 0 ? "pur-t-risk" : "pur-t-warn") : ""}`}>{relativeDay(p.needBy)}</span>
          </div>
        );
      },
    },
    { key: "value", header: "Value", align: "right", sort: (p) => p.value, cell: (p) => <span className="cell-num">{inr(p.value)}</span> },
    { key: "status", header: "Status", sort: (p) => ORDER.indexOf(p.status), cell: (p) => <Status>{p.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {pending.map((a) => {
        const pr = prs.find((p) => p.id === a.reference)!;
        return (
          <Callout
            key={a.id}
            tone="accent"
            icon={ShieldCheck}
            title={`${a.reference} is waiting on you · ${a.level.split("·")[1]?.trim() ?? a.level}`}
            action={
              <Button size="sm" variant="primary" onClick={() => setReview(a)}>
                Review approval
              </Button>
            }
          >
            {pr.title} · {inr(pr.value)} · raised by {a.maker} {ago(a.submitted)}. Need by {date(pr.needBy, true)} ({relativeDay(pr.needBy).toLowerCase()}).
          </Callout>
        );
      })}
      <Card padded={false}>
        <div className="pur-table-head">
          <Toolbar
            end={
              <Button size="sm" icon={Plus} onClick={onNew}>
                New requisition
              </Button>
            }
          >
            <SearchField value={q} onChange={setQ} placeholder="Search title, source, project or requester" label="Search requisitions" width={320} />
            <FilterChips
              label="Status"
              value={filter}
              onChange={setFilter}
              options={[{ value: "all" as Filter, label: "All", count: prs.length }, ...ORDER.filter((s) => count(s)).map((s) => ({ value: s as Filter, label: s, count: count(s) }))]}
            />
          </Toolbar>
        </div>
        <div className="pur-flush">
          <DataTable
            caption="Purchase requisitions"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(p) => openRecord(p.id, "requisitions")}
            empty={
              <EmptyState
                icon={ClipboardList}
                title={q || filter !== "all" ? "No requisition matches" : "No requisitions yet"}
                action={
                  q || filter !== "all" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setQ("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" icon={Plus} onClick={onNew}>
                      New requisition
                    </Button>
                  )
                }
              >
                {q || filter !== "all" ? "Try another search or status." : "Requisitions come from BOM shortages, project site needs, reorder levels and maintenance demand."}
              </EmptyState>
            }
          />
        </div>
        {!loading && (
          <div className="pur-table-foot">
            <span>
              {rows.length} shown · {inr(rows.reduce((s, p) => s + p.value, 0))}
            </span>
            <span className="pur-foot-note">Above ₹2 L the operations head approves; below, the purchase head. A budget check against the project runs first.</span>
          </div>
        )}
      </Card>
      <ApprovalDialog approval={review} open={!!review} onOpenChange={(o) => !o && setReview(null)} />
    </div>
  );
}
