/**
 * The context Claude answers from: records the actor may view, nothing else.
 * Each resource is loaded only when the actor's role can view its module (the same
 * guard GET /api/<resource> applies), trimmed to the fields analysis needs (no email
 * or phone numbers), sorted by id so the JSON is byte-stable and the prompt cache hits.
 * The rule-based findings from the Insights engine ride along, so Claude explains the
 * same numbers the Insights page shows instead of re-deriving them.
 */
import * as fx from "../../../prototype/src/api/fixtures";
import type { ModuleKey } from "../../../prototype/src/api/types";
import { analyze, type Dataset } from "../../../prototype/src/modules/insights/engine";
import { can, type Actor } from "../core";
import type { Database } from "../db/client";
import { env } from "../env";
import { read } from "../read";

const MODULES: ModuleKey[] = ["dashboard", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll"];

/** Dataset key → [module that guards it, loader]. Mirrors RESOURCES in app.ts. */
const LOADERS = {
  projects: ["projects", (db: Database) => read.projects(db)],
  items: ["dashboard", read.items],
  boms: ["inventory", read.boms],
  workOrders: ["inventory", read.workOrders],
  movements: ["inventory", read.movements],
  subcontractIssues: ["inventory", read.subcontractIssues],
  assets: ["assets", read.assets],
  tickets: ["assets", read.tickets],
  contracts: ["assets", read.contracts],
  calibrations: ["assets", read.calibrations],
  purchaseRequests: ["purchase", read.purchaseRequests],
  rfqs: ["purchase", read.rfqs],
  purchaseOrders: ["purchase", read.purchaseOrders],
  vendors: ["dashboard", read.vendors],
  salesOrders: ["sales", read.salesOrders],
  billingAdvices: ["sales", read.billingAdvices],
  postings: ["sales", read.postings],
  quotations: ["sales", read.quotations],
  opportunities: ["crm", read.opportunities],
  approvals: ["dashboard", read.approvals],
  people: ["dashboard", read.people],
  leaveRequests: ["hr", read.leaveRequests],
  claims: ["hr", read.claims],
  payrollRuns: ["payroll", read.payrollRuns],
  exitCases: ["hr", read.exitCases],
} as const satisfies Record<string, readonly [ModuleKey, (db: Database) => Promise<unknown[]>]>;

/** Demo clock: the fixtures are written for 09:40 IST on the business date. */
export function businessNow() {
  return env.businessDate === fx.TODAY ? fx.NOW : `${env.businessDate}T${new Date().toISOString().slice(11, 19)}Z`;
}

export async function loadDataset(db: Database, actor: Actor): Promise<Dataset> {
  const visible = MODULES.filter((m) => can(actor, m, "view"));
  const data: Record<string, unknown[] | undefined> = {};
  await Promise.all(
    Object.entries(LOADERS).map(async ([key, [module, load]]) => {
      if (visible.includes(module)) data[key] = await (load as (db: Database) => Promise<unknown[]>)(db);
    }),
  );
  const ds = { ...data, today: env.businessDate, now: businessNow(), visible } as Dataset;
  // Approvals are readable by every role; keep only those in modules this role can open.
  ds.approvals = ds.approvals?.filter((a) => visible.includes(a.module));
  ds.user = { name: actor.name, role: actor.roleName, approveModules: MODULES.filter((m) => can(actor, m, "approve")) };
  return ds;
}

/** Fields that identify or contact a person and aren't needed to answer questions. */
const DROP = new Set(["email", "phone", "initials", "gstin"]);

function compact(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(compact);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      if (DROP.has(k)) continue;
      const x = (v as Record<string, unknown>)[k];
      if (x === null || x === undefined || x === "") continue;
      out[k] = compact(x);
    }
    return out;
  }
  return v;
}

const byId = (rows: unknown[]) => [...rows].sort((a, b) => String((a as { id?: string; key?: string }).id ?? (a as { key?: string }).key ?? "").localeCompare(String((b as { id?: string; key?: string }).id ?? (b as { key?: string }).key ?? "")));

export interface AssistContext {
  json: string;
  ids: Set<string>;
  visible: ModuleKey[];
  dataset: Dataset;
}

/** Build the JSON context for one actor. Deterministic for a given role and data. */
export async function buildContext(db: Database, actor: Actor): Promise<AssistContext> {
  const ds = await loadDataset(db, actor);
  const analysis = analyze(ds);
  const records: Record<string, unknown> = {};
  for (const key of Object.keys(LOADERS).sort()) {
    const rows = (ds as unknown as Record<string, unknown[] | undefined>)[key];
    if (rows) records[key] = compact(byId(rows));
  }
  const findings = analysis.findings.map((f) => ({ severity: f.severity, area: f.area, title: f.title, detail: f.detail, numbers: f.numbers, records: f.cites }));
  const context = {
    meta: {
      company: "ABC Limited (demo workspace, illustrative records)",
      businessDate: ds.today,
      now: ds.now,
      timezone: "Asia/Kolkata",
      role: actor.roleName,
      modulesVisible: ds.visible,
      modulesNotVisible: MODULES.filter((m) => !ds.visible.includes(m)),
      money: "integer rupees",
    },
    findings,
    checksOutsideRole: analysis.checks.filter((c) => c.status === "hidden").map((c) => c.rule.name),
    records,
  };
  const json = JSON.stringify(context);
  const ids = new Set<string>();
  for (const m of json.matchAll(/"(?:id|key|advice|reference)":"([A-Z]{2,4}-[0-9A-Z-]+(?:\/R\d+)?)"/g)) ids.add(m[1]);
  for (const f of findings) f.records.forEach((r) => ids.add(r));
  return { json, ids, visible: ds.visible, dataset: ds };
}
