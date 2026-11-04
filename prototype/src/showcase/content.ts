import type { ModuleKey } from "../api/types";

/* ---------------------------------------------------------------- The job thread */
export interface JobStop {
  key: string;
  label: string;
  record: string;
  module: ModuleKey;
  moduleLabel: string;
  title: string;
  happens: string;
  control: string;
  owner: string;
  status: string;
}

export const JOB_STOPS: JobStop[] = [
  { key: "enquiry", label: "Enquiry", record: "OPP-0061", module: "crm", moduleLabel: "CRM", title: "Tender enquiry qualified", happens: "Northstar Pharma's RFQ for a Line 03 automation upgrade is logged with technical requirements, bid date and an estimator.", control: "Bid / no-bid decision recorded before effort is spent", owner: "Sana Kapoor · Sales", status: "Won" },
  { key: "quote", label: "Quotation", record: "QUO-0221", module: "sales", moduleLabel: "Sales", title: "Revision B accepted", happens: "Engineering, material and commissioning lines are priced. Revision A → B changes are kept side by side.", control: "Discounts above authority need approval", owner: "Sana Kapoor · Sales", status: "Accepted" },
  { key: "order", label: "Order", record: "SO-0196", module: "sales", moduleLabel: "Sales", title: "₹48.50 L order booked", happens: "The customer PO becomes a sales order with three billable milestones. No master data is typed twice.", control: "Order cannot exist without an accepted quotation", owner: "Sana Kapoor · Sales", status: "In fulfilment" },
  { key: "project", label: "Project", record: "PRJ-0264", module: "projects", moduleLabel: "Projects", title: "Project opened from the order", happens: "Milestones, FAT/SAT gates, budget by cost category and the team are set up from the order's scope.", control: "Budget and gates approved before procurement starts", owner: "Ananya Rao · Project manager", status: "At risk" },
  { key: "bom", label: "BOM & MRP", record: "BOM-042", module: "inventory", moduleLabel: "Inventory", title: "BOM rev C released, 3 lines short", happens: "The engineering BOM explodes against free, reserved and on-order stock. Shortages become a requisition automatically.", control: "Revisions are versioned; rev D waits for approval", owner: "Rahul Desai · Panel design", status: "Released" },
  { key: "purchase", label: "Purchase", record: "RFQ-0041", module: "purchase", moduleLabel: "Purchase", title: "3 quotes compared on fit and lead time", happens: "PR-0084 goes out as RFQ-0041. Suppliers are compared on price, lead time against need-by date, technical fit and warranty.", control: "Selection rationale is mandatory; lowest price isn't automatic", owner: "Nikhil Joshi · Purchase", status: "Evaluating" },
  { key: "assembly", label: "Assembly & QC", record: "WO-0187", module: "inventory", moduleLabel: "Inventory", title: "Panel in wiring, QC gate ahead", happens: "Kitting, fabrication, wiring, assembly, testing, dispatch. Each stage has an owner; materials are issued against the work order.", control: "Held stock can't be issued; dispatch needs passed QC", owner: "Assembly cell 2 · Deepa Kulkarni (QC)", status: "In progress" },
  { key: "asset", label: "Installed base", record: "AST-0042", module: "assets", moduleLabel: "Assets", title: "Panel becomes customer equipment", happens: "After SAT the panel joins the installed base with serial, warranty and the AMC that covers it.", control: "Customer-owned assets stay separate from company assets", owner: "Karan Patel · Custodian", status: "In service" },
  { key: "service", label: "Service", record: "SR-0148", module: "assets", moduleLabel: "Assets", title: "P1 breakdown, 6 h response", happens: "The customer calls. Entitlement is resolved from AMC-0031, the nearest qualified engineer is dispatched, spares come from stock.", control: "SLA clock and chargeability decided from the contract", owner: "Karan Patel · Service engineer", status: "Assigned" },
];

/* ---------------------------------------------------------------- Module map */
export interface ModuleNode {
  key: ModuleKey;
  label: string;
  short: string;
  x: number; // 0..100 layout coordinates
  y: number;
  points: string[];
  links: ModuleKey[];
}

