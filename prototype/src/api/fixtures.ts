/**
 * Illustrative records for the Pinnacle Engineering demo workspace.
 * Every cross-reference resolves: SO-0196 → PRJ-0264 → BOM-042 → PR-0084 → RFQ-0041
 * → PO-0121 → WO-0187 → AST-0042 → AMC-0031 → SR-0148. "Today" is 3 Nov 2026, 09:40 IST.
 */
import type {
  AccountingPosting,
  ActivityEvent,
  Approval,
  Asset,
  BillingAdvice,
  Bom,
  CalibrationJob,
  Claim,
  Customer,
  ExitCase,
  Item,
  LeaveRequest,
  Notification,
  Opportunity,
  PayrollRun,
  Person,
  Project,
  PurchaseOrder,
  PurchaseRequest,
  Quotation,
  ReportDef,
  Rfq,
  Role,
  SalesOrder,
  ServiceContract,
  ServiceTicket,
  StockMovement,
  SubcontractIssue,
  UserAccount,
  Vendor,
  WorkOrder,
} from "./types";

export const TODAY = "2026-11-03";
export const NOW = "2026-11-03T09:40:00+05:30";

export const people: Person[] = [
  { id: "EMP-0034", name: "Ananya Rao", initials: "AR", role: "Project Manager", department: "Engineering", location: "Pune", email: "ananya.rao@abc.example", phone: "+91 98200 11034", employment: "Permanent", status: "Deployed", assignment: "PRJ-0264", assignmentUntil: "2026-11-30", skills: ["Process automation", "Siemens TIA", "GMP"], certifications: [{ name: "PMP", expires: "2027-08-14" }], joined: "2019-06-03", utilisation: 92, reportsTo: "EMP-0002" },
  { id: "EMP-0072", name: "Karan Patel", initials: "KP", role: "Service Engineer", department: "Field operations", location: "Pune", email: "karan.patel@abc.example", phone: "+91 98200 11072", employment: "Permanent", status: "Deployed", assignment: "SR-0148", assignmentUntil: "2026-11-03", skills: ["PLC troubleshooting", "Profinet", "AMC"], certifications: [{ name: "Electrical safety", expires: "2026-12-02" }], joined: "2021-02-15", utilisation: 86, reportsTo: "EMP-0011" },
  { id: "EMP-0091", name: "Priya Menon", initials: "PM", role: "Calibration Engineer", department: "Quality", location: "Central lab", email: "priya.menon@abc.example", phone: "+91 98200 11091", employment: "Permanent", status: "Available", skills: ["Pressure calibration", "ISO/IEC 17025", "Uncertainty"], certifications: [{ name: "Calibration metrology", expires: "2027-03-30" }], joined: "2020-09-21", utilisation: 64, reportsTo: "EMP-0019" },
  { id: "EMP-0048", name: "Meera Nair", initials: "MN", role: "Validation Lead", department: "CSV", location: "Hyderabad", email: "meera.nair@abc.example", phone: "+91 98200 11048", employment: "Permanent", status: "Deployed", assignment: "PRJ-0271", assignmentUntil: "2026-12-02", skills: ["GAMP 5", "21 CFR Part 11", "IQ/OQ/PQ"], certifications: [{ name: "GAMP 5 practitioner", expires: "2027-01-10" }], joined: "2018-11-12", utilisation: 88, reportsTo: "EMP-0002" },
  { id: "EMP-0027", name: "Rahul Desai", initials: "RD", role: "Panel Design Lead", department: "Engineering", location: "Nashik", email: "rahul.desai@abc.example", phone: "+91 98200 11027", employment: "Permanent", status: "Deployed", assignment: "PRJ-0258", assignmentUntil: "2026-11-24", skills: ["EPLAN", "MCC design", "IEC 61439"], certifications: [], joined: "2017-04-01", utilisation: 95, reportsTo: "EMP-0002" },
  { id: "EMP-0056", name: "Vikram Shah", initials: "VS", role: "Commissioning Engineer", department: "Engineering", location: "Vadodara", email: "vikram.shah@abc.example", phone: "+91 98200 11056", employment: "Permanent", status: "Deployed", assignment: "PRJ-0249", assignmentUntil: "2026-11-12", skills: ["Loop testing", "HART", "DCS"], certifications: [{ name: "Hazardous area (CompEx)", expires: "2026-11-20" }], joined: "2020-01-06", utilisation: 90, reportsTo: "EMP-0034" },
  { id: "EMP-0063", name: "Nikhil Joshi", initials: "NJ", role: "Purchase Executive", department: "Procurement", location: "Pune", email: "nikhil.joshi@abc.example", phone: "+91 98200 11063", employment: "Permanent", status: "Available", skills: ["Vendor development", "Electrical BOMs"], certifications: [], joined: "2022-07-18", utilisation: 70, reportsTo: "EMP-0008" },
  { id: "EMP-0081", name: "Sana Kapoor", initials: "SK", role: "Sales Manager", department: "Sales", location: "Mumbai", email: "sana.kapoor@abc.example", phone: "+91 98200 11081", employment: "Permanent", status: "Available", skills: ["Turnkey proposals", "Pharma accounts"], certifications: [], joined: "2019-03-11", utilisation: 74, reportsTo: "EMP-0001" },
  { id: "EMP-0012", name: "Arjun Mehta", initials: "AM", role: "Operations Head", department: "Management", location: "Pune", email: "arjun.mehta@abc.example", phone: "+91 98200 11012", employment: "Permanent", status: "Available", skills: ["Operations", "P&L"], certifications: [], joined: "2015-08-01", utilisation: 80 },
  { id: "EMP-0104", name: "Imran Sheikh", initials: "IS", role: "Store Keeper", department: "Stores", location: "Pune", email: "imran.sheikh@abc.example", phone: "+91 98200 11104", employment: "Permanent", status: "Available", skills: ["Stores", "Serial tracking"], certifications: [], joined: "2021-10-04", utilisation: 77, reportsTo: "EMP-0063" },
  { id: "EMP-0117", name: "Deepa Kulkarni", initials: "DK", role: "QC Inspector", department: "Quality", location: "Pune", email: "deepa.kulkarni@abc.example", phone: "+91 98200 11117", employment: "Permanent", status: "Available", skills: ["Incoming inspection", "FAT"], certifications: [{ name: "ISO 9001 internal auditor", expires: "2027-05-19" }], joined: "2022-01-17", utilisation: 69, reportsTo: "EMP-0019" },
  { id: "EMP-0129", name: "Rohit Verma", initials: "RV", role: "Field Technician", department: "Field operations", location: "Nashik", email: "rohit.verma@abc.example", phone: "+91 98200 11129", employment: "Contract", status: "On leave", skills: ["Panel wiring", "Preventive maintenance"], certifications: [], joined: "2024-04-08", utilisation: 41, reportsTo: "EMP-0072" },
  { id: "EMP-0135", name: "Kavya Iyer", initials: "KI", role: "HR Executive", department: "HR", location: "Pune", email: "kavya.iyer@abc.example", phone: "+91 98200 11135", employment: "Permanent", status: "Available", skills: ["Payroll inputs", "Onboarding"], certifications: [], joined: "2023-02-01", utilisation: 72 },
  // November joiners behind the payroll bank-details check (PAY-2026-11). The other three joined with verified accounts.
  { id: "EMP-0221", name: "Aditi Rane", initials: "AR", role: "Graduate Engineer", department: "Engineering", location: "Pune", email: "aditi.rane@abc.example", phone: "+91 98200 11221", employment: "Probation", status: "Available", skills: ["Induction"], certifications: [], joined: "2026-11-02", utilisation: 0, reportsTo: "EMP-0034", joining: { bank: "Pending", note: "Bank proof uploaded, penny-drop verification not run" } },
  { id: "EMP-0222", name: "Farhan Ali", initials: "FA", role: "Field Technician", department: "Field operations", location: "Nashik", email: "farhan.ali@abc.example", phone: "+91 98200 11222", employment: "Probation", status: "Available", skills: ["Induction"], certifications: [], joined: "2026-11-02", utilisation: 0, reportsTo: "EMP-0027", joining: { bank: "Pending", note: "Cancelled cheque received 3 Nov, account not yet verified" } },
];

