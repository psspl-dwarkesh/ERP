import { useMemo, useState } from "react";
import { date, inr } from "../../api/format";
import type { Opportunity } from "../../api/types";
import { DataTable, FilterChips, Person, SearchField, Status, Toolbar, type Column } from "../../ds/components";
import { ALL_STAGES, NextAction, VERTICAL_SHORT, isOpen, weighted } from "./shared";

type Filter = "open" | "all" | Opportunity["stage"];

export function OpportunityList({ rows, loading, onOpen, activeId }: { rows: Opportunity[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("open");

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (filter === "open" && !isOpen(o)) return false;
      if (filter !== "open" && filter !== "all" && o.stage !== filter) return false;
      return !term || `${o.id} ${o.name} ${o.account} ${o.vertical} ${o.owner}`.toLowerCase().includes(term);
    });
  }, [rows, q, filter]);

  const columns: Column<Opportunity>[] = [
    {
      key: "name",
      header: "Opportunity",
      sort: (o) => o.name,
      cell: (o) => (
        <div className="cell-primary">
          <span className="cell-title">{o.name}</span>
          <span className="cell-sub">
            <span className="mono">{o.id}</span> · {o.account}
          </span>
        </div>
      ),
    },
    { key: "stage", header: "Stage", sort: (o) => ALL_STAGES.indexOf(o.stage), cell: (o) => <Status>{o.stage}</Status> },
    { key: "vertical", header: "Vertical", sort: (o) => o.vertical, cell: (o) => <span className="crm-small crm-nowrap">{VERTICAL_SHORT[o.vertical]}</span>, priority: 3 },
    { key: "value", header: "Value", align: "right", sort: (o) => o.value, cell: (o) => <span className="cell-num crm-nowrap">{inr(o.value)}</span> },
    { key: "weighted", header: "Weighted", align: "right", sort: (o) => weighted(o), cell: (o) => (isOpen(o) ? <div className="cell-primary crm-nowrap" style={{ alignItems: "flex-end" }}><span className="cell-num">{inr(weighted(o))}</span><span className="cell-sub">{o.probability}%</span></div> : <span className="t-muted">—</span>), priority: 2 },
    { key: "close", header: "Close", sort: (o) => o.closeDate, cell: (o) => <span className="cell-num crm-nowrap">{date(o.closeDate, true)}</span>, priority: 2 },
    { key: "owner", header: "Owner", sort: (o) => o.owner, cell: (o) => <Person name={o.owner} size="xs" />, priority: 3 },
    { key: "next", header: "Next action", sort: (o) => o.nextActionDue, width: 280, cell: (o) => <NextAction o={o} compact /> },
  ];

  const count = (f: Filter) => rows.filter((o) => (f === "open" ? isOpen(o) : f === "all" ? true : o.stage === f)).length;

  return (
    <div className="stack">
      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search name, account, owner" width={280} />}>
        <FilterChips
          label="Stage"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open", count: count("open") },
            ...ALL_STAGES.map((s) => ({ value: s as Filter, label: s, count: count(s) })),
            { value: "all", label: "All", count: rows.length },
          ]}
        />
      </Toolbar>
      <DataTable rows={visible} columns={columns} loading={loading} onRowClick={(o) => onOpen(o.id)} activeId={activeId} caption="Opportunities" />
    </div>
  );
}
