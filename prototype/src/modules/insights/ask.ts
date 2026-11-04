/**
 * Local answers for "Ask Threadline". A small intent matcher over the same dataset and
 * analysis the Insights page shows: no model, no network. Every answer names the records
 * it used, and says plainly when the data it would need is outside the user's role.
 */
import { date, duration, inr, time } from "../../api/format";
import type { ModuleKey } from "../../api/types";
import { MODULE_LABEL, addDays, bomShortages, type Analysis, type Dataset, type Finding } from "./engine";

export interface Answer {
  intent: string;
  text: string;
  points: string[];
  cites: string[];
}

const ID_RE = /\b(PRJ|BOM|PR|RFQ|PO|WO|AST|SR|AMC|OM|CAL|ITM|GRN|SO|BA|QUO|OPP|CUS|VEN|EMP|LV|CLM|SI|EXT|MOV|PAY)-\d{2,4}(?:-\d{2})?\b/gi;
export const idsIn = (text: string) => [...new Set((text.match(ID_RE) ?? []).map((x) => x.toUpperCase()))];

const uniq = (xs: string[]) => [...new Set(xs)];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Clock time in IST. Timestamps arrive as "…+05:30" (fixtures) or "2026-11-03 08:30:00+00" (PostgreSQL), so parse the instant rather than slicing text. */
const hhmm = (iso: string) => time(iso.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
const outside = (m: ModuleKey[]) => `That needs ${m.map((x) => MODULE_LABEL[x] ?? x).join(" and ")}, which ${m.length === 1 ? "isn't" : "aren't"} part of your role, so I can't see those records.`;

type Handler = (q: string, ds: Dataset, a: Analysis) => Answer;
interface Intent {
  id: string;
  needs: ModuleKey[];
  match: (q: string) => boolean;
  run: Handler;
}

const has = (q: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? q.includes(w) : w.test(q)));

/* ---------------------------------------------------------------- handlers */
const projectAnswer: Handler = (q, ds, a) => {
  const id = idsIn(q).find((x) => x.startsWith("PRJ-")) ?? a.projects[0]?.project.id;
  const p = ds.projects?.find((x) => x.id === id);
  if (!p) return { intent: "project", text: `I can't find ${id ?? "that project"} among the projects you can see.`, points: [], cites: [] };
  const r = a.projects.find((x) => x.project.id === p.id);
  const related = a.findings.filter((f) => f.projectId === p.id || f.cites.includes(p.id));
  const blocked = p.milestones.filter((m) => m.status === "Blocked" || m.status === "Late");
  const points: string[] = [];
  for (const m of blocked) points.push(`${m.id} ${m.name}: ${m.status.toLowerCase()}, due ${date(m.due, true)}.`);
  const bom = ds.boms?.find((b) => b.id === p.bom || b.projectId === p.id);
  if (bom) {
    const short = bomShortages(bom, ds);
    if (short.length) points.push(`${bom.id} is ${plural(short.length, "line")} short: ${short.map((l) => `${l.shortage} × ${l.item.split(" · ")[0]}${l.pr ? ` (on ${l.pr.id}, ${l.pr.status.toLowerCase()})` : l.held ? " (on QC hold)" : ""}`).join("; ")}.`);
  }
  for (const pr of (ds.purchaseRequests ?? []).filter((x) => x.projectId === p.id && x.status === "Awaiting approval")) points.push(`${pr.id} (${inr(pr.value)}) is awaiting approval; need by ${date(pr.needBy, true)}.`);
  for (const f of related.filter((f) => ["qc-hold", "margin", "billing-mismatch", "earned-unbilled", "subcontract", "po-followup"].includes(f.rule))) points.push(f.brief);
  const head = r
    ? `${p.id} (${p.name}) is ${p.status.toLowerCase()} at ${p.progress}%. Computed risk: schedule ${r.schedule.score}, cost ${r.cost.score}, material ${r.material.score} out of 100.`
    : `${p.id} (${p.name}) is ${p.status.toLowerCase()} at ${p.progress}%.`;
  return {
    intent: "project",
    text: points.length ? `${head} What's holding it:` : `${head} Nothing in the records is blocking it right now.`,
    points: uniq(points),
    cites: uniq([p.id, ...(bom ? [bom.id] : []), ...related.flatMap((f) => f.cites)]).slice(0, 10),
  };
};