export const customers: Customer[] = [
  { id: "CUS-0012", name: "Northstar Pharma", industry: "Pharmaceuticals", sites: [{ id: "S-01", name: "Pune plant", city: "Pune" }], accountOwner: "Sana Kapoor", gstin: "27AAACN1234F1Z5" },
  { id: "CUS-0019", name: "Meridian Foods", industry: "Food processing", sites: [{ id: "S-02", name: "Nashik utility block", city: "Nashik" }], accountOwner: "Sana Kapoor", gstin: "27AABCM5678K1Z2" },
  { id: "CUS-0027", name: "Aster Biologics", industry: "Biotech", sites: [{ id: "S-03", name: "Genome Valley", city: "Hyderabad" }], accountOwner: "Arjun Mehta", gstin: "36AACCA9012L1Z8" },
  { id: "CUS-0031", name: "Crest Chemicals", industry: "Specialty chemicals", sites: [{ id: "S-04", name: "Nandesari unit", city: "Vadodara" }], accountOwner: "Arjun Mehta", gstin: "24AADCC3456M1Z1" },
  { id: "CUS-0038", name: "Summit Engineering", industry: "Industrial manufacturing", sites: [{ id: "S-05", name: "Bhiwandi works", city: "Mumbai" }], accountOwner: "Sana Kapoor", gstin: "27AAECS7890N1Z4" },
];

export const vendors: Vendor[] = [
  { id: "VEN-0021", name: "Vector Controls", category: "Automation components", city: "Pune", rating: 4.4, onTimeRate: 91, openPOs: 2 },
  { id: "VEN-0034", name: "Precision Instruments", category: "Test & measurement", city: "Bengaluru", rating: 4.7, onTimeRate: 96, openPOs: 1 },
  { id: "VEN-0040", name: "Indus Automation Supply", category: "Automation components", city: "Mumbai", rating: 3.9, onTimeRate: 78, openPOs: 0 },
  { id: "VEN-0052", name: "Kaveri Electricals", category: "Switchgear & enclosures", city: "Nashik", rating: 4.2, onTimeRate: 88, openPOs: 1 },
  { id: "VEN-0058", name: "Orbit Process Solutions", category: "Field instruments", city: "Ahmedabad", rating: 4.0, onTimeRate: 84, openPOs: 1 },
];

export const projects: Project[] = [
  {
    id: "PRJ-0264", name: "Process automation upgrade", customerId: "CUS-0012", customer: "Northstar Pharma", site: "Pune plant", vertical: "Turnkey automation", manager: "Ananya Rao", status: "At risk", progress: 68, start: "2026-06-02", due: "2026-11-18", salesOrder: "SO-0196", bom: "BOM-042", workOrder: "WO-0187", installedAsset: "AST-0042",
    contractValue: 4850000, budget: 3920000, committed: 3115000, incurred: 2468000, billed: 2425000,
    milestones: [
      { id: "MS-1", name: "Design freeze & URS sign-off", due: "2026-06-30", done: "2026-06-27", status: "Done", billable: 970000 },
      { id: "MS-2", name: "Panel FAT", due: "2026-09-12", done: "2026-09-15", status: "Done", gate: "FAT", billable: 1455000 },
      { id: "MS-3", name: "Material at site", due: "2026-10-28", status: "Late", gate: "Delivery" },
      { id: "MS-4", name: "Installation & loop test", due: "2026-11-10", status: "Blocked", gate: "Loop test" },
      { id: "MS-5", name: "SAT & handover", due: "2026-11-18", status: "Upcoming", gate: "SAT", billable: 1455000 },
    ],
    risks: [
      { id: "RSK-1", title: "PLC I/O modules not yet ordered", impact: "High", owner: "Nikhil Joshi", mitigation: "Award RFQ-0041 by 5 Nov; expedite with 7-day lead supplier." },
      { id: "RSK-2", title: "Transmitters held at incoming QC", impact: "Medium", owner: "Deepa Kulkarni", mitigation: "Re-test with calibrated reference; release or return by 4 Nov." },
    ],
    documents: [
      { id: "DOC-1182", name: "P&ID — Line 03", kind: "Drawing", revision: "C", status: "Approved", updated: "2026-08-20" },
      { id: "DOC-1187", name: "Control philosophy", kind: "Specification", revision: "B", status: "Approved", updated: "2026-07-14" },
      { id: "DOC-1203", name: "FAT protocol & results", kind: "Protocol", revision: "A", status: "Approved", updated: "2026-09-16" },
      { id: "DOC-1219", name: "SAT protocol", kind: "Protocol", revision: "A", status: "In review", updated: "2026-10-30" },
      { id: "DOC-1224", name: "BOM revision D change note", kind: "Transmittal", revision: "D", status: "Draft", updated: "2026-11-02" },
    ],
    team: ["EMP-0034", "EMP-0056", "EMP-0027", "EMP-0063"],
    health: { schedule: "risk", cost: "ok", material: "warn" },
  },
  {
    id: "PRJ-0258", name: "MCC panel installation", customerId: "CUS-0019", customer: "Meridian Foods", site: "Nashik utility block", vertical: "Panel assembly", manager: "Rahul Desai", status: "On track", progress: 84, start: "2026-07-14", due: "2026-11-24", salesOrder: "SO-0188",
    contractValue: 3280000, budget: 2610000, committed: 2380000, incurred: 2140000, billed: 1968000,
    milestones: [
      { id: "MS-1", name: "GA drawing approval", due: "2026-08-05", done: "2026-08-04", status: "Done", billable: 656000 },
      { id: "MS-2", name: "Panel FAT", due: "2026-10-10", done: "2026-10-09", status: "Done", gate: "FAT", billable: 1312000 },
      { id: "MS-3", name: "Site installation", due: "2026-11-15", status: "In progress", gate: "Installation" },
      { id: "MS-4", name: "Energisation & handover", due: "2026-11-24", status: "Upcoming", gate: "SAT", billable: 1312000 },
    ],
    risks: [], documents: [{ id: "DOC-1140", name: "MCC GA drawing", kind: "Drawing", revision: "B", status: "Approved", updated: "2026-08-04" }],
    team: ["EMP-0027", "EMP-0129"], health: { schedule: "ok", cost: "ok", material: "ok" },
  },
  {
    id: "PRJ-0271", name: "Cleanroom validation", customerId: "CUS-0027", customer: "Aster Biologics", site: "Genome Valley", vertical: "CSV / Manufacturing IT", manager: "Meera Nair", status: "On track", progress: 42, start: "2026-09-01", due: "2026-12-02",
    contractValue: 1820000, budget: 1310000, committed: 540000, incurred: 498000, billed: 546000,
    milestones: [
      { id: "MS-1", name: "Validation master plan", due: "2026-09-20", done: "2026-09-18", status: "Done", billable: 546000 },
      { id: "MS-2", name: "IQ execution", due: "2026-10-30", done: "2026-10-31", status: "Done", gate: "IQ" },
      { id: "MS-3", name: "OQ execution", due: "2026-11-20", status: "In progress", gate: "OQ" },
      { id: "MS-4", name: "PQ & final report", due: "2026-12-02", status: "Upcoming", gate: "PQ", billable: 1274000 },
    ],
    risks: [], documents: [], team: ["EMP-0048"], health: { schedule: "ok", cost: "ok", material: "ok" },
  },
  {
    id: "PRJ-0249", name: "Instrumentation commissioning", customerId: "CUS-0031", customer: "Crest Chemicals", site: "Nandesari unit", vertical: "Instrumentation", manager: "Vikram Shah", status: "In review", progress: 92, start: "2026-05-18", due: "2026-11-12", salesOrder: "SO-0179",
    contractValue: 2640000, budget: 2050000, committed: 1990000, incurred: 1912000, billed: 2112000,
    milestones: [
      { id: "MS-1", name: "Instrument supply", due: "2026-07-30", done: "2026-07-28", status: "Done", billable: 1320000 },
      { id: "MS-2", name: "Loop checks", due: "2026-10-15", done: "2026-10-19", status: "Done", gate: "Loop test", billable: 528000 },
      { id: "MS-3", name: "Commissioning certificate", due: "2026-11-12", status: "In progress", gate: "Commissioning", billable: 792000 },
    ],
    risks: [], documents: [], team: ["EMP-0056"], health: { schedule: "warn", cost: "warn", material: "ok" },
  },
  {
    id: "PRJ-0278", name: "Utility monitoring system", customerId: "CUS-0038", customer: "Summit Engineering", site: "Bhiwandi works", vertical: "Turnkey automation", manager: "Ananya Rao", status: "Planning", progress: 18, start: "2026-10-20", due: "2026-12-15",
    contractValue: 1560000, budget: 1180000, committed: 120000, incurred: 86000, billed: 0,
    milestones: [
      { id: "MS-1", name: "Site survey", due: "2026-10-30", done: "2026-10-29", status: "Done" },
      { id: "MS-2", name: "Architecture approval", due: "2026-11-14", status: "In progress", billable: 468000 },
      { id: "MS-3", name: "Commissioning", due: "2026-12-15", status: "Upcoming", billable: 1092000 },
    ],
    risks: [], documents: [], team: ["EMP-0034"], health: { schedule: "ok", cost: "ok", material: "neutral" },
  },
  {
    id: "PRJ-0244", name: "Boiler house O&M mobilisation", customerId: "CUS-0031", customer: "Crest Chemicals", site: "Nandesari unit", vertical: "O&M", manager: "Vikram Shah", status: "On hold", progress: 30, start: "2026-08-10", due: "2026-12-20",
    contractValue: 980000, budget: 720000, committed: 210000, incurred: 205000, billed: 196000,
    milestones: [{ id: "MS-1", name: "Mobilisation", due: "2026-09-01", done: "2026-09-04", status: "Done", billable: 196000 }, { id: "MS-2", name: "Customer permit renewal", due: "2026-11-05", status: "Blocked", gate: "Permit" }],
    risks: [{ id: "RSK-1", title: "Site work permit lapsed", impact: "Medium", owner: "Vikram Shah", mitigation: "Customer EHS renewal requested 28 Oct." }],
    documents: [], team: ["EMP-0056"], health: { schedule: "warn", cost: "ok", material: "neutral" },
  },
];

