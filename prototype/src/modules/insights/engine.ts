/**
 * Insights engine. Pure TypeScript, no React and no browser APIs, so the same rules run
 * in the browser (Insights page, local answers) and on the API server (grounding for
 * /api/assist). Every finding is computed from records in the dataset; nothing is typed
 * by hand. A module the signed-in role can't view is simply absent from the dataset,
 * and every rule that needs it reports "outside your role" instead of running.
 */
import { date, duration, inr, time } from "../../api/format";
import type {
  AccountingPosting,
  Approval,
  Asset,
  BillingAdvice,
  Bom,
  CalibrationJob,
  Claim,
  ExitCase,
  Item,
  LeaveRequest,
  Milestone,
  ModuleKey,
  Opportunity,
  PayrollRun,
  Person,
  Project,
  PurchaseOrder,
  PurchaseRequest,
  Quotation,
  Rfq,
  SalesOrder,
  ServiceContract,
  ServiceTicket,
  StockMovement,
  SubcontractIssue,
  Tone,
  Vendor,
  WorkOrder,
} from "../../api/types";

/* ================================================================ types */
export type Area = "delivery" | "supply" | "service" | "commercial" | "people";
export type Severity = "high" | "medium" | "low";

export const AREA_LABEL: Record<Area, string> = { delivery: "Delivery", supply: "Supply chain", service: "Service", commercial: "Commercial", people: "People" };
export const SEVERITY_LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low" };
export const SEVERITY_TONE: Record<Severity, Tone> = { high: "risk", medium: "warn", low: "info" };
export const MODULE_LABEL: Partial<Record<ModuleKey, string>> = {
  projects: "Projects",
  inventory: "Inventory",
  assets: "Assets & Service",
  purchase: "Purchase",
  sales: "Sales",
  crm: "CRM",
  hr: "People",
  payroll: "Payroll",
  dashboard: "Dashboard",
};

export interface Dataset {
  /** Business date ("2026-11-03") and instant the analysis is made at. */
  today: string;
  now: string;
  /** Modules the signed-in role may view. Data for any other module must be absent. */
  visible: ModuleKey[];
  /** The signed-in user, for "what needs my approval". */
  user?: { name: string; role: string; approveModules?: ModuleKey[] };
  projects?: Project[];
  items?: Item[];
  boms?: Bom[];
  workOrders?: WorkOrder[];
  movements?: StockMovement[];
  subcontractIssues?: SubcontractIssue[];
  assets?: Asset[];
  tickets?: ServiceTicket[];
  contracts?: ServiceContract[];
  calibrations?: CalibrationJob[];
  purchaseRequests?: PurchaseRequest[];
  rfqs?: Rfq[];
  purchaseOrders?: PurchaseOrder[];
  vendors?: Vendor[];
  salesOrders?: SalesOrder[];
  billingAdvices?: BillingAdvice[];
  postings?: AccountingPosting[];
  quotations?: Quotation[];
  opportunities?: Opportunity[];
  approvals?: Approval[];
  people?: Person[];
  leaveRequests?: LeaveRequest[];
  claims?: Claim[];
  payrollRuns?: PayrollRun[];
  exitCases?: ExitCase[];
}

export interface FindingAction {
  label: string;
  /** Open this record (preferred), or a module tab. */
  recordId?: string;
  module?: ModuleKey;
  tab?: string;
}

export interface Finding {
  id: string;
  rule: string;
  area: Area;
  severity: Severity;
  score: number;
  title: string;
  /** Plain-English explanation. Record ids in the text are linked by the UI. */
  detail: string;
  /** One sentence for "Today's briefing". */
  brief: string;
  numbers: { label: string; value: string }[];
  /** Every record the finding read from, most important first. */
  cites: string[];
  projectId?: string;
  action: FindingAction;
}

export interface RuleDef {
  id: string;
  name: string;
  area: Area;
  needs: ModuleKey[];
  definition: string;
  reqs: string;
}

export interface CheckResult {
  rule: RuleDef;
  status: "found" | "clear" | "hidden";
  count: number;
  missing: ModuleKey[];
}

export interface RiskDimension {
  score: number;
  tone: Tone;
  reasons: string[];
}
export interface ProjectRisk {
  project: Project;
  schedule: RiskDimension;
  cost: RiskDimension;
  material: RiskDimension;
  overall: number;
  tone: Tone;
}

export interface SlipItem {
  projectId: string;
  milestone: Milestone;
  reason: string;
}
export interface Forecasts {
  slipping: { dueThisMonth: number; items: SlipItem[]; alreadyLate: SlipItem[]; billableAtStake: number; monthLabel: string } | null;
  billable: { total: number; atRisk: number; items: (SlipItem & { atRisk: boolean })[]; inReview: number; windowEnd: string } | null;
}

export interface Analysis {
  findings: Finding[];
  checks: CheckResult[];
  projects: ProjectRisk[];
  forecasts: Forecasts;
  briefing: Finding[];
  hiddenModules: ModuleKey[];
  at: string;
}

