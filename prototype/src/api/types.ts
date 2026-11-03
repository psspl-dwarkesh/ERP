/**
 * Domain model for the Threadline ERP front end.
 * These shapes are the contract the Node + PostgreSQL backend will implement:
 * money is an integer number of rupees, dates are ISO strings, every record
 * carries a stable id and the ids of the records it links to.
 */

export type ISODate = string; // "2026-11-18"
export type ISODateTime = string; // "2026-11-03T14:00:00+05:30"
export type Rupees = number;

export type ModuleKey =
  | "dashboard"
  | "projects"
  | "inventory"
  | "assets"
  | "purchase"
  | "sales"
  | "crm"
  | "hr"
  | "payroll"
  | "users"
  | "reports";

export type Vertical =
  | "Turnkey automation"
  | "Panel assembly"
  | "Instrumentation"
  | "Calibration"
  | "AMC"
  | "O&M"
  | "CSV / Manufacturing IT";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "risk" | "info" | "violet";

export interface Person {
  id: string; // EMP-0034
  name: string;
  initials: string;
  role: string;
  department: string;
  location: string;
  email: string;
  phone: string;
  employment: "Permanent" | "Contract" | "Probation";
  status: "Deployed" | "Available" | "On leave" | "Notice period";
  assignment?: string; // record id: PRJ-0264, SR-0148, AMC-0031
  assignmentUntil?: ISODate;
  skills: string[];
  certifications: { name: string; expires: ISODate }[];
  joined: ISODate;
  utilisation: number; // 0..100 this month
  reportsTo?: string;
}

export interface Customer {
  id: string; // CUS-0012
  name: string;
  industry: string;
  sites: { id: string; name: string; city: string }[];
  accountOwner: string;
  gstin: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number; // 0..5
  onTimeRate: number; // 0..100
  openPOs: number;
}

/* ---------------- Projects ---------------- */
export type ProjectStatus = "Planning" | "On track" | "At risk" | "In review" | "On hold" | "Closed";

export interface Milestone {
  id: string;
  name: string;
  due: ISODate;
  done?: ISODate;
  status: "Done" | "In progress" | "Upcoming" | "Late" | "Blocked";
  billable?: Rupees;
  gate?: string; // FAT, SAT, loop test…
}

export interface ProjectRisk {
  id: string;
  title: string;
  impact: "Low" | "Medium" | "High";
  owner: string;
  mitigation: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  kind: "Drawing" | "Specification" | "Protocol" | "Certificate" | "Transmittal";
  revision: string;
  status: "Approved" | "In review" | "Draft" | "Superseded";
  updated: ISODate;
}

export interface Project {
  id: string; // PRJ-0264
  name: string;
  customerId: string;
  customer: string;
  site: string;
  vertical: Vertical;
  manager: string;
  status: ProjectStatus;
  progress: number; // 0..100
  start: ISODate;
  due: ISODate;
  salesOrder?: string;
  bom?: string;
  workOrder?: string;
  installedAsset?: string;
  contractValue: Rupees;
  budget: Rupees;
  committed: Rupees;
  incurred: Rupees;
  billed: Rupees;
  milestones: Milestone[];
  risks: ProjectRisk[];
  documents: ProjectDocument[];
  team: string[]; // person ids
  health: { schedule: Tone; cost: Tone; material: Tone };
}

/* ---------------- Inventory & assembly ---------------- */
export type StockStatus = "Available" | "Low stock" | "QC hold" | "Out of stock" | "Reserved";

export interface Item {
  id: string; // ITM-0042
  name: string;
  category: string;
  make: string;
  uom: string;
  warehouse: string;
  bin: string;
  onHand: number;
  reserved: number;
  quarantined: number;
  onOrder: number;
  reorderLevel: number;
  unitCost: Rupees;
  serialized: boolean;
  status: StockStatus;
  lastMovement: ISODate;
}

export interface StockMovement {
  id: string; // MOV-0931
  type: "Receipt" | "Issue" | "Transfer" | "Return" | "Adjustment" | "QC release";
  itemId: string;
  item: string;
  qty: number;
  from: string;
  to: string;
  reference: string;
  at: ISODateTime;
  by: string;
  status: "Posted" | "Pending" | "Blocked" | "In transit";
}

export interface BomLine {
  itemId: string;
  item: string;
  required: number;
  available: number;
  reserved: number;
  onOrder: number;
  uom: string;
}