export const items: Item[] = [
  { id: "ITM-0042", name: "PLC CPU · S7-1200 series", category: "Automation", make: "Siemens", uom: "nos", warehouse: "Central warehouse", bin: "A-04", onHand: 16, reserved: 12, quarantined: 0, onOrder: 0, reorderLevel: 6, unitCost: 38500, serialized: true, status: "Low stock", lastMovement: "2026-10-30" },
  { id: "ITM-0051", name: "Digital input module · 16 DI", category: "Automation", make: "Siemens", uom: "nos", warehouse: "Central warehouse", bin: "A-05", onHand: 6, reserved: 6, quarantined: 0, onOrder: 0, reorderLevel: 8, unitCost: 14200, serialized: true, status: "Out of stock", lastMovement: "2026-10-22" },
  { id: "ITM-0052", name: "Analog input module · 8 AI", category: "Automation", make: "Siemens", uom: "nos", warehouse: "Central warehouse", bin: "A-05", onHand: 2, reserved: 2, quarantined: 0, onOrder: 0, reorderLevel: 6, unitCost: 21800, serialized: true, status: "Out of stock", lastMovement: "2026-10-22" },
  { id: "ITM-0089", name: "24 V DC power supply · 10 A", category: "Electrical", make: "Phoenix Contact", uom: "nos", warehouse: "Central warehouse", bin: "B-12", onHand: 48, reserved: 10, quarantined: 0, onOrder: 0, reorderLevel: 12, unitCost: 6400, serialized: false, status: "Available", lastMovement: "2026-11-01" },
  { id: "ITM-0137", name: "Pressure transmitter · 0–10 bar", category: "Field instruments", make: "Orbit Process", uom: "nos", warehouse: "QC bay", bin: "QC-02", onHand: 6, reserved: 0, quarantined: 6, onOrder: 0, reorderLevel: 4, unitCost: 27500, serialized: true, status: "QC hold", lastMovement: "2026-11-02" },
  { id: "ITM-0214", name: "Panel enclosure · IP65 1800×800", category: "Enclosures", make: "Kaveri", uom: "nos", warehouse: "Assembly store", bin: "C-02", onHand: 24, reserved: 8, quarantined: 0, onOrder: 4, reorderLevel: 6, unitCost: 41000, serialized: false, status: "Available", lastMovement: "2026-10-28" },
  { id: "ITM-0233", name: "Profinet switch · 8 port", category: "Networking", make: "Siemens", uom: "nos", warehouse: "Central warehouse", bin: "A-09", onHand: 9, reserved: 3, quarantined: 0, onOrder: 0, reorderLevel: 4, unitCost: 18600, serialized: true, status: "Available", lastMovement: "2026-10-19" },
  { id: "ITM-0301", name: "Control cable · 12C × 1.5 sq mm", category: "Cables", make: "Polycab", uom: "m", warehouse: "Pune site store · PRJ-0264", bin: "SITE-1", onHand: 640, reserved: 600, quarantined: 0, onOrder: 0, reorderLevel: 200, unitCost: 145, serialized: false, status: "Reserved", lastMovement: "2026-10-31" },
  { id: "ITM-0318", name: "MCCB 250 A · 4 pole", category: "Switchgear", make: "Schneider", uom: "nos", warehouse: "Assembly store", bin: "C-07", onHand: 14, reserved: 6, quarantined: 0, onOrder: 6, reorderLevel: 6, unitCost: 23900, serialized: false, status: "Available", lastMovement: "2026-10-27" },
  { id: "ITM-0402", name: "Pressure calibrator reference", category: "Test equipment", make: "Fluke", uom: "nos", warehouse: "Calibration lab", bin: "LAB-1", onHand: 2, reserved: 1, quarantined: 0, onOrder: 0, reorderLevel: 1, unitCost: 412000, serialized: true, status: "Available", lastMovement: "2026-09-30" },
];

export const movements: StockMovement[] = [
  { id: "MOV-0931", type: "Receipt", itemId: "ITM-0137", item: "Pressure transmitter · 0–10 bar", qty: 6, from: "Orbit Process Solutions", to: "QC bay", reference: "GRN-0073 · PO-0109", at: "2026-11-02T16:20:00+05:30", by: "Imran Sheikh", status: "Blocked" },
  { id: "MOV-0928", type: "Transfer", itemId: "ITM-0301", item: "Control cable · 12C × 1.5 sq mm", qty: 600, from: "Central warehouse", to: "Pune site store · PRJ-0264", reference: "TRF-0215", at: "2026-10-31T11:05:00+05:30", by: "Imran Sheikh", status: "Posted" },
  { id: "MOV-0926", type: "Issue", itemId: "ITM-0042", item: "PLC CPU · S7-1200 series", qty: 2, from: "Central warehouse", to: "WO-0187", reference: "WO-0187 kitting", at: "2026-10-30T10:15:00+05:30", by: "Imran Sheikh", status: "Posted" },
  { id: "MOV-0924", type: "Transfer", itemId: "ITM-0214", item: "Panel enclosure · IP65 1800×800", qty: 2, from: "Assembly store", to: "Nashik site · PRJ-0258", reference: "TRF-0213", at: "2026-10-29T15:40:00+05:30", by: "Imran Sheikh", status: "In transit" },
  { id: "MOV-0921", type: "Return", itemId: "ITM-0089", item: "24 V DC power supply · 10 A", qty: 3, from: "Vadodara site · PRJ-0249", to: "Central warehouse", reference: "RTN-0047", at: "2026-10-28T12:00:00+05:30", by: "Vikram Shah", status: "Posted" },
  { id: "MOV-0918", type: "Adjustment", itemId: "ITM-0233", item: "Profinet switch · 8 port", qty: -1, from: "Central warehouse", to: "Count variance", reference: "CNT-0012", at: "2026-10-26T18:30:00+05:30", by: "Imran Sheikh", status: "Pending" },
];