/* ================================================================ helpers */
const DAY = 86_400_000;
const d10 = (iso: string) => iso.slice(0, 10);
/** Whole days from a to b (date parts only; negative = b is earlier). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(d10(b)) - Date.parse(d10(a))) / DAY);
export const addDays = (iso: string, n: number) => new Date(Date.parse(d10(iso)) + n * DAY).toISOString().slice(0, 10);
const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60_000);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n < 0 ? `${-n} days ago` : `in ${n} days`);
/** Clock time in IST. Timestamps arrive as "…+05:30" (fixtures) or "2026-11-03 08:30:00+00" (PostgreSQL), so parse the instant rather than slicing text. */
const hhmm = (iso: string) => time(iso.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
const OPEN_TICKET = (t: ServiceTicket) => t.status !== "Resolved" && t.status !== "Closed";
export const freeQty = (i: Pick<Item, "onHand" | "reserved" | "quarantined">) => Math.max(0, i.onHand - i.reserved - i.quarantined);

const BASE: Record<Severity, number> = { high: 300, medium: 200, low: 100 };
/** Rank = severity, then how soon it bites, then how much money is involved. */
function rank(sev: Severity, daysToImpact: number | "stale" | null, value = 0, bonus = 0) {
  const urgency = daysToImpact === "stale" ? 50 : daysToImpact === null ? 15 : daysToImpact <= 0 ? 80 : daysToImpact <= 3 ? 70 : daysToImpact <= 7 ? 55 : daysToImpact <= 14 ? 40 : daysToImpact <= 30 ? 25 : 15;
  const money = value > 0 ? Math.max(0, Math.min(25, (Math.log10(value) - 4) * 10)) : 0;
  return Math.round(BASE[sev] + urgency + money + bonus);
}

/** Shortage per BOM line, with the cover that exists for it (open PR line, QC-held stock). */
export interface ShortLine {
  itemId: string;
  item: string;
  uom: string;
  required: number;
  reserved: number;
  free: number;
  onOrder: number;
  held: number;
  shortage: number;
  pr?: PurchaseRequest;
}
export function bomShortages(bom: Bom, ds: Dataset): ShortLine[] {
  const items = ds.items ?? [];
  return bom.lines
    .map((l) => {
      const it = items.find((i) => i.id === l.itemId);
      const free = it ? freeQty(it) : l.available;
      const shortage = Math.max(0, l.required - l.reserved - free - l.onOrder);
      const held = it?.quarantined ?? 0;
      // Stock on QC hold is its own cover (release or replace); a fallback requisition isn't the order for it.
      const pr = held ? undefined : (ds.purchaseRequests ?? []).find((p) => p.status !== "Rejected" && p.status !== "Converted" && p.lines.some((pl) => pl.item === l.item));
      return { itemId: l.itemId, item: l.item, uom: l.uom, required: l.required, reserved: l.reserved, free, onOrder: l.onOrder, held, shortage, pr };
    })
    .filter((l) => l.shortage > 0);
}

const OPEN_PR = (p: PurchaseRequest) => p.status === "Awaiting approval" || p.status === "Draft";

/** Fastest full-fit quote on the RFQ behind a requisition, and when it would land if ordered today. */
function fastestFullFit(prId: string, ds: Dataset) {
  const rfq = (ds.rfqs ?? []).find((r) => r.prId === prId && r.status !== "Cancelled");
  if (!rfq || rfq.status === "Awarded") return null;
  const q = rfq.quotes.filter((x) => x.technicalFit === "Full").sort((a, b) => a.leadDays - b.leadDays)[0];
  return q ? { rfq, quote: q, lands: addDays(ds.today, q.leadDays) } : null;
}

const isOnLeave = (personId: string, day: string, ds: Dataset) =>
  (ds.leaveRequests ?? []).find((l) => l.personId === personId && l.status !== "Rejected" && d10(l.from) <= d10(day) && d10(l.to) >= d10(day));

const projectBom = (p: Project, ds: Dataset) => (ds.boms ?? []).find((b) => b.id === p.bom || b.projectId === p.id);

/* ================================================================ rules */
export const RULES: RuleDef[] = [
  { id: "gate-risk", name: "Gate at risk on an active project", area: "delivery", needs: ["projects"], reqs: "DASH-003", definition: "A gated milestone due in the next 30 days whose project has a blocked or late milestone before it, a BOM shortage, or an unapproved requisition." },
  { id: "milestone-blocked", name: "Blocked or overdue milestones", area: "delivery", needs: ["projects"], reqs: "DASH-003", definition: "Milestones marked Blocked or Late, or past their due date without a done date, on projects the gate check didn't already explain." },
  { id: "sla-today", name: "Service response due within 24 hours", area: "service", needs: ["assets"], reqs: "DASH-007", definition: "Open tickets whose SLA deadline falls in the next 24 hours and nobody is on site yet. P1 and P2 inside 6 hours rank high." },
  { id: "assignee-away", name: "Ticket assigned to someone away", area: "service", needs: ["assets"], reqs: "DASH-007, HR-018", definition: "Open tickets whose engineer is marked on leave, or has leave covering the SLA day." },
  { id: "unassigned", name: "Tickets without an engineer", area: "service", needs: ["assets"], reqs: "DASH-007", definition: "Open tickets with no assignee." },
  { id: "calibration", name: "Calibration overdue, due or out of tolerance", area: "service", needs: ["assets"], reqs: "DASH-008", definition: "Calibration jobs overdue, due within 14 days, or with a recorded reading outside tolerance." },
  { id: "contracts", name: "Contract renewal and visit entitlement", area: "service", needs: ["assets"], reqs: "DASH-008, SAL-016", definition: "AMC/O&M contracts ending within 60 days, or with 85% or more of included visits used and over a month left." },
  { id: "bom-shortage", name: "BOM shortages", area: "supply", needs: ["inventory"], reqs: "DASH-005", definition: "Released BOM lines where required − reserved − free − on order is above zero. Stock on QC hold is never counted as free." },
  { id: "qc-hold", name: "Stock on QC hold that a BOM needs", area: "supply", needs: ["inventory"], reqs: "DASH-005, INV-026", definition: "Items with quarantined quantity that a released BOM is short of." },
  { id: "reorder", name: "Below reorder level, nothing on order", area: "supply", needs: ["inventory"], reqs: "INV-025", definition: "Free stock below the reorder level with nothing on order or requested, and none of it on QC hold." },
  { id: "adjustment", name: "Stock adjustments waiting", area: "supply", needs: ["inventory"], reqs: "E2E-11", definition: "Count adjustments still Pending more than 3 days after they were recorded." },
  { id: "subcontract", name: "Material at partner shops", area: "supply", needs: ["inventory"], reqs: "E2E-04", definition: "Open subcontract issues past their reconcile-by date, or due within 7 days with material outstanding or damage without a partner report." },
  { id: "po-followup", name: "Late or rejected purchase deliveries", area: "supply", needs: ["purchase"], reqs: "DASH-004", definition: "Open purchase orders past their expected date, or with lines rejected at receipt." },
  { id: "billing-mismatch", name: "Billing that doesn't reconcile", area: "commercial", needs: ["sales"], reqs: "E2E-10", definition: "Billing advice in Mismatch, or an acknowledged posting whose invoiced amount differs from the advice." },
  { id: "posting-failed", name: "Failed accounting postings", area: "commercial", needs: ["sales"], reqs: "E2E-10, SYS-06", definition: "Outbox postings in Failed state." },
  { id: "earned-unbilled", name: "Earned but not invoiced", area: "commercial", needs: ["projects", "sales"], reqs: "DASH-003, SAL-016", definition: "Done billable milestones with no advice and beyond the billed amount, or advice still in review 7 days after it was raised." },
  { id: "margin", name: "Cost running ahead of budget", area: "commercial", needs: ["projects"], reqs: "PM-016", definition: "Forecast at completion (incurred ÷ progress, a straight-line estimate) above budget, or commitments above 95% of budget before 95% progress." },
  { id: "quote-expiry", name: "Quotations about to lapse", area: "commercial", needs: ["sales"], reqs: "SAL-016", definition: "Sent, in-review or draft quotations that expire within 21 days." },
  { id: "payroll", name: "Payroll run blocked", area: "people", needs: ["payroll"], reqs: "E2E-08", definition: "The open pay run has an input check marked Blocked or Warning." },
  { id: "leaver", name: "Leavers with open items", area: "people", needs: ["hr"], reqs: "E2E-12", definition: "Exit cases with open checklist items, leave requested after the last day, or work scheduled for the person after it." },
  { id: "utilisation", name: "People above 90% utilisation", area: "people", needs: ["projects"], reqs: "PM-009, HR-018", definition: "People above 90% utilisation this month, with where spare capacity sits." },
  { id: "certificates", name: "Site certificates expiring", area: "people", needs: ["hr"], reqs: "HR-018", definition: "Personal certifications that expire within 30 days." },
  { id: "claims", name: "Expense claims waiting", area: "people", needs: ["hr"], reqs: "DASH-009", definition: "Claims still Pending, with any that belong to a leaver." },
];
const RULE = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<string, RuleDef>;

type Draft = Omit<Finding, "area" | "rule"> & { area?: Area };
const mk = (rule: string, f: Draft): Finding => ({ ...f, rule, area: f.area ?? RULE[rule].area });

/* ---------------------------------------------------------------- delivery */
function gateRisk(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const p of ds.projects ?? []) {
    if (p.status === "Closed" || p.status === "On hold") continue;
    const open = p.milestones.filter((m) => m.status !== "Done");
    const blockedMs = open.filter((m) => m.status === "Blocked");
    const lateMs = open.filter((m) => m.status === "Late" || (m.status !== "Blocked" && daysBetween(ds.today, m.due) < 0));
    const bom = ds.visible.includes("inventory") ? projectBom(p, ds) : undefined;
    const short = bom ? bomShortages(bom, ds) : [];
    const prs = ds.visible.includes("purchase") ? (ds.purchaseRequests ?? []).filter((r) => r.projectId === p.id && r.status === "Awaiting approval") : [];
    const blockers = blockedMs.length + lateMs.length + (short.length ? 1 : 0) + prs.length;
    if (!blockers) continue;
    const window = open.filter((m) => m.gate && daysBetween(ds.today, m.due) >= 0 && daysBetween(ds.today, m.due) <= 30);
    if (!window.length) continue;
    // The gate that matters: the last one in the window that sits after (or is) a blocked step.
    const target = [...window].sort((a, b) => b.due.localeCompare(a.due))[0];
    const firstBlocked = blockedMs.sort((a, b) => a.due.localeCompare(b.due))[0];
    const held = short.filter((l) => l.held > 0);
    const units = short.reduce((a, l) => a + l.shortage, 0);
    const pr = prs[0];
    const parts: string[] = [];
    if (firstBlocked && firstBlocked.id !== target.id) parts.push(`It depends on ${firstBlocked.name.toLowerCase()} (${date(firstBlocked.due, true)}), which is blocked.`);
    if (lateMs.length) parts.push(`${cap(list(lateMs.map((m) => `${m.name.toLowerCase()} is ${-daysBetween(ds.today, m.due)} days late`)))}.`);
    const supply: string[] = [];
    if (short.length && bom) supply.push(`${bom.id} is ${plural(short.length, "line")} short (${units} units)`);
    if (pr) supply.push(`${pr.id} (${inr(pr.value)}) is still awaiting approval`);
    if (held.length) supply.push(`${held.reduce((a, l) => a + l.held, 0)} ${held.length === 1 ? held[0].item.split(" · ")[0].toLowerCase() + "s" : "units"} are on QC hold`);
    const days = daysBetween(ds.today, target.due);
    const impactDays = firstBlocked ? daysBetween(ds.today, firstBlocked.due) : days;
    const sev: Severity = days <= 21 && (blockedMs.length > 0 || blockers >= 2) ? "high" : "medium";
    const gateName = target.gate ?? target.name;
    out.push(
      mk("gate-risk", {
        id: `gate-risk:${p.id}:${target.id}`,
        severity: sev,
        score: rank(sev, impactDays, target.billable ?? 0, 10),
        projectId: p.id,
        title: `${gateName} on ${date(target.due, true)} at risk for ${p.id}`,
        detail: `${p.id} (${p.name}, ${p.customer}) has its ${gateName} on ${date(target.due, true)}${target.billable ? `, worth ${inr(target.billable)} in billing` : ""}. ${parts.length ? parts.join(" ") : ""}${supply.length ? ` ${cap(list(supply))}.` : ""}`.trim(),
        brief: `${p.id} is the job most at risk: ${firstBlocked && firstBlocked.id !== target.id ? `${firstBlocked.name.toLowerCase()} on ${date(firstBlocked.due, true)} is blocked and the ${gateName} on ${date(target.due, true)} depends on it` : `its ${gateName} on ${date(target.due, true)} has ${plural(blockers, "open blocker")}`}${pr ? `, while ${pr.id} is still awaiting approval` : ""}${held.length ? ` and ${held.reduce((a, l) => a + l.held, 0)} ${held.length === 1 ? held[0].item.split(" · ")[0].toLowerCase() + "s" : "units"} are held at QC` : ""}.`,
        numbers: [
          { label: "Gate", value: `${gateName} · ${date(target.due, true)} (${inDays(days)})` },
          ...(target.billable ? [{ label: "Billable at the gate", value: inr(target.billable) }] : []),
          ...(blockedMs.length || lateMs.length ? [{ label: "Milestones behind", value: [...blockedMs.map((m) => `${m.id} blocked`), ...lateMs.map((m) => `${m.id} ${-daysBetween(ds.today, m.due)} d late`)].join(" · ") }] : []),
          ...(short.length && bom ? [{ label: `${bom.id} short`, value: `${plural(short.length, "line")} · ${units} units` }] : []),
          ...(pr ? [{ label: pr.id, value: `${inr(pr.value)} · awaiting approval` }] : []),
          { label: "Progress", value: `${p.progress}% · due ${date(p.due, true)}` },
        ],
        cites: [p.id, ...(bom && short.length ? [bom.id] : []), ...prs.map((x) => x.id), ...held.map((l) => l.itemId), ...(p.workOrder ? [p.workOrder] : [])],
        action: { label: `Open ${p.id}`, recordId: p.id },
      }),
    );
  }
  return out;
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function milestoneBlocked(ds: Dataset, explained: Set<string>): Finding[] {
  const out: Finding[] = [];
  for (const p of ds.projects ?? []) {
    if (p.status === "Closed" || explained.has(p.id)) continue;
    const bad = p.milestones.filter((m) => m.status === "Blocked" || m.status === "Late" || (m.status !== "Done" && daysBetween(ds.today, m.due) < 0));
    if (!bad.length) continue;
    const m = bad.sort((a, b) => a.due.localeCompare(b.due))[0];
    const days = daysBetween(ds.today, m.due);
    const risk = p.risks[0];
    const sev: Severity = m.billable || p.status === "At risk" ? "high" : "medium";
    out.push(
      mk("milestone-blocked", {
        id: `milestone-blocked:${p.id}:${m.id}`,
        severity: sev,
        score: rank(sev, days < 0 ? "stale" : days, m.billable ?? 0),
        projectId: p.id,
        title: `${p.id}${p.status === "On hold" ? " is on hold" : ""}: ${m.name.toLowerCase()} ${m.status === "Blocked" ? "blocked" : "late"}`,
        detail: `${p.name} at ${p.customer} ${p.status === "On hold" ? "is on hold. Its" : "has its"} ${m.name.toLowerCase()} milestone ${m.status === "Blocked" ? "blocked" : "late"}, due ${date(m.due, true)} (${inDays(days)}).${risk ? ` Logged risk: ${risk.title.toLowerCase()} (${risk.owner}); ${risk.mitigation.charAt(0).toLowerCase()}${risk.mitigation.slice(1)}` : ""}`,
        brief: `${p.id} ${p.status === "On hold" ? "is on hold" : "is behind"}: ${m.name.toLowerCase()} is ${m.status === "Blocked" ? "blocked" : "late"} and due ${date(m.due, true)}.`,
        numbers: [
          { label: "Milestone", value: `${m.id} ${m.name} · ${date(m.due, true)}` },
          { label: "Status", value: `${m.status}${days < 0 ? ` · ${-days} days overdue` : ""}` },
          { label: "Project", value: `${p.status} · ${p.progress}% complete` },
          { label: "Manager", value: p.manager },
        ],
        cites: [p.id],
        action: { label: `Open ${p.id}`, recordId: p.id },
      }),
    );
  }
  return out;
}

/* ---------------------------------------------------------------- service */
function slaToday(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const t of ds.tickets ?? []) {
    if (!OPEN_TICKET(t) || t.status === "On site") continue;
    const mins = minutesBetween(ds.now, t.slaDue);
    if (mins > 24 * 60) continue;
    const urgent = t.priority === "P1" || t.priority === "P2";
    const sev: Severity = urgent && mins <= 6 * 60 ? "high" : urgent ? "medium" : "low";
    const contract = (ds.contracts ?? []).find((c) => c.id === t.contractId);
    const when = mins < 0 ? `was due at ${hhmm(t.slaDue)} and is ${duration(-mins)} past it` : `must be answered by ${hhmm(t.slaDue)}${d10(t.slaDue) === ds.today ? " today" : ` on ${date(t.slaDue, true)}`}, ${duration(mins)} from now`;
    out.push(
      mk("sla-today", {
        id: `sla-today:${t.id}`,
        severity: sev,
        score: rank(sev, 0),
        title: `${t.id} ${t.priority} ${mins < 0 ? "breached its SLA" : `due by ${hhmm(t.slaDue)}`}`,
        detail: `${t.id}, a ${t.priority} ${t.kind.toLowerCase()} at ${t.customer} (${t.title}), ${when}. ${t.assignee ? `${t.assignee} is assigned but not on site yet (status ${t.status}).` : "Nobody is assigned yet."}${contract ? ` Covered by ${contract.id}: ${contract.responseHours} h response${t.chargeable ? "" : ", no charge"}.` : ""}`,
        brief: `${t.id}, a ${t.priority} ${t.kind.toLowerCase()} at ${t.customer}, ${when}.`,
        numbers: [
          { label: "Response due", value: `${hhmm(t.slaDue)} ${d10(t.slaDue) === ds.today ? "today" : date(t.slaDue, true)} · ${mins < 0 ? `${duration(-mins)} over` : `${duration(mins)} left`}` },
          { label: "Priority", value: `${t.priority} · ${t.kind}` },
          { label: "Engineer", value: t.assignee ? `${t.assignee} · ${t.status}` : "Unassigned" },
          ...(contract ? [{ label: "Contract", value: `${contract.id} · ${contract.responseHours} h response` }] : []),
        ],
        cites: [t.id, t.assetId, ...(contract ? [contract.id] : [])],
        action: { label: `Open ${t.id}`, recordId: t.id },
      }),
    );
  }
  return out;
}

