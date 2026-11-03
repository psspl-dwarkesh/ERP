/**
 * Mock API. Every function is async and returns plain data, exactly as the
 * future REST backend will (GET /projects, POST /approvals/:id/decision …).
 * Replace the bodies with fetch() calls in the backend phase; screens keep working.
 *
 * Mutations persist to localStorage so a demo survives reloads; `resetDemo()` restores fixtures.
 */
import * as fx from "./fixtures";
import { http } from "./http";
import { canAccess, getSessionUser, isFullDemoUser } from "./session";
import { API_MODE, ApiError, invalidate } from "./store";
import type {
  Approval,
  ModuleKey,
  PurchaseRequest,
  ServiceTicket,
  StockMovement,
} from "./types";

const STORAGE_KEY = "threadline-demo-v2";

type Db = {
  people: typeof fx.people;
  customers: typeof fx.customers;
  vendors: typeof fx.vendors;
  projects: typeof fx.projects;
  items: typeof fx.items;
  movements: typeof fx.movements;
  boms: typeof fx.boms;
  workOrders: typeof fx.workOrders;
  assets: typeof fx.assets;
  tickets: typeof fx.tickets;
  contracts: typeof fx.contracts;
  calibrations: typeof fx.calibrations;
  purchaseRequests: typeof fx.purchaseRequests;
  rfqs: typeof fx.rfqs;
  purchaseOrders: typeof fx.purchaseOrders;
  opportunities: typeof fx.opportunities;
  quotations: typeof fx.quotations;
  salesOrders: typeof fx.salesOrders;
  billingAdvices: typeof fx.billingAdvices;
  leaveRequests: typeof fx.leaveRequests;
  claims: typeof fx.claims;
  payrollRuns: typeof fx.payrollRuns;
  approvals: typeof fx.approvals;
  activity: typeof fx.activity;
  roles: typeof fx.roles;
  reports: typeof fx.reports;
  notifications: typeof fx.notifications;
  subcontractIssues: typeof fx.subcontractIssues;
  exitCases: typeof fx.exitCases;
  postings: typeof fx.postings;
};

function seed(): Db {
  return structuredClone({
    people: fx.people,
    customers: fx.customers,
    vendors: fx.vendors,
    projects: fx.projects,
    items: fx.items,
    movements: fx.movements,
    boms: fx.boms,
    workOrders: fx.workOrders,
    assets: fx.assets,
    tickets: fx.tickets,
    contracts: fx.contracts,
    calibrations: fx.calibrations,
    purchaseRequests: fx.purchaseRequests,
    rfqs: fx.rfqs,
    purchaseOrders: fx.purchaseOrders,
    opportunities: fx.opportunities,
    quotations: fx.quotations,
    salesOrders: fx.salesOrders,
    billingAdvices: fx.billingAdvices,
    leaveRequests: fx.leaveRequests,
    claims: fx.claims,
    payrollRuns: fx.payrollRuns,
    approvals: fx.approvals,
    activity: fx.activity,
    roles: fx.roles,
    reports: fx.reports,
    notifications: fx.notifications,
    subcontractIssues: fx.subcontractIssues,
    exitCases: fx.exitCases,
    postings: fx.postings,
  });
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seed(), ...JSON.parse(raw) };
  } catch {
    /* storage blocked or corrupt — fall back to fixtures */
  }
  return seed();
}

let db: Db = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* ignore quota / privacy mode */
  }
}

/* ---- change notification so hooks can refetch ---- */
export { ApiError, getVersion, subscribe, API_MODE } from "./store";
function commit() {
  persist();
  invalidate();
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => wait(140 + Math.random() * 220);
const clone = <T,>(v: T): T => structuredClone(v);

function find<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((r) => r.id === id);
  if (!found) throw new ApiError(`${label} ${id} not found`, "NOT_FOUND");
  return found;
}

function log(actor: string, action: string, reference: string, module: ModuleKey) {
  db.activity.unshift({
    id: `ACT-${Date.now()}`,
    at: new Date().toISOString(),
    actor,
    action,
    reference,
    module,
  });
}

const CURRENT_USER = "Arjun Mehta";

/** Who may decide each seeded approval — mirrors server/src/db/seed.ts. */
const APPROVER_ROLE: Record<string, string> = { "APR-0132": "ROLE-01", "APR-0129": "ROLE-01", "APR-0125": "ROLE-01", "APR-0121": "ROLE-07" };