export const boms: Bom[] = [
  {
    id: "BOM-042", revision: "C", name: "Line 03 process control panel", projectId: "PRJ-0264", status: "Released", releasedOn: "2026-08-22",
    lines: [
      { itemId: "ITM-0042", item: "PLC CPU · S7-1200 series", required: 2, available: 4, reserved: 2, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0051", item: "Digital input module · 16 DI", required: 12, available: 0, reserved: 6, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0052", item: "Analog input module · 8 AI", required: 8, available: 0, reserved: 2, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0089", item: "24 V DC power supply · 10 A", required: 4, available: 38, reserved: 4, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0137", item: "Pressure transmitter · 0–10 bar", required: 6, available: 0, reserved: 0, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0214", item: "Panel enclosure · IP65 1800×800", required: 2, available: 16, reserved: 2, onOrder: 0, uom: "nos" },
      { itemId: "ITM-0233", item: "Profinet switch · 8 port", required: 2, available: 6, reserved: 2, onOrder: 0, uom: "nos" },
    ],
  },
];

export const workOrders: WorkOrder[] = [
  {
    id: "WO-0187", name: "Line 03 process control panel", projectId: "PRJ-0264", bomId: "BOM-042", serial: "PNL-26-0187", due: "2026-11-08", qc: "Not started",
    stages: [
      { key: "kitting", name: "Kitting", status: "Done", owner: "Imran Sheikh", done: "2026-10-30" },
      { key: "fabrication", name: "Fabrication", status: "Done", owner: "Assembly cell 2", done: "2026-10-31" },
      { key: "wiring", name: "Wiring", status: "Active", owner: "Assembly cell 2", note: "62 of 96 terminations" },
      { key: "assembly", name: "Assembly", status: "Waiting", owner: "Assembly cell 2", note: "Needs DI/AI modules (PR-0084)" },
      { key: "testing", name: "Testing & QC", status: "Waiting", owner: "Deepa Kulkarni" },
      { key: "dispatch", name: "Packing & dispatch", status: "Waiting", owner: "Imran Sheikh" },
    ],
  },
  {
    id: "WO-0182", name: "MCC panel — utility block", projectId: "PRJ-0258", bomId: "BOM-038", serial: "PNL-26-0182", due: "2026-10-12", qc: "Passed",
    stages: [
      { key: "kitting", name: "Kitting", status: "Done", owner: "Imran Sheikh", done: "2026-09-08" },
      { key: "fabrication", name: "Fabrication", status: "Done", owner: "Assembly cell 1", done: "2026-09-18" },
      { key: "wiring", name: "Wiring", status: "Done", owner: "Assembly cell 1", done: "2026-09-30" },
      { key: "assembly", name: "Assembly", status: "Done", owner: "Assembly cell 1", done: "2026-10-04" },
      { key: "testing", name: "Testing & QC", status: "Done", owner: "Deepa Kulkarni", done: "2026-10-09" },
      { key: "dispatch", name: "Packing & dispatch", status: "Done", owner: "Imran Sheikh", done: "2026-10-12" },
    ],
  },
];

export const assets: Asset[] = [
  { id: "AST-0042", name: "Process control panel · Line 03", category: "Control panel", ownership: "Customer", customer: "Northstar Pharma", site: "Pune plant", make: "Pinnacle Engineering", model: "PCP-S7-03", serial: "PNL-23-0102", status: "In service", contractId: "AMC-0031", custodian: "Karan Patel", installed: "2023-03-14", warrantyEnd: "2025-03-14", nextService: "2026-11-28", projectId: "PRJ-0192" },
  { id: "AST-0134", name: "MCC panel · Utility block", category: "Motor control centre", ownership: "Customer", customer: "Meridian Foods", site: "Nashik utility block", make: "Pinnacle Engineering", model: "MCC-800", serial: "PNL-24-0144", status: "In service", contractId: "AMC-0044", custodian: "Rahul Desai", installed: "2024-06-20", warrantyEnd: "2026-12-20", nextService: "2026-12-12" },
  { id: "AST-0151", name: "Flow transmitter bank · Reactor R-2", category: "Field instruments", ownership: "Customer", customer: "Crest Chemicals", site: "Nandesari unit", make: "Orbit Process", model: "OF-220", serial: "OF22-88713", status: "Under repair", contractId: "OM-0009", custodian: "Vikram Shah", installed: "2025-01-09", warrantyEnd: "2027-01-09", nextService: "2026-11-06" },
  { id: "AST-0086", name: "Digital pressure calibrator", category: "Calibration master", ownership: "Company", site: "Central lab", make: "Fluke", model: "2700G", serial: "FL27-44120", status: "Calibration due", custodian: "Priya Menon", installed: "2022-02-11", calibrationDue: "2026-11-05" },
  { id: "AST-0093", name: "Multifunction process calibrator", category: "Calibration master", ownership: "Company", site: "Central lab", make: "Beamex", model: "MC6", serial: "BX6-11927", status: "In service", custodian: "Priya Menon", installed: "2023-05-02", calibrationDue: "2027-01-18" },
  { id: "AST-0110", name: "Insulation resistance tester", category: "Test equipment", ownership: "Company", site: "Issued · Karan Patel", make: "Megger", model: "MIT525", serial: "MG52-30981", status: "In service", custodian: "Karan Patel", installed: "2024-08-12", calibrationDue: "2026-11-21" },
  { id: "AST-0118", name: "Service vehicle · MH12 QK 4471", category: "Vehicle", ownership: "Company", site: "Pune", make: "Mahindra", model: "Bolero Neo", serial: "MA1NE2GXJ41", status: "In service", custodian: "Field operations", installed: "2024-01-30", nextService: "2026-11-15" },
];

export const tickets: ServiceTicket[] = [
  { id: "SR-0148", title: "Intermittent PLC communication on Line 03", assetId: "AST-0042", asset: "Process control panel · Line 03", customer: "Northstar Pharma", site: "Pune plant", contractId: "AMC-0031", priority: "P1", status: "Assigned", assignee: "Karan Patel", opened: "2026-11-03T08:05:00+05:30", slaDue: "2026-11-03T14:00:00+05:30", channel: "Phone", kind: "Breakdown", chargeable: false },
  { id: "SR-0151", title: "Flow reading drift on R-2 transmitters", assetId: "AST-0151", asset: "Flow transmitter bank · Reactor R-2", customer: "Crest Chemicals", site: "Nandesari unit", contractId: "OM-0009", priority: "P2", status: "On site", assignee: "Vikram Shah", opened: "2026-11-02T15:30:00+05:30", slaDue: "2026-11-03T15:30:00+05:30", channel: "Email", kind: "Breakdown", chargeable: false },
  { id: "SR-0146", title: "Quarterly preventive inspection", assetId: "AST-0134", asset: "MCC panel · Utility block", customer: "Meridian Foods", site: "Nashik utility block", contractId: "AMC-0044", priority: "P3", status: "Assigned", assignee: "Rohit Verma", opened: "2026-10-28T10:00:00+05:30", slaDue: "2026-11-04T18:00:00+05:30", channel: "Scheduled", kind: "Preventive", chargeable: false },
  { id: "SR-0142", title: "Instrument loop verification after shutdown", assetId: "AST-0151", asset: "Flow transmitter bank · Reactor R-2", customer: "Crest Chemicals", site: "Nandesari unit", priority: "P3", status: "Resolved", assignee: "Meera Nair", opened: "2026-10-30T09:00:00+05:30", slaDue: "2026-11-01T18:00:00+05:30", channel: "Portal", kind: "Inspection", chargeable: true },
  { id: "SR-0153", title: "HMI touchscreen unresponsive", assetId: "AST-0042", asset: "Process control panel · Line 03", customer: "Northstar Pharma", site: "Pune plant", contractId: "AMC-0031", priority: "P3", status: "New", opened: "2026-11-03T09:12:00+05:30", slaDue: "2026-11-05T09:12:00+05:30", channel: "Portal", kind: "Breakdown", chargeable: false },
];

export const contracts: ServiceContract[] = [
  { id: "AMC-0031", customer: "Northstar Pharma", type: "AMC", start: "2026-04-01", end: "2027-03-31", assets: ["AST-0042"], visitsIncluded: 4, visitsUsed: 2, responseHours: 6, annualValue: 680000, status: "Active" },
  { id: "AMC-0044", customer: "Meridian Foods", type: "AMC", start: "2025-12-15", end: "2026-12-14", assets: ["AST-0134"], visitsIncluded: 4, visitsUsed: 3, responseHours: 8, annualValue: 420000, status: "Renewal due" },
  { id: "OM-0009", customer: "Crest Chemicals", type: "O&M", start: "2026-01-01", end: "2026-12-31", assets: ["AST-0151"], visitsIncluded: 24, visitsUsed: 21, responseHours: 24, annualValue: 1860000, status: "Active" },
];

export const calibrations: CalibrationJob[] = [
  { id: "CAL-0096", assetId: "AST-0086", asset: "Digital pressure calibrator", due: "2026-11-05", status: "Due", engineer: "Priya Menon", points: [{ nominal: "0 bar", reading: "0.001 bar", tolerance: "±0.005", pass: true }, { nominal: "5 bar", reading: "5.003 bar", tolerance: "±0.005", pass: true }, { nominal: "10 bar", reading: "10.007 bar", tolerance: "±0.005", pass: false }] },
  { id: "CAL-0094", assetId: "AST-0110", asset: "Insulation resistance tester", due: "2026-11-21", status: "Scheduled", engineer: "Priya Menon", points: [] },
  { id: "CAL-0090", assetId: "AST-0093", asset: "Multifunction process calibrator", due: "2026-01-18", status: "Passed", engineer: "Priya Menon", certificate: "CERT-26-0418", points: [{ nominal: "4 mA", reading: "4.0002 mA", tolerance: "±0.001", pass: true }, { nominal: "20 mA", reading: "19.9995 mA", tolerance: "±0.001", pass: true }] },
  { id: "CAL-0088", assetId: "AST-0151", asset: "Flow transmitter bank · Reactor R-2", due: "2026-10-31", status: "Overdue", engineer: "Vikram Shah", points: [] },
];

export const purchaseRequests: PurchaseRequest[] = [
  { id: "PR-0084", title: "PLC I/O modules for Line 03 panel", source: "BOM-042 rev C shortage", projectId: "PRJ-0264", requester: "Ananya Rao", value: 284000, needBy: "2026-11-06", status: "Awaiting approval", lines: [{ item: "Digital input module · 16 DI", qty: 12, uom: "nos" }, { item: "Analog input module · 8 AI", qty: 6, uom: "nos" }] },
  { id: "PR-0086", title: "Replacement transmitters (if QC fails)", source: "GRN-0073 QC hold", projectId: "PRJ-0264", requester: "Deepa Kulkarni", value: 165000, needBy: "2026-11-08", status: "Draft", lines: [{ item: "Pressure transmitter · 0–10 bar", qty: 6, uom: "nos" }] },
  { id: "PR-0081", title: "MCCB restock — assembly store", source: "Reorder level", requester: "Imran Sheikh", value: 143400, needBy: "2026-11-12", status: "Converted", lines: [{ item: "MCCB 250 A · 4 pole", qty: 6, uom: "nos" }] },
  { id: "PR-0079", title: "Calibration reference recertification", source: "CAL-0096 due", requester: "Priya Menon", value: 38000, needBy: "2026-11-05", status: "Approved", lines: [{ item: "External recertification service", qty: 1, uom: "job" }] },
];

export const rfqs: Rfq[] = [
  {
    id: "RFQ-0041", title: "PLC I/O module supply", prId: "PR-0084", projectId: "PRJ-0264", closes: "2026-11-04", status: "Evaluating",
    quotes: [
      { vendorId: "VEN-0021", vendor: "Vector Controls", price: 284000, leadDays: 7, technicalFit: "Full", warrantyMonths: 18, paymentTerms: "30 days", notes: "Genuine Siemens, stock in Pune" },
      { vendorId: "VEN-0040", vendor: "Indus Automation Supply", price: 262500, leadDays: 21, technicalFit: "Full", warrantyMonths: 12, paymentTerms: "45 days", notes: "Import lead time; partial shipment possible" },
      { vendorId: "VEN-0058", vendor: "Orbit Process Solutions", price: 249000, leadDays: 10, technicalFit: "Deviation", warrantyMonths: 12, paymentTerms: "30 days", notes: "Offers ET 200SP equivalent — needs design approval" },
    ],
  },
  { id: "RFQ-0039", title: "Panel enclosure batch", prId: "PR-0077", closes: "2026-10-20", status: "Awarded", awardedTo: "Kaveri Electricals", quotes: [{ vendorId: "VEN-0052", vendor: "Kaveri Electricals", price: 164000, leadDays: 12, technicalFit: "Full", warrantyMonths: 24, paymentTerms: "30 days", notes: "" }] },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-0118", vendor: "Vector Controls", title: "Control cabinet components", projectId: "PRJ-0258", value: 412000, issued: "2026-10-14", expected: "2026-11-07", status: "Part received", lines: [{ item: "Terminal blocks · 4 sq mm", ordered: 400, received: 400, rejected: 0, uom: "nos" }, { item: "Relay module · 24 V", ordered: 60, received: 36, rejected: 2, uom: "nos" }] },
  { id: "PO-0112", vendor: "Precision Instruments", title: "Calibration reference equipment", value: 188000, issued: "2026-10-09", expected: "2026-11-09", status: "Issued", lines: [{ item: "Reference pressure module", ordered: 1, received: 0, rejected: 0, uom: "nos" }] },
  { id: "PO-0109", vendor: "Orbit Process Solutions", title: "Pressure transmitters — Line 03", projectId: "PRJ-0264", value: 165000, issued: "2026-10-12", expected: "2026-10-30", status: "Received", lines: [{ item: "Pressure transmitter · 0–10 bar", ordered: 6, received: 6, rejected: 0, uom: "nos" }] },
  { id: "PO-0115", vendor: "Kaveri Electricals", title: "Panel enclosure batch", value: 164000, issued: "2026-10-21", expected: "2026-11-02", status: "Part received", lines: [{ item: "Panel enclosure · IP65 1800×800", ordered: 8, received: 4, rejected: 0, uom: "nos" }] },
];

export const opportunities: Opportunity[] = [
  { id: "OPP-0081", name: "Line automation expansion", account: "Summit Engineering", vertical: "Turnkey automation", stage: "Qualified", value: 6400000, probability: 35, owner: "Sana Kapoor", closeDate: "2026-12-22", nextAction: "Site survey with estimator", nextActionDue: "2026-11-06", source: "Existing customer" },
  { id: "OPP-0076", name: "Annual instrumentation support", account: "Summit Engineering", vertical: "AMC", stage: "Proposal", value: 1240000, probability: 60, owner: "Arjun Mehta", closeDate: "2026-11-10", nextAction: "Revise QUO-0237 visit count", nextActionDue: "2026-11-04", source: "Renewal" },
  { id: "OPP-0072", name: "Panel assembly contract — 14 MCCs", account: "Meridian Foods", vertical: "Panel assembly", stage: "Negotiation", value: 2850000, probability: 75, owner: "Sana Kapoor", closeDate: "2026-11-15", nextAction: "Commercial meeting — payment terms", nextActionDue: "2026-11-05", source: "Existing customer" },
  { id: "OPP-0084", name: "Calibration lab outsourcing", account: "Aster Biologics", vertical: "Calibration", stage: "Lead", value: 540000, probability: 15, owner: "Arjun Mehta", closeDate: "2027-01-30", nextAction: "Qualify instrument count", nextActionDue: "2026-11-11", source: "Website" },
  { id: "OPP-0079", name: "Data integrity remediation (CSV)", account: "Northstar Pharma", vertical: "CSV / Manufacturing IT", stage: "Proposal", value: 1760000, probability: 50, owner: "Sana Kapoor", closeDate: "2026-12-05", nextAction: "Submit technical proposal", nextActionDue: "2026-11-08", source: "Tender" },
  { id: "OPP-0069", name: "Boiler house O&M", account: "Crest Chemicals", vertical: "O&M", stage: "Won", value: 980000, probability: 100, owner: "Arjun Mehta", closeDate: "2026-08-02", nextAction: "Handed to projects", nextActionDue: "2026-08-05", source: "Tender" },
  { id: "OPP-0066", name: "Tank farm instrumentation", account: "Crest Chemicals", vertical: "Instrumentation", stage: "Lost", value: 2200000, probability: 0, owner: "Sana Kapoor", closeDate: "2026-09-18", nextAction: "Lost on price — 11% gap", nextActionDue: "2026-09-18", source: "Tender" },
];

export const quotations: Quotation[] = [
  { id: "QUO-0221", opportunityId: "OPP-0061", customer: "Northstar Pharma", title: "Process automation upgrade", revision: "B", value: 4850000, validUntil: "2026-06-15", status: "Accepted", owner: "Sana Kapoor",
    lines: [
      { description: "PLC, I/O, field instruments and panel", billing: "Material", qty: 1, rate: 2910000 },
      { description: "Engineering, FAT, installation and SAT", billing: "Engineering", qty: 1, rate: 1940000 },
    ],
  },
  { id: "QUO-0237", opportunityId: "OPP-0076", customer: "Summit Engineering", title: "Annual instrumentation support", revision: "A", value: 1240000, validUntil: "2026-11-20", status: "In review", owner: "Arjun Mehta",
    lines: [
      { description: "Annual support cover — breakdown response 6 h", billing: "AMC", qty: 1, rate: 690000 },
      { description: "Preventive visits", billing: "AMC", qty: 4, rate: 110000 },
      { description: "Critical spares kit", billing: "Material", qty: 1, rate: 110000 },
    ],
  },
  { id: "QUO-0240", opportunityId: "OPP-0072", customer: "Meridian Foods", title: "Panel assembly contract — 14 MCCs", revision: "C", value: 2850000, validUntil: "2026-11-30", status: "Sent", owner: "Sana Kapoor" },
  { id: "QUO-0242", opportunityId: "OPP-0079", customer: "Northstar Pharma", title: "Data integrity remediation", revision: "A", value: 1760000, validUntil: "2026-12-10", status: "Draft", owner: "Sana Kapoor" },
];

export const salesOrders: SalesOrder[] = [
  { id: "SO-0196", quotationId: "QUO-0221", customer: "Northstar Pharma", title: "Process automation upgrade", value: 4850000, billed: 2425000, booked: "2026-05-28", status: "In fulfilment", projectId: "PRJ-0264", owner: "Sana Kapoor", customerPo: "NSP/PO/26/1187" },
  { id: "SO-0188", customer: "Meridian Foods", title: "MCC panel installation", value: 3280000, billed: 1968000, booked: "2026-07-08", status: "In fulfilment", projectId: "PRJ-0258", owner: "Sana Kapoor", customerPo: "MF/ENG/PO/2611" },
  { id: "SO-0179", customer: "Crest Chemicals", title: "Instrumentation commissioning", value: 2640000, billed: 2112000, booked: "2026-05-10", status: "In fulfilment", projectId: "PRJ-0249", owner: "Arjun Mehta", customerPo: "CC/NDS/26-114" },
  { id: "SO-0201", customer: "Northstar Pharma", title: "AMC-0031 annual contract", value: 680000, billed: 340000, booked: "2026-03-25", status: "In fulfilment", owner: "Arjun Mehta", customerPo: "NSP/AMC/26/031" },
  { id: "SO-0172", customer: "Aster Biologics", title: "Calibration services — H1", value: 312000, billed: 312000, booked: "2026-03-02", status: "Closed", owner: "Arjun Mehta", customerPo: "AB/CAL/26/007" },
];

export const billingAdvices: BillingAdvice[] = [
  { id: "BA-0063", salesOrderId: "SO-0179", customer: "Crest Chemicals", trigger: "MS-2 Loop checks complete", value: 528000, raised: "2026-10-20", status: "Ready for review" },
  { id: "BA-0061", salesOrderId: "SO-0196", customer: "Northstar Pharma", trigger: "MS-2 Panel FAT passed", value: 1455000, raised: "2026-09-16", status: "Posted" },
  { id: "BA-0064", salesOrderId: "SO-0201", customer: "Northstar Pharma", trigger: "AMC quarter 3 billing", value: 170000, raised: "2026-10-01", status: "Sent to accounting" },
  { id: "BA-0062", salesOrderId: "SO-0172", customer: "Aster Biologics", trigger: "Calibration services H1 — final instalment", value: 156000, raised: "2026-11-02", status: "Sent to accounting" },
  { id: "BA-0060", salesOrderId: "SO-0188", customer: "Meridian Foods", trigger: "MS-2 Panel FAT passed", value: 1312000, raised: "2026-10-10", status: "Mismatch" },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "LV-0412", personId: "EMP-0129", person: "Rohit Verma", kind: "Sick", from: "2026-11-02", to: "2026-11-04", days: 3, status: "Approved", reason: "Fever — certificate attached" },
  { id: "LV-0415", personId: "EMP-0091", person: "Priya Menon", kind: "Earned", from: "2026-11-24", to: "2026-11-28", days: 5, status: "Pending", reason: "Family function" },
  { id: "LV-0416", personId: "EMP-0063", person: "Nikhil Joshi", kind: "Casual", from: "2026-11-07", to: "2026-11-07", days: 1, status: "Pending", reason: "Personal work" },
];