export const MODULE_NODES: ModuleNode[] = [
  { key: "crm", label: "CRM", short: "Leads, tenders, renewals", x: 50, y: 8, points: ["Lead → opportunity → tender", "Bid / no-bid and win-loss reasons", "AMC renewal leads from contract expiry"], links: ["sales"] },
  { key: "sales", label: "Sales", short: "Quotes, orders, billing advice", x: 74.8, y: 14.6, points: ["Quotation revisions and approvals", "Orders that spawn projects or deliveries", "Milestone and recurring billing advice"], links: ["projects", "assets", "reports"] },
  { key: "projects", label: "Projects", short: "Milestones, gates, cost", x: 91.9, y: 32.6, points: ["WBS, milestones, FAT/SAT gates", "Budget vs committed vs incurred", "Handover to installed base"], links: ["inventory", "purchase", "hr", "sales", "assets"] },
  { key: "inventory", label: "Inventory & Assembly", short: "Stock, BOM, MRP, work orders", x: 95.5, y: 56, points: ["Multi-store stock with QC hold", "Engineering BOM revisions and MRP", "Panel work orders and stage QC"], links: ["purchase", "projects", "assets"] },
  { key: "purchase", label: "Purchase", short: "PR, RFQ, PO, GRN", x: 84.8, y: 77.5, points: ["Requisitions from shortages", "Supplier comparison with rationale", "GRN linked to inspection"], links: ["inventory", "reports"] },
  { key: "assets", label: "Assets & Service", short: "Installed base, AMC, tickets", x: 67, y: 90.3, points: ["Customer vs company assets", "AMC/O&M entitlements and SLA", "Calibration due and certificates"], links: ["inventory", "sales", "hr"] },
  { key: "hr", label: "People", short: "Deployment, attendance, claims", x: 33, y: 90.3, points: ["Site deployment roster", "Leave, attendance, shifts", "Travel and expense claims"], links: ["payroll", "projects", "users"] },
  { key: "payroll", label: "Payroll", short: "Runs, checks, payslips", x: 15.2, y: 77.5, points: ["Input checks before a run", "Maker-checker approval and lock", "Cost allocation by project"], links: ["reports"] },
  { key: "users", label: "Users & Access", short: "Roles, approvals, audit", x: 25.2, y: 14.6, points: ["Role × module × action permissions", "Approval authority and delegation", "Audit trail on every decision"], links: ["dashboard"] },
  { key: "dashboard", label: "Dashboard", short: "What needs you now", x: 8.1, y: 32.6, points: ["Role-based exception views", "Drill from KPI to record", "Refresh time on every tile"], links: [] },
  { key: "reports", label: "Reports", short: "MIS with export control", x: 4.5, y: 56, points: ["Defined owner, source and refresh", "Restricted payroll and HR reports", "Audited exports"], links: ["dashboard"] },
];

/* ---------------------------------------------------------------- Verticals */
export interface VerticalStory {
  key: string;
  name: string;
  headline: string;
  body: string;
  chain: string[];
  modules: ModuleKey[];
  example: { id: string; title: string; detail: string };
  measure: string;
}