/* ---------------- Queries ---------------- */
async function list<K extends keyof Db>(key: K): Promise<Db[K]> {
  await latency();
  return clone(db[key]);
}

/** The signed-in user as a directory entry (name, role, email) — from the session in remote mode. */
function currentUser() {
  const s = getSessionUser();
  const person = fx.people.find((p) => p.name === (s?.name ?? CURRENT_USER));
  if (s) return { ...(person ?? fx.people[0]), name: s.name, role: s.title, email: s.email, initials: s.initials };
  return person!;
}

const mockApi = {
  currentUser,
  people: () => list("people"),
  customers: () => list("customers"),
  vendors: () => list("vendors"),
  projects: () => list("projects"),
  project: async (id: string) => {
    await latency();
    return clone(find(db.projects, id, "Project"));
  },
  items: () => list("items"),
  movements: () => list("movements"),
  boms: () => list("boms"),
  workOrders: () => list("workOrders"),
  assets: () => list("assets"),
  tickets: () => list("tickets"),
  contracts: () => list("contracts"),
  calibrations: () => list("calibrations"),
  purchaseRequests: () => list("purchaseRequests"),
  rfqs: () => list("rfqs"),
  purchaseOrders: () => list("purchaseOrders"),
  opportunities: () => list("opportunities"),
  quotations: () => list("quotations"),
  salesOrders: () => list("salesOrders"),
  billingAdvices: () => list("billingAdvices"),
  leaveRequests: () => list("leaveRequests"),
  claims: () => list("claims"),
  payrollRuns: () => list("payrollRuns"),
  approvals: () => list("approvals"),
  activity: () => list("activity"),
  roles: () => list("roles"),
  reports: () => list("reports"),
  notifications: () => list("notifications"),
  subcontractIssues: () => list("subcontractIssues"),
  exitCases: () => list("exitCases"),
  postings: () => list("postings"),

  /* ---------------- Commands ---------------- */
  async decideApproval(id: string, decision: "Approved" | "Rejected", reason: string) {
    await wait(420);
    const a = find(db.approvals, id, "Approval");
    if (a.status !== "Pending") throw new ApiError(`${a.reference} was already ${a.status.toLowerCase()}.`, "BLOCKED");
    if (a.maker === (getSessionUser()?.name ?? CURRENT_USER)) throw new ApiError("You raised this request, so someone else has to decide it (maker ≠ checker).", "FORBIDDEN");
    // Same authority rules as the API: a designated approver role, else "approve" on the module.
    const viewer = getSessionUser();
    if (viewer && !isFullDemoUser(viewer)) {
      const approver = APPROVER_ROLE[a.id] ?? (/Operations head|Commercial head/.test(a.level) ? "ROLE-01" : /Finance owner/.test(a.level) ? "ROLE-07" : undefined);
      if (approver && viewer.roleId !== approver) {
        const name = fx.roles.find((r) => r.id === approver)?.name ?? "designated";
        throw new ApiError(`This approval waits on the ${name} role. Your role (${viewer.role}) can view it but not decide it.`, "FORBIDDEN");
      }
      if (!approver && !canAccess(viewer, a.module, "approve")) throw new ApiError(`Your role (${viewer.role}) can't approve ${a.module} requests.`, "FORBIDDEN");
    }
    if (decision === "Rejected" && reason.trim().length < 8) {
      throw new ApiError("Give a reason of at least 8 characters so the maker can act on it.", "VALIDATION");
    }
    a.status = decision;
    if (a.reference.startsWith("PR-")) {
      const pr = db.purchaseRequests.find((p) => p.id === a.reference);
      if (pr) pr.status = decision === "Approved" ? "Approved" : "Rejected";
    }
    if (a.reference.startsWith("CLM-")) {
      const c = db.claims.find((x) => x.id === a.reference);
      if (c) c.status = decision === "Approved" ? "Approved" : "Rejected";
    }
    if (a.reference.startsWith("SI-")) {
      const si = db.subcontractIssues.find((x) => x.id === a.reference);
      if (si) si.status = decision === "Approved" ? "Closed" : "Open";
    }
    log(CURRENT_USER, decision === "Approved" ? "approved" : "rejected", a.reference, a.module);
    commit();
    return clone(a) as Approval;
  },

  async issueStock(itemId: string, qty: number, to: string) {
    await wait(380);
    const item = find(db.items, itemId, "Item");
    const free = item.onHand - item.reserved - item.quarantined;
    if (item.quarantined > 0 && free <= 0) {
      throw new ApiError(`${item.id} is on QC hold. Release it through inspection before issuing.`, "BLOCKED");
    }
    if (qty > free) {
      throw new ApiError(`Only ${free} ${item.uom} free to issue (${item.reserved} reserved, ${item.quarantined} on hold).`, "BLOCKED");
    }
    item.onHand -= qty;
    item.lastMovement = fx.TODAY;
    const mv: StockMovement = {
      id: `MOV-${String(932 + db.movements.length).padStart(4, "0")}`,
      type: "Issue",
      itemId,
      item: item.name,
      qty,
      from: item.warehouse,
      to,
      reference: to,
      at: new Date().toISOString(),
      by: CURRENT_USER,
      status: "Posted",
    };
    db.movements.unshift(mv);
    log(CURRENT_USER, `issued ${qty} ${item.uom} of`, item.id, "inventory");
    commit();
    return clone(mv);
  },

  async releaseFromQc(itemId: string, pass: boolean) {
    await wait(380);
    const item = find(db.items, itemId, "Item");
    if (pass) {
      item.status = "Available";
      item.quarantined = 0;
      item.warehouse = "Central warehouse";
      item.bin = "A-11";
      item.lastMovement = fx.TODAY;
      db.movements.unshift({
        id: `MOV-${String(932 + db.movements.length).padStart(4, "0")}`,
        type: "QC release",
        itemId,
        item: item.name,
        qty: item.onHand,
        from: "QC bay",
        to: "Central warehouse",
        reference: "GRN-0073",
        at: new Date().toISOString(),
        by: CURRENT_USER,
        status: "Posted",
      });
    }
    log(CURRENT_USER, pass ? "released from QC" : "rejected at QC", item.id, "inventory");
    commit();
    return clone(item);
  },

  async advanceWorkOrder(id: string) {
    await wait(420);
    const wo = find(db.workOrders, id, "Work order");
    const idx = wo.stages.findIndex((s) => s.status === "Active");
    if (idx === -1) throw new ApiError("No active stage to complete.", "VALIDATION");
    const next = wo.stages[idx + 1];
    if (next?.key === "assembly") {
      const bom = db.boms.find((b) => b.id === wo.bomId);
      const short = bom?.lines.filter((l) => l.available + l.reserved < l.required) ?? [];
      if (short.length) {
        wo.stages[idx].status = "Done";
        wo.stages[idx].done = fx.TODAY;
        next.status = "Blocked";
        next.note = `${short.length} BOM lines short — waiting on PR-0084`;
        log(CURRENT_USER, "completed wiring on", wo.id, "inventory");
        commit();
        throw new ApiError(`Wiring done. Assembly is blocked: ${short.length} BOM lines are short.`, "BLOCKED");
      }
    }
    if (next?.key === "dispatch" && wo.qc !== "Passed") {
      throw new ApiError("Dispatch needs a passed QC record first.", "BLOCKED");
    }
    wo.stages[idx].status = "Done";
    wo.stages[idx].done = fx.TODAY;
    if (next) next.status = "Active";
    if (next?.key === "testing") wo.qc = "Pending review";
    log(CURRENT_USER, `completed ${wo.stages[idx].name.toLowerCase()} on`, wo.id, "inventory");
    commit();
    return clone(wo);
  },

  async awardRfq(id: string, vendorId: string, rationale: string) {
    await wait(420);
    const rfq = find(db.rfqs, id, "RFQ");
    if (rationale.trim().length < 12) throw new ApiError("Record why this supplier was chosen (at least 12 characters).", "VALIDATION");
    const q = rfq.quotes.find((x) => x.vendorId === vendorId);
    if (!q) throw new ApiError("Quote not found", "NOT_FOUND");
    rfq.status = "Awarded";
    rfq.awardedTo = q.vendor;
    rfq.awardRationale = rationale.trim();
    log(CURRENT_USER, `awarded to ${q.vendor}:`, rfq.id, "purchase");
    commit();
    return clone(rfq);
  },

  async updateTicket(id: string, patch: Partial<Pick<ServiceTicket, "status" | "assignee" | "priority">>) {
    await wait(320);
    const t = find(db.tickets, id, "Ticket");
    Object.assign(t, patch);
    log(CURRENT_USER, `set ${Object.entries(patch).map(([k, v]) => `${k} → ${v}`).join(", ")} on`, t.id, "assets");
    commit();
    return clone(t);
  },

  async createPurchaseRequest(input: Pick<PurchaseRequest, "title" | "source" | "projectId" | "value" | "needBy" | "lines">) {
    await wait(420);
    if (!input.title.trim()) throw new ApiError("Title is required.", "VALIDATION");
    const pr: PurchaseRequest = {
      ...input,
      id: `PR-${String(87 + db.purchaseRequests.length).padStart(4, "0")}`,
      requester: CURRENT_USER,
      status: "Draft",
    };
    db.purchaseRequests.unshift(pr);
    log(CURRENT_USER, "created draft", pr.id, "purchase");
    commit();
    return clone(pr);
  },

  async moveOpportunity(id: string, stage: (typeof fx.opportunities)[number]["stage"]) {
    await wait(260);
    const o = find(db.opportunities, id, "Opportunity");
    o.stage = stage;
    log(CURRENT_USER, `moved to ${stage}:`, o.id, "crm");
    commit();
    return clone(o);
  },

  async decideLeave(id: string, status: "Approved" | "Rejected") {
    await wait(300);
    const l = find(db.leaveRequests, id, "Leave request");
    l.status = status;
    log(CURRENT_USER, `${status.toLowerCase()} leave`, l.id, "hr");
    commit();
    return clone(l);
  },

  async markNotificationsRead() {
    db.notifications.forEach((n) => (n.read = true));
    commit();
  },

  async search(q: string) {
    await wait(60);
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const hits: { id: string; title: string; subtitle: string; module: ModuleKey }[] = [];
    const add = (id: string, title: string, subtitle: string, module: ModuleKey) => {
      if (`${id} ${title} ${subtitle}`.toLowerCase().includes(term)) hits.push({ id, title, subtitle, module });
    };
    db.projects.forEach((p) => add(p.id, p.name, `${p.customer} · ${p.status}`, "projects"));
    db.items.forEach((i) => add(i.id, i.name, `${i.warehouse} · ${i.status}`, "inventory"));
    db.assets.forEach((a) => add(a.id, a.name, `${a.customer ?? "Company-owned"} · ${a.site}`, "assets"));
    db.tickets.forEach((t) => add(t.id, t.title, `${t.customer} · ${t.priority} · ${t.status}`, "assets"));
    db.purchaseRequests.forEach((p) => add(p.id, p.title, `Requisition · ${p.status}`, "purchase"));
    db.rfqs.forEach((r) => add(r.id, r.title, `RFQ · ${r.status}`, "purchase"));
    db.purchaseOrders.forEach((p) => add(p.id, p.title, `${p.vendor} · ${p.status}`, "purchase"));
    db.opportunities.forEach((o) => add(o.id, o.name, `${o.account} · ${o.stage}`, "crm"));
    db.salesOrders.forEach((s) => add(s.id, s.title, `${s.customer} · ${s.status}`, "sales"));
    db.quotations.forEach((s) => add(s.id, s.title, `Quotation rev ${s.revision} · ${s.status}`, "sales"));
    db.people.forEach((p) => add(p.id, p.name, `${p.role} · ${p.location}`, "hr"));
    db.workOrders.forEach((w) => add(w.id, w.name, `Work order · ${w.projectId}`, "inventory"));
    db.boms.forEach((b) => add(b.id, b.name, `BOM rev ${b.revision} · ${b.status}`, "inventory"));
    db.contracts.forEach((c) => add(c.id, `${c.type} · ${c.customer}`, `Contract · ${c.status}`, "assets"));
    return hits.slice(0, 12);
  },
};