export const claims: Claim[] = [
  { id: "CLM-0068", personId: "EMP-0072", person: "Karan Patel", kind: "Travel", reference: "SR-0144 · Pune → Chakan", amount: 8450, submitted: "2026-11-02", status: "Pending" },
  { id: "CLM-0066", personId: "EMP-0056", person: "Vikram Shah", kind: "Lodging", reference: "PRJ-0249 · Vadodara", amount: 21600, submitted: "2026-10-31", status: "Pending" },
  { id: "CLM-0061", personId: "EMP-0048", person: "Meera Nair", kind: "Travel", reference: "PRJ-0271 · Hyderabad", amount: 14200, submitted: "2026-10-24", status: "Approved" },
  { id: "CLM-0071", personId: "EMP-0091", person: "Priya Menon", kind: "Travel", reference: "CAL-0090 · Bengaluru reference lab", amount: 6120, submitted: "2026-10-28", status: "Pending" },
  { id: "CLM-0058", personId: "EMP-0027", person: "Rahul Desai", kind: "Site expense", reference: "PRJ-0258 · Nashik", amount: 5300, submitted: "2026-10-20", status: "Paid" },
];

export const payrollRuns: PayrollRun[] = [
  {
    id: "PAY-2026-11", period: "November 2026", status: "Collecting inputs", employees: 214, gross: 15860000, deductions: 2140000, net: 13720000,
    checks: [
      { name: "Attendance locked", status: "Warning", detail: "11 attendance corrections pending approval" },
      { name: "Leave balances synced", status: "Pass", detail: "All leave approved through 31 Oct" },
      { name: "New joiners have bank details", status: "Blocked", detail: "2 of 5 joiners missing verified bank account" },
      { name: "Site allowances approved", status: "Pass", detail: "38 site deployments, all approved" },
      { name: "Claims cut-off", status: "Warning", detail: "2 claims awaiting manager approval" },
    ],
  },
  { id: "PAY-2026-10", period: "October 2026", status: "Locked", employees: 211, gross: 15620000, deductions: 2105000, net: 13515000, checks: [], preparedBy: "Kavya Iyer", preparedAt: "2026-10-27T16:10:00+05:30", approvedBy: "Ritu Agarwal", approvedAt: "2026-10-28T11:30:00+05:30", lockedBy: "Kavya Iyer", lockedAt: "2026-10-29T10:05:00+05:30" },
  { id: "PAY-2026-09", period: "September 2026", status: "Locked", employees: 209, gross: 15410000, deductions: 2081000, net: 13329000, checks: [], preparedBy: "Kavya Iyer", preparedAt: "2026-09-25T15:40:00+05:30", approvedBy: "Ritu Agarwal", approvedAt: "2026-09-26T12:15:00+05:30", lockedBy: "Kavya Iyer", lockedAt: "2026-09-28T09:50:00+05:30" },
];