function assigneeAway(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const t of ds.tickets ?? []) {
    if (!OPEN_TICKET(t) || !t.assignee) continue;
    const person = (ds.people ?? []).find((p) => p.name === t.assignee);
    if (!person) continue;
    const leave = isOnLeave(person.id, t.slaDue, ds) ?? isOnLeave(person.id, ds.today, ds);
    if (!leave && person.status !== "On leave") continue;
    const mins = minutesBetween(ds.now, t.slaDue);
    const urgent = t.priority === "P1" || t.priority === "P2";
    const sev: Severity = urgent ? "high" : "medium";
    const away = leave ? `on ${leave.status === "Approved" ? "approved" : "requested"} ${leave.kind.toLowerCase()} leave from ${date(leave.from, true)} to ${date(leave.to, true)}` : "marked on leave";
    out.push(
      mk("assignee-away", {
        id: `assignee-away:${t.id}`,
        severity: sev,
        score: rank(sev, Math.max(0, Math.floor(mins / 1440))),
        title: `${t.id} is assigned to ${person.name}, who is away`,
        detail: `${t.id} (${t.priority}, ${t.title}, ${t.customer}) is due ${date(t.slaDue, true)} at ${hhmm(t.slaDue)}. Its engineer, ${person.name}, is ${away}${leave ? ` (${leave.id})` : ""}. Reassign it before the SLA falls due.`,
        brief: `${t.id} is due ${inDays(daysBetween(ds.today, t.slaDue))}, but ${person.name} is ${away}.`,
        numbers: [
          { label: "SLA due", value: `${date(t.slaDue, true)} · ${hhmm(t.slaDue)} (${duration(Math.max(0, mins))} left)` },
          { label: "Engineer", value: `${person.name} · ${person.status}` },
          ...(leave ? [{ label: "Leave", value: `${leave.id} · ${date(leave.from, true)}–${date(leave.to, true)} · ${leave.status}` }] : []),
        ],
        cites: [t.id, person.id, ...(leave ? [leave.id] : []), ...(t.contractId ? [t.contractId] : [])],
        action: { label: `Reassign ${t.id}`, recordId: t.id },
      }),
    );
  }
  return out;
}

function unassigned(ds: Dataset): Finding[] {
  return (ds.tickets ?? [])
    .filter((t) => OPEN_TICKET(t) && !t.assignee)
    .map((t) => {
      const mins = minutesBetween(ds.now, t.slaDue);
      const sameAsset = (ds.tickets ?? []).find((x) => x.id !== t.id && x.assetId === t.assetId && OPEN_TICKET(x) && x.assignee);
      const sev: Severity = t.priority === "P1" || t.priority === "P2" ? "high" : "low";
      return mk("unassigned", {
        id: `unassigned:${t.id}`,
        severity: sev,
        score: rank(sev, Math.max(0, Math.floor(mins / 1440))),
        title: `${t.id} has no engineer`,
        detail: `${t.id} (${t.priority}, ${t.title}, ${t.customer}) came in through the ${t.channel.toLowerCase()} and has no engineer; its SLA is due ${date(t.slaDue, true)} at ${hhmm(t.slaDue)}.${sameAsset ? ` ${sameAsset.assignee} is already assigned to the same asset (${t.assetId}) for ${sameAsset.id}.` : ""}`,
        brief: `${t.id} has no engineer yet and is due ${date(t.slaDue, true)}.`,
        numbers: [
          { label: "SLA due", value: `${date(t.slaDue, true)} · ${hhmm(t.slaDue)} (${duration(Math.max(0, mins))} left)` },
          { label: "Asset", value: t.asset },
          ...(sameAsset ? [{ label: "Same asset", value: `${sameAsset.id} · ${sameAsset.assignee}` }] : []),
        ],
        cites: [t.id, t.assetId, ...(sameAsset ? [sameAsset.id] : [])],
        action: { label: `Assign ${t.id}`, recordId: t.id },
      });
    });
}

function calibration(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const c of ds.calibrations ?? []) {
    if (c.status === "Passed" || c.status === "Scheduled") continue;
    const days = daysBetween(ds.today, c.due);
    const failed = c.points.filter((p) => !p.pass);
    if (c.status !== "Overdue" && days > 14 && !failed.length) continue;
    const asset = (ds.assets ?? []).find((a) => a.id === c.assetId);
    const ticket = (ds.tickets ?? []).find((t) => t.assetId === c.assetId && OPEN_TICKET(t));
    const pr = (ds.purchaseRequests ?? []).find((p) => p.source.includes(c.id) && p.status !== "Rejected");
    const sev: Severity = days < 0 && ticket ? "high" : "medium";
    const f = failed[0];
    out.push(
      mk("calibration", {
        id: `calibration:${c.id}`,
        severity: sev,
        score: rank(sev, days < 0 ? "stale" : days),
        title: days < 0 ? `${c.id} calibration ${-days} days overdue` : `${c.id} due ${date(c.due, true)}${f ? ", reading out of tolerance" : ""}`,
        detail: `${c.asset} (${c.assetId}${asset?.ownership === "Company" ? ", a company calibration master" : asset?.customer ? `, ${asset.customer}` : ""}) ${days < 0 ? `was due for calibration on ${date(c.due, true)} and is ${-days} days overdue` : `is due for calibration ${inDays(days)} (${date(c.due, true)})`}.${f ? ` Its ${f.nominal} reading was ${f.reading}, outside the ${f.tolerance} tolerance.` : ""}${ticket ? ` ${ticket.id} is open on the same asset: “${ticket.title}”.` : ""}${pr ? ` ${pr.id} (${pr.status.toLowerCase()}) covers the recertification.` : ""}`,
        brief: `${c.id} (${c.asset}) is ${days < 0 ? `${-days} days overdue` : `due ${date(c.due, true)}`}${f ? ` and failed its ${f.nominal} point` : ""}${ticket ? `, with ${ticket.id} open on the same asset` : ""}.`,
        numbers: [
          { label: "Due", value: `${date(c.due, true)} (${inDays(days)})` },
          { label: "Engineer", value: c.engineer },
          ...(f ? [{ label: "Out of tolerance", value: `${f.nominal}: ${f.reading} (${f.tolerance})` }] : []),
          ...(ticket ? [{ label: "Open ticket", value: `${ticket.id} · ${ticket.priority}` }] : []),
        ],
        cites: [c.id, c.assetId, ...(ticket ? [ticket.id] : []), ...(pr ? [pr.id] : [])],
        action: { label: `Open ${c.id}`, recordId: c.id },
      }),
    );
  }
  return out;
}