/* ================================================================ Remote (Threadline API) */
type MockApi = typeof mockApi;
type Result<K extends keyof MockApi> = Awaited<ReturnType<MockApi[K]>>;
const get =
  <K extends keyof MockApi>(path: string) =>
  () =>
    http.get<Result<K>>(path);

const remoteApi: MockApi = {
  currentUser,
  people: get<"people">("/people"),
  customers: get<"customers">("/customers"),
  vendors: get<"vendors">("/vendors"),
  projects: get<"projects">("/projects"),
  project: (id: string) => http.get<Result<"project">>(`/projects/${encodeURIComponent(id)}`),
  items: get<"items">("/items"),
  movements: get<"movements">("/movements"),
  boms: get<"boms">("/boms"),
  workOrders: get<"workOrders">("/work-orders"),
  assets: get<"assets">("/assets"),
  tickets: get<"tickets">("/tickets"),
  contracts: get<"contracts">("/contracts"),
  calibrations: get<"calibrations">("/calibrations"),
  purchaseRequests: get<"purchaseRequests">("/purchase-requests"),
  rfqs: get<"rfqs">("/rfqs"),
  purchaseOrders: get<"purchaseOrders">("/purchase-orders"),
  opportunities: get<"opportunities">("/opportunities"),
  quotations: get<"quotations">("/quotations"),
  salesOrders: get<"salesOrders">("/sales-orders"),
  billingAdvices: get<"billingAdvices">("/billing-advices"),
  leaveRequests: get<"leaveRequests">("/leave-requests"),
  claims: get<"claims">("/claims"),
  payrollRuns: get<"payrollRuns">("/payroll-runs"),
  approvals: get<"approvals">("/approvals"),
  activity: get<"activity">("/activity"),
  roles: get<"roles">("/roles"),
  reports: get<"reports">("/reports"),
  notifications: get<"notifications">("/notifications"),
  subcontractIssues: get<"subcontractIssues">("/subcontract-issues"),
  exitCases: get<"exitCases">("/exit-cases"),
  postings: get<"postings">("/postings"),
  search: (q: string) => (q.trim().length < 2 ? Promise.resolve([]) : http.get<Result<"search">>(`/search?q=${encodeURIComponent(q)}`)),

  decideApproval: (id, decision, reason) => http.command("approvals.decide", { id, decision, reason }),
  issueStock: (itemId, qty, to) => http.command("inventory.issueStock", { itemId, qty, to }),
  releaseFromQc: (itemId, pass) => http.command("inventory.decideQc", { itemId, decision: pass ? "release" : "reject", note: pass ? "" : "Rejected at incoming inspection" }),
  advanceWorkOrder: (id) => http.command("inventory.advanceWorkOrder", { id }),
  awardRfq: (id, vendorId, rationale) => http.command("purchase.awardRfq", { id, vendorId, rationale }),
  updateTicket: (id, patch) => http.command("assets.updateTicket", { id, patch }),
  createPurchaseRequest: (input) => http.command("purchase.createRequest", input),
  moveOpportunity: (id, stage) => http.command("crm.moveOpportunity", { id, stage }),
  decideLeave: (id, status) => http.command("hr.decideLeave", { id, status }),
  markNotificationsRead: () => http.command("notifications.markRead", {}),
};

