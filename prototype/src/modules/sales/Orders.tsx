import { useMemo, useState } from "react";
import { date, inr } from "../../api/format";
import type { SalesOrder } from "../../api/types";
import { DataTable, FilterChips, Progress, RecordLink, SearchField, Status, Toolbar, type Column } from "../../ds/components";
import { billedPct, unbilled } from "./shared";

type Filter = "open" | "all" | SalesOrder["status"];

export function OrdersView({ rows, loading, onOpen, activeId }: { rows: SalesOrder[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((o) => (filter === "all" ? true : filter === "open" ? o.status !== "Closed" : o.status === filter) && (!t || `${o.id} ${o.title} ${o.customer} ${o.projectId ?? ""}`.toLowerCase().includes(t)));
  }, [rows, q, filter]);

  const columns: Column<SalesOrder>[] = [
    {
      key: "title",
      header: "Order",
      sort: (o) => o.title,
      cell: (o) => (
        <div className="cell-primary">
          <span className="cell-title">{o.title}</span>
          <span className="cell-sub">
            <span className="mono">{o.id}</span> · {o.customer}
          </span>
        </div>
      ),
    },
    { key: "value", header: "Order value", align: "right", sort: (o) => o.value, cell: (o) => <span className="cell-num sal-nowrap">{inr(o.value)}</span> },
    {
      key: "billed",
      header: "Billed",
      width: 200,
      sort: (o) => billedPct(o),
      cell: (o) => (
        <div className="sal-billed">
          <Progress value={billedPct(o)} tone={billedPct(o) >= 100 ? "ok" : "accent"} size="sm" label={`${billedPct(o)}% billed`} />
          <span className="cell-num sal-nowrap">
            {inr(o.billed)} <span className="t-muted">· {billedPct(o)}%</span>
          </span>
        </div>
      ),
    },
    { key: "unbilled", header: "Unbilled", align: "right", sort: (o) => unbilled(o), cell: (o) => <span className="cell-num sal-nowrap">{unbilled(o) ? inr(unbilled(o)) : "—"}</span>, priority: 2 },
    { key: "project", header: "Delivered through", cell: (o) => (o.projectId ? <RecordLink id={o.projectId} /> : <span className="t-muted sal-small">{o.title.startsWith("AMC") ? "Service contract" : "Direct supply"}</span>), priority: 2 },
    { key: "booked", header: "Booked", sort: (o) => o.booked, cell: (o) => <span className="cell-num sal-nowrap">{date(o.booked, true)}</span>, priority: 3 },
    { key: "status", header: "Status", sort: (o) => o.status, cell: (o) => <Status>{o.status}</Status> },
  ];

  const count = (f: Filter) => rows.filter((o) => (f === "all" ? true : f === "open" ? o.status !== "Closed" : o.status === f)).length;
  return (
    <div className="stack">
      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search order, customer, project" width={280} />}>
        <FilterChips
          label="Order status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open", count: count("open") },
            { value: "In fulfilment", label: "In fulfilment", count: count("In fulfilment") },
            { value: "Closed", label: "Closed", count: count("Closed") },
            { value: "all", label: "All", count: rows.length },
          ]}
        />
      </Toolbar>
      <DataTable rows={visible} columns={columns} loading={loading} onRowClick={(o) => onOpen(o.id)} activeId={activeId} caption="Sales orders" />
    </div>
  );
}
