/**
 * Insights: analysis across every module the signed-in role can view.
 * Briefing first, then forecasts, a question box, the ranked findings and per-project
 * risk, and finally every check that ran (DASH-012: documented definitions, refresh time).
 */
import { ArrowRight, CalendarClock, ChevronDown, Download, Gauge, ListChecks, LockKeyhole, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { date, inr, time } from "../../api/format";
import { useSession } from "../../api/session";
import { ModuleFrame } from "../../app/Shell";
import { href, setTab, useRoute } from "../../app/router";
import {
  ButtonLink,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  FilterChips,
  LoadingRows,
  Meter,
  PageHeader,
  Progress,
  RecordLink,
  Segmented,
  Status,
  Tabs,
  Tag,
  cx,
  downloadCsv,
  useToast,
} from "../../ds/components";
import { AskPanel } from "./AskPanel";
import { useInsights } from "./data";
import { AREA_LABEL, MODULE_LABEL, SEVERITY_LABEL, SEVERITY_TONE, type Analysis, type Area, type Finding, type FindingAction, type ProjectRisk, type Severity } from "./engine";
import { RefText, useCanOpen } from "./RefText";
import "./insights.css";

const actionHref = (a: FindingAction) => (a.recordId ? href.record(a.recordId) : href.module(a.module ?? "dashboard", a.tab));

const TABS = ["briefing", "findings", "forecasts", "risk", "checks"] as const;

export default function InsightsPage() {
  const route = useRoute();
  const { ds, analysis, loading, error } = useInsights();
  const user = useSession().user;
  const toast = useToast();
  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : "briefing";

  const counts = analysis ? (["high", "medium", "low"] as Severity[]).map((s) => analysis.findings.filter((f) => f.severity === s).length) : [0, 0, 0];
  const ran = analysis?.checks.filter((c) => c.status !== "hidden").length ?? 0;
  const hidden = analysis?.checks.filter((c) => c.status === "hidden").length ?? 0;

  const exportCsv = () => {
    if (!analysis) return;
    downloadCsv(
      "threadline-insights.csv",
      ["Severity", "Area", "Finding", "Detail", "Numbers", "Records", "Rule"],
      analysis.findings.map((f) => [SEVERITY_LABEL[f.severity], AREA_LABEL[f.area], f.title, f.detail, f.numbers.map((n) => `${n.label}: ${n.value}`).join("; "), f.cites.join(" "), f.rule]),
    );
    toast({ title: "Findings exported", body: `threadline-insights.csv · ${analysis.findings.length} findings` });
  };

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited", to: href.module("dashboard") }, { label: "Insights" }]}
        title="Insights"
        description={
          analysis
            ? `${counts[0]} high, ${counts[1]} medium and ${counts[2]} low findings from ${ran} checks over the records your role can see. Every finding shows its numbers and the records behind it.`
            : "Analysis across every module your role can see: risks, exceptions and answers to questions."
        }
        meta={
          analysis && (
            <>
              <span className="row" style={{ gap: 6 }}>
                <CalendarClock size={14} aria-hidden /> Computed {date(analysis.at)} · {time(analysis.at)} IST
              </span>
              <span>{user?.role ?? ""} view</span>
              <Tag tone="neutral" icon={ShieldCheck}>
                Rule-based · no AI in the findings
              </Tag>
            </>
          )
        }
        actions={
          <Button icon={Download} onClick={exportCsv} disabled={!analysis}>
            Export findings
          </Button>
        }
      />

      {error && (
        <Callout tone="risk" title="Some records couldn't be loaded">
          {error.message} Findings below use whatever loaded.
        </Callout>
      )}

      {loading || !analysis || !ds ? (
        <div className="stack">
          <LoadingRows rows={4} columns={2} />
          <LoadingRows rows={6} columns={4} />
        </div>
      ) : (
        <>
          {analysis.hiddenModules.length > 0 && (
            <Callout tone="info" icon={LockKeyhole} title={`${hidden} of ${analysis.checks.length} checks are outside your role`}>
              Insights reads only what your role may view. {analysis.hiddenModules.map((m) => MODULE_LABEL[m]).join(", ")} {analysis.hiddenModules.length === 1 ? "isn't" : "aren't"} included, so nothing here reflects {analysis.hiddenModules.length === 1 ? "it" : "them"}.
            </Callout>
          )}

          <Tabs
            value={tab}
            onChange={(v) => setTab(v)}
            items={[
              { value: "briefing", label: "Briefing", icon: CalendarClock, count: analysis.briefing.length },
              { value: "findings", label: "Findings", icon: ListChecks, count: analysis.findings.length },
              { value: "forecasts", label: "Forecasts", icon: Wallet },
              { value: "risk", label: "Project risk", icon: Gauge, count: analysis.projects.length },
              { value: "checks", label: "Checks", icon: ShieldCheck, count: analysis.checks.length },
            ]}
          />

          {tab === "briefing" && (
            <>
              <div className="grid grid-main-aside ins-top">
                <Briefing analysis={analysis} />
                <SlipForecast analysis={analysis} />
              </div>
              <AskPanel ds={ds} analysis={analysis} />
            </>
          )}

          {tab === "findings" && <FindingsList findings={analysis.findings} />}

          {tab === "forecasts" && <BillableForecast analysis={analysis} />}

          {tab === "risk" && <ProjectRiskCard risks={analysis.projects} visible={ds.visible.includes("projects")} />}

          {tab === "checks" && <ChecksCard analysis={analysis} />}
        </>
      )}
    </ModuleFrame>
  );
}

