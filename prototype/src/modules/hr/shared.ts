import { daysFrom } from "../../api/format";
import type { Person, Tone } from "../../api/types";

export function certState(expires: string): { tone: Tone; label: string } {
  const d = daysFrom(expires);
  if (d < 0) return { tone: "risk", label: `Expired ${-d} d ago` };
  if (d <= 30) return { tone: "warn", label: `Expires in ${d} d` };
  return { tone: "neutral", label: `Valid to ${expires.slice(0, 7)}` };
}

export const expiringCerts = (people: Person[]) =>
  people.flatMap((p) => p.certifications.filter((c) => daysFrom(c.expires) <= 30).map((c) => ({ person: p, cert: c, days: daysFrom(c.expires) }))).sort((a, b) => a.days - b.days);

export const utilTone = (u: number): Tone => (u >= 90 ? "warn" : u < 50 ? "neutral" : "accent");

/* ---------------------------------------------------------------- Roster (2–29 Nov 2026) */
export const ROSTER_START = "2026-11-02";
export const ROSTER_DAYS = 28;

export type Booking = { personId: string; ref: string; label: string; site: string; from: string; to: string; kind: "assignment" | "planned" | "leave"; pending?: boolean };

/**
 * Planned bookings beyond each person's current assignment. Illustrative — the deployment
 * planner that creates them is designed in HR-UI-03; assignments and leave come from fixtures.
 */
export const PLANNED: Booking[] = [
  { personId: "EMP-0072", ref: "AMC-0031", label: "Preventive visit · Line 03", site: "Pune plant", from: "2026-11-26", to: "2026-11-28", kind: "planned" },
  { personId: "EMP-0129", ref: "SR-0146", label: "Quarterly inspection", site: "Nashik utility block", from: "2026-11-04", to: "2026-11-04", kind: "planned" },
  { personId: "EMP-0091", ref: "CAL-0096", label: "Calibrator recertification", site: "Central lab", from: "2026-11-05", to: "2026-11-05", kind: "planned" },
  { personId: "EMP-0091", ref: "CAL-0094", label: "IR tester calibration", site: "Central lab", from: "2026-11-21", to: "2026-11-21", kind: "planned" },
  { personId: "EMP-0027", ref: "PRJ-0278", label: "Panel design · utility monitoring", site: "Bhiwandi works", from: "2026-11-23", to: "2026-11-29", kind: "planned" },
  { personId: "EMP-0056", ref: "SR-0151", label: "Flow drift · R-2", site: "Nandesari unit", from: "2026-11-03", to: "2026-11-03", kind: "planned" },
];

export const SITE_FOR: Record<string, string> = {
  "PRJ-0264": "Pune plant",
  "PRJ-0258": "Nashik utility block",
  "PRJ-0271": "Genome Valley",
  "PRJ-0249": "Nandesari unit",
  "SR-0148": "Pune plant",
};

export const dayIndex = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(ROSTER_START)) / 86400000);

export type Conflict = { personId: string; person: string; a: Booking; b: Booking; text: string };

/** Overlap between leave and a booking, or two bookings at different sites, is a conflict. */
export function findConflicts(bookings: Booking[], names: Record<string, string>): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < bookings.length; i++)
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (a.personId !== b.personId) continue;
      if (a.from > b.to || b.from > a.to) continue;
      const leave = a.kind === "leave" ? a : b.kind === "leave" ? b : null;
      if (a.kind === "leave" && b.kind === "leave") continue;
      if (!leave && a.site === b.site) continue;
      const work = leave === a ? b : a;
      const other = leave ? leave : b;
      const overlapFrom = a.from > b.from ? a.from : b.from;
      const overlapTo = a.to < b.to ? a.to : b.to;
      const span = overlapFrom === overlapTo ? overlapFrom.slice(8, 10) : `${overlapFrom.slice(8, 10)}–${overlapTo.slice(8, 10)}`;
      out.push({
        personId: a.personId,
        person: names[a.personId] ?? a.personId,
        a: work,
        b: other,
        text: leave ? `on ${leave.pending ? "requested " : ""}leave ${span} Nov but booked on ${work.ref}` : `booked at ${a.site} and ${b.site} on ${span} Nov`,
      });
    }
  return out;
}
