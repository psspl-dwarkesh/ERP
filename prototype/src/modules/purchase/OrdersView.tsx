import { ArrowRight, Truck } from "lucide-react";
import { useState } from "react";
import { date, inr, relativeDay } from "../../api/format";
import type { PurchaseOrder } from "../../api/types";
import { Button, Callout, Card, DataTable, EmptyState, FilterChips, Meter, RecordLink, SearchField, Status, Toolbar, type Column } from "../../ds/components";
import { openRecord, poOverdue, poTotals } from "./util";

type Filter = "all" | "open" | "received" | "closed";
const isOpen = (p: PurchaseOrder) => p.status === "Issued" || p.status === "Part received";

export function OrdersView({ pos, loading }: { pos: PurchaseOrder[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const match = (p: PurchaseOrder) => (filter === "all" ? true : filter === "open" ? isOpen(p) : filter === "received" ? p.status === "Received" : p.status === "Closed" || p.status === "Cancelled");
  const rows = pos
    .filter(match)
    .filter((p) => !q.trim() || `${p.id} ${p.title} ${p.vendor} ${p.projectId ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => poOverdue(b) - poOverdue(a) || a.expected.localeCompare(b.expected));
  const late = pos.filter((p) => poOverdue(p) > 0);
  const openValue = pos.filter(isOpen).reduce((s, p) => s + p.value, 0);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "title",
      header: "Order",
      sort: (p) => p.title,
      cell: (p) => (
        <div className="cell-primary">
          <span className="cell-title">{p.title}</span>
          <span className="cell-sub">
            <span className="mono">{p.id}</span> · {p.vendor}
          </span>
        </div>
      ),
    },
    { key: "project", header: "Project", priority: 2, cell: (p) => (p.projectId ? <RecordLink id={p.projectId} /> : <span className="t-muted">Stock / general</span>) },
    { key: "value", header: "Value", align: "right", sort: (p) => p.value, cell: (p) => <span className="cell-num">{inr(p.value)}</span> },
    {
      key: "expected",
      header: "Expected",
      sort: (p) => p.expected,
      cell: (p) => {
        const od = poOverdue(p);
        return (
          <div className="cell-primary">
            <span className="cell-num">{date(p.expected, true)}</span>
            <span className={`cell-sub ${od ? "pur-t-risk" : ""}`}>{od ? `${od} day${od === 1 ? "" : "s"} overdue` : p.status === "Received" ? "Delivered" : relativeDay(p.expected)}</span>
          </div>
        );
      },
    },
    {
      key: "receipt",
      header: "Received",
      width: 200,
      priority: 2,
      cell: (p) => {
        const t = poTotals(p);
        return (
          <div className="pur-receipt-cell">
            <Meter
              total={t.ordered}
              segments={[
                { value: t.accepted, tone: "ok", label: "Accepted" },
                { value: t.rejected, tone: "risk", label: "Rejected" },
              ]}
            />
            <span className="cell-sub">
              {t.received} of {t.ordered} · {t.rejected ? `${t.rejected} rejected` : `${t.outstanding} open`}
            </span>
          </div>
        );
      },
    },
    { key: "status", header: "Status", sort: (p) => p.status, cell: (p) => <Status>{p.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {late.map((p) => {
        const t = poTotals(p);
        return (
          <Callout
            key={p.id}
            tone="risk"
            title={`${p.id} from ${p.vendor} is ${poOverdue(p)} day${poOverdue(p) === 1 ? "" : "s"} overdue`}
            action={
              <Button size="sm" iconRight={ArrowRight} onClick={() => openRecord(p.id, "orders")}>
                Open order
              </Button>
            }
          >
            {p.title}: {t.outstanding} of {t.ordered} units still outstanding against an expected date of {date(p.expected, true)}.
          </Callout>
        );
      })}
      <Card padded={false}>
        <div className="pur-table-head">
          <Toolbar end={<span className="pur-cell-sub">{inr(openValue)} open across {pos.filter(isOpen).length} orders</span>}>
            <SearchField value={q} onChange={setQ} placeholder="Search order, vendor or project" label="Search purchase orders" width={300} />
            <FilterChips
              label="Receipt status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "open", label: "Open", count: pos.filter(isOpen).length },
                { value: "received", label: "Received", count: pos.filter((p) => p.status === "Received").length },
                { value: "closed", label: "Closed", count: pos.filter((p) => p.status === "Closed" || p.status === "Cancelled").length },
                { value: "all", label: "All", count: pos.length },
              ]}
            />
          </Toolbar>
        </div>
        <div className="pur-flush">
          <DataTable
            caption="Purchase orders"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(p) => openRecord(p.id, "orders")}
            empty={
              <EmptyState icon={Truck} title={q ? "No order matches" : filter === "closed" ? "No closed orders yet" : "No orders in this view"}>
                {q ? "Try another order number, vendor or project." : "Orders are raised from an awarded RFQ once its requisition is approved."}
              </EmptyState>
            }
          />
        </div>
      </Card>
    </div>
  );
}