const ticketsAnswer: Handler = (_q, ds) => {
  const open = (ds.tickets ?? []).filter((t) => t.status !== "Resolved" && t.status !== "Closed");
  const within = open.filter((t) => t.slaDue.slice(0, 10) === ds.today || Date.parse(t.slaDue) < Date.parse(ds.now)).sort((a, b) => a.slaDue.localeCompare(b.slaDue));
  const later = open.filter((t) => !within.includes(t)).sort((a, b) => a.slaDue.localeCompare(b.slaDue));
  const mins = (iso: string) => Math.round((Date.parse(iso) - Date.parse(ds.now)) / 60000);
  const line = (t: (typeof open)[number]) => {
    const m = mins(t.slaDue);
    return `${t.id} ${t.priority} · ${t.customer} · due ${hhmm(t.slaDue)}${t.slaDue.slice(0, 10) === ds.today ? "" : ` ${date(t.slaDue, true)}`} (${m < 0 ? `${duration(-m)} over` : `${duration(m)} left`}) · ${t.assignee ? `${t.assignee}, ${t.status.toLowerCase()}` : "unassigned"}`;
  };
  if (!within.length)
    return { intent: "tickets", text: `No open ticket breaches today. ${later.length ? `The next deadline is ${later[0].id} at ${hhmm(later[0].slaDue)} on ${date(later[0].slaDue, true)}.` : "There are no open tickets."}`, points: later.slice(0, 3).map(line), cites: later.slice(0, 3).map((t) => t.id) };
  const risky = within.filter((t) => t.status !== "On site");
  return {
    intent: "tickets",
    text: `${plural(within.length, "open ticket")} fall${within.length === 1 ? "s" : ""} due today${risky.length ? `; ${risky.map((t) => t.id).join(", ")} ${risky.length === 1 ? "has" : "have"} nobody on site yet` : ", and an engineer is on site for each"}.`,
    points: [...within.map(line), ...later.slice(0, 2).map((t) => `Next: ${line(t)}`)],
    cites: [...within, ...later.slice(0, 2)].map((t) => t.id),
  };
};

const bomAnswer: Handler = (q, ds) => {
  const id = idsIn(q).find((x) => x.startsWith("BOM-"));
  const boms = (ds.boms ?? []).filter((b) => (id ? b.id === id : b.status === "Released"));
  if (!boms.length) return { intent: "bom", text: id ? `I can't find ${id} among the BOMs you can see.` : "There is no released BOM in the records you can see.", points: [], cites: [] };
  const points: string[] = [];
  const cites: string[] = [];
  for (const b of boms) {
    const short = bomShortages(b, ds);
    cites.push(b.id);
    if (!short.length) {
      points.push(`${b.id} rev ${b.revision}: every line is covered by reserved or free stock.`);
      continue;
    }
    for (const l of short) {
      points.push(`${l.itemId} ${l.item}: need ${l.required}, reserved ${l.reserved}, free ${l.free}, on order ${l.onOrder} → ${l.shortage} ${l.uom} short${l.pr ? `; on ${l.pr.id} (${l.pr.status.toLowerCase()})` : l.held ? `; ${l.held} on QC hold, not counted as free` : "; not covered"}.`);
      cites.push(l.itemId, ...(l.pr ? [l.pr.id] : []));
    }
  }
  const total = boms.reduce((a, b) => a + bomShortages(b, ds).length, 0);
  return { intent: "bom", text: total ? `${boms.map((b) => b.id).join(", ")}: ${plural(total, "line")} short. Shortage = required − reserved − free − on order.` : `No shortages on ${boms.map((b) => b.id).join(", ")}.`, points, cites: uniq(cites) };
};

const approvalsAnswer: Handler = (_q, ds) => {
  const me = ds.user;
  const pending = (ds.approvals ?? []).filter((x) => x.status === "Pending");
  if (!pending.length) return { intent: "approvals", text: "Nothing is waiting for approval.", points: [], cites: [] };
  const role = me?.role.toLowerCase() ?? "";
  const mine = pending.filter((x) => x.maker !== me?.name && (x.level.toLowerCase().includes(role) || (me?.approveModules ?? []).includes(x.module)));
  const others = pending.filter((x) => !mine.includes(x));
  const line = (x: (typeof pending)[number]) => `${x.reference} · ${x.title} · ${x.value} · from ${x.maker}, ${x.level.split(" · ").pop()}`;
  return {
    intent: "approvals",
    text: mine.length ? `${plural(mine.length, "approval")} ${mine.length === 1 ? "is" : "are"} yours to decide${others.length ? `, and ${others.length} more wait${others.length === 1 ? "s" : ""} on other approvers` : ""}. Mine is judged from the approval level and your role's rights.` : `None of the ${plural(pending.length, "pending approval")} routes to your role.`,
    points: [...mine.map(line), ...others.map((x) => `Waiting on others: ${line(x)}`)],
    cites: uniq([...mine, ...others].map((x) => x.reference)),
  };
};

/** Monday–Friday of next week. */
function nextWeek(today: string) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sun
  const mon = addDays(today, ((8 - dow) % 7) || 7);
  return { from: mon, to: addDays(mon, 4) };
}