function contracts(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const c of ds.contracts ?? []) {
    if (c.status === "Expired") continue;
    const left = daysBetween(ds.today, c.end);
    const used = c.visitsIncluded ? c.visitsUsed / c.visitsIncluded : 0;
    if (left <= 60) {
      const crm = ds.visible.includes("crm") ? (ds.opportunities ?? []).filter((o) => o.account === c.customer && o.source === "Renewal" && o.stage !== "Lost") : null;
      out.push(
        mk("contracts", {
          id: `contracts:renewal:${c.id}`,
          area: "commercial",
          severity: "low",
          score: rank("low", left, c.annualValue),
          title: `${c.id} ends ${date(c.end, true)}`,
          detail: `${c.id}, the ${c.type} with ${c.customer} (${inr(c.annualValue)} a year), ends on ${date(c.end, true)}, ${inDays(left)}. ${c.visitsUsed} of ${c.visitsIncluded} included visits are used.${crm ? (crm.length ? ` ${crm[0].id} is open for the renewal.` : " CRM has no renewal opportunity for it yet.") : ""}`,
          brief: `${c.id} with ${c.customer} (${inr(c.annualValue)} a year) ends ${date(c.end, true)}${crm && !crm.length ? " with no renewal opportunity in CRM" : ""}.`,
          numbers: [
            { label: "Ends", value: `${date(c.end, true)} (${inDays(left)})` },
            { label: "Annual value", value: inr(c.annualValue) },
            { label: "Visits used", value: `${c.visitsUsed} of ${c.visitsIncluded}` },
          ],
          cites: [c.id, ...(crm ?? []).map((o) => o.id)],
          action: { label: `Open ${c.id}`, recordId: c.id },
        }),
      );
    } else if (used >= 0.85 && left > 30) {
      out.push(
        mk("contracts", {
          id: `contracts:visits:${c.id}`,
          severity: "low",
          score: rank("low", left),
          title: `${c.id} has used ${c.visitsUsed} of ${c.visitsIncluded} visits`,
          detail: `${c.id} (${c.type}, ${c.customer}) has used ${c.visitsUsed} of ${c.visitsIncluded} included visits (${pct(used)}) with ${left} days left. Visits beyond the entitlement would need a chargeable decision.`,
          brief: `${c.id} has ${c.visitsIncluded - c.visitsUsed} included visits left for ${left} days.`,
          numbers: [
            { label: "Visits used", value: `${c.visitsUsed} of ${c.visitsIncluded} · ${pct(used)}` },
            { label: "Contract ends", value: `${date(c.end, true)} (${inDays(left)})` },
          ],
          cites: [c.id],
          action: { label: `Open ${c.id}`, recordId: c.id },
        }),
      );
    }
  }
  return out;
}

/* ---------------------------------------------------------------- supply */
/** The first gated milestone, not done, on the project a BOM belongs to: what a shortage threatens. */
function neededBy(bom: Bom, ds: Dataset) {
  const p = (ds.projects ?? []).find((x) => x.id === bom.projectId);
  const m = p?.milestones.filter((x) => x.status !== "Done" && x.gate && x.gate !== "Delivery").sort((a, b) => a.due.localeCompare(b.due))[0];
  return { project: p, milestone: m };
}

function bomShortage(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const bom of ds.boms ?? []) {
    if (bom.status !== "Released") continue;
    const short = bomShortages(bom, ds);
    if (!short.length) continue;
    const units = short.reduce((a, l) => a + l.shortage, 0);
    const onPr = short.filter((l) => l.pr);
    const held = short.filter((l) => l.held > 0);
    const uncovered = short.filter((l) => !l.pr && !l.held);
    const pr = onPr[0]?.pr;
    const fast = pr && ds.visible.includes("purchase") ? fastestFullFit(pr.id, ds) : null;
    const { project, milestone } = neededBy(bom, ds);
    const wo = (ds.workOrders ?? []).find((w) => w.bomId === bom.id);
    const needDays = pr ? daysBetween(ds.today, pr.needBy) : milestone ? daysBetween(ds.today, milestone.due) : null;
    const sev: Severity = milestone && daysBetween(ds.today, milestone.due) <= 14 ? "high" : "medium";
    const prText = pr ? `${onPr.filter((l) => l.pr === pr).reduce((a, l) => a + l.shortage, 0)} of the missing units are on ${pr.id} (${inr(pr.value)}), which is ${pr.status.toLowerCase()}` : "";
    const fastText = fast ? `${fast.rfq.id}'s fastest full-fit quote (${fast.quote.vendor}, ${fast.quote.leadDays} days) lands ${date(fast.lands, true)} if ordered today${milestone && fast.lands >= milestone.due ? `, ${fast.lands === milestone.due ? "the same day as" : "after"} the ${(milestone.gate ?? milestone.name).toLowerCase()}` : ""}` : "";
    out.push(
      mk("bom-shortage", {
        id: `bom-shortage:${bom.id}`,
        severity: sev,
        score: rank(sev, needDays, pr?.value ?? 0),
        projectId: bom.projectId,
        title: `${bom.id} is ${plural(short.length, "line")} short`,
        detail: `${bom.id} rev ${bom.revision} (${bom.name}) is short on ${short.length} of ${bom.lines.length} lines, ${units} units in all${wo ? `, which holds ${wo.id} before assembly` : ""}. ${[prText, fastText].filter(Boolean).map(cap).join(". ")}${prText || fastText ? "." : ""}${held.length ? ` ${cap(list(held.map((l) => `${l.held} ${l.item.split(" · ")[0].toLowerCase()}${l.held === 1 ? "" : "s"}`)))} ${held.length === 1 && held[0].held === 1 ? "is" : "are"} on QC hold.` : ""}${uncovered.length ? ` ${plural(uncovered.length, "line")} ${uncovered.length === 1 ? "has" : "have"} no requisition or order at all.` : ""}`,
        brief: `${bom.id} is ${plural(short.length, "line")} short (${units} units)${pr ? ` and waits on ${pr.id}` : ""}.`,
        numbers: [
          { label: "Short lines", value: `${short.length} of ${bom.lines.length} · ${units} units` },
          ...short.map((l) => ({ label: l.itemId, value: `${l.shortage} ${l.uom} short${l.pr ? ` · on ${l.pr.id}` : l.held ? ` · ${l.held} on QC hold` : " · not covered"}` })),
          ...(pr ? [{ label: "Need by", value: `${date(pr.needBy, true)} (${pr.id})` }] : []),
          ...(fast ? [{ label: "Earliest delivery", value: `${date(fast.lands, true)} · ${fast.quote.vendor}` }] : []),
        ],
        cites: [bom.id, ...(pr ? [pr.id] : []), ...(fast ? [fast.rfq.id] : []), ...(wo ? [wo.id] : []), ...short.map((l) => l.itemId), ...(project ? [project.id] : [])],
        action: pr && pr.status === "Awaiting approval" ? { label: `Review ${pr.id}`, recordId: pr.id } : { label: "Open requirements", module: "inventory", tab: "mrp" },
      }),
    );
  }
  return out;
}

function qcHold(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const it of ds.items ?? []) {
    if (it.quarantined <= 0) continue;
    const bom = (ds.boms ?? []).find((b) => b.status === "Released" && bomShortages(b, ds).some((l) => l.itemId === it.id));
    if (!bom) continue;
    const { project, milestone } = neededBy(bom, ds);
    const receipt = (ds.movements ?? []).find((m) => m.itemId === it.id && m.type === "Receipt");
    const refs = receipt ? receipt.reference.match(/[A-Z]{2,4}-\d{3,4}/g) ?? [] : [];
    const fallback = (ds.purchaseRequests ?? []).find((p) => OPEN_PR(p) && p.lines.some((l) => l.item === it.name) && refs.some((r) => p.source.includes(r)));
    const risk = project?.risks.find((r) => /qc/i.test(r.title));
    const days = milestone ? daysBetween(ds.today, milestone.due) : null;
    const sev: Severity = days !== null && days <= 14 ? "high" : "medium";
    const value = it.quarantined * it.unitCost;
    out.push(
      mk("qc-hold", {
        id: `qc-hold:${it.id}`,
        severity: sev,
        score: rank(sev, days, value),
        projectId: project?.id,
        title: `${it.quarantined} ${it.name.split(" · ")[0].toLowerCase()}s on QC hold`,
        detail: `${it.quarantined} × ${it.name} (${it.id})${receipt ? ` from ${receipt.from}, received ${date(receipt.at, true)} on ${receipt.reference},` : ""} are on QC hold, so none can be issued. ${bom.id} needs them${project && milestone ? ` for ${project.id}'s ${milestone.name.toLowerCase()} on ${date(milestone.due, true)}` : ""}.${risk ? ` Plan on record: ${risk.mitigation.charAt(0).toLowerCase()}${risk.mitigation.slice(1)}` : ""}${fallback ? ` If they fail, ${fallback.id} (${fallback.status.toLowerCase()}, ${inr(fallback.value)}) replaces them.` : ""}`,
        brief: `${it.quarantined} ${it.name.split(" · ")[0].toLowerCase()}s are on QC hold and ${project && milestone ? `${project.id}'s ${(milestone.gate ?? milestone.name).toLowerCase()} on ${date(milestone.due, true)} needs them` : `${bom.id} needs them`}.`,
        numbers: [
          { label: "On QC hold", value: `${it.quarantined} ${it.uom} · ${inr(value)}` },
          ...(milestone ? [{ label: "Needed by", value: `${milestone.id} ${milestone.gate ?? milestone.name} · ${date(milestone.due, true)} (${inDays(days ?? 0)})` }] : []),
          ...(receipt ? [{ label: "Received", value: `${date(receipt.at, true)} · ${receipt.reference}` }] : []),
          ...(fallback ? [{ label: "Fallback", value: `${fallback.id} · ${fallback.status} · ${inr(fallback.value)}` }] : []),
        ],
        cites: [it.id, ...refs, bom.id, ...(project ? [project.id] : []), ...(fallback ? [fallback.id] : [])],
        action: { label: `Inspect ${it.id}`, recordId: it.id },
      }),
    );
  }
  return out;
}

function reorder(ds: Dataset): Finding[] {
  const low = (ds.items ?? []).filter((i) => i.quarantined === 0 && i.onOrder === 0 && freeQty(i) < i.reorderLevel && !(ds.purchaseRequests ?? []).some((p) => p.status !== "Rejected" && p.lines.some((l) => l.item === i.name)));
  if (!low.length) return [];
  return [
    mk("reorder", {
      id: "reorder",
      severity: "low",
      score: rank("low", null, low.reduce((a, i) => a + (i.reorderLevel - freeQty(i)) * i.unitCost, 0)),
      title: `${plural(low.length, "item")} below reorder level`,
      detail: `${list(low.map((i) => `${i.id} ${i.name.split(" · ")[0]} (${freeQty(i)} ${i.uom} free, reorder at ${i.reorderLevel})`))} ${low.length === 1 ? "is" : "are"} below reorder level with nothing on order or requested.`,
      brief: `${plural(low.length, "item")} ${low.length === 1 ? "is" : "are"} below reorder level with nothing on order.`,
      numbers: low.map((i) => ({ label: i.id, value: `${freeQty(i)} free · reorder at ${i.reorderLevel} ${i.uom}` })),
      cites: low.map((i) => i.id),
      action: { label: "Open stock", module: "inventory", tab: "stock" },
    }),
  ];
}

