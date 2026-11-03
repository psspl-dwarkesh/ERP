import { CalendarClock } from "lucide-react";
import { TODAY } from "../../api/fixtures";
import { date, daysFrom, inr, relativeDay } from "../../api/format";
import type { Milestone, Project } from "../../api/types";
import { href } from "../../app/router";
import { Card, CardHeader, EmptyState, LoadingRows, RecordLink, Status, Tag, Tooltip, cx, toneFor } from "../../ds/components";
import { daysBetween, milestoneTone, milestoneVariance } from "./util";

const RANGE_START = "2026-06-01";
const RANGE_END = "2027-01-01";
const SPAN = daysBetween(RANGE_START, RANGE_END);
const MONTHS = [
  { label: "Jun", start: "2026-06-01" },
  { label: "Jul", start: "2026-07-01" },
  { label: "Aug", start: "2026-08-01" },
  { label: "Sep", start: "2026-09-01" },
  { label: "Oct", start: "2026-10-01" },
  { label: "Nov", start: "2026-11-01" },
  { label: "Dec", start: "2026-12-01" },
];

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const pos = (iso: string) => clamp((daysBetween(RANGE_START, iso) / SPAN) * 100);

export function TimelineView({ projects, loading }: { projects: Project[]; loading: boolean }) {
  if (loading) return <LoadingRows rows={6} columns={4} />;
  const rows = [...projects].sort((a, b) => a.start.localeCompare(b.start));
  const today = pos(TODAY);
  const upcoming = rows
    .flatMap((p) => p.milestones.filter((m) => m.status !== "Done" && daysFrom(m.due) <= 30).map((m) => ({ p, m })))
    .sort((a, b) => a.m.due.localeCompare(b.m.due));

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <Card padded={false}>
        <div className="card-padded" style={{ paddingBottom: "var(--space-3)" }}>
          <CardHeader
            title="Milestones across the portfolio"
            description="Bars run from start to contractual due date; the fill is progress. Hover or focus a diamond for the gate."
            actions={
              <div className="prj-legend" aria-label="Legend">
                <span><i className="prj-legend-dia tone-ok" /> Done</span>
                <span><i className="prj-legend-dia tone-accent" /> In progress</span>
                <span><i className="prj-legend-dia tone-neutral" /> Upcoming</span>
                <span><i className="prj-legend-dia tone-risk" /> Late or blocked</span>
                <span><i className="prj-legend-today" /> Today</span>
              </div>
            }
          />
        </div>
        <div className="prj-gantt" role="region" aria-label="Milestone timeline, June to December 2026" tabIndex={0}>
          <div className="prj-gantt-inner">
            <div className="prj-gantt-head">
              <div className="prj-gantt-label-h">Project</div>
              <div className="prj-gantt-scale">
                {MONTHS.map((m, i) => {
                  const end = MONTHS[i + 1]?.start ?? RANGE_END;
                  return (
                    <span key={m.label} style={{ left: `${pos(m.start)}%`, width: `${pos(end) - pos(m.start)}%` }}>
                      {m.label}
                    </span>
                  );
                })}
                <span className="prj-gantt-today-label" style={{ left: `${today}%` }}>
                  3 Nov
                </span>
              </div>
            </div>
            {rows.map((p) => (
              <div key={p.id} className="prj-gantt-row">
                <a className="prj-gantt-label" href={href.record(p.id)}>
                  <span className="prj-gantt-name">{p.name}</span>
                  <span className="prj-gantt-sub">
                    <span className="mono">{p.id}</span> · {p.customer}
                  </span>
                </a>
                <div className="prj-gantt-track">
                  {MONTHS.slice(1).map((m) => (
                    <i key={m.label} className="prj-gantt-grid" style={{ left: `${pos(m.start)}%` }} aria-hidden />
                  ))}
                  <i className="prj-gantt-today" style={{ left: `${today}%` }} aria-hidden />
                  <div className={cx("prj-gantt-bar", `tone-${toneFor(p.status)}`)} style={{ left: `${pos(p.start)}%`, width: `${pos(p.due) - pos(p.start)}%` }}>
                    <span className="prj-gantt-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                  {p.milestones.map((m) => (
                    <MilestoneDiamond key={m.id} p={p} m={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={CalendarClock} title="Due in the next 30 days" description="Open milestones by date, with the gate they close and what they release for billing." />
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No milestones due in the next 30 days">
            The next gates fall later in the year; they will appear here a month ahead.
          </EmptyState>
        ) : (
          <ul className="divider-list">
            {upcoming.map(({ p, m }) => {
              const v = milestoneVariance(m);
              return (
                <li key={`${p.id}-${m.id}`} className="list-row prj-due-row">
                  <span className={cx("prj-date-chip", `tone-${milestoneTone(m)}`)}>
                    <b>{m.due.slice(8)}</b>
                    <span>{date(m.due, true).split(" ")[1]}</span>
                  </span>
                  <div className="list-row-main">
                    <div className="list-row-title">
                      {m.name} {m.gate && <Tag tone="info">{m.gate}</Tag>}
                    </div>
                    <div className="list-row-sub">
                      <RecordLink id={p.id} quiet>{p.name}</RecordLink> · <span className={`prj-t-${v.tone}`}>{v.text}</span>
                    </div>
                  </div>
                  <span className="prj-due-value cell-num">{m.billable ? inr(m.billable) : <span className="t-muted">Not billable</span>}</span>
                  <Status size="sm">{m.status}</Status>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MilestoneDiamond({ p, m }: { p: Project; m: Milestone }) {
  const at = m.done ?? m.due;
  const v = milestoneVariance(m);
  return (
    <Tooltip
      content={
        <span className="prj-tip">
          <b>{m.gate ? `${m.gate} · ` : ""}{m.name}</b>
          <span>
            {m.done ? `Done ${date(m.done, true)} · planned ${date(m.due, true)}` : `Due ${date(m.due, true)} · ${relativeDay(m.due)}`}
          </span>
          <span>
            {m.status} · {v.text}
            {m.billable ? ` · ${inr(m.billable)} billable` : ""}
          </span>
        </span>
      }
    >
      <button
        type="button"
        className={cx("prj-diamond", `tone-${milestoneTone(m)}`, m.gate && "has-gate")}
        style={{ left: `${pos(at)}%` }}
        aria-label={`${p.id} ${m.name}${m.gate ? `, gate ${m.gate}` : ""}, ${m.status}, ${date(at)}`}
      />
    </Tooltip>
  );
}
