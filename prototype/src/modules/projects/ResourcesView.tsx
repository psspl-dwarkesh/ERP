import { UserSearch } from "lucide-react";
import { date, relativeDay } from "../../api/format";
import type { Person as PersonT, Project } from "../../api/types";
import { navigate } from "../../app/router";
import { Callout, Card, DataTable, EmptyState, Person, Progress, RecordLink, Status, Tag, type Column } from "../../ds/components";

const OVER = 90;

interface Row extends PersonT {
  projects: Project[];
}

export function ResourcesView({ projects, people, loading }: { projects: Project[]; people: PersonT[]; loading: boolean }) {
  const rows: Row[] = people
    .map((p) => ({ ...p, projects: projects.filter((x) => x.team.includes(p.id) || x.manager === p.name) }))
    .filter((p) => p.projects.length > 0)
    .sort((a, b) => b.utilisation - a.utilisation);
  const over = rows.filter((r) => r.utilisation > OVER);
  const spare = people.filter((p) => p.status === "Available" && p.utilisation < 75 && !["HR", "Sales", "Management"].includes(p.department)).sort((a, b) => a.utilisation - b.utilisation);

  const columns: Column<Row>[] = [
    { key: "person", header: "Team member", sort: (r) => r.name, cell: (r) => <Person name={r.name} detail={`${r.role} · ${r.location}`} /> },
    { key: "dept", header: "Department", sort: (r) => r.department, priority: 3, cell: (r) => <span className="prj-muted-cell">{r.department}</span> },
    {
      key: "projects",
      header: "On projects",
      cell: (r) => (
        <div className="prj-chip-list">
          {r.projects.map((p) => (
            <RecordLink key={p.id} id={p.id} quiet={r.assignment !== p.id} />
          ))}
        </div>
      ),
    },
    {
      key: "assignment",
      header: "Deployed to",
      sort: (r) => r.assignmentUntil ?? "9999",
      priority: 2,
      cell: (r) =>
        r.assignment ? (
          <div className="cell-primary">
            <RecordLink id={r.assignment} />
            {r.assignmentUntil && <span className="cell-sub">until {date(r.assignmentUntil, true)} · {relativeDay(r.assignmentUntil).toLowerCase()}</span>}
          </div>
        ) : (
          <span className="t-muted">Not deployed</span>
        ),
    },
    {
      key: "util",
      header: "Utilisation · Nov",
      sort: (r) => r.utilisation,
      width: 220,
      cell: (r) => (
        <div className="prj-util">
          <Progress value={r.utilisation} size="sm" tone={r.utilisation > OVER ? "risk" : r.utilisation >= 85 ? "warn" : "accent"} label={`${r.name} utilisation`} />
          <span className="cell-num">{r.utilisation}%</span>
          {r.utilisation > OVER && <Tag tone="risk">Over-allocated</Tag>}
        </div>
      ),
    },
    { key: "status", header: "Status", sort: (r) => r.status, priority: 2, cell: (r) => <Status>{r.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {!loading && over.length > 0 && (
        <Callout tone="warn" title={`${over.length} ${over.length === 1 ? "person is" : "people are"} above ${OVER}% this month`}>
          {over.map((o) => `${o.name} (${o.utilisation}%, ${o.projects.map((p) => p.id).join(" + ")})`).join(" and ")}.{" "}
          {spare.length > 0 && <>Capacity sits with {spare.slice(0, 3).map((s) => `${s.name} (${s.role}, ${s.utilisation}%)`).join(", ")}.</>}
        </Callout>
      )}
      <Card padded={false}>
        <div className="prj-flush prj-flush-top">
          <DataTable
            caption="Project resources"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(r) => navigate(`/app/hr/${r.id}`)}
            empty={
              <EmptyState icon={UserSearch} title="Nobody is allocated to a project yet">
                Allocations made in People appear here with their project and dates.
              </EmptyState>
            }
          />
        </div>
      </Card>
    </div>
  );
}