function adjustment(ds: Dataset): Finding[] {
  return (ds.movements ?? [])
    .filter((m) => m.type === "Adjustment" && m.status === "Pending" && daysBetween(m.at, ds.today) > 3)
    .map((m) => {
      const age = daysBetween(m.at, ds.today);
      const it = (ds.items ?? []).find((i) => i.id === m.itemId);
      return mk("adjustment", {
        id: `adjustment:${m.id}`,
        severity: "low",
        score: rank("low", "stale", Math.abs(m.qty) * (it?.unitCost ?? 0)),
        title: `Count adjustment waiting ${age} days`,
        detail: `${m.id} adjusts ${m.item} (${m.itemId}) by ${m.qty} after ${m.reference}. It was recorded on ${date(m.at, true)} and has waited ${age} days for approval, so the ledger still shows the old quantity.`,
        brief: `A stock count adjustment (${m.id}) has waited ${age} days.`,
        numbers: [
          { label: "Adjustment", value: `${m.qty} ${it?.uom ?? ""}${it ? ` · ${inr(Math.abs(m.qty) * it.unitCost)}` : ""}`.trim() },
          { label: "Recorded", value: `${date(m.at, true)} by ${m.by}` },
        ],
        cites: [m.id, m.itemId],
        action: { label: "Open counts", module: "inventory", tab: "counts" },
      });
    });
}

function subcontract(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const si of ds.subcontractIssues ?? []) {
    if (si.status === "Closed") continue;
    const days = daysBetween(ds.today, si.reconcileBy);
    const outstanding = si.lines.reduce((a, l) => a + Math.max(0, l.issued - l.consumed - l.returned - l.damaged), 0);
    const outValue = si.lines.reduce((a, l) => a + Math.max(0, l.issued - l.consumed - l.returned - l.damaged) * l.unitValue, 0);
    const damaged = si.lines.filter((l) => l.damaged > 0);
    const consumed = si.lines.reduce((a, l) => a + l.consumed * l.unitValue, 0);
    const noCustodian = /no named custodian/i.test(si.custodian);
    if (days >= 0 && !(days <= 7 && (outstanding > 0 || (damaged.length && !si.partnerReport)))) continue;
    const overdue = days < 0;
    const sev: Severity = overdue ? "medium" : "low";
    out.push(
      mk("subcontract", {
        id: `subcontract:${si.id}`,
        severity: sev,
        score: rank(sev, overdue ? "stale" : days, outValue || consumed),
        projectId: si.projectId,
        title: overdue ? `${si.id} reconciliation ${-days} days overdue` : `${si.id} reconciles ${date(si.reconcileBy, true)}`,
        detail: `${si.id} at ${si.partner} ${overdue ? `was due for reconciliation on ${date(si.reconcileBy, true)} and is ${-days} days overdue` : `is due for reconciliation ${inDays(days)}`}.${noCustodian ? " Nobody at the partner is named as custodian." : ""} ${outstanding ? `${plural(outstanding, "unit")} (${inr(outValue)}) ${outstanding === 1 ? "is" : "are"} still outstanding.` : `Everything issued is reported consumed (${inr(consumed)}), but the issue is still open.`}${damaged.length && !si.partnerReport ? ` ${damaged.reduce((a, l) => a + l.damaged, 0)} damaged with no partner report yet.` : ""}`,
        brief: overdue ? `${si.id} at ${si.partner} is ${-days} days past its reconciliation date${noCustodian ? " with no named custodian" : ""}.` : `${si.id} at ${si.partner} reconciles ${date(si.reconcileBy, true)} with ${inr(outValue)} outstanding.`,
        numbers: [
          { label: "Reconcile by", value: `${date(si.reconcileBy, true)} (${inDays(days)})` },
          { label: "Outstanding", value: outstanding ? `${outstanding} units · ${inr(outValue)}` : "None" },
          ...(damaged.length ? [{ label: "Damaged", value: `${damaged.reduce((a, l) => a + l.damaged, 0)} · ${si.partnerReport ? "report on file" : "no partner report"}` }] : []),
          { label: "Custodian", value: si.custodian },
        ],
        cites: [si.id, ...(si.poId ? [si.poId] : []), ...(si.projectId ? [si.projectId] : [])],
        action: { label: `Open ${si.id}`, recordId: si.id },
      }),
    );
  }
  return out;
}

function poFollowup(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const po of ds.purchaseOrders ?? []) {
    if (po.status === "Received" || po.status === "Closed" || po.status === "Cancelled") continue;
    const late = daysBetween(po.expected, ds.today);
    const rejected = po.lines.filter((l) => l.rejected > 0);
    if (late <= 0 && !rejected.length) continue;
    const vendor = (ds.vendors ?? []).find((v) => v.name === po.vendor);
    const pending = po.lines.reduce((a, l) => a + Math.max(0, l.ordered - l.received), 0);
    const sev: Severity = po.projectId && late > 0 ? "medium" : "low";
    out.push(
      mk("po-followup", {
        id: `po-followup:${po.id}`,
        severity: sev,
        score: rank(sev, late > 0 ? "stale" : daysBetween(ds.today, po.expected), po.value),
        projectId: po.projectId,
        title: late > 0 ? `${po.id} is ${plural(late, "day")} late` : `${po.id} has rejected lines`,
        detail: `${po.id} from ${po.vendor} (${po.title}${po.projectId ? `, ${po.projectId}` : ""}) ${late > 0 ? `was expected ${date(po.expected, true)} and is ${plural(late, "day")} late` : `is expected ${date(po.expected, true)}`}, with ${pending} units still to come.${rejected.length ? ` ${list(rejected.map((l) => `${l.rejected} × ${l.item} rejected at receipt`))}.` : ""}${vendor ? ` On-time rate for ${vendor.name}: ${vendor.onTimeRate}%.` : ""}`,
        brief: `${po.id} from ${po.vendor} ${late > 0 ? `is ${plural(late, "day")} late` : "has rejected lines"}.`,
        numbers: [
          { label: "Expected", value: `${date(po.expected, true)}${late > 0 ? ` · ${late} d late` : ""}` },
          { label: "Still to receive", value: `${pending} units` },
          ...(rejected.length ? [{ label: "Rejected", value: rejected.map((l) => `${l.rejected} ${l.uom}`).join(", ") }] : []),
          ...(vendor ? [{ label: "Vendor on-time", value: `${vendor.onTimeRate}%` }] : []),
        ],
        cites: [po.id, ...(vendor ? [vendor.id] : []), ...(po.projectId ? [po.projectId] : [])],
        action: { label: `Open ${po.id}`, recordId: po.id },
      }),
    );
  }
  return out;
}

/* ---------------------------------------------------------------- commercial */
function billingMismatch(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const ba of ds.billingAdvices ?? []) {
    const post = (ds.postings ?? []).find((p) => p.advice === ba.id && p.state !== "Superseded");
    const diff = post?.posted !== undefined ? ba.value - post.posted : 0;
    if (ba.status !== "Mismatch" && !diff) continue;
    const so = (ds.salesOrders ?? []).find((s) => s.id === ba.salesOrderId);
    const age = daysBetween(ba.raised, ds.today);
    out.push(
      mk("billing-mismatch", {
        id: `billing-mismatch:${ba.id}`,
        severity: "high",
        score: rank("high", "stale", Math.abs(diff)),
        projectId: so?.projectId,
        title: `${inr(Math.abs(diff))} difference on ${ba.id}`,
        detail: `Accounting invoiced ${inr(post?.posted ?? 0)} against ${ba.id} (${inr(ba.value)}, ${ba.customer}, ${ba.trigger}), ${inr(Math.abs(diff))} ${diff > 0 ? "less" : "more"} than the advice.${post?.note ? ` ${post.note}` : ""}`,
        brief: `Accounting invoiced ${inr(Math.abs(diff))} ${diff > 0 ? "less" : "more"} than ${ba.id} asked for, and it has been open ${age} days.`,
        numbers: [
          { label: "Advice", value: inr(ba.value) },
          { label: "Invoiced", value: `${inr(post?.posted ?? 0)}${post?.external ? ` · ${post.external}` : ""}` },
          { label: "Difference", value: `${inr(Math.abs(diff))} · ${pct(Math.abs(diff) / ba.value, 1)}` },
          { label: "Raised", value: `${date(ba.raised, true)} · ${age} days ago` },
        ],
        cites: [ba.id, ...(so ? [so.id] : []), ...(so?.projectId ? [so.projectId] : [])],
        action: { label: `Reconcile ${ba.id}`, module: "sales", tab: "reconciliation" },
      }),
    );
  }
  return out;
}

function postingFailed(ds: Dataset): Finding[] {
  return (ds.postings ?? [])
    .filter((p) => p.state === "Failed")
    .map((p) =>
      mk("posting-failed", {
        id: `posting-failed:${p.key}`,
        severity: "medium",
        score: rank("medium", "stale", p.amount),
        title: `${p.advice} posting failed ${plural(p.attempts, "time")}`,
        detail: `The posting of ${p.advice} (${inr(p.amount)}, ${p.party}) to accounting failed ${plural(p.attempts, "time")}${p.lastError ? ` (${p.lastError.toLowerCase()})` : ""}${p.lastAttempt ? `, last on ${date(p.lastAttempt, true)}` : ""}. No invoice number came back, so a retry with the same key ${p.key} can't post it twice.`,
        brief: `${p.advice} (${inr(p.amount)}) has failed to post to accounting ${plural(p.attempts, "time")}.`,
        numbers: [
          { label: "Amount", value: inr(p.amount) },
          { label: "Attempts", value: String(p.attempts) },
          { label: "Idempotency key", value: p.key },
        ],
        cites: [p.advice],
        action: { label: "Open reconciliation", module: "sales", tab: "reconciliation" },
      }),
    );
}