export const VERTICALS: VerticalStory[] = [
  { key: "turnkey", name: "Turnkey automation", headline: "Long jobs with many gates", body: "Engineering deliverables, procurement, site work and commissioning on one project record, with FAT/SAT gates and billing milestones.", chain: ["Tender", "Order", "WBS & gates", "Procurement", "Commissioning", "Handover"], modules: ["crm", "sales", "projects", "purchase", "inventory", "hr", "assets"], example: { id: "PRJ-0264", title: "Process automation upgrade", detail: "5 milestones · SAT due 18 Nov" }, measure: "Margin: contract vs committed vs incurred" },
  { key: "panels", name: "Panel assembly", headline: "Engineer-to-order panels", body: "Versioned BOMs, MRP against real free stock, staged work orders and a QC gate before finished goods can ship.", chain: ["BOM release", "MRP", "Kitting", "Wiring", "Testing & QC", "Dispatch"], modules: ["projects", "inventory", "purchase", "sales"], example: { id: "WO-0187", title: "Line 03 control panel", detail: "Stage 3 of 6 · wiring" }, measure: "WIP by stage and QC first-pass rate" },
  { key: "instrumentation", name: "Instrumentation", headline: "Trade with traceability", body: "Serialized items from receipt to installation, incoming inspection, returns and dispatch tied to customer orders.", chain: ["RFQ", "PO", "GRN", "Inspection", "Reservation", "Dispatch"], modules: ["purchase", "inventory", "sales", "crm"], example: { id: "ITM-0137", title: "Pressure transmitters", detail: "6 on QC hold from GRN-0073" }, measure: "Serial trace and receipt-to-dispatch time" },
  { key: "calibration", name: "Calibration", headline: "Due dates you can't miss", body: "Company calibration masters and customer instruments, due reminders, measured points with tolerances and certificates.", chain: ["Due", "Plan visit", "Measure", "Review", "Certificate", "Next due"], modules: ["assets", "hr", "reports"], example: { id: "CAL-0096", title: "Digital pressure calibrator", detail: "Due in 2 days · 10 bar point out" }, measure: "Overdue instruments and first-time pass rate" },
  { key: "amc", name: "AMC", headline: "Contracts that dispatch themselves", body: "Entitlements, included visits and response SLAs resolve from the contract the moment a ticket is logged.", chain: ["Ticket", "Entitlement", "Assign", "Visit", "Spares", "Sign-off"], modules: ["assets", "inventory", "hr", "sales", "crm"], example: { id: "SR-0148", title: "P1 breakdown, Northstar Pharma", detail: "AMC-0031 · 6 h response" }, measure: "SLA attainment and visits used vs included" },
  { key: "om", name: "O&M", headline: "Staff on site, accountable", body: "On-site teams, recurring work orders, permits and material consumption against an operations contract.", chain: ["Mobilise", "Roster", "Work orders", "Materials", "Reports", "Billing"], modules: ["projects", "hr", "assets", "inventory", "sales"], example: { id: "OM-0009", title: "Crest Chemicals O&M", detail: "21 of 24 visits used" }, measure: "Planned vs reactive work and contract margin" },
  { key: "csv", name: "CSV / Manufacturing IT", headline: "Validation as deliverables", body: "Computerized system validation run as project milestones (VMP, IQ, OQ, PQ) with controlled documents and expert deployment.", chain: ["VMP", "IQ", "OQ", "PQ", "Report", "Closure"], modules: ["crm", "projects", "hr", "reports"], example: { id: "PRJ-0271", title: "Cleanroom validation", detail: "OQ in progress · Hyderabad" }, measure: "Deliverables on time and expert utilisation" },
];

/* ---------------------------------------------------------------- 12 flows */
export interface Flow {
  id: string;
  name: string;
  steps: { label: string; module: ModuleKey }[];
  gate: string;
  exception: string;
}