export interface Bom {
  id: string; // BOM-042
  revision: string;
  name: string;
  projectId: string;
  status: "Released" | "In approval" | "Draft" | "Superseded";
  releasedOn?: ISODate;
  lines: BomLine[];
}

export interface AssemblyStage {
  key: string;
  name: string;
  status: "Done" | "Active" | "Waiting" | "Blocked";
  owner: string;
  done?: ISODate;
  note?: string;
}

export interface WorkOrder {
  id: string; // WO-0187
  name: string;
  projectId: string;
  bomId: string;
  serial: string;
  due: ISODate;
  stages: AssemblyStage[];
  qc: "Not started" | "Pending review" | "Passed" | "Failed";
}

/* ---------------- Assets & service ---------------- */
export interface Asset {
  id: string; // AST-0042
  name: string;
  category: string;
  ownership: "Customer" | "Company";
  customer?: string;
  site: string;
  make: string;
  model: string;
  serial: string;
  status: "In service" | "Under repair" | "Calibration due" | "Idle" | "Retired";
  contractId?: string;
  custodian: string;
  installed: ISODate;
  warrantyEnd?: ISODate;
  nextService?: ISODate;
  calibrationDue?: ISODate;
  projectId?: string;
}

export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export interface ServiceTicket {
  id: string; // SR-0148
  title: string;
  assetId: string;
  asset: string;
  customer: string;
  site: string;
  contractId?: string;
  priority: TicketPriority;
  status: "New" | "Assigned" | "En route" | "On site" | "Resolved" | "Closed";
  assignee?: string;
  opened: ISODateTime;
  slaDue: ISODateTime;
  channel: "Phone" | "Email" | "Portal" | "Scheduled";
  kind: "Breakdown" | "Preventive" | "Calibration" | "Inspection";
  chargeable: boolean;
}

export interface ServiceContract {
  id: string; // AMC-0031
  customer: string;
  type: "AMC" | "O&M";
  start: ISODate;
  end: ISODate;
  assets: string[];
  visitsIncluded: number;
  visitsUsed: number;
  responseHours: number;
  annualValue: Rupees;
  status: "Active" | "Renewal due" | "Expired";
}

export interface CalibrationJob {
  id: string; // CAL-0096
  assetId: string;
  asset: string;
  due: ISODate;
  status: "Overdue" | "Due" | "Scheduled" | "Passed" | "Failed";
  engineer: string;
  points: { nominal: string; reading: string; tolerance: string; pass: boolean }[];
  certificate?: string;
}

/* ---------------- Purchase ---------------- */
export interface PurchaseRequest {
  id: string; // PR-0084
  title: string;
  source: string; // BOM-042 rev C shortage
  projectId?: string;
  requester: string;
  value: Rupees;
  needBy: ISODate;
  status: "Draft" | "Awaiting approval" | "Approved" | "Rejected" | "Converted";
  lines: { item: string; qty: number; uom: string }[];
}

export interface SupplierQuote {
  vendorId: string;
  vendor: string;
  price: Rupees;
  leadDays: number;
  technicalFit: "Full" | "Partial" | "Deviation";
  warrantyMonths: number;
  paymentTerms: string;
  notes: string;
}

export interface Rfq {
  id: string; // RFQ-0041
  title: string;
  prId: string;
  projectId?: string;
  closes: ISODate;
  status: "Open" | "Evaluating" | "Awarded" | "Cancelled";
  quotes: SupplierQuote[];
  awardedTo?: string;
  awardRationale?: string;
}

export interface PurchaseOrder {
  id: string; // PO-0118
  vendor: string;
  title: string;
  projectId?: string;
  value: Rupees;
  issued: ISODate;
  expected: ISODate;
  status: "Issued" | "Part received" | "Received" | "Closed" | "Cancelled";
  lines: { item: string; ordered: number; received: number; rejected: number; uom: string }[];
}

/* ---------------- Commercial ---------------- */
export type OpportunityStage = "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";

export interface Opportunity {
  id: string; // OPP-0081
  name: string;
  account: string;
  vertical: Vertical;
  stage: OpportunityStage;
  value: Rupees;
  probability: number;
  owner: string;
  closeDate: ISODate;
  nextAction: string;
  nextActionDue: ISODate;
  source: "Tender" | "Referral" | "Existing customer" | "Website" | "Renewal";
}

export interface Quotation {
  id: string; // QUO-0221
  opportunityId?: string;
  customer: string;
  title: string;
  revision: string;
  value: Rupees;
  validUntil: ISODate;
  status: "Draft" | "Sent" | "In review" | "Accepted" | "Expired";
  owner: string;
}