function earnedUnbilled(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const p of ds.projects ?? []) {
    const advices = (ds.billingAdvices ?? []).filter((b) => p.salesOrder && b.salesOrderId === p.salesOrder);
    let cumulative = 0;
    for (const m of p.milestones) {
      if (!m.billable) continue;
      const ba = advices.find((b) => b.trigger.startsWith(`${m.id} `));
      if (ba) {
        if (m.status === "Done") cumulative += m.billable;
        const age = daysBetween(ba.raised, ds.today);
        if (ba.status === "Ready for review" && age >= 7) {
          const apr = (ds.approvals ?? []).find((a) => a.reference === ba.id && a.status === "Pending");
          out.push(
            mk("earned-unbilled", {
              id: `earned-unbilled:${ba.id}`,
              severity: "medium",
              score: rank("medium", "stale", ba.value),
              projectId: p.id,
              title: `${inr(ba.value)} earned, waiting ${age} days in review`,
              detail: `${p.id}'s ${m.name.toLowerCase()} milestone${m.done ? ` was done on ${date(m.done, true)}` : ""}, and ${ba.id} (${inr(ba.value)}) was raised on ${date(ba.raised, true)}. It has waited ${age} days for review${apr ? ` (${apr.level.split(" · ").pop()})` : ""}, so the customer hasn't been invoiced.`,
              brief: `${inr(ba.value)} earned on ${p.id} has waited ${age} days in billing review (${ba.id}).`,
              numbers: [
                { label: "Milestone", value: `${m.id} ${m.name}${m.done ? ` · done ${date(m.done, true)}` : ""}` },
                { label: "Advice", value: `${ba.id} · ${inr(ba.value)} · ${ba.status}` },
                { label: "Waiting", value: `${age} days` },
              ],
              cites: [ba.id, p.id, ...(p.salesOrder ? [p.salesOrder] : [])],
              action: { label: `Review ${ba.id}`, recordId: ba.id },
            }),
          );
        }
      } else if (m.status === "Done") {
        cumulative += m.billable;
        if (cumulative > p.billed) {
          const age = m.done ? daysBetween(m.done, ds.today) : 0;
          out.push(
            mk("earned-unbilled", {
              id: `earned-unbilled:${p.id}:${m.id}`,
              severity: "medium",
              score: rank("medium", "stale", m.billable),
              projectId: p.id,
              title: `${inr(m.billable)} earned on ${p.id} with no advice`,
              detail: `${p.id}'s ${m.name.toLowerCase()} milestone is done${m.done ? ` (${date(m.done, true)}, ${age} days ago)` : ""} and billable at ${inr(m.billable)}, but no billing advice has been raised.`,
              brief: `${inr(m.billable)} earned on ${p.id} has no billing advice yet.`,
              numbers: [
                { label: "Milestone", value: `${m.id} ${m.name}` },
                { label: "Billable", value: inr(m.billable) },
              ],
              cites: [p.id, ...(p.salesOrder ? [p.salesOrder] : [])],
              action: { label: "Open billing advice", module: "sales", tab: "billing" },
            }),
          );
        }
      }
    }
  }
  return out;
}

/** Straight-line cost forecast for one project. */
export function costForecast(p: Project) {
  const eac = p.progress > 0 ? p.incurred / (p.progress / 100) : p.incurred;
  return {
    eac,
    overrun: eac - p.budget,
    commitRatio: p.budget ? p.committed / p.budget : 0,
    spentRatio: p.budget ? p.incurred / p.budget : 0,
    plannedMargin: p.contractValue ? (p.contractValue - p.budget) / p.contractValue : 0,
    forecastMargin: p.contractValue ? (p.contractValue - Math.max(eac, p.budget)) / p.contractValue : 0,
  };
}

function margin(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const p of ds.projects ?? []) {
    if (p.status === "Closed" || p.progress <= 0) continue;
    const f = costForecast(p);
    const commitAhead = f.commitRatio > 0.95 && p.progress < 95;
    if (f.overrun <= 0 && !commitAhead) continue;
    const claims = ds.visible.includes("hr") ? (ds.claims ?? []).filter((c) => c.status === "Pending" && c.reference.startsWith(p.id)) : [];
    const sev: Severity = f.overrun / p.budget >= 0.05 || f.forecastMargin < 0.1 ? "high" : "medium";
    out.push(
      mk("margin", {
        id: `margin:${p.id}`,
        severity: sev,
        score: rank(sev, daysBetween(ds.today, p.due), Math.max(0, f.overrun)),
        projectId: p.id,
        title: f.overrun > 0 ? `${p.id} heading ${inr(Math.round(f.overrun))} over budget` : `${p.id} has committed ${pct(f.commitRatio)} of budget`,
        detail: `${p.id} (${p.name}) has spent ${inr(p.incurred)}, ${pct(f.spentRatio)} of its ${inr(p.budget)} budget, at ${p.progress}% complete, and committed ${pct(f.commitRatio)}. ${f.overrun > 0 ? `At that rate it finishes about ${inr(Math.round(f.overrun))} over budget, taking margin from ${pct(f.plannedMargin, 1)} to ${pct(f.forecastMargin, 1)}.` : `Only ${inr(p.budget - p.committed)} of budget is left for the remaining ${100 - p.progress}% of the work.`}${claims.length ? ` ${list(claims.map((c) => `${c.id} (${inr(c.amount)})`))} ${claims.length === 1 ? "is" : "are"} still pending against it.` : ""}`,
        brief: `${p.id}'s cost is running ahead of plan: margin forecast ${pct(f.forecastMargin, 1)} against ${pct(f.plannedMargin, 1)} planned.`,
        numbers: [
          { label: "Budget", value: inr(p.budget) },
          { label: "Committed", value: `${inr(p.committed)} · ${pct(f.commitRatio)}` },
          { label: "Incurred", value: `${inr(p.incurred)} · ${pct(f.spentRatio)}` },
          { label: "Forecast at completion", value: inr(Math.round(f.eac)) },
          { label: "Margin", value: `${pct(f.plannedMargin, 1)} planned → ${pct(f.forecastMargin, 1)} forecast` },
        ],
        cites: [p.id, ...claims.map((c) => c.id)],
        action: { label: `Open ${p.id}`, recordId: p.id },
      }),
    );
  }
  return out;
}

function quoteExpiry(ds: Dataset): Finding[] {
  return (ds.quotations ?? [])
    .filter((q) => (q.status === "Sent" || q.status === "In review" || q.status === "Draft") && daysBetween(ds.today, q.validUntil) <= 21)
    .map((q) => {
      const days = daysBetween(ds.today, q.validUntil);
      const opp = ds.visible.includes("crm") ? (ds.opportunities ?? []).find((o) => o.id === q.opportunityId) : undefined;
      return mk("quote-expiry", {
        id: `quote-expiry:${q.id}`,
        severity: "low",
        score: rank("low", days, q.value),
        title: days < 0 ? `${q.id} lapsed ${-days} days ago` : `${q.id} expires ${date(q.validUntil, true)}`,
        detail: `${q.id} (${inr(q.value)}, ${q.customer}, ${q.title}) ${days < 0 ? "has lapsed" : `expires ${inDays(days)}`} and is still ${q.status.toLowerCase()}.${opp ? ` ${opp.id} is due to close ${date(opp.closeDate, true)}; next action “${opp.nextAction}” by ${date(opp.nextActionDue, true)}.` : ""}`,
        brief: `${q.id} (${inr(q.value)}) expires ${date(q.validUntil, true)} and is still ${q.status.toLowerCase()}.`,
        numbers: [
          { label: "Valid until", value: `${date(q.validUntil, true)} (${inDays(days)})` },
          { label: "Value", value: inr(q.value) },
          { label: "Status", value: q.status },
        ],
        cites: [q.id, ...(opp ? [opp.id] : [])],
        action: { label: `Open ${q.id}`, recordId: q.id },
      });
    });
}

/* ---------------------------------------------------------------- people */
function payroll(ds: Dataset): Finding[] {
  const run = (ds.payrollRuns ?? []).find((r) => r.status === "Collecting inputs" || r.status === "Ready for review");
  if (!run) return [];
  const blocked = run.checks.filter((c) => c.status === "Blocked");
  const warn = run.checks.filter((c) => c.status === "Warning");
  if (!blocked.length && !warn.length) return [];
  const sev: Severity = blocked.length ? "high" : "medium";
  return [
    mk("payroll", {
      id: `payroll:${run.id}`,
      severity: sev,
      score: rank(sev, null, run.net),
      title: blocked.length ? `${run.period} payroll is blocked` : `${run.period} payroll has warnings`,
      detail: `${run.id} (${run.employees} employees, ${inr(run.net)} net) ${blocked.length ? `can't be approved: ${list(blocked.map((c) => c.detail.charAt(0).toLowerCase() + c.detail.slice(1)))}.` : "has open input checks."}${warn.length ? ` Also open: ${list(warn.map((c) => c.detail.charAt(0).toLowerCase() + c.detail.slice(1)))}.` : ""}`,
      brief: `${run.period} payroll (${run.id}) is ${blocked.length ? `blocked: ${blocked[0].detail.charAt(0).toLowerCase() + blocked[0].detail.slice(1)}` : "waiting on input checks"}.`,
      numbers: [
        { label: "Blocked checks", value: String(blocked.length) },
        { label: "Warnings", value: String(warn.length) },
        { label: "Employees", value: String(run.employees) },
        { label: "Net pay", value: inr(run.net) },
      ],
      cites: [run.id],
      action: { label: `Open ${run.id}`, module: "payroll" },
    }),
  ];
}