export const api: MockApi = API_MODE === "remote" ? remoteApi : mockApi;

/**
 * Declare a module command once; it runs against the browser mock or the API
 * depending on the build. `toInput` maps the call's arguments to the server
 * command's JSON body; `local` is the in-browser implementation.
 */
export function defineCommand<A extends unknown[], R>(name: string, toInput: (...args: A) => unknown, local: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return (...args: A) => (API_MODE === "remote" ? http.command<R>(name, toInput(...args)) : local(...args));
}

/**
 * Escape hatch for module-level commands (kept in src/modules/<m>/commands.ts):
 * mutate the in-memory db, log an audit event, persist and notify subscribers.
 * Throw ApiError inside `fn` to reject the command. Mirrors a POST to the backend.
 */
export async function mutate<T>(
  fn: (db: Db) => T,
  audit?: { action: string; reference: string; module: ModuleKey },
  delayMs = 380,
): Promise<T> {
  await wait(delayMs);
  const result = fn(db);
  if (audit) log(getSessionUser()?.name ?? CURRENT_USER, audit.action, audit.reference, audit.module);
  commit();
  return clone(result);
}
export type { Db };

export function resetDemo() {
  db = seed();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  commit();
}

/** Which module owns a record id prefix — used for cross-module links. */
export function moduleForId(id: string): ModuleKey | null {
  const p = id.split("-")[0];
  const map: Record<string, ModuleKey> = {
    PRJ: "projects",
    ITM: "inventory",
    BOM: "inventory",
    WO: "inventory",
    GRN: "inventory",
    MOV: "inventory",
    TRF: "inventory",
    CNT: "inventory",
    RTN: "inventory",
    DOC: "projects",
    AST: "assets",
    SR: "assets",
    AMC: "assets",
    OM: "assets",
    CAL: "assets",
    PR: "purchase",
    RFQ: "purchase",
    PO: "purchase",
    VEN: "purchase",
    OPP: "crm",
    CUS: "crm",
    QUO: "sales",
    SO: "sales",
    BA: "sales",
    SI: "inventory",
    EXT: "hr",
    EMP: "hr",
    LV: "hr",
    CLM: "hr",
    PAY: "payroll",
    ROLE: "users",
    RPT: "reports",
  };
  return map[p] ?? null;
}