/** Joiners this period: the bank-details check passes when none is still pending verification. */
export const PAYROLL_JOINERS_THIS_PERIOD = 5;

/**
 * Sign-in accounts. USR-0001…0009 are the demo accounts (one per role, same ids the API seeds);
 * the last two show the other lifecycle states and can't sign in.
 */
export const accounts: UserAccount[] = [
  { id: "USR-0001", name: "Arjun Mehta", email: "arjun.mehta@abc.example", employeeId: "EMP-0012", roleId: "ROLE-01", mfa: "On", lastActive: "2026-11-03T09:38:00+05:30", status: "Active" },
  { id: "USR-0002", name: "Ananya Rao", email: "ananya.rao@abc.example", employeeId: "EMP-0034", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-11-03T07:41:00+05:30", status: "Active" },
  { id: "USR-0003", name: "Imran Sheikh", email: "imran.sheikh@abc.example", employeeId: "EMP-0104", roleId: "ROLE-03", mfa: "Not required", lastActive: "2026-11-02T16:21:00+05:30", status: "Active" },
  { id: "USR-0004", name: "Karan Patel", email: "karan.patel@abc.example", employeeId: "EMP-0072", roleId: "ROLE-04", mfa: "Not required", lastActive: "2026-11-03T08:24:00+05:30", status: "Active" },
  { id: "USR-0005", name: "Sana Kapoor", email: "sana.kapoor@abc.example", employeeId: "EMP-0081", roleId: "ROLE-05", mfa: "Not required", lastActive: "2026-11-03T09:02:00+05:30", status: "Active" },
  { id: "USR-0006", name: "Kavya Iyer", email: "kavya.iyer@abc.example", employeeId: "EMP-0135", roleId: "ROLE-06", mfa: "On", lastActive: "2026-11-03T09:15:00+05:30", status: "Active" },
  { id: "USR-0007", name: "Ritu Agarwal", email: "ritu.agarwal@abc.example", roleId: "ROLE-07", mfa: "On", lastActive: "2026-11-02T18:40:00+05:30", status: "Active" },
  { id: "USR-0008", name: "IT Administrator", email: "it.admin@abc.example", roleId: "ROLE-08", mfa: "On", lastActive: "2026-11-02T18:10:00+05:30", status: "Active" },
  { id: "USR-0009", name: "Deepa Kulkarni", email: "deepa.kulkarni@abc.example", employeeId: "EMP-0117", roleId: "ROLE-03", mfa: "Not required", lastActive: "2026-11-03T08:55:00+05:30", status: "Active" },
  { id: "USR-0010", name: "Neha Bansal", email: "neha.bansal@abc.example", roleId: "ROLE-07", mfa: "Not enrolled", status: "Invited", note: "Invited 30 Oct · MFA is enrolled at first sign-in" },
  { id: "USR-0011", name: "Suresh Pillai", email: "suresh.pillai@abc.example", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-10-30T18:00:00+05:30", status: "Deactivated", note: "Exit 31 Oct · access revoked; approvals delegated to Ananya Rao" },
];

export const approvals: Approval[] = [
  { id: "APR-0132", type: "Purchase requisition", module: "purchase", reference: "PR-0084", title: "PLC I/O modules for Line 03 panel", maker: "Ananya Rao", value: "₹2.84 L", submitted: "2026-11-03T07:40:00+05:30", level: "Level 2 of 2 · Operations head", status: "Pending", evidence: ["BOM-042 rev C shortage list", "RFQ-0041 comparison (3 quotes)", "Project budget headroom ₹8.05 L"] },
  { id: "APR-0129", type: "BOM release", module: "inventory", reference: "BOM-042-D", title: "Engineering BOM revision D", maker: "Rahul Desai", value: "24 components", submitted: "2026-11-03T05:30:00+05:30", level: "Level 1 of 1 · Engineering head", status: "Pending", evidence: ["Change note DOC-1224", "Impact: WO-0187 not yet past wiring"] },
  { id: "APR-0125", type: "Employee claim", module: "hr", reference: "CLM-0068", title: "Site travel reimbursement", maker: "Karan Patel", value: "₹8,450", submitted: "2026-11-02T18:10:00+05:30", level: "Level 1 of 1 · Reporting manager", status: "Pending", evidence: ["Fuel bills (3)", "Linked ticket SR-0144"] },
  { id: "APR-0121", type: "Billing advice", module: "sales", reference: "BA-0063", title: "Commissioning milestone advice", maker: "Vikram Shah", value: "₹5.28 L", submitted: "2026-11-01T12:00:00+05:30", level: "Level 1 of 1 · Finance owner", status: "Pending", evidence: ["Loop check sheets", "Customer sign-off"] },
];

export const activity: ActivityEvent[] = [
  { id: "ACT-1", at: "2026-11-03T09:12:00+05:30", actor: "Customer portal", action: "logged ticket", reference: "SR-0153", module: "assets" },
  { id: "ACT-2", at: "2026-11-03T08:22:00+05:30", actor: "Arjun Mehta", action: "assigned Karan Patel to", reference: "SR-0148", module: "assets" },
  { id: "ACT-3", at: "2026-11-03T07:40:00+05:30", actor: "Ananya Rao", action: "submitted for approval", reference: "PR-0084", module: "purchase" },
  { id: "ACT-4", at: "2026-11-03T05:30:00+05:30", actor: "Rahul Desai", action: "proposed revision D of", reference: "BOM-042", module: "inventory" },
  { id: "ACT-5", at: "2026-11-02T16:20:00+05:30", actor: "Imran Sheikh", action: "received into QC hold", reference: "GRN-0073", module: "inventory" },
  { id: "ACT-6", at: "2026-11-02T11:05:00+05:30", actor: "Nikhil Joshi", action: "recorded 3 quotes on", reference: "RFQ-0041", module: "purchase" },
  { id: "ACT-7", at: "2026-11-01T12:00:00+05:30", actor: "Vikram Shah", action: "raised billing advice", reference: "BA-0063", module: "sales" },
];

export const roles: Role[] = [
  { id: "ROLE-01", name: "Operations head", users: 2, description: "Final approval on purchases above ₹2 L and project variations.", permissions: { dashboard: "view", insights: "view", projects: "approve", inventory: "view", assets: "view", purchase: "approve", sales: "view", crm: "view", hr: "view", payroll: "none", users: "none", reports: "view" } },
  { id: "ROLE-02", name: "Project manager", users: 9, description: "Runs projects, raises requisitions and approves timesheets for their team.", permissions: { dashboard: "view", insights: "view", projects: "edit", inventory: "view", assets: "view", purchase: "edit", sales: "view", crm: "none", hr: "view", payroll: "none", users: "none", reports: "view" } },
  { id: "ROLE-03", name: "Stores & QC", users: 7, description: "Receives, inspects, issues and transfers stock; cannot approve own adjustments.", permissions: { dashboard: "view", insights: "view", projects: "view", inventory: "edit", assets: "view", purchase: "view", sales: "none", crm: "none", hr: "none", payroll: "none", users: "none", reports: "view" } },
  { id: "ROLE-04", name: "Service coordinator", users: 5, description: "Triages tickets, dispatches engineers and manages AMC visits.", permissions: { dashboard: "view", insights: "view", projects: "view", inventory: "view", assets: "edit", purchase: "none", sales: "view", crm: "view", hr: "view", payroll: "none", users: "none", reports: "view" } },
  { id: "ROLE-05", name: "Sales & presales", users: 8, description: "Owns the pipeline, quotations and customer orders.", permissions: { dashboard: "view", insights: "view", projects: "view", inventory: "view", assets: "view", purchase: "none", sales: "edit", crm: "edit", hr: "none", payroll: "none", users: "none", reports: "view" } },
  { id: "ROLE-06", name: "HR & payroll", users: 3, description: "Maintains people records and prepares payroll; salary fields restricted to this role.", permissions: { dashboard: "view", insights: "view", projects: "none", inventory: "none", assets: "view", purchase: "none", sales: "none", crm: "none", hr: "admin", payroll: "edit", users: "view", reports: "view" } },
  { id: "ROLE-07", name: "Finance owner", users: 2, description: "Approves billing advice and payroll; reconciles with external accounting.", permissions: { dashboard: "view", insights: "view", projects: "view", inventory: "view", assets: "none", purchase: "view", sales: "approve", crm: "none", hr: "none", payroll: "approve", users: "none", reports: "view" } },
  { id: "ROLE-08", name: "System administrator", users: 2, description: "Manages users, roles and integrations. No business approvals.", permissions: { dashboard: "view", insights: "none", projects: "none", inventory: "none", assets: "none", purchase: "none", sales: "none", crm: "none", hr: "none", payroll: "none", users: "admin", reports: "view" } },
  // A walkthrough convenience for the presenter: every module at full access. Reachable only via Switch role; hidden from the login page and the roles matrix.
  { id: "ROLE-00", name: "Full access (demo)", users: 1, description: "Every module — a walkthrough convenience for the presenter, not a production role.", permissions: { dashboard: "admin", insights: "admin", projects: "admin", inventory: "admin", assets: "admin", purchase: "admin", sales: "admin", crm: "admin", hr: "admin", payroll: "admin", users: "admin", reports: "admin" } },
];

export const reports: ReportDef[] = [
  { id: "RPT-PM-01", name: "Project portfolio & margin", module: "projects", owner: "Operations head", description: "Contract value, committed, incurred and billed by project with estimated margin.", refresh: "Hourly", restricted: false },
  { id: "RPT-PM-02", name: "Milestone ageing", module: "projects", owner: "Operations head", description: "Late and upcoming milestones with billing exposure.", refresh: "Hourly", restricted: false },
  { id: "RPT-INV-01", name: "BOM shortage", module: "inventory", owner: "Stores lead", description: "Released BOM requirement against available, reserved and on-order stock.", refresh: "Live", restricted: false },
  { id: "RPT-INV-02", name: "Stock ledger & valuation", module: "inventory", owner: "Finance owner", description: "Quantity and value movement by item and location.", refresh: "Daily", restricted: true },
  { id: "RPT-INV-03", name: "Serial traceability", module: "inventory", owner: "QC lead", description: "Serial from GRN through issue, assembly and installation.", refresh: "Live", restricted: false },
  { id: "RPT-PUR-01", name: "Open PO & receipt ageing", module: "purchase", owner: "Purchase head", description: "Outstanding PO lines, late receipts and vendor on-time rate.", refresh: "Hourly", restricted: false },
  { id: "RPT-SAL-01", name: "Order book & unbilled milestones", module: "sales", owner: "Finance owner", description: "Order value, billed to date and billable milestones not yet invoiced.", refresh: "Daily", restricted: false },
  { id: "RPT-CRM-01", name: "Pipeline by vertical", module: "crm", owner: "Sales head", description: "Weighted pipeline by vertical, stage and close period.", refresh: "Hourly", restricted: false },
  { id: "RPT-AST-01", name: "SLA attainment", module: "assets", owner: "Service head", description: "Response and resolution against contract SLA, by customer.", refresh: "Hourly", restricted: false },
  { id: "RPT-AST-02", name: "Calibration due & overdue", module: "assets", owner: "QC lead", description: "Instruments by due window with certificate status.", refresh: "Daily", restricted: false },
  { id: "RPT-HR-01", name: "Deployment roster", module: "hr", owner: "HR lead", description: "Who is deployed where, until when, against which record.", refresh: "Live", restricted: false },
  { id: "RPT-PAY-01", name: "Payroll register", module: "payroll", owner: "HR & payroll", description: "Earnings, deductions and net pay per employee.", refresh: "Per run", restricted: true },
  { id: "RPT-USR-01", name: "Approval & audit trail", module: "users", owner: "System administrator", description: "Every approve, reject, export and permission change with before/after.", refresh: "Live", restricted: true },
];

export const notifications: Notification[] = [
  { id: "N-1", at: "2026-11-03T09:12:00+05:30", title: "New P3 ticket", body: "HMI touchscreen unresponsive — Northstar Pharma", reference: "SR-0153", module: "assets", tone: "info", read: false },
  { id: "N-2", at: "2026-11-03T08:05:00+05:30", title: "P1 breakdown — response due 14:00", body: "Intermittent PLC communication on Line 03", reference: "SR-0148", module: "assets", tone: "risk", read: false },
  { id: "N-3", at: "2026-11-03T07:40:00+05:30", title: "Approval requested", body: "PR-0084 · ₹2.84 L · from Ananya Rao", reference: "PR-0084", module: "purchase", tone: "accent", read: false },
  { id: "N-4", at: "2026-11-02T16:20:00+05:30", title: "Material on QC hold", body: "6 transmitters from GRN-0073 quarantined", reference: "ITM-0137", module: "inventory", tone: "warn", read: true },
];

export const deliveryTrend = [
  { month: "Jun", planned: 12, delivered: 9 },
  { month: "Jul", planned: 16, delivered: 13 },
  { month: "Aug", planned: 14, delivered: 12 },
  { month: "Sep", planned: 21, delivered: 17 },
  { month: "Oct", planned: 18, delivered: 16 },
  { month: "Nov", planned: 24, delivered: 7 },
];

export const verticals = [
  "Turnkey automation",
  "Panel assembly",
  "Instrumentation",
  "Calibration",
  "AMC",
  "O&M",
  "CSV / Manufacturing IT",
] as const;

/* ---------------------------------------------------------------- E2E-04 · material at a partner's shop */
export const subcontractIssues: SubcontractIssue[] = [
  {
    id: "SI-0044", partner: "Vector Controls", package: "Control cabinet sub-assembly · PO-0118 line 2", poId: "PO-0118", projectId: "PRJ-0258",
    custodian: "Vector Controls, Pune shop · Salim Khot (custody changed 30 Oct)", issuedOn: "2026-10-20", reconcileBy: "2026-11-10", issuedBy: "Imran Sheikh", status: "Open",
    lines: [
      { itemId: "ITM-0214", item: "Panel enclosure · IP65 1800×800", issued: 2, consumed: 1, returned: 0, damaged: 0, unitValue: 41000, note: "Cut and formed; one held for the bending fixture." },
      { itemId: "ITM-0089", item: "24 V DC power supply · 10 A", issued: 10, consumed: 6, returned: 2, damaged: 1, unitValue: 6400, note: "One unit burnt on the bench test. Partner report not yet recorded." },
      { itemId: "ITM-0042", item: "PLC CPU · S7-1200 series", issued: 4, consumed: 2, returned: 1, damaged: 0, unitValue: 38500, note: "Serialized units stay company stock until work acceptance." },
    ],
  },
  {
    id: "SI-0039", partner: "Kaveri Electricals", package: "Wiring harness sub-assembly · PO-0115", poId: "PO-0115", projectId: "PRJ-0258",
    custodian: "Kaveri stores, Nashik · no named custodian since 28 Oct", issuedOn: "2026-10-06", reconcileBy: "2026-10-28", issuedBy: "Imran Sheikh", status: "Open",
    lines: [{ itemId: "ITM-0214", item: "Panel enclosure · IP65 1800×800", issued: 4, consumed: 4, returned: 0, damaged: 0, unitValue: 41000, note: "Fully consumed. Reconciliation was due 28 Oct and is still open." }],
  },
];

/* ---------------------------------------------------------------- E2E-12 · a leaver's checklist is the record */
export const exitCases: ExitCase[] = [
  {
    id: "EXT-0003", personId: "EMP-0091", person: "Priya Menon", role: "Calibration Engineer · Quality", lastDay: "2026-11-14", reason: "Resignation accepted 31 Oct", status: "In progress",
    items: [
      { key: "identity", item: "Workspace access", owner: "IT security", due: "2026-11-14", reference: "Account mapped to EMP-0091", rule: "Deactivation is an event with its own time. Access ends on or before the last day, never after.", status: "Open" },
      { key: "custody", item: "Company-held instrument", owner: "Central lab store", due: "2026-11-12", reference: "AST-0086 · CAL-0096 due 5 Nov", rule: "Recovery is a custody event that records the condition the equipment came back in.", status: "Open" },
      { key: "commitment", item: "Open purchase commitment", owner: "Purchase · Nikhil Joshi", due: "2026-11-09", reference: "PR-0079 → PO-0112 · ₹1.88 L, delivery 9 Nov", rule: "A live order needs a named owner before the goods arrive. The maker stays on the approval history.", status: "Open" },
      { key: "claim", item: "Travel and expense claim", owner: "Payroll", due: "2026-11-14", reference: "CLM-0071 · ₹6,120", rule: "Settled or rejected before the last day. The full-and-final figure belongs to payroll, not this screen.", status: "Open" },
      { key: "delegation", item: "Approvals that route to her", owner: "Quality · reporting manager", due: "2026-11-15", reference: "Calibration review queue", rule: "Delegation carries a start date, so nothing waits in a queue nobody is left to open.", status: "Open" },
      { key: "allocation", item: "Project and site allocation", owner: "HR", due: "2026-11-14", reference: "No project, site or contract allocation", rule: "Checked and empty. An exception check shows what it looked at, not only what it found.", status: "Checked — nothing found", outcome: "Registers checked: projects, deployments, contracts", doneBy: "Kavya Iyer", doneAt: "2026-11-02T16:40:00+05:30" },
    ],
  },
];

/* ---------------------------------------------------------------- E2E-10 · accounting outbox, one key per posting */
export const postings: AccountingPosting[] = [
  { key: "BA-0061/R1", advice: "BA-0061", party: "Northstar Pharma", projectId: "PRJ-0264", state: "Acknowledged", attempts: 1, lastAttempt: "2026-09-16T15:05:00+05:30", amount: 1455000, posted: 1455000, external: "ACC-INV/26-27/0371", note: "Posted, acknowledged and equal to the advice. Kept visible as evidence of a clean match." },
  { key: "BA-0060/R1", advice: "BA-0060", party: "Meridian Foods", projectId: "PRJ-0258", state: "Needs attention", attempts: 1, lastAttempt: "2026-10-10T09:18:00+05:30", amount: 1312000, posted: 1246400, external: "ACC-INV/26-27/0418", note: "Accounting deducted 5% retention the advice doesn't carry. Re-sending would repeat the wrong number." },
  { key: "BA-0064/R1", advice: "BA-0064", party: "Northstar Pharma", state: "Failed", attempts: 3, lastAttempt: "2026-11-02T17:42:00+05:30", lastError: "Accounting endpoint unavailable (503)", amount: 170000, note: "Transport failed before any invoice number came back, so the key is still unused." },
  { key: "BA-0062/R1", advice: "BA-0062", party: "Aster Biologics", state: "Sent", attempts: 1, lastAttempt: "2026-11-03T08:10:00+05:30", amount: 156000, note: "Acknowledgement pending. An unanswered send is not a failed send." },
];
