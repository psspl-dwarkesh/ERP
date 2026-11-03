import { AlertTriangle, ArrowRight, FolderSearch, PauseCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { verticals } from "../../api/fixtures";
import { date, daysFrom, inr, relativeDay } from "../../api/format";
import type { Project } from "../../api/types";
import { HealthDots } from "../../app/patterns";
import { href, navigate } from "../../app/router";
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  FilterChips,
  LoadingRows,
  Person,
  Progress,
  RecordLink,
  SearchField,
  Select,
  Stat,
  Status,
  Toolbar,
  toneFor,
  type Column,
} from "../../ds/components";
import { STATUS_ORDER, attention, milestoneVariance } from "./util";

type StatusFilter = "all" | Project["status"];

export function PortfolioView({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [vertical, setVertical] = useState<string>("all");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return projects
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => vertical === "all" || p.vertical === vertical)
      .filter((p) => !term || `${p.id} ${p.name} ${p.customer} ${p.site} ${p.manager}`.toLowerCase().includes(term))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.due.localeCompare(b.due));
  }, [projects, q, status, vertical]);

  const counts = (s: Project["status"]) => projects.filter((p) => p.status === s).length;
  const statuses = STATUS_ORDER.filter((s) => counts(s) > 0);
  const flagged = projects.map((p) => ({ p, a: attention(p) })).filter((x) => x.a) as { p: Project; a: NonNullable<ReturnType<typeof attention>> }[];

  const live = projects.filter((p) => p.status !== "Closed");
  const contract = live.reduce((s, p) => s + p.contractValue, 0);
  const billed = live.reduce((s, p) => s + p.billed, 0);
  const budget = live.reduce((s, p) => s + p.budget, 0);
  const committed = live.reduce((s, p) => s + p.committed, 0);
  const gates = live.flatMap((p) => p.milestones.filter((m) => m.status !== "Done" && m.gate && daysFrom(m.due) >= 0 && daysFrom(m.due) <= 14));
  const gatesBillable = gates.reduce((s, m) => s + (m.billable ?? 0), 0);

  const filtersOn = q || status !== "all" || vertical !== "all";
  const overdue = rows.filter((p) => {
    const m = p.milestones.find((x) => x.status !== "Done");
    return m && milestoneVariance(m).tone === "risk";
  }).length;

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Project",
      sort: (p) => p.name,
      cell: (p) => (
        <div className="cell-primary">
          <span className="cell-title">{p.name}</span>
          <span className="cell-sub">
            <span className="mono">{p.id}</span> · {p.customer}
          </span>
        </div>
      ),
    },
    { key: "vertical", header: "Vertical", sort: (p) => p.vertical, priority: 3, cell: (p) => <span className="prj-muted-cell">{p.vertical}</span> },
    { key: "manager", header: "Manager", sort: (p) => p.manager, priority: 2, cell: (p) => <Person name={p.manager} size="xs" /> },
    { key: "status", header: "Status", sort: (p) => STATUS_ORDER.indexOf(p.status), cell: (p) => <Status>{p.status}</Status> },
    { key: "health", header: "Health", priority: 2, cell: (p) => <HealthDots health={p.health} /> },
    {
      key: "progress",
      header: "Progress",
      sort: (p) => p.progress,
      width: 150,
      cell: (p) => (
        <div className="prj-progress-cell">
          <Progress value={p.progress} size="sm" tone={toneFor(p.status) === "risk" ? "risk" : p.status === "On hold" ? "warn" : "accent"} label={`${p.name} progress`} />
          <span className="cell-num">{p.progress}%</span>
        </div>
      ),
    },
    { key: "value", header: "Contract value", sort: (p) => p.contractValue, align: "right", priority: 3, cell: (p) => <span className="cell-num">{inr(p.contractValue)}</span> },
    {
      key: "due",
      header: "Due",
      sort: (p) => p.due,
      cell: (p) => {
        const d = daysFrom(p.due);
        return (
          <div className="cell-primary">
            <span className="cell-num">{date(p.due, true)}</span>
            <span className={`cell-sub ${d < 0 && p.status !== "Closed" ? "prj-t-risk" : ""}`}>{relativeDay(p.due)}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {loading ? (
        <LoadingRows rows={2} columns={3} />
      ) : (
        flagged.length > 0 && (
          <section className="prj-attention" aria-label="Projects that need a decision">
            {flagged.map(({ p, a }) => {
              const Icon = p.status === "On hold" ? PauseCircle : AlertTriangle;
              const tone = p.status === "On hold" ? "warn" : "risk";
              return (
                <article key={p.id} className={`prj-attention-card tone-${tone}`}>
                  <div className="prj-attention-top">
                    <span className="prj-attention-icon">
                      <Icon size={16} aria-hidden />
                    </span>
                    <RecordLink id={p.id}>{p.customer}</RecordLink>
                    <Status size="sm">{p.status}</Status>
                  </div>
                  <h3 className="prj-attention-title">{a.title}</h3>
                  {a.body && <p className="prj-attention-body">{a.body}</p>}
                  {a.mitigation && (
                    <p className="prj-attention-plan">
                      <b>Plan:</b> {a.mitigation}
                    </p>
                  )}
                  <div className="prj-attention-foot">
                    <Person name={p.manager} size="xs" detail="Project manager" />
                    <ButtonLink to={href.record(p.id)} size="sm" iconRight={ArrowRight}>
                      Open project
                    </ButtonLink>
                  </div>
                </article>
              );
            })}
          </section>
        )
      )}

      <div className="stat-strip">
        <Stat label="Live contract value" value={loading ? "–" : inr(contract)} foot={`${live.length} projects · budgeted margin ${contract ? Math.round(((contract - budget) / contract) * 100) : 0}%`} />
        <Stat label="Billed to date" value={loading ? "–" : inr(billed)} foot={`${contract ? Math.round((billed / contract) * 100) : 0}% of contract value`} />
        <Stat label="Committed against budget" value={loading ? "–" : `${budget ? Math.round((committed / budget) * 100) : 0}%`} foot={`${inr(committed)} of ${inr(budget)} · POs and approved PRs`} />
        <Stat label="Gates in the next 14 days" value={loading ? "–" : gates.length} tone={gates.some((g) => g.status === "Blocked") ? "risk" : undefined} foot={gates.length ? `${gates.filter((g) => g.status === "Blocked").length} blocked · ${inr(gatesBillable)} billable on completion` : "Nothing due"} onClick={() => navigate("/app/projects?tab=timeline")} />
      </div>

      <Card padded={false}>
        <div className="prj-table-head">
          <Toolbar
            end={
              <Select
                label="Vertical"
                size="sm"
                value={vertical}
                onChange={setVertical}
                options={[{ value: "all", label: "All verticals" }, ...verticals.map((v) => ({ value: v, label: v, detail: `${projects.filter((p) => p.vertical === v).length} projects` }))]}
              />
            }
          >
            <SearchField value={q} onChange={setQ} placeholder="Search project, customer, site or manager" label="Search projects" width={320} />
            <FilterChips
              label="Status"
              value={status}
              onChange={setStatus}
              options={[{ value: "all" as StatusFilter, label: "All", count: projects.length }, ...statuses.map((s) => ({ value: s as StatusFilter, label: s, count: counts(s) }))]}
            />
          </Toolbar>
        </div>
        <div className="prj-flush">
          <DataTable
            caption="Project portfolio"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(p) => navigate(`/app/projects/${p.id}`)}
            empty={
              <EmptyState
                icon={FolderSearch}
                title={filtersOn ? "No project matches these filters" : "No projects yet"}
                action={
                  filtersOn ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setQ("");
                        setStatus("all");
                        setVertical("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              >
                {filtersOn
                  ? `Nothing in ${vertical === "all" ? "any vertical" : vertical}${status === "all" ? "" : ` with status ${status}`}${q ? ` matches “${q}”` : ""}.`
                  : "Projects are created from an accepted sales order, so customer, site and value arrive pre-filled."}
              </EmptyState>
            }
          />
        </div>
        {!loading && rows.length > 0 && (
          <div className="prj-table-foot">
            <span>
              {rows.length} of {projects.length} projects · {inr(rows.reduce((s, p) => s + p.contractValue, 0))} contract value
            </span>
            <span className="prj-table-foot-note">
              Health dots: schedule · cost · material
              {overdue ? ` · ${overdue} next milestone${overdue === 1 ? "" : "s"} overdue` : ""}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