function leaver(ds: Dataset): Finding[] {
  const out: Finding[] = [];
  for (const x of ds.exitCases ?? []) {
    if (x.status === "Closed") continue;
    const days = daysBetween(ds.today, x.lastDay);
    const open = x.items.filter((i) => i.status === "Open").sort((a, b) => a.due.localeCompare(b.due));
    if (open.length) {
      const first = open[0];
      const afterLast = open.filter((i) => i.due > x.lastDay);
      out.push(
        mk("leaver", {
          id: `leaver:${x.id}`,
          severity: "medium",
          score: rank("medium", daysBetween(ds.today, first.due)),
          title: `${x.person} leaves ${date(x.lastDay, true)} with ${open.length} items open`,
          detail: `${x.person} (${x.role}) leaves on ${date(x.lastDay, true)}, ${inDays(days)}, with ${open.length} of ${x.items.length} exit items open. The first is due ${date(first.due, true)}: ${first.item.toLowerCase()} (${first.reference}).${afterLast.length ? ` ${cap(list(afterLast.map((i) => `${i.item.toLowerCase()} falls due ${date(i.due, true)}`)))}, after the last day.` : ""}`,
          brief: `${x.person} leaves on ${date(x.lastDay, true)} with ${open.length} exit items open; the first is due ${date(first.due, true)}.`,
          numbers: [
            { label: "Last day", value: `${date(x.lastDay, true)} (${inDays(days)})` },
            { label: "Open items", value: `${open.length} of ${x.items.length}` },
            { label: "Next due", value: `${date(first.due, true)} · ${first.item}` },
          ],
          cites: [x.id, x.personId, ...((first.reference.match(/[A-Z]{2,4}-\d{3,4}/g) ?? []) as string[])],
          action: { label: `Open ${x.id}`, recordId: x.id },
        }),
      );
    }
    for (const l of ds.leaveRequests ?? []) {
      if (l.personId !== x.personId || l.status === "Rejected" || l.from <= x.lastDay) continue;
      out.push(
        mk("leaver", {
          id: `leaver:leave:${l.id}`,
          severity: "medium",
          score: rank("medium", daysBetween(ds.today, x.lastDay)),
          title: `${l.id} is for dates after ${x.person}'s last day`,
          detail: `${x.person}'s ${l.kind.toLowerCase()} leave request ${l.id} (${date(l.from, true)}–${date(l.to, true)}, ${plural(l.days, "day")}, ${l.status.toLowerCase()}) falls after her last day on ${date(x.lastDay, true)} (${x.id}). Decline it, and settle any balance in the full and final.`,
          brief: `${l.id} asks for leave after ${x.person}'s last day (${date(x.lastDay, true)}).`,
          numbers: [
            { label: "Leave", value: `${date(l.from, true)}–${date(l.to, true)} · ${l.status}` },
            { label: "Last day", value: date(x.lastDay, true) },
          ],
          cites: [l.id, x.id, x.personId],
          action: { label: `Open ${l.id}`, recordId: l.id },
        }),
      );
    }
    const person = (ds.people ?? []).find((p) => p.id === x.personId);
    const cals = ds.visible.includes("assets") ? (ds.calibrations ?? []).filter((c) => c.engineer === x.person && c.due > x.lastDay && c.status !== "Passed") : [];
    const tickets = ds.visible.includes("assets") ? (ds.tickets ?? []).filter((t) => OPEN_TICKET(t) && t.assignee === x.person && d10(t.slaDue) > x.lastDay) : [];
    const work = [...cals.map((c) => `${c.id} (${c.asset.toLowerCase()}, ${date(c.due, true)})`), ...tickets.map((t) => `${t.id} (${date(t.slaDue, true)})`)];
    if (person?.assignmentUntil && person.assignmentUntil > x.lastDay && person.assignment) work.push(`the ${person.assignment} deployment until ${date(person.assignmentUntil, true)}`);
    if (work.length) {
      out.push(
        mk("leaver", {
          id: `leaver:work:${x.id}`,
          severity: "medium",
          score: rank("medium", daysBetween(ds.today, x.lastDay)),
          title: `Work scheduled for ${x.person} after she leaves`,
          detail: `${list(work)} ${work.length === 1 ? "is" : "are"} scheduled for ${x.person}, whose last day is ${date(x.lastDay, true)} (${x.id}). Hand ${work.length === 1 ? "it" : "them"} to someone who will be here.`,
          brief: `${list(cals.map((c) => c.id).concat(tickets.map((t) => t.id)))} ${work.length === 1 ? "is" : "are"} planned for ${x.person} after her last day.`,
          numbers: work.map((w, i) => ({ label: `Scheduled ${i + 1}`, value: w })),
          cites: [...cals.map((c) => c.id), ...tickets.map((t) => t.id), x.id],
          action: cals[0] ? { label: `Open ${cals[0].id}`, recordId: cals[0].id } : { label: `Open ${x.id}`, recordId: x.id },
        }),
      );
    }
  }
  return out;
}

function utilisation(ds: Dataset): Finding[] {
  const people = ds.people ?? [];
  const over = people.filter((p) => p.utilisation > 90).sort((a, b) => b.utilisation - a.utilisation);
  if (!over.length) return [];
  const leaving = new Set((ds.exitCases ?? []).filter((x) => x.status !== "Closed").map((x) => x.personId));
  const spare = people
    .filter((p) => p.status === "Available" && p.utilisation < 75 && !leaving.has(p.id) && !["HR", "Sales", "Management"].includes(p.department))
    .sort((a, b) => a.utilisation - b.utilisation)
    .slice(0, 3);
  const projectsOf = (p: Person) => (ds.projects ?? []).filter((x) => x.status !== "Closed" && (x.team.includes(p.id) || x.manager === p.name));
  const atRisk = over.filter((p) => projectsOf(p).some((x) => x.status === "At risk"));
  const sev: Severity = atRisk.length ? "medium" : "low";
  return [
    mk("utilisation", {
      id: "utilisation",
      severity: sev,
      score: rank(sev, null),
      title: `${plural(over.length, "person", "people")} above 90% utilisation`,
      detail: `${list(over.map((p) => `${p.name} (${p.role}, ${p.utilisation}%)`))} ${over.length === 1 ? "is" : "are"} above 90% utilisation this month${atRisk.length ? `; ${list(atRisk.map((p) => p.name.split(" ")[0]))} ${atRisk.length === 1 ? "works" : "work"} on ${list([...new Set(atRisk.flatMap((p) => projectsOf(p).filter((x) => x.status === "At risk").map((x) => x.id)))])}, which is at risk` : ""}.${spare.length ? ` Spare capacity sits with ${list(spare.map((p) => `${p.name} (${p.role}, ${p.utilisation}%)`))}.` : ""}`,
      brief: `${list(over.map((p) => `${p.name} (${p.utilisation}%)`))} ${over.length === 1 ? "is" : "are"} over 90% utilised.`,
      numbers: [...over.map((p) => ({ label: p.name, value: `${p.utilisation}% · ${projectsOf(p).map((x) => x.id).join(", ") || p.assignment || "—"}` })), ...spare.map((p) => ({ label: `Spare: ${p.name}`, value: `${p.utilisation}% · ${p.role}` }))],
      cites: [...over.map((p) => p.id), ...spare.map((p) => p.id)],
      action: { label: "Open resources", module: "projects", tab: "resources" },
    }),
  ];
}

function certificates(ds: Dataset): Finding[] {
  const hits = (ds.people ?? [])
    .flatMap((p) => p.certifications.map((c) => ({ p, c, days: daysBetween(ds.today, c.expires) })))
    .filter((x) => x.days <= 30)
    .sort((a, b) => a.days - b.days);
  if (!hits.length) return [];
  const during = hits.filter((x) => x.p.assignmentUntil && x.p.assignmentUntil >= x.c.expires);
  const sev: Severity = hits.some((x) => x.days < 0) || during.length ? "medium" : "low";
  return [
    mk("certificates", {
      id: "certificates",
      severity: sev,
      score: rank(sev, hits[0].days),
      title: `${plural(hits.length, "site certificate")} expiring within 30 days`,
      detail: `${list(hits.map((x) => `${x.p.name}'s ${x.c.name} ${x.days < 0 ? "expired" : "expires"} ${date(x.c.expires, true)}`))}.${during.length ? ` ${list(during.map((x) => x.p.name))} would still be deployed then.` : " Each falls after the person's current deployment ends, so renew before the next one."}`,
      brief: `${plural(hits.length, "site certificate")} expire within 30 days, first ${hits[0].p.name}'s ${hits[0].c.name} on ${date(hits[0].c.expires, true)}.`,
      numbers: hits.map((x) => ({ label: x.p.name, value: `${x.c.name} · ${date(x.c.expires, true)} (${inDays(x.days)})` })),
      cites: hits.map((x) => x.p.id),
      action: { label: "Open people", module: "hr", tab: "directory" },
    }),
  ];
}

function claims(ds: Dataset): Finding[] {
  const pending = (ds.claims ?? []).filter((c) => c.status === "Pending");
  if (!pending.length) return [];
  const leavers = (ds.exitCases ?? []).filter((x) => x.status !== "Closed");
  const leaverClaims = pending.filter((c) => leavers.some((x) => x.personId === c.personId));
  const total = pending.reduce((a, c) => a + c.amount, 0);
  const oldest = pending.reduce((a, c) => (c.submitted < a.submitted ? c : a));
  return [
    mk("claims", {
      id: "claims",
      severity: leaverClaims.length ? "medium" : "low",
      score: rank(leaverClaims.length ? "medium" : "low", "stale", total),
      title: `${plural(pending.length, "claim")} waiting (${inr(total)})`,
      detail: `${plural(pending.length, "expense claim")} worth ${inr(total)} wait for approval; the oldest, ${oldest.id}, was submitted ${date(oldest.submitted, true)}.${leaverClaims.length ? ` ${list(leaverClaims.map((c) => `${c.id} is ${c.person}'s`))}, and must be settled before her last day (${date(leavers.find((x) => x.personId === leaverClaims[0].personId)!.lastDay, true)}).` : ""}`,
      brief: `${plural(pending.length, "expense claim")} (${inr(total)}) wait for approval.`,
      numbers: pending.map((c) => ({ label: c.id, value: `${c.person} · ${inr(c.amount)} · ${date(c.submitted, true)}` })),
      cites: pending.map((c) => c.id),
      action: { label: "Open claims", module: "hr", tab: "claims" },
    }),
  ];
}

/* ================================================================ project risk */
const toneOf = (score: number, neutral = false): Tone => (neutral ? "neutral" : score >= 60 ? "risk" : score >= 30 ? "warn" : "ok");

