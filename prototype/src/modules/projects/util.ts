import { TODAY } from "../../api/fixtures";
import { date } from "../../api/format";
import type { Milestone, Project, Tone } from "../../api/types";

const DAY = 86400000;

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);
}

export function impactTone(impact: "Low" | "Medium" | "High"): Tone {
  return impact === "High" ? "risk" : impact === "Medium" ? "warn" : "neutral";
}

export function milestoneTone(m: Milestone): Tone {
  if (m.status === "Done") return "ok";
  if (m.status === "Late" || m.status === "Blocked") return "risk";
  if (m.status === "In progress") return "accent";
  return "neutral";
}

/** How a milestone landed against its plan: "3 days late", "on time", "due in 7 days". */
export function milestoneVariance(m: Milestone) {
  if (m.done) {
    const v = daysBetween(m.due, m.done);
    return v > 0 ? { text: `${v} day${v === 1 ? "" : "s"} late`, tone: "warn" as Tone } : v < 0 ? { text: `${-v} day${v === -1 ? "" : "s"} early`, tone: "ok" as Tone } : { text: "On the day", tone: "ok" as Tone };
  }
  const left = daysBetween(TODAY, m.due);
  if (left < 0) return { text: `${-left} day${left === -1 ? "" : "s"} overdue`, tone: "risk" as Tone };
  if (left === 0) return { text: "Due today", tone: "warn" as Tone };
  return { text: `Due in ${left} day${left === 1 ? "" : "s"}`, tone: (left <= 7 ? "warn" : "neutral") as Tone };
}

export function nextMilestone(p: Project) {
  return p.milestones.find((m) => m.status !== "Done");
}

/** Committed cost already exceeds budget → forecast at committed; otherwise budget is the estimate. */
export function margin(p: Project) {
  const estCost = Math.max(p.budget, p.committed);
  const value = p.contractValue - estCost;
  return { value, pct: p.contractValue ? (value / p.contractValue) * 100 : 0, headroom: p.budget - p.committed };
}

/** The decision a project needs, written as a sentence, or null when it's on plan. */
export function attention(p: Project) {
  const blocked = p.milestones.find((m) => m.status === "Blocked");
  const late = p.milestones.filter((m) => m.status === "Late");
  const high = p.risks.find((r) => r.impact === "High") ?? p.risks[0];
  if (!blocked && !late.length && p.status !== "At risk" && p.status !== "On hold") return null;
  const lead = blocked ?? late[0];
  const title = !lead
    ? p.status === "On hold" ? "Project on hold" : "Project at risk"
    : lead.status === "Blocked"
      ? `${lead.gate ?? lead.name} on ${date(lead.due, true)} is blocked`
      : `${lead.name} is ${-daysBetween(TODAY, lead.due)} days late`;
  const parts: string[] = [];
  late
    .filter((m) => m !== lead)
    .forEach((m) => parts.push(`${m.name} was due ${date(m.due, true)} and is ${-daysBetween(TODAY, m.due)} days late`));
  if (high) parts.push(high.title);
  return { title, body: parts.join(". ") + (parts.length ? "." : ""), mitigation: high?.mitigation, milestone: lead };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthShort(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

export const STATUS_ORDER: Project["status"][] = ["At risk", "On hold", "In review", "On track", "Planning", "Closed"];