const freeAnswer: Handler = (q, ds) => {
  const w = /this week/.test(q) ? { from: ds.today, to: addDays(ds.today, 5 - Math.max(1, new Date(`${ds.today}T00:00:00Z`).getUTCDay())) } : nextWeek(ds.today);
  const hr = ds.visible.includes("hr");
  const people = (ds.people ?? []).filter((p) => !["HR", "Sales", "Management"].includes(p.department));
  const free: string[] = [];
  const part: string[] = [];
  const cites: string[] = [];
  for (const p of people) {
    const leave = hr ? (ds.leaveRequests ?? []).find((l) => l.personId === p.id && l.status !== "Rejected" && l.from <= w.to && l.to >= w.from) : undefined;
    const exit = hr ? (ds.exitCases ?? []).find((x) => x.personId === p.id && x.status !== "Closed") : undefined;
    const busyUntil = p.status === "Deployed" && p.assignmentUntil ? p.assignmentUntil : undefined;
    const desc = `${p.name} (${p.role}, ${p.location}, ${p.utilisation}% this month)`;
    if (exit && exit.lastDay < w.from) continue;
    if (busyUntil && busyUntil >= w.to) continue;
    if (leave && leave.from <= w.from && leave.to >= w.to) continue;
    const notes: string[] = [];
    if (busyUntil && busyUntil >= w.from) notes.push(`free from ${date(addDays(busyUntil, 1), true)} (${p.assignment} until ${date(busyUntil, true)})`);
    if (leave) notes.push(`${leave.kind.toLowerCase()} leave ${date(leave.from, true)}–${date(leave.to, true)} (${leave.id})`);
    if (exit && exit.lastDay <= w.to) notes.push(`last day ${date(exit.lastDay, true)} (${exit.id})`);
    if (notes.length) part.push(`${desc}: ${notes.join("; ")}`);
    else free.push(`${desc}${p.status === "On leave" ? "; back from leave before then" : ""}${exit ? `; leaves ${date(exit.lastDay, true)} (${exit.id})` : ""}${p.assignment && p.assignmentUntil && p.assignmentUntil < w.from ? `; ${p.assignment} ends ${date(p.assignmentUntil, true)}` : ""}`);
    cites.push(p.id, ...(leave ? [leave.id] : []), ...(exit ? [exit.id] : []));
  }
  return {
    intent: "people",
    text: `For ${date(w.from, true)}–${date(w.to, true)}: ${plural(free.length, "person", "people")} free all week and ${part.length} for part of it, from deployments${hr ? ", leave and exits" : ""}. HR, Sales and Management are left out.${hr ? "" : " Leave and exits are outside your role, so planned leave isn't checked."}`,
    points: [...free.map((x) => `Free: ${x}`), ...part.map((x) => `Part of the week: ${x}`)],
    cites: uniq(cites),
  };
};

const unbilledAnswer: Handler = (_q, _ds, a) => {
  const rel = a.findings.filter((f) => ["earned-unbilled", "billing-mismatch", "posting-failed"].includes(f.rule));
  const b = a.forecasts.billable;
  const points = rel.map((f) => f.brief);
  if (b) points.push(`${inr(b.total)} more becomes billable by ${date(b.windowEnd, true)} across ${plural(b.items.length, "milestone")}${b.atRisk ? `; ${inr(b.atRisk)} of it sits behind a blocked step` : ""}.`);
  const earned = rel.filter((f) => f.rule === "earned-unbilled");
  return {
    intent: "billing",
    text: earned.length ? `${plural(earned.length, "earned milestone")} ${earned.length === 1 ? "isn't" : "aren't"} invoiced yet.` : "Every done billable milestone has billing advice; nothing earned is left unadvised.",
    points,
    cites: uniq([...rel.flatMap((f) => f.cites), ...(b?.items.map((i) => i.projectId) ?? [])]).slice(0, 12),
  };
};

const fromFindings =
  (intent: string, rules: string[], none: string): Handler =>
  (_q, _ds, a) => {
    const fs = a.findings.filter((f) => rules.includes(f.rule));
    return { intent, text: fs.length ? `${plural(fs.length, "thing")} to look at:` : none, points: fs.map((f) => f.detail), cites: uniq(fs.flatMap((f) => f.cites)).slice(0, 12) };
  };

const summaryAnswer: Handler = (_q, _ds, a) => ({
  intent: "summary",
  text: a.briefing.length ? "Here is what matters most today, highest first:" : "Nothing in the records you can see needs attention today.",
  points: a.briefing.map((f) => f.brief),
  cites: uniq(a.briefing.flatMap((f) => f.cites)).slice(0, 12),
});