export function projectRisk(p: Project, ds: Dataset): ProjectRisk {
  // Schedule
  const sReasons: string[] = [];
  let s = 0;
  const open = p.milestones.filter((m) => m.status !== "Done");
  const blocked = open.filter((m) => m.status === "Blocked");
  const late = open.filter((m) => m.status === "Late" || (m.status !== "Blocked" && daysBetween(ds.today, m.due) < 0));
  if (blocked.length) {
    s += 40;
    sReasons.push(...blocked.map((m) => `${m.name} blocked (due ${date(m.due, true)})`));
  }
  if (late.length) {
    s += 30;
    sReasons.push(...late.map((m) => `${m.name} ${-daysBetween(ds.today, m.due)} days late`));
  }
  if (p.status === "On hold") {
    s += 20;
    sReasons.push("Project on hold");
  }
  const total = Math.max(1, daysBetween(p.start, p.due));
  const elapsed = Math.min(1, Math.max(0, daysBetween(p.start, ds.today) / total));
  const gap = elapsed * 100 - p.progress;
  if (gap > 10) s += Math.min(30, gap - 10);
  sReasons.push(`${p.progress}% complete with ${Math.round(elapsed * 100)}% of the time used`);
  // Cost
  const f = costForecast(p);
  const cReasons: string[] = [];
  let c = 0;
  if (f.overrun > 0) {
    c += 30 + Math.min(40, (f.overrun / p.budget) * 400);
    cReasons.push(`Forecast ${inr(Math.round(f.eac))} against a ${inr(p.budget)} budget`);
  }
  if (f.commitRatio > 0.95 && p.progress < 95) {
    c += 20;
    cReasons.push(`${pct(f.commitRatio)} of budget committed at ${p.progress}% progress`);
  }
  const openPrValue = ds.visible.includes("purchase") ? (ds.purchaseRequests ?? []).filter((r) => r.projectId === p.id && OPEN_PR(r)).reduce((a, r) => a + r.value, 0) : 0;
  if (openPrValue && p.committed + openPrValue > p.budget) {
    c += 30;
    cReasons.push(`Open requisitions (${inr(openPrValue)}) would take commitments past budget`);
  } else if (openPrValue) cReasons.push(`Open requisitions (${inr(openPrValue)}) keep commitments at ${pct((p.committed + openPrValue) / p.budget)} of budget`);
  if (!cReasons.length || (f.overrun <= 0 && cReasons.length === (openPrValue ? 1 : 0))) cReasons.unshift(`Spent ${pct(f.spentRatio)} of budget at ${p.progress}% progress`);
  // Material
  const mReasons: string[] = [];
  let m = 0;
  let any = false;
  const bom = ds.visible.includes("inventory") ? projectBom(p, ds) : undefined;
  if (bom) {
    any = true;
    const short = bomShortages(bom, ds);
    if (short.length) {
      m += Math.min(60, short.length * 25);
      mReasons.push(`${bom.id} is ${plural(short.length, "line")} short (${short.reduce((a, l) => a + l.shortage, 0)} units)`);
      const unapproved = short.filter((l) => l.pr && l.pr.status !== "Approved");
      if (unapproved.length) {
        m += 20;
        mReasons.push(`${unapproved[0].pr!.id} covers ${plural(unapproved.length, "line")} but isn't approved`);
      }
      const held = short.filter((l) => l.held > 0);
      if (held.length) {
        m += 15;
        mReasons.push(`${held.reduce((a, l) => a + l.held, 0)} units of ${held.map((l) => l.itemId).join(", ")} on QC hold`);
      }
    } else mReasons.push(`${bom.id} fully covered`);
  }
  if (ds.visible.includes("inventory")) {
    for (const si of (ds.subcontractIssues ?? []).filter((x) => x.projectId === p.id && x.status !== "Closed")) {
      any = true;
      if (daysBetween(ds.today, si.reconcileBy) < 0) {
        m += 25;
        mReasons.push(`${si.id} reconciliation ${-daysBetween(ds.today, si.reconcileBy)} days overdue`);
      }
    }
  }
  if (ds.visible.includes("purchase")) {
    for (const po of (ds.purchaseOrders ?? []).filter((x) => x.projectId === p.id && x.status !== "Received" && x.status !== "Closed" && x.status !== "Cancelled")) {
      any = true;
      const lateBy = daysBetween(po.expected, ds.today);
      const rej = po.lines.reduce((a, l) => a + l.rejected, 0);
      if (lateBy > 0) {
        m += 30;
        mReasons.push(`${po.id} ${lateBy} days late`);
      }
      if (rej) {
        m += 10;
        mReasons.push(`${po.id}: ${rej} units rejected at receipt`);
      }
    }
  }
  if (!any) mReasons.push(ds.visible.includes("inventory") ? "No material demand on record" : "Material is outside your role");
  else if (!mReasons.length) mReasons.push("No shortages on record");
  const schedule = { score: Math.round(Math.min(100, s)), tone: toneOf(s), reasons: sReasons };
  const cost = { score: Math.round(Math.min(100, c)), tone: toneOf(c), reasons: cReasons };
  const material = { score: Math.round(Math.min(100, m)), tone: toneOf(m, !any), reasons: mReasons };
  const overall = Math.max(schedule.score, cost.score, material.score);
  return { project: p, schedule, cost, material, overall, tone: toneOf(overall) };
}

/* ================================================================ forecasts */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function forecasts(ds: Dataset, risks: ProjectRisk[]): Forecasts {
  if (!ds.projects) return { slipping: null, billable: null };
  const monthEnd = (() => {
    const [y, mo] = ds.today.split("-").map(Number);
    return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  })();
  const slipReason = (p: Project, m: Milestone): string | null => {
    if (m.status === "Blocked") return p.status === "On hold" ? "Blocked · project on hold" : "Blocked";
    if (m.status === "Late") return "Already late";
    const before = p.milestones.filter((x) => x.due < m.due && x.status !== "Done" && (x.status === "Blocked" || x.status === "Late"));
    if (before.length) return `Waits on ${before[before.length - 1].name.toLowerCase()} (${before[before.length - 1].status.toLowerCase()})`;
    const r = risks.find((x) => x.project.id === p.id);
    if (r && r.material.score >= 60 && m.gate && /loop|sat|install|delivery/i.test(m.gate)) return "Material short for this gate";
    return null;
  };
  const due: SlipItem[] = [];
  const late: SlipItem[] = [];
  let count = 0;
  for (const p of ds.projects) {
    if (p.status === "Closed") continue;
    for (const m of p.milestones) {
      if (m.status === "Done") continue;
      if (m.due < ds.today) {
        late.push({ projectId: p.id, milestone: m, reason: `${-daysBetween(ds.today, m.due)} days late` });
        continue;
      }
      if (m.due > monthEnd) continue;
      count++;
      const reason = slipReason(p, m);
      if (reason) due.push({ projectId: p.id, milestone: m, reason });
    }
  }
  due.sort((a, b) => a.milestone.due.localeCompare(b.milestone.due));
  const windowEnd = addDays(ds.today, 30);
  const bill: (SlipItem & { atRisk: boolean })[] = [];
  for (const p of ds.projects) {
    if (p.status === "Closed") continue;
    for (const m of p.milestones) {
      if (m.status === "Done" || !m.billable || m.due < ds.today || m.due > windowEnd) continue;
      const reason = slipReason(p, m);
      bill.push({ projectId: p.id, milestone: m, reason: reason ?? "On plan", atRisk: !!reason });
    }
  }
  bill.sort((a, b) => a.milestone.due.localeCompare(b.milestone.due));
  const inReview = ds.visible.includes("sales") ? (ds.billingAdvices ?? []).filter((b) => b.status === "Ready for review").reduce((a, b) => a + b.value, 0) : 0;
  return {
    slipping: { dueThisMonth: count, items: due, alreadyLate: late, billableAtStake: due.reduce((a, x) => a + (x.milestone.billable ?? 0), 0), monthLabel: MONTHS[Number(ds.today.slice(5, 7)) - 1] },
    billable: { total: bill.reduce((a, x) => a + (x.milestone.billable ?? 0), 0), atRisk: bill.filter((x) => x.atRisk).reduce((a, x) => a + (x.milestone.billable ?? 0), 0), items: bill, inReview, windowEnd },
  };
}

/* ================================================================ analyze */
export function analyze(ds: Dataset): Analysis {
  const can = (m: ModuleKey) => ds.visible.includes(m);
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const run = (id: string, fn: () => Finding[]) => {
    const rule = RULE[id];
    const missing = rule.needs.filter((m) => !can(m));
    if (missing.length) {
      checks.push({ rule, status: "hidden", count: 0, missing });
      return [];
    }
    const out = fn();
    checks.push({ rule, status: out.length ? "found" : "clear", count: out.length, missing: [] });
    findings.push(...out);
    return out;
  };
  const gates = run("gate-risk", () => gateRisk(ds));
  run("milestone-blocked", () => milestoneBlocked(ds, new Set(gates.map((g) => g.projectId!))));
  run("sla-today", () => slaToday(ds));
  run("assignee-away", () => assigneeAway(ds));
  run("unassigned", () => unassigned(ds));
  run("calibration", () => calibration(ds));
  run("contracts", () => contracts(ds));
  run("bom-shortage", () => bomShortage(ds));
  run("qc-hold", () => qcHold(ds));
  run("reorder", () => reorder(ds));
  run("adjustment", () => adjustment(ds));
  run("subcontract", () => subcontract(ds));
  run("po-followup", () => poFollowup(ds));
  run("billing-mismatch", () => billingMismatch(ds));
  run("posting-failed", () => postingFailed(ds));
  run("earned-unbilled", () => earnedUnbilled(ds));
  run("margin", () => margin(ds));
  run("quote-expiry", () => quoteExpiry(ds));
  run("payroll", () => payroll(ds));
  run("leaver", () => leaver(ds));
  run("utilisation", () => utilisation(ds));
  run("certificates", () => certificates(ds));
  run("claims", () => claims(ds));
  findings.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const projects = (ds.projects ?? []).filter((p) => p.status !== "Closed").map((p) => projectRisk(p, ds)).sort((a, b) => b.overall - a.overall);

  // Briefing: the top findings, one per project chain, high and medium only.
  const briefing: Finding[] = [];
  const usedProjects = new Set<string>();
  for (const f of findings) {
    if (briefing.length >= 5) break;
    if (f.severity === "low") continue;
    if (f.projectId && usedProjects.has(f.projectId)) continue;
    briefing.push(f);
    if (f.projectId) usedProjects.add(f.projectId);
  }

  const ALL: ModuleKey[] = ["projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll"];
  return { findings, checks, projects, forecasts: forecasts(ds, projects), briefing, hiddenModules: ALL.filter((m) => !can(m)), at: ds.now };
}

/** Which modules each dataset key is read under — mirrors the API's read permissions. */
export const DATA_MODULE: Record<Exclude<keyof Dataset, "today" | "now" | "visible" | "user">, ModuleKey> = {
  projects: "projects",
  items: "dashboard",
  boms: "inventory",
  workOrders: "inventory",
  movements: "inventory",
  subcontractIssues: "inventory",
  assets: "assets",
  tickets: "assets",
  contracts: "assets",
  calibrations: "assets",
  purchaseRequests: "purchase",
  rfqs: "purchase",
  purchaseOrders: "purchase",
  vendors: "dashboard",
  salesOrders: "sales",
  billingAdvices: "sales",
  postings: "sales",
  quotations: "sales",
  opportunities: "crm",
  approvals: "dashboard",
  people: "dashboard",
  leaveRequests: "hr",
  claims: "hr",
  payrollRuns: "payroll",
  exitCases: "hr",
};