/* ---------------------------------------------------------------- briefing */
function Briefing({ analysis }: { analysis: Analysis }) {
  const b = analysis.briefing;
  return (
    <Card tone="accent" className="ins-brief">
      <CardHeader title="Today's briefing" description="The highest-ranked findings, one per job. Ranked by severity, how soon each one bites and the money involved." />
      {b.length ? (
        <ol className="ins-brief-list">
          {b.map((f) => (
            <li key={f.id}>
              <span className={cx("ins-sev-dot", `tone-${SEVERITY_TONE[f.severity]}`)} aria-label={`${SEVERITY_LABEL[f.severity]} severity`} />
              <p>
                <RefText text={f.brief} />
              </p>
              <a className="ins-brief-go" href={actionHref(f.action)}>
                {f.action.label}
                <ArrowRight size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-muted">Nothing in the records your role can see needs attention today.</p>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- forecasts */
function SlipForecast({ analysis }: { analysis: Analysis }) {
  const s = analysis.forecasts.slipping;
  if (!s) return <LockedCard title="Milestones likely to slip" module="Projects" />;
  return (
    <Card className="ins-fc">
      <div className="ins-fc-head">
        <span className="ins-fc-icon tone-warn">
          <TrendingDown size={16} aria-hidden />
        </span>
        <div>
          <p className="ins-fc-label">Likely to slip in {s.monthLabel}</p>
          <p className="ins-fc-value t-num">
            {s.items.length} <span>of {s.dueThisMonth} milestones due</span>
          </p>
        </div>
      </div>
      {s.items.length ? (
        <ul className="ins-fc-list">
          {s.items.map((i) => (
            <li key={i.projectId + i.milestone.id}>
              <RecordLink id={i.projectId} quiet />
              <span className="ins-fc-name">
                {i.milestone.name}
                <span>
                  {date(i.milestone.due, true)} · {i.reason}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ins-fc-foot">Every milestone due this month has no blocked or late step ahead of it.</p>
      )}
      <p className="ins-fc-foot">
        {s.billableAtStake ? <>{inr(s.billableAtStake)} of billing depends on them. </> : null}
        {s.alreadyLate.length ? <>{s.alreadyLate.length} more already late: {s.alreadyLate.map((l) => `${l.milestone.name} (${l.projectId}, ${l.reason})`).join(", ")}.</> : null}
      </p>
    </Card>
  );
}

function BillableForecast({ analysis }: { analysis: Analysis }) {
  const b = analysis.forecasts.billable;
  if (!b) return <LockedCard title="Billable in the next 30 days" module="Projects" />;
  return (
    <Card className="ins-fc">
      <div className="ins-fc-head">
        <span className="ins-fc-icon tone-accent">
          <Wallet size={16} aria-hidden />
        </span>
        <div>
          <p className="ins-fc-label">Billable by {date(b.windowEnd, true)}</p>
          <p className="ins-fc-value t-num">
            {inr(b.total)} <span>across {b.items.length} milestones</span>
          </p>
        </div>
      </div>
      <Meter
        total={b.total}
        segments={[
          { value: b.total - b.atRisk, tone: "accent", label: "On plan" },
          { value: b.atRisk, tone: "risk", label: "Behind a blocked step" },
        ]}
      />
      <p className="ins-fc-legend">
        <span><i className="tone-accent" /> On plan {inr(b.total - b.atRisk)}</span>
        {b.atRisk > 0 && <span><i className="tone-risk" /> Behind a blocked step {inr(b.atRisk)}</span>}
      </p>
      <ul className="ins-fc-list">
        {b.items.map((i) => (
          <li key={i.projectId + i.milestone.id}>
            <RecordLink id={i.projectId} quiet />
            <span className="ins-fc-name">
              {i.milestone.name}
              <span>
                {date(i.milestone.due, true)} · {inr(i.milestone.billable ?? 0)}
                {i.atRisk ? ` · ${i.reason}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="ins-fc-foot">
        Milestone billing only; AMC and O&M instalments have no dates in this data.{b.inReview ? ` A further ${inr(b.inReview)} is already earned and waiting in billing review.` : ""}
      </p>
    </Card>
  );
}

function LockedCard({ title, module }: { title: string; module: string }) {
  return (
    <Card className="ins-fc">
      <p className="ins-fc-label">{title}</p>
      <p className="ins-fc-foot">
        <LockKeyhole size={13} aria-hidden /> Needs {module}, which isn't part of your role.
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------- findings */
type SevFilter = "all" | Severity;

function FindingsList({ findings }: { findings: Finding[] }) {
  const [area, setArea] = useState<"all" | Area>("all");
  const [sev, setSev] = useState<SevFilter>("all");
  const [showLow, setShowLow] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const areas = (Object.keys(AREA_LABEL) as Area[]).filter((a) => findings.some((f) => f.area === a));
  const byArea = findings.filter((f) => area === "all" || f.area === area);
  const rows = byArea.filter((f) => sev === "all" || f.severity === sev);
  const collapsed = sev === "all" && !showLow;
  const shown = collapsed ? rows.filter((f) => f.severity !== "low") : rows;
  const lowCount = rows.filter((f) => f.severity === "low").length;

  return (
    <Card padded={false} className="ins-findings">
      <div className="card-padded ins-findings-head">
        <CardHeader icon={ListChecks} title="Findings" description="Ranked highest first. Open a finding for its numbers and the records it read." />
        <div className="ins-filters">
          <FilterChips
            label="Area"
            value={area}
            onChange={(v) => setArea(v)}
            options={[{ value: "all" as const, label: "All", count: findings.length }, ...areas.map((a) => ({ value: a, label: AREA_LABEL[a], count: findings.filter((f) => f.area === a).length }))]}
          />
          <Segmented<SevFilter>
            size="sm"
            label="Severity"
            value={sev}
            onChange={setSev}
            options={[
              { value: "all", label: "All" },
              { value: "high", label: `High ${byArea.filter((f) => f.severity === "high").length}` },
              { value: "medium", label: `Medium ${byArea.filter((f) => f.severity === "medium").length}` },
              { value: "low", label: `Low ${lowCount}` },
            ]}
          />
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No findings match these filters"
          action={
            <Button size="sm" onClick={() => { setArea("all"); setSev("all"); }}>
              Clear filters
            </Button>
          }
        >
          {rows.length ? "Only low-severity findings are left here." : "The checks for this selection found nothing."}
        </EmptyState>
      ) : (
        <ul className="ins-rows">
          {shown.map((f) => (
            <FindingRow key={f.id} f={f} open={open === f.id} onToggle={() => setOpen((o) => (o === f.id ? null : f.id))} />
          ))}
        </ul>
      )}
      {collapsed && lowCount > 0 && (
        <div className="ins-more">
          <Button size="sm" variant="ghost" icon={ChevronDown} onClick={() => setShowLow(true)}>
            Show {lowCount} low-severity {lowCount === 1 ? "finding" : "findings"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function FindingRow({ f, open, onToggle }: { f: Finding; open: boolean; onToggle: () => void }) {
  const canOpen = useCanOpen();
  const panel = `ins-f-${f.id.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <li className={cx("ins-row", open && "is-open")}>
      <div className="ins-row-main">
        <Status tone={SEVERITY_TONE[f.severity]} size="sm">
          {SEVERITY_LABEL[f.severity]}
        </Status>
        <div className="ins-row-text">
          <button type="button" className="ins-row-title" aria-expanded={open} aria-controls={panel} onClick={onToggle}>
            <span>{f.title}</span>
            <ChevronDown size={15} aria-hidden className="ins-chev" />
          </button>
          <p className="ins-row-detail">
            <RefText text={f.detail} />
          </p>
        </div>
        <div className="ins-row-side">
          <span className="ins-area">{AREA_LABEL[f.area]}</span>
          <ButtonLink to={actionHref(f.action)} size="sm" iconRight={ArrowRight}>
            {f.action.label}
          </ButtonLink>
        </div>
      </div>
      {open && (
        <div className="ins-row-more" id={panel}>
          <dl className="ins-numbers">
            {f.numbers.map((n) => (
              <div key={n.label}>
                <dt>{n.label}</dt>
                <dd>
                  <RefText text={n.value} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="ins-cited">
            <span className="ins-cited-label">Records read</span>
            {f.cites.filter(canOpen).map((c) => (
              <RecordLink key={c} id={c} quiet />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- project risk */
function ProjectRiskCard({ risks, visible }: { risks: ProjectRisk[]; visible: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!visible)
    return (
      <Card>
        <CardHeader title="Project risk" />
        <p className="ins-fc-foot">
          <LockKeyhole size={13} aria-hidden /> Needs Projects, which isn't part of your role.
        </p>
      </Card>
    );
  const label = (t: string) => (t === "risk" ? "At risk" : t === "warn" ? "Watch" : t === "neutral" ? "Not started" : "On plan");
  return (
    <Card padded={false} className="ins-risk">
      <div className="card-padded" style={{ paddingBottom: 0 }}>
        <CardHeader title="Project risk" description="Scores 0–100, computed from milestones, cost and material. Open a project for the reasons." />
      </div>
      <ul className="ins-risk-list">
        {risks.map((r) => {
          const isOpen = open === r.project.id;
          const pmDiffers = (["schedule", "cost", "material"] as const).filter((k) => r[k].tone !== r.project.health[k] && !(r[k].tone === "neutral" && r.project.health[k] === "neutral"));
          return (
            <li key={r.project.id} className={cx("ins-risk-row", isOpen && "is-open")}>
              <div className="ins-risk-top">
                <RecordLink id={r.project.id} />
                <span className="ins-risk-name truncate">{r.project.name}</span>
                <Status tone={r.tone} size="sm">
                  {label(r.tone)}
                </Status>
              </div>
              <div className="ins-risk-dims">
                {(["schedule", "cost", "material"] as const).map((k) => (
                  <div key={k} className="ins-dim">
                    <span className="ins-dim-label">
                      {k[0].toUpperCase() + k.slice(1)} <b className="t-num">{r[k].tone === "neutral" ? "—" : r[k].score}</b>
                    </span>
                    <Progress size="sm" value={r[k].tone === "neutral" ? 0 : Math.max(4, r[k].score)} tone={r[k].tone} label={`${k} risk ${r[k].score} of 100`} />
                  </div>
                ))}
              </div>
              <button type="button" className="ins-risk-why" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.project.id)}>
                {isOpen ? "Hide reasons" : "Why"}
                <ChevronDown size={13} aria-hidden className="ins-chev" />
              </button>
              {isOpen && (
                <div className="ins-risk-reasons">
                  {(["schedule", "cost", "material"] as const).map((k) => (
                    <div key={k}>
                      <p className="ins-risk-k">
                        {k[0].toUpperCase() + k.slice(1)} · {label(r[k].tone)}
                        {pmDiffers.includes(k) && <span className="ins-pm"> · PM flag: {label(r.project.health[k])}</span>}
                      </p>
                      <ul>
                        {r[k].reasons.map((x) => (
                          <li key={x}>
                            <RefText text={x} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="ins-risk-foot">
        Schedule: +40 for a blocked milestone, +30 for a late one, +20 on hold, plus time used beyond progress. Cost: straight-line forecast against budget and commitments. Material: BOM shortages, unapproved cover, QC holds, late or rejected deliveries.
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------- checks */
function ChecksCard({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...analysis.checks].sort((a, b) => ["found", "clear", "hidden"].indexOf(a.status) - ["found", "clear", "hidden"].indexOf(b.status)), [analysis.checks]);
  const clear = analysis.checks.filter((c) => c.status === "clear").length;
  return (
    <Card className="ins-checks">
      <CardHeader
        icon={ShieldCheck}
        title="Checks and definitions"
        description={`${analysis.checks.length} checks run every time the records change. ${clear ? `${clear} found nothing, which is shown rather than hidden.` : "Each one lists what it reads."} Definitions follow the scope's dashboard requirements; formulas are proposals until the FRD fixes them.`}
        actions={
          <Button size="sm" variant="ghost" icon={ChevronDown} aria-expanded={open} onClick={() => setOpen(!open)} className={cx(open && "ins-chev-open")}>
            {open ? "Hide checks" : `Show all ${analysis.checks.length}`}
          </Button>
        }
      />
      {open && (
        <div className="table-wrap is-dense">
          <table className="table ins-check-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Result</th>
                <th>Reads</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.rule.id}>
                  <td>
                    <div className="cell-primary">
                      <span className="cell-title">{c.rule.name}</span>
                      <span className="cell-sub">
                        {AREA_LABEL[c.rule.area]} · {c.rule.reqs}
                      </span>
                    </div>
                  </td>
                  <td>
                    {c.status === "found" ? (
                      <Status tone="warn" size="sm">{`${c.count} found`}</Status>
                    ) : c.status === "clear" ? (
                      <Status tone="ok" size="sm">
                        Checked — nothing found
                      </Status>
                    ) : (
                      <Status tone="neutral" size="sm">
                        Outside your role
                      </Status>
                    )}
                  </td>
                  <td className="ins-reads">{c.rule.needs.map((m) => MODULE_LABEL[m]).join(", ")}</td>
                  <td className="ins-def">{c.rule.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