export interface SalesOrder {
  id: string; // SO-0196
  quotationId?: string;
  customer: string;
  title: string;
  value: Rupees;
  billed: Rupees;
  booked: ISODate;
  status: "Confirmed" | "In fulfilment" | "Delivered" | "Closed";
  projectId?: string;
  owner: string;
}

export interface BillingAdvice {
  id: string; // BA-0063
  salesOrderId: string;
  customer: string;
  trigger: string;
  value: Rupees;
  raised: ISODate;
  status: "Ready for review" | "Sent to accounting" | "Posted" | "Mismatch";
}

/* ---------------- People & payroll ---------------- */
export interface LeaveRequest {
  id: string;
  personId: string;
  person: string;
  kind: "Casual" | "Earned" | "Sick" | "Comp-off";
  from: ISODate;
  to: ISODate;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
}

export interface Claim {
  id: string; // CLM-0068
  personId: string;
  person: string;
  kind: "Travel" | "Site expense" | "Lodging" | "Tools";
  reference: string;
  amount: Rupees;
  submitted: ISODate;
  status: "Pending" | "Approved" | "Rejected" | "Paid";
}

export interface PayrollRun {
  id: string; // PAY-2026-11
  period: string;
  status: "Collecting inputs" | "Ready for review" | "Approved" | "Locked";
  employees: number;
  gross: Rupees;
  deductions: Rupees;
  net: Rupees;
  checks: { name: string; status: "Pass" | "Warning" | "Blocked"; detail: string }[];
}

/* ---------------- Platform ---------------- */
export interface Approval {
  id: string; // APR-0132
  type: string;
  module: ModuleKey;
  reference: string;
  title: string;
  maker: string;
  value: string;
  submitted: ISODateTime;
  level: string; // "Level 2 of 3 · Purchase head"
  status: "Pending" | "Approved" | "Rejected";
  evidence: string[];
}

export interface ActivityEvent {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  reference: string;
  module: ModuleKey;
}

export interface Role {
  id: string;
  name: string;
  users: number;
  description: string;
  permissions: Partial<Record<ModuleKey, "none" | "view" | "edit" | "approve" | "admin">>;
}

export interface ReportDef {
  id: string; // RPT-PM-01
  name: string;
  module: ModuleKey;
  owner: string;
  description: string;
  refresh: string;
  restricted: boolean;
}

export interface Notification {
  id: string;
  at: ISODateTime;
  title: string;
  body: string;
  reference: string;
  module: ModuleKey;
  tone: Tone;
  read: boolean;
}

/* ---------------------------------------------------------------- Subcontract custody (E2E-04) */
export interface SubcontractLine {
  itemId: string;
  item: string;
  issued: number;
  consumed: number;
  returned: number;
  damaged: number;
  unitValue: Rupees;
  note: string;
}

export interface SubcontractIssue {
  id: string; // SI-0044
  partner: string;
  package: string;
  poId?: string;
  projectId?: string;
  custodian: string;
  issuedOn: ISODate;
  reconcileBy: ISODate;
  issuedBy: string;
  status: "Open" | "Variance in approval" | "Closed";
  partnerReport?: string;
  lines: SubcontractLine[];
}

/* ---------------------------------------------------------------- Exit & handover (E2E-12) */
export type ExitItemKey = "identity" | "custody" | "commitment" | "claim" | "delegation" | "allocation";

export interface ExitItem {
  key: ExitItemKey;
  item: string;
  owner: string;
  due: ISODate;
  reference: string;
  rule: string;
  status: "Open" | "Done" | "Checked — nothing found";
  outcome?: string;
  doneBy?: string;
  doneAt?: ISODateTime;
}

export interface ExitCase {
  id: string; // EXT-0003
  personId: string;
  person: string;
  role: string;
  lastDay: ISODate;
  reason: string;
  status: "In progress" | "Closed";
  items: ExitItem[];
}

/* ---------------------------------------------------------------- Accounting outbox (E2E-10) */
export type PostingState = "Queued" | "Sent" | "Acknowledged" | "Failed" | "Needs attention" | "Superseded";

export interface AccountingPosting {
  key: string; // BA-0060/R1 — idempotency key, never reused for a different amount
  advice: string;
  party: string;
  projectId?: string;
  state: PostingState;
  attempts: number;
  lastAttempt?: ISODateTime;
  lastError?: string;
  amount: Rupees;
  posted?: Rupees;
  external?: string;
  supersedes?: string;
  supersededBy?: string;
  note: string;
}
