import { CalendarRange } from "lucide-react";
import { TODAY } from "../../api/fixtures";
import type { LeaveRequest, Person } from "../../api/types";
import { href } from "../../app/router";
import { Callout, LoadingRows, Person as PersonChip, RecordLink, Tooltip, cx } from "../../ds/components";
import { PLANNED, ROSTER_DAYS, ROSTER_START, SITE_FOR, dayIndex, findConflicts, type Booking } from "./shared";

const DAYS = Array.from({ length: ROSTER_DAYS }, (_, i) => {
  const d = new Date(`${ROSTER_START}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return { iso: d.toISOString().slice(0, 10), dom: d.getUTCDate(), dow: d.getUTCDay() };
});
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const ROSTER_END = DAYS[DAYS.length - 1].iso;

export function buildBookings(people: Person[], leave: LeaveRequest[]): Booking[] {
  const assignments: Booking[] = people
    .filter((p) => p.assignment && p.assignmentUntil && p.assignmentUntil >= ROSTER_START)
    .map((p) => ({
      personId: p.id,
      ref: p.assignment!,
      label: p.assignment!.startsWith("SR-") ? "Breakdown call" : "Project deployment",
      site: SITE_FOR[p.assignment!] ?? p.location,
      from: p.assignment!.startsWith("SR-") ? TODAY : ROSTER_START,
      to: p.assignmentUntil!,
      kind: "assignment" as const,
    }));
  const leaves: Booking[] = leave
    .filter((l) => l.status !== "Rejected")
    .map((l) => ({ personId: l.personId, ref: l.id, label: `${l.kind} leave`, site: "—", from: l.from, to: l.to, kind: "leave" as const, pending: l.status === "Pending" }));
  return [...assignments, ...PLANNED, ...leaves];
}

export function DeploymentRoster({ people, leave, loading }: { people: Person[]; leave: LeaveRequest[]; loading: boolean }) {
  if (loading) return <LoadingRows rows={8} columns={5} />;
  const bookings = buildBookings(people, leave);
  const names = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const conflicts = findConflicts(bookings, names);
  const ids = [...new Set(bookings.map((b) => b.personId))];
  const rows = people.filter((p) => ids.includes(p.id)).sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
  const conflictRefs = new Set(conflicts.flatMap((c) => [`${c.personId}|${c.a.ref}`, `${c.personId}|${c.b.ref}`]));
  const todayIdx = dayIndex(TODAY);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {conflicts.length > 0 && (
        <Callout tone="risk" title={`${conflicts.length} allocation conflict${conflicts.length > 1 ? "s" : ""} in the next four weeks`}>
          <ul className="hr-conflicts">
            {conflicts.map((c) => (
              <li key={`${c.personId}-${c.a.ref}-${c.b.ref}`}>
                <RecordLink id={c.personId}>{c.person}</RecordLink> is {c.text} (<RecordLink id={c.b.kind === "leave" ? c.a.ref : c.b.ref} quiet />).
              </li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="hr-legend">
        <span><i className="hr-key is-assignment" /> Current assignment</span>
        <span><i className="hr-key is-planned" /> Planned booking</span>
        <span><i className="hr-key is-leave" /> Approved leave</span>
        <span><i className="hr-key is-leave is-pending" /> Leave requested</span>
        <span><i className="hr-key is-conflict" /> Conflict</span>
        <span className="hr-legend-note">
          <CalendarRange size={13} aria-hidden /> 2–29 Nov 2026 · weekends shaded
        </span>
      </div>

      <div className="hr-roster-scroll">
        <div className="hr-roster" role="table" aria-label="Deployment roster, 2 to 29 November 2026">
          <div className="hr-roster-row hr-roster-head" role="row">
            <div className="hr-roster-name" role="columnheader">Person</div>
            <div className="hr-roster-track">
              <div className="hr-weeks">
                {[0, 1, 2, 3].map((w) => (
                  <span key={w} role="columnheader">Week {45 + w} · {DAYS[w * 7].dom}–{DAYS[w * 7 + 6].dom} Nov</span>
                ))}
              </div>
              <div className="hr-days">
                {DAYS.map((d, i) => (
                  <span key={d.iso} className={cx((d.dow === 0 || d.dow === 6) && "is-weekend", i === todayIdx && "is-today")}>
                    <b>{DOW[d.dow]}</b>
                    {d.dom}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {rows.map((p) => {
            const mine = bookings
              .filter((b) => b.personId === p.id && b.to >= ROSTER_START && b.from <= ROSTER_END)
              .sort((a, b) => a.from.localeCompare(b.from));
            const lanes: Booking[][] = [];
            mine.forEach((b) => {
              const lane = lanes.find((l) => l.every((x) => x.to < b.from || x.from > b.to));
              if (lane) lane.push(b);
              else lanes.push([b]);
            });
            return (
              <div key={p.id} className="hr-roster-row" role="row">
                <div className="hr-roster-name" role="rowheader">
                  <a href={href.record(p.id)} className="hr-roster-person">
                    <PersonChip name={p.name} detail={p.role} size="xs" />
                  </a>
                </div>
                <div className="hr-roster-track" style={{ height: lanes.length * 30 + 10 }}>
                  <div className="hr-grid" aria-hidden>
                    {DAYS.map((d, i) => (
                      <span key={d.iso} className={cx((d.dow === 0 || d.dow === 6) && "is-weekend", i === todayIdx && "is-today")} />
                    ))}
                  </div>
                  {lanes.map((lane, li) =>
                    lane.map((b) => {
                      const s = Math.max(0, dayIndex(b.from));
                      const e = Math.min(ROSTER_DAYS - 1, dayIndex(b.to));
                      const conflict = conflictRefs.has(`${p.id}|${b.ref}`);
                      const runsOn = dayIndex(b.to) > ROSTER_DAYS - 1;
                      return (
                        <Tooltip key={b.ref + b.from} content={`${b.ref} · ${b.label}${b.site !== "—" ? ` · ${b.site}` : ""} · ${b.from.slice(8)}–${b.to.slice(8, 10)} ${b.to.slice(5, 7) === "12" ? "Dec" : "Nov"}${b.pending ? " · awaiting approval" : ""}${conflict ? " · conflict" : ""}`}>
                          <a
                            href={href.record(b.ref)}
                            className={cx("hr-bar", `is-${b.kind}`, b.pending && "is-pending", conflict && "is-conflict", runsOn && "runs-on")}
                            style={{ left: `calc(${(s / ROSTER_DAYS) * 100}% + 2px)`, width: `calc(${((e - s + 1) / ROSTER_DAYS) * 100}% - 4px)`, top: li * 30 + 5 }}
                          >
                            <span className="mono">{b.ref}</span>
                            {e - s >= 3 && <span className="hr-bar-label">{b.kind === "leave" ? b.label : b.site}</span>}
                          </a>
                        </Tooltip>
                      );
                    }),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