const recordAnswer: Handler = (q, ds, a) => {
  const ids = idsIn(q);
  const id = ids[0];
  const fs: Finding[] = a.findings.filter((f) => f.cites.includes(id));
  const known = Object.entries(ds).some(([, v]) => Array.isArray(v) && (v as { id?: string; key?: string }[]).some((r) => r && (r.id === id || r.key === id)));
  if (!known) return { intent: "record", text: `I can't find ${id} in the records you can see. It may not exist, or it may sit in a module outside your role.`, points: [], cites: [] };
  return {
    intent: "record",
    text: fs.length ? `${id} appears in ${plural(fs.length, "finding")}:` : `${id} is on record and no rule flags it right now.`,
    points: fs.map((f) => f.detail),
    cites: uniq([id, ...fs.flatMap((f) => f.cites)]).slice(0, 10),
  };
};

/* ---------------------------------------------------------------- intents */
const INTENTS: Intent[] = [
  { id: "approvals", needs: [], match: (q) => has(q, /approv/, "sign off", "sign-off", "my queue", "waiting on me", "decide"), run: approvalsAnswer },
  { id: "free", needs: [], match: (q) => has(q, /\bfree\b/, "available", "capacity", "spare", "bandwidth", "who can"), run: freeAnswer },
  { id: "tickets", needs: ["assets"], match: (q) => has(q, "ticket", /\bsla\b/, "breach", "service call", "response"), run: ticketsAnswer },
  { id: "bom", needs: ["inventory"], match: (q) => has(q, "short", /\bbom/, "missing material"), run: bomAnswer },
  { id: "billing", needs: ["projects", "sales"], match: (q) => has(q, "unbilled", "bill", "invoice", "earned", "cash"), run: unbilledAnswer },
  { id: "payroll", needs: ["payroll"], match: (q) => has(q, "payroll", "salary", "pay run", "payslip"), run: fromFindings("payroll", ["payroll"], "The open pay run has no blocked or warning checks.") },
  { id: "calibration", needs: ["assets"], match: (q) => has(q, "calibrat"), run: fromFindings("calibration", ["calibration"], "No calibration is overdue, due within 14 days or out of tolerance.") },
  { id: "leavers", needs: ["hr"], match: (q) => has(q, "leaver", "leaving", "exit", "resign", "offboard"), run: fromFindings("leavers", ["leaver"], "No open exit case has anything outstanding.") },
  { id: "margin", needs: ["projects"], match: (q) => has(q, "margin", "budget", "overrun", "cost"), run: fromFindings("margin", ["margin"], "No project's cost is running ahead of its budget on a straight-line forecast.") },
  { id: "purchase", needs: ["purchase"], match: (q) => has(q, "purchase order", /\bpo\b/, "supplier", "vendor", "late deliver"), run: fromFindings("purchase", ["po-followup"], "No open purchase order is late or has rejected lines.") },
  { id: "stock", needs: ["inventory"], match: (q) => has(q, "stock", "reorder", "qc hold", "quarantin", "inventory"), run: fromFindings("stock", ["qc-hold", "reorder", "adjustment", "subcontract"], "No stock exceptions: nothing on hold that a BOM needs, nothing below reorder level.") },
  { id: "project", needs: ["projects"], match: (q) => /\bprj-\d{4}\b/.test(q) || has(q, "project", "blocking", "at risk", "behind"), run: projectAnswer },
  { id: "summary", needs: [], match: (q) => has(q, "summary", "brief", "today", "priorit", "focus", "what should", "top"), run: summaryAnswer },
];

export function answerLocally(question: string, ds: Dataset, a: Analysis): Answer {
  const q = question.trim().toLowerCase();
  const intent = INTENTS.find((i) => i.match(q));
  if (intent) {
    const missing = intent.needs.filter((m) => !ds.visible.includes(m));
    if (missing.length) return { intent: intent.id, text: outside(missing), points: [], cites: [] };
    return intent.run(q, ds, a);
  }
  if (idsIn(q).length) return recordAnswer(q, ds, a);
  return {
    intent: "fallback",
    text: "I don't have a built-in answer for that yet. I can answer about a project's blockers, BOM shortages, tickets due today, approvals waiting for you, who is free next week, unbilled work, payroll, calibration, leavers, margins and late purchase orders, or look up any record id.",
    points: [],
    cites: [],
  };
}

/** Suggested questions, built from the data so each one has a real answer. */
export function suggestions(ds: Dataset, a: Analysis): string[] {
  const out: string[] = [];
  const top = a.projects[0]?.project;
  if (top && ds.visible.includes("projects")) out.push(`What's blocking ${top.id}?`);
  if (ds.visible.includes("assets")) out.push("Which tickets breach today?");
  const bom = (ds.boms ?? []).find((b) => b.status === "Released" && bomShortages(b, ds).length);
  if (bom) out.push(`Shortages on ${bom.id}`);
  out.push("What needs my approval?");
  out.push("Who is free next week?");
  if (ds.visible.includes("projects") && ds.visible.includes("sales")) out.push("Unbilled milestones");
  return out.slice(0, 6);
}