export const FLOWS: Flow[] = [
  { id: "E2E-01", name: "Tender to execution", steps: [{ label: "Lead / RFQ", module: "crm" }, { label: "Proposal", module: "sales" }, { label: "Customer order", module: "sales" }, { label: "Project", module: "projects" }, { label: "WBS & BOM", module: "projects" }, { label: "Delivery & closure", module: "projects" }], gate: "Order needs an accepted quotation revision", exception: "Order amendments reconcile back to the quote and project" },
  { id: "E2E-02", name: "Panel assemble-to-deliver", steps: [{ label: "Approved BOM", module: "inventory" }, { label: "Requirements", module: "inventory" }, { label: "PR / RFQ / PO", module: "purchase" }, { label: "GRN & QC", module: "inventory" }, { label: "Work order stages", module: "inventory" }, { label: "Finished goods", module: "inventory" }, { label: "Dispatch", module: "sales" }], gate: "Dispatch blocked until QC passes", exception: "Revision change, substitution, rejected material, partial completion" },
  { id: "E2E-03", name: "Purchase to stock and site", steps: [{ label: "Project need", module: "projects" }, { label: "Comparison", module: "purchase" }, { label: "Approved PO", module: "purchase" }, { label: "Receipt", module: "inventory" }, { label: "Inspection", module: "inventory" }, { label: "Reservation", module: "inventory" }, { label: "Site transfer", module: "inventory" }], gate: "Quarantined stock can't be issued", exception: "Over-receipt prevented; quantity and value reconciled" },
  { id: "E2E-04", name: "Subcontract material accountability", steps: [{ label: "Issue to subcontractor", module: "inventory" }, { label: "Work acceptance", module: "purchase" }, { label: "Consume / return", module: "inventory" }, { label: "Reconcile balance", module: "reports" }], gate: "Custody recorded on every issue", exception: "Shortages audited; liability method still to be decided" },
  { id: "E2E-05", name: "Project to installed base", steps: [{ label: "Delivery", module: "projects" }, { label: "Commissioning sign-off", module: "projects" }, { label: "Installed asset", module: "assets" }, { label: "Warranty", module: "assets" }, { label: "AMC link", module: "assets" }], gate: "Asset created only after SAT sign-off", exception: "Customer ownership kept separate from company assets" },
  { id: "E2E-06", name: "AMC breakdown response", steps: [{ label: "Customer ticket", module: "assets" }, { label: "Entitlement & SLA", module: "assets" }, { label: "Assign engineer", module: "hr" }, { label: "Site visit", module: "assets" }, { label: "Spares", module: "inventory" }, { label: "Sign-off & charge", module: "sales" }], gate: "Chargeability decided from the contract", exception: "Priority change, paused SLA, after-hours, revisit" },
  { id: "E2E-07", name: "Preventive maintenance & calibration", steps: [{ label: "Asset due", module: "assets" }, { label: "Planned visit", module: "assets" }, { label: "Engineer", module: "hr" }, { label: "Results", module: "assets" }, { label: "Evidence", module: "assets" }, { label: "Next due", module: "reports" }], gate: "Out-of-tolerance points need review", exception: "Certificate depth and approval controls to be agreed" },
  { id: "E2E-08", name: "Deployment to payroll", steps: [{ label: "Employee", module: "hr" }, { label: "Site assignment", module: "hr" }, { label: "Attendance & leave", module: "hr" }, { label: "Payroll inputs", module: "payroll" }, { label: "Run & approval", module: "payroll" }, { label: "Cost export", module: "reports" }], gate: "Maker ≠ checker on every payroll run", exception: "Contractor treatment and accounting handoff to confirm" },
  { id: "E2E-09", name: "Timesheets & expenses to project cost", steps: [{ label: "Assignment", module: "hr" }, { label: "Approved timesheet", module: "hr" }, { label: "Travel claim", module: "hr" }, { label: "Project cost", module: "projects" }, { label: "Variance report", module: "reports" }], gate: "Only approved time reaches project cost", exception: "Rate cards and employee confidentiality respected" },
  { id: "E2E-10", name: "Contract billing & finance handoff", steps: [{ label: "Order / contract", module: "sales" }, { label: "Milestone or recurrence", module: "projects" }, { label: "Billing advice", module: "sales" }, { label: "Accounting posting", module: "reports" }], gate: "One system of record for the invoice", exception: "Mismatch and retry states visible, never silent" },
  { id: "E2E-11", name: "Inventory correction & audit", steps: [{ label: "Count", module: "inventory" }, { label: "Variance approval", module: "users" }, { label: "Ledger & valuation", module: "inventory" }, { label: "Project impact", module: "projects" }, { label: "Audit report", module: "reports" }], gate: "Adjustments need an approver other than the counter", exception: "Corrections reverse, never overwrite" },
  { id: "E2E-12", name: "Offboarding & asset recovery", steps: [{ label: "Exit", module: "hr" }, { label: "Revoke access", module: "users" }, { label: "Recover tools", module: "assets" }, { label: "Settle claims & pay", module: "payroll" }, { label: "Reassign approvals", module: "users" }], gate: "No exit closes with open custody", exception: "Delegated approvals keep work moving" },
];
