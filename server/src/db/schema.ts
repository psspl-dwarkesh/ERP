/**
 * Threadline relational schema (PostgreSQL).
 * Business keys are the human record ids (PRJ-0264, ITM-0137…) so every link the
 * UI shows is a real foreign key. Money is whole rupees (bigint), dates are `date`,
 * events are `timestamptz`. Child collections are tables, not JSON, so they can be
 * queried, locked and reported on.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const money = (name: string) => bigint(name, { mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const day = (name: string) => date(name, { mode: "string" });

/* ================================================================ Platform */
export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

/** none < view < edit < approve < admin, per module. */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    level: text("level").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.module] })],
);

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  employment: text("employment").notNull(),
  status: text("status").notNull(),
  assignment: text("assignment"),
  assignmentUntil: day("assignment_until"),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  certifications: jsonb("certifications").$type<{ name: string; expires: string }[]>().notNull().default([]),
  joined: day("joined").notNull(),
  utilisation: integer("utilisation").notNull().default(0),
  reportsTo: text("reports_to"),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // USR-0001
    email: text("email").notNull(),
    name: text("name").notNull(),
    personId: text("person_id").references(() => people.id),
    roleId: text("role_id").notNull().references(() => roles.id),
    passwordHash: text("password_hash").notNull(),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    status: text("status").notNull().default("Active"), // Active | Invited | Disabled
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

/** Opaque session tokens; only the SHA-256 of the token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Per-prefix counters for human record ids, incremented inside the creating transaction. */
export const idSequences = pgTable("id_sequences", {
  prefix: text("prefix").primaryKey(),
  next: integer("next").notNull(),
});

/** Append-only audit trail: who did what to which record, and when. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    at: ts("at").notNull(),
    actor: text("actor").notNull(),
    userId: text("user_id"),
    action: text("action").notNull(),
    reference: text("reference").notNull(),
    module: text("module").notNull(),
    detail: jsonb("detail"),
  },
  (t) => [index("audit_at_idx").on(t.at), index("audit_ref_idx").on(t.reference)],
);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  at: ts("at").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  reference: text("reference").notNull(),
  module: text("module").notNull(),
  tone: text("tone").notNull(),
  read: boolean("read").notNull().default(false),
});

export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    module: text("module").notNull(),
    reference: text("reference").notNull(),
    title: text("title").notNull(),
    maker: text("maker").notNull(),
    value: text("value").notNull(),
    submitted: ts("submitted").notNull(),
    level: text("level").notNull(),
    /** Role whose holder may decide (segregation of duties is enforced on top). */
    approverRoleId: text("approver_role_id").references(() => roles.id),
    status: text("status").notNull(),
    evidence: text("evidence").array().notNull().default(sql`'{}'::text[]`),
    decidedBy: text("decided_by"),
    decidedAt: ts("decided_at"),
    decisionNote: text("decision_note"),
  },
  (t) => [index("approvals_status_idx").on(t.status), index("approvals_ref_idx").on(t.reference)],
);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  module: text("module").notNull(),
  owner: text("owner").notNull(),
  description: text("description").notNull(),
  refresh: text("refresh").notNull(),
  restricted: boolean("restricted").notNull().default(false),
});

/* ================================================================ Masters */
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  accountOwner: text("account_owner").notNull(),
  gstin: text("gstin").notNull(),
});

export const customerSites = pgTable("customer_sites", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city").notNull(),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  city: text("city").notNull(),
  rating: real("rating").notNull(),
  onTimeRate: integer("on_time_rate").notNull(),
  openPOs: integer("open_pos").notNull().default(0),
});

/* ================================================================ Projects */
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  customer: text("customer").notNull(),
  site: text("site").notNull(),
  vertical: text("vertical").notNull(),
  manager: text("manager").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull(),
  start: day("start").notNull(),
  due: day("due").notNull(),
  salesOrder: text("sales_order"),
  bom: text("bom"),
  workOrder: text("work_order"),
  installedAsset: text("installed_asset"),
  contractValue: money("contract_value").notNull(),
  budget: money("budget").notNull(),
  committed: money("committed").notNull(),
  incurred: money("incurred").notNull(),
  billed: money("billed").notNull(),
  health: jsonb("health").$type<{ schedule: string; cost: string; material: string }>().notNull(),
});

export const projectMilestones = pgTable(
  "project_milestones",
  {
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    seq: integer("seq").notNull(),
    name: text("name").notNull(),
    due: day("due").notNull(),
    done: day("done"),
    status: text("status").notNull(),
    billable: money("billable"),
    gate: text("gate"),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.id] })],
);

export const projectRisks = pgTable(
  "project_risks",
  {
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    title: text("title").notNull(),
    impact: text("impact").notNull(),
    owner: text("owner").notNull(),
    mitigation: text("mitigation").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.id] })],
);

