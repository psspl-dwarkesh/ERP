import { useMemo, useState } from "react";
import { date, relativeDay } from "../../api/format";
import type { Person as PersonT } from "../../api/types";
import { DataTable, FilterChips, Person, Progress, RecordLink, SearchField, Status, Tag, Toolbar, type Column } from "../../ds/components";
import { utilTone } from "./shared";

type Filter = "all" | PersonT["status"];

export function Directory({ rows, loading, onOpen, activeId }: { rows: PersonT[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((p) => (filter === "all" || p.status === filter) && (!t || `${p.id} ${p.name} ${p.role} ${p.department} ${p.location} ${p.skills.join(" ")}`.toLowerCase().includes(t)));
  }, [rows, q, filter]);

  const columns: Column<PersonT>[] = [
    { key: "name", header: "Person", sort: (p) => p.name, cell: (p) => <Person name={p.name} detail={p.id} /> },
    {
      key: "role",
      header: "Role",
      sort: (p) => p.role,
      cell: (p) => (
        <div className="cell-primary">
          <span className="cell-title">{p.role}</span>
          <span className="cell-sub">{p.department}</span>
        </div>
      ),
    },
    { key: "loc", header: "Location", sort: (p) => p.location, cell: (p) => <span className="hr-small hr-nowrap">{p.location}</span>, priority: 3 },
    { key: "emp", header: "Type", sort: (p) => p.employment, cell: (p) => <Tag tone={p.employment === "Contract" ? "violet" : p.employment === "Probation" ? "warn" : "neutral"}>{p.employment}</Tag>, priority: 2 },
    { key: "status", header: "Status", sort: (p) => p.status, cell: (p) => <Status>{p.status}</Status> },
    {
      key: "util",
      header: "Utilisation",
      sort: (p) => p.utilisation,
      width: 140,
      priority: 2,
      cell: (p) => (
        <span className="hr-util">
          <Progress value={p.utilisation} tone={utilTone(p.utilisation)} size="sm" label={`${p.utilisation}% utilised`} />
          <span className="cell-num">{p.utilisation}%</span>
        </span>
      ),
    },
    {
      key: "assign",
      header: "Assignment",
      sort: (p) => p.assignmentUntil ?? "~",
      cell: (p) =>
        p.assignment ? (
          <div className="cell-primary">
            <RecordLink id={p.assignment} />
            {p.assignmentUntil && <span className="cell-sub">until {date(p.assignmentUntil, true)} · {relativeDay(p.assignmentUntil).toLowerCase()}</span>}
          </div>
        ) : (
          <span className="t-muted hr-small">—</span>
        ),
    },
  ];

  const count = (f: Filter) => (f === "all" ? rows.length : rows.filter((p) => p.status === f).length);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack">
        <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search name, role, skill" width={260} />}>
          <FilterChips
            label="Status"
            value={filter}
            onChange={setFilter}
            options={(["all", "Deployed", "Available", "On leave"] as Filter[]).map((f) => ({ value: f, label: f === "all" ? "Everyone" : f, count: count(f) }))}
          />
        </Toolbar>
        <DataTable rows={visible} columns={columns} loading={loading} onRowClick={(p) => onOpen(p.id)} activeId={activeId} caption="People directory" />
        <p className="hr-small t-muted">The demo directory holds 13 representative people of the 214 on payroll. Contract staff are flagged; whether they sit in payroll is decision HR-021.</p>
      </div>
    </div>
  );
}