export const projectDocuments = pgTable("project_documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  revision: text("revision").notNull(),
  status: text("status").notNull(),
  updated: day("updated").notNull(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    personId: text("person_id").notNull().references(() => people.id),
    seq: integer("seq").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.personId] })],
);

/* ================================================================ Inventory & assembly */
export const items = pgTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  make: text("make").notNull(),
  uom: text("uom").notNull(),
  warehouse: text("warehouse").notNull(),
  bin: text("bin").notNull(),
  onHand: integer("on_hand").notNull(),
  reserved: integer("reserved").notNull(),
  quarantined: integer("quarantined").notNull(),
  onOrder: integer("on_order").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  unitCost: money("unit_cost").notNull(),
  serialized: boolean("serialized").notNull(),
  status: text("status").notNull(),
  lastMovement: day("last_movement").notNull(),
});

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    itemId: text("item_id").notNull().references(() => items.id),
    item: text("item").notNull(),
    qty: integer("qty").notNull(),
    from: text("from_location").notNull(),
    to: text("to_location").notNull(),
    reference: text("reference").notNull(),
    at: ts("at").notNull(),
    by: text("by").notNull(),
    status: text("status").notNull(),
  },
  (t) => [index("movements_item_idx").on(t.itemId), index("movements_at_idx").on(t.at)],
);

export const boms = pgTable("boms", {
  id: text("id").primaryKey(),
  revision: text("revision").notNull(),
  name: text("name").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: text("status").notNull(),
  releasedOn: day("released_on"),
});

export const bomLines = pgTable(
  "bom_lines",
  {
    bomId: text("bom_id").notNull().references(() => boms.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    itemId: text("item_id").notNull().references(() => items.id),
    item: text("item").notNull(),
    required: integer("required").notNull(),
    available: integer("available").notNull(),
    reserved: integer("reserved").notNull(),
    onOrder: integer("on_order").notNull(),
    uom: text("uom").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bomId, t.seq] })],
);

export const workOrders = pgTable("work_orders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id),
  bomId: text("bom_id").notNull(),
  serial: text("serial").notNull(),
  due: day("due").notNull(),
  qc: text("qc").notNull(),
});

export const workOrderStages = pgTable(
  "work_order_stages",
  {
    workOrderId: text("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    owner: text("owner").notNull(),
    done: day("done"),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.workOrderId, t.seq] })],
);

/* ================================================================ Assets & service */
export const serviceContracts = pgTable("service_contracts", {
  id: text("id").primaryKey(),
  customer: text("customer").notNull(),
  type: text("type").notNull(),
  start: day("start").notNull(),
  end: day("end_date").notNull(),
  visitsIncluded: integer("visits_included").notNull(),
  visitsUsed: integer("visits_used").notNull(),
  responseHours: integer("response_hours").notNull(),
  annualValue: money("annual_value").notNull(),
  status: text("status").notNull(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  ownership: text("ownership").notNull(),
  customer: text("customer"),
  site: text("site").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  serial: text("serial").notNull(),
  status: text("status").notNull(),
  contractId: text("contract_id").references(() => serviceContracts.id),
  custodian: text("custodian").notNull(),
  installed: day("installed").notNull(),
  warrantyEnd: day("warranty_end"),
  nextService: day("next_service"),
  calibrationDue: day("calibration_due"),
  projectId: text("project_id"),
});

export const contractAssets = pgTable(
  "contract_assets",
  {
    contractId: text("contract_id").notNull().references(() => serviceContracts.id, { onDelete: "cascade" }),
    assetId: text("asset_id").notNull().references(() => assets.id),
  },
  (t) => [primaryKey({ columns: [t.contractId, t.assetId] })],
);

export const serviceTickets = pgTable(
  "service_tickets",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    assetId: text("asset_id").notNull().references(() => assets.id),
    asset: text("asset").notNull(),
    customer: text("customer").notNull(),
    site: text("site").notNull(),
    contractId: text("contract_id").references(() => serviceContracts.id),
    priority: text("priority").notNull(),
    status: text("status").notNull(),
    assignee: text("assignee"),
    opened: ts("opened").notNull(),
    slaDue: ts("sla_due").notNull(),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    chargeable: boolean("chargeable").notNull(),
    resolution: text("resolution"),
  },
  (t) => [index("tickets_status_idx").on(t.status)],
);

export const calibrationJobs = pgTable("calibration_jobs", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  asset: text("asset").notNull(),
  due: day("due").notNull(),
  status: text("status").notNull(),
  engineer: text("engineer").notNull(),
  certificate: text("certificate"),
});

export const calibrationPoints = pgTable(
  "calibration_points",
  {
    jobId: text("job_id").notNull().references(() => calibrationJobs.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    nominal: text("nominal").notNull(),
    reading: text("reading").notNull(),
    tolerance: text("tolerance").notNull(),
    pass: boolean("pass").notNull(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.seq] })],
);

/* ================================================================ Purchase */
export const purchaseRequests = pgTable("purchase_requests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  projectId: text("project_id").references(() => projects.id),
  requester: text("requester").notNull(),
  value: money("value").notNull(),
  needBy: day("need_by").notNull(),
  status: text("status").notNull(),
});

export const prLines = pgTable(
  "pr_lines",
  {
    prId: text("pr_id").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    item: text("item").notNull(),
    qty: integer("qty").notNull(),
    uom: text("uom").notNull(),
  },
  (t) => [primaryKey({ columns: [t.prId, t.seq] })],
);

export const rfqs = pgTable("rfqs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  prId: text("pr_id").notNull(),
  projectId: text("project_id"),
  closes: day("closes").notNull(),
  status: text("status").notNull(),
  awardedTo: text("awarded_to"),
  awardRationale: text("award_rationale"),
});

export const rfqQuotes = pgTable(
  "rfq_quotes",
  {
    rfqId: text("rfq_id").notNull().references(() => rfqs.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id").notNull().references(() => vendors.id),
    vendor: text("vendor").notNull(),
    price: money("price").notNull(),
    leadDays: integer("lead_days").notNull(),
    technicalFit: text("technical_fit").notNull(),
    warrantyMonths: integer("warranty_months").notNull(),
    paymentTerms: text("payment_terms").notNull(),
    notes: text("notes").notNull(),
  },
  (t) => [primaryKey({ columns: [t.rfqId, t.vendorId] })],
);

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  vendor: text("vendor").notNull(),
  title: text("title").notNull(),
  projectId: text("project_id"),
  rfqId: text("rfq_id"),
  value: money("value").notNull(),
  issued: day("issued").notNull(),
  expected: day("expected").notNull(),
  status: text("status").notNull(),
});

export const poLines = pgTable(
  "po_lines",
  {
    poId: text("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    item: text("item").notNull(),
    ordered: integer("ordered").notNull(),
    received: integer("received").notNull(),
    rejected: integer("rejected").notNull(),
    uom: text("uom").notNull(),
  },
  (t) => [primaryKey({ columns: [t.poId, t.seq] })],
);

/* ================================================================ Commercial */
export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  account: text("account").notNull(),
  vertical: text("vertical").notNull(),
  stage: text("stage").notNull(),
  value: money("value").notNull(),
  probability: integer("probability").notNull(),
  owner: text("owner").notNull(),
  closeDate: day("close_date").notNull(),
  nextAction: text("next_action").notNull(),
  nextActionDue: day("next_action_due").notNull(),
  source: text("source").notNull(),
});

export const quotations = pgTable("quotations", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id"),
  customer: text("customer").notNull(),
  title: text("title").notNull(),
  revision: text("revision").notNull(),
  value: money("value").notNull(),
  validUntil: day("valid_until").notNull(),
  status: text("status").notNull(),
  owner: text("owner").notNull(),
});

export const salesOrders = pgTable("sales_orders", {
  id: text("id").primaryKey(),
  quotationId: text("quotation_id"),
  customer: text("customer").notNull(),
  title: text("title").notNull(),
  value: money("value").notNull(),
  billed: money("billed").notNull(),
  booked: day("booked").notNull(),
  status: text("status").notNull(),
  projectId: text("project_id"),
  owner: text("owner").notNull(),
});

export const billingAdvices = pgTable("billing_advices", {
  id: text("id").primaryKey(),
  salesOrderId: text("sales_order_id").notNull().references(() => salesOrders.id),
  customer: text("customer").notNull(),
  trigger: text("trigger").notNull(),
  value: money("value").notNull(),
  raised: day("raised").notNull(),
  status: text("status").notNull(),
});

/* ================================================================ People & payroll */
export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id),
  person: text("person").notNull(),
  kind: text("kind").notNull(),
  from: day("from_date").notNull(),
  to: day("to_date").notNull(),
  days: integer("days").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
});

export const claims = pgTable("claims", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id),
  person: text("person").notNull(),
  kind: text("kind").notNull(),
  reference: text("reference").notNull(),
  amount: money("amount").notNull(),
  submitted: day("submitted").notNull(),
  status: text("status").notNull(),
});

export const payrollRuns = pgTable("payroll_runs", {
  id: text("id").primaryKey(),
  period: text("period").notNull(),
  status: text("status").notNull(),
  employees: integer("employees").notNull(),
  gross: money("gross").notNull(),
  deductions: money("deductions").notNull(),
  net: money("net").notNull(),
});

export const payrollChecks = pgTable(
  "payroll_checks",
  {
    runId: text("run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    detail: text("detail").notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.seq] })],
);
