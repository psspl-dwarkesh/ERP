export type RecordRow = {
  id: string;
  name: string;
  subtitle: string;
  owner: string;
  status: string;
  value: string;
  date: string;
  progress?: number;
  notes?: string;
};
export const projects: RecordRow[] = [
  {
    id: "PRJ-0264",
    name: "Process automation upgrade",
    subtitle: "Northstar Pharma · Pune plant",
    owner: "Ananya Rao",
    status: "At risk",
    value: "₹48.50 L",
    date: "18 Nov 2026",
    progress: 68,
  },
  {
    id: "PRJ-0258",
    name: "MCC panel installation",
    subtitle: "Meridian Foods · Nashik",
    owner: "Rahul Desai",
    status: "On track",
    value: "₹32.80 L",
    date: "24 Nov 2026",
    progress: 84,
  },
  {
    id: "PRJ-0271",
    name: "Cleanroom validation",
    subtitle: "Aster Biologics · Hyderabad",
    owner: "Meera Nair",
    status: "On track",
    value: "₹18.20 L",
    date: "02 Dec 2026",
    progress: 42,
  },
  {
    id: "PRJ-0249",
    name: "Instrumentation commissioning",
    subtitle: "Crest Chemicals · Vadodara",
    owner: "Vikram Shah",
    status: "In review",
    value: "₹26.40 L",
    date: "12 Nov 2026",
    progress: 92,
  },
  {
    id: "PRJ-0278",
    name: "Utility monitoring system",
    subtitle: "Summit Engineering · Mumbai",
    owner: "Ananya Rao",
    status: "Planning",
    value: "₹15.60 L",
    date: "15 Dec 2026",
    progress: 18,
  },
];
export const purchases: RecordRow[] = [
  {
    id: "PR-0084",
    name: "PLC & I/O modules",
    subtitle: "PRJ-0264 · BOM-042 rev C",
    owner: "Ananya Rao",
    status: "Awaiting approval",
    value: "₹2.84 L",
    date: "05 Nov 2026",
  },
  {
    id: "PO-0118",
    name: "Control cabinet components",
    subtitle: "Vector Controls · PRJ-0258",
    owner: "Nikhil Joshi",
    status: "Part received",
    value: "₹4.12 L",
    date: "07 Nov 2026",
  },
  {
    id: "RFQ-0041",
    name: "PLC & I/O module supply",
    subtitle: "3 supplier responses · PRJ-0264",
    owner: "Nikhil Joshi",
    status: "In review",
    value: "₹2.84 L",
    date: "06 Nov 2026",
  },
  {
    id: "PO-0112",
    name: "Calibration reference equipment",
    subtitle: "Precision Instruments · Calibration lab",
    owner: "Priya Menon",
    status: "Approved",
    value: "₹1.88 L",
    date: "09 Nov 2026",
  },
];
export const stock: RecordRow[] = [
  {
    id: "ITM-0042",
    name: "PLC CPU · S7-1200 series",
    subtitle: "Central warehouse · Rack A-04 · Serialized",
    owner: "Central warehouse",
    status: "Low stock",
    value: "4 available",
    date: "12 reserved",
  },
  {
    id: "ITM-0089",
    name: "24V DC power supply",
    subtitle: "Central warehouse · Rack B-12",
    owner: "Central warehouse",
    status: "Available",
    value: "38 available",
    date: "10 reserved",
  },
  {
    id: "ITM-0137",
    name: "Pressure transmitter · 0–10 bar",
    subtitle: "QC bay · GRN-0073 · Customer equipment",
    owner: "QC bay",
    status: "QC hold",
    value: "0 available",
    date: "6 quarantined",
  },
  {
    id: "ITM-0214",
    name: "Panel enclosure · IP65",
    subtitle: "Assembly store · Rack C-02",
    owner: "Assembly store",
    status: "Available",
    value: "16 available",
    date: "8 reserved",
  },
];
export const assets: RecordRow[] = [
  {
    id: "AST-0042",
    name: "Process control panel · Line 03",
    subtitle: "Northstar Pharma · Pune · Customer-owned",
    owner: "Karan Patel",
    status: "In service",
    value: "AMC-0031",
    date: "28 Nov 2026",
  },
  {
    id: "AST-0086",
    name: "Digital pressure calibrator",
    subtitle: "ABC calibration lab · Company-owned",
    owner: "Priya Menon",
    status: "Calibration due",
    value: "CAL-0096",
    date: "05 Nov 2026",
  },
  {
    id: "AST-0134",
    name: "MCC panel · Utility block",
    subtitle: "Meridian Foods · Nashik · Customer-owned",
    owner: "Rahul Desai",
    status: "In service",
    value: "AMC-0044",
    date: "12 Dec 2026",
  },
];
export const tickets: RecordRow[] = [
  {
    id: "SR-0148",
    name: "Intermittent PLC communication",
    subtitle: "Northstar Pharma · AST-0042 · AMC-0031",
    owner: "Karan Patel",
    status: "Urgent",
    value: "14:00 IST target",
    date: "03 Nov 2026",
  },
  {
    id: "SR-0146",
    name: "Scheduled preventive inspection",
    subtitle: "Meridian Foods · AST-0134",
    owner: "Rahul Desai",
    status: "Scheduled",
    value: "Included visit",
    date: "04 Nov 2026",
  },
  {
    id: "SR-0142",
    name: "Instrument loop verification",
    subtitle: "Crest Chemicals · Service job",
    owner: "Meera Nair",
    status: "In progress",
    value: "Charge review",
    date: "04 Nov 2026",
  },
];
export const people: RecordRow[] = [
  {
    id: "EMP-0034",
    name: "Ananya Rao",
    subtitle: "Project Manager · Engineering",
    owner: "Pune plant",
    status: "Deployed",
    value: "PRJ-0264",
    date: "30 Nov 2026",
  },
  {
    id: "EMP-0072",
    name: "Karan Patel",
    subtitle: "Service Engineer · Field operations",
    owner: "Pune plant",
    status: "Deployed",
    value: "SR-0148",
    date: "03 Nov 2026",
  },
  {
    id: "EMP-0091",
    name: "Priya Menon",
    subtitle: "Calibration Engineer · Quality",
    owner: "Central lab",
    status: "Available",
    value: "Calibration team",
    date: "—",
  },
  {
    id: "EMP-0048",
    name: "Meera Nair",
    subtitle: "Validation Lead · CSV",
    owner: "Hyderabad",
    status: "Deployed",
    value: "PRJ-0271",
    date: "02 Dec 2026",
  },
];
export const sales: RecordRow[] = [
  {
    id: "SO-0196",
    name: "Process automation upgrade",
    subtitle: "Northstar Pharma · QUO-0221 rev B",
    owner: "Sana Kapoor",
    status: "In fulfilment",
    value: "₹48.50 L",
    date: "18 Nov 2026",
  },
  {
    id: "QUO-0237",
    name: "Annual instrumentation support",
    subtitle: "Summit Engineering · AMC proposal",
    owner: "Sana Kapoor",
    status: "In review",
    value: "₹12.40 L",
    date: "10 Nov 2026",
  },
  {
    id: "BA-0063",
    name: "Commissioning milestone advice",
    subtitle: "Crest Chemicals · PRJ-0249",
    owner: "Arjun Mehta",
    status: "Ready for review",
    value: "₹5.28 L",
    date: "06 Nov 2026",
  },
];
export const opportunities: RecordRow[] = [
  {
    id: "OPP-0081",
    name: "Line automation expansion",
    subtitle: "Summit Engineering · Turnkey automation",
    owner: "Sana Kapoor",
    status: "Qualification",
    value: "₹64.00 L",
    date: "22 Nov 2026",
  },
  {
    id: "OPP-0076",
    name: "Annual instrumentation support",
    subtitle: "Summit Engineering · AMC",
    owner: "Arjun Mehta",
    status: "Proposal",
    value: "₹12.40 L",
    date: "10 Nov 2026",
  },
  {
    id: "OPP-0072",
    name: "Panel assembly contract",
    subtitle: "Meridian Foods · Electrical panels",
    owner: "Sana Kapoor",
    status: "Negotiation",
    value: "₹28.50 L",
    date: "15 Nov 2026",
  },
];
export type Approval = {
  id: string;
  title: string;
  type: string;
  ref: string;
  maker: string;
  value: string;
  age: string;
  evidence?: string;
};
export const approvals: Approval[] = [
  {
    id: "APR-0132",
    title: "PLC & I/O modules",
    type: "Purchase requisition",
    ref: "PR-0084",
    maker: "Ananya Rao",
    value: "₹2.84 L",
    age: "2 hours ago",
  },
  {
    id: "APR-0127",
    title: "Stock count variance · ITM-0042",
    type: "Count variance",
    ref: "CNT-0031",
    maker: "Ravi Kulkarni",
    value: "₹85,000",
    age: "3 hours ago",
    evidence: "Count sheet · two counters · reason recorded at the shelf",
  },
  {
    id: "APR-0129",
    title: "Engineering BOM revision D",
    type: "BOM release",
    ref: "BOM-042-D",
    maker: "Rahul Desai",
    value: "24 components",
    age: "4 hours ago",
  },
  {
    id: "APR-0125",
    title: "Site travel reimbursement",
    type: "Employee claim",
    ref: "CLM-0068",
    maker: "Karan Patel",
    value: "₹8,450",
    age: "Yesterday",
  },
  {
    // The queue viewer is Arjun Mehta throughout the prototype, so this request
    // is deliberately his own: it is where the maker-checker rule bites.
    id: "APR-0121",
    title: "Subcontract material write-off",
    type: "Subcontract variance",
    ref: "SI-0044",
    maker: "Arjun Mehta",
    value: "₹3,200",
    age: "2 days ago",
    evidence: "Partner damage report · bench-test log · awaiting custodian sign-off",
  },
];
export const chartData = [
  { month: "Jun", planned: 12, delivered: 9 },
  { month: "Jul", planned: 16, delivered: 13 },
  { month: "Aug", planned: 14, delivered: 12 },
  { month: "Sep", planned: 21, delivered: 17 },
  { month: "Oct", planned: 18, delivered: 16 },
  { month: "Nov", planned: 24, delivered: 18 },
];
export const verticals = [
  "Turnkey automation",
  "Panel assembly",
  "Instrumentation",
  "Calibration",
  "AMC",
  "O&M",
  "CSV / Manufacturing IT",
];
/* Counts and subcontract issues are the two journeys the prototype could not
   yet walk, so these fixtures exist to make E2E-04 and E2E-11 clickable. Item
   codes, names, locations and reservations are inherited from the stock
   fixtures above; counted quantities, partner consumption and the people at the
   bench are invented. Unit values are round placeholders chosen to make a
   variance legible as money, not a valuation policy — that decision stays open. */
export type CountLine = {
  item: string;
  material: string;
  position: string;
  expected: number;
  counted: number;
  unitValue: number;
  reason: string;
  route: "adjustment" | "transfer";
};
export const countLines: CountLine[] = [
  {
    item: "ITM-0042",
    material: "PLC CPU · S7-1200 series",
    position: "Central warehouse · Rack A-04 · serialized",
    expected: 4,
    counted: 2,
    unitValue: 42500,
    reason:
      "Two serialized CPUs went out on the PRJ-0264 site van with no transfer posting.",
    route: "adjustment",
  },
  {
    item: "ITM-0089",
    material: "24V DC power supply",
    position: "Central warehouse · Rack B-12",
    expected: 38,
    counted: 38,
    unitValue: 3200,
    reason: "No difference. Reserved block counted separately from free stock.",
    route: "adjustment",
  },
  {
    item: "ITM-0137",
    material: "Pressure transmitter · 0–10 bar",
    position: "QC bay · GRN-0073 · customer-owned",
    expected: 6,
    counted: 6,
    unitValue: 8900,
    reason:
      "Held stock counted at the QC bay. Position recorded, availability deliberately unchanged.",
    route: "transfer",
  },
  {
    item: "ITM-0214",
    material: "Panel enclosure · IP65",
    position: "Assembly store · Rack C-02",
    expected: 16,
    counted: 15,
    unitValue: 6400,
    reason:
      "One enclosure is at Vector Controls under SI-0044 and was counted at both positions.",
    route: "transfer",
  },
];
export type SubcontractLine = {
  issue: string;
  partner: string;
  package: string;
  custodian: string;
  material: string;
  issued: number;
  consumed: number;
  returned: number;
  damaged: number;
  unitValue: number;
  note: string;
  review: "Open" | "Overdue";
};
export const subcontractLines: SubcontractLine[] = [
  {
    issue: "SI-0044",
    partner: "Vector Controls",
    package: "MCC enclosure fabrication · PO-0118 line 2",
    custodian: "Nashik shop · Salim Khot (custody changed 04 Nov)",
    material: "ITM-0214 · Panel enclosure · IP65",
    issued: 2,
    consumed: 1,
    returned: 0,
    damaged: 0,
    unitValue: 6400,
    note: "Cut and formed; held for the bending fixture.",
    review: "Open",
  },
  {
    issue: "SI-0044",
    partner: "Vector Controls",
    package: "MCC enclosure fabrication · PO-0118 line 2",
    custodian: "Nashik shop · Salim Khot (custody changed 04 Nov)",
    material: "ITM-0089 · 24V DC power supply",
    issued: 10,
    consumed: 6,
    returned: 2,
    damaged: 1,
    unitValue: 3200,
    note: "One unit burnt on the bench test. Partner report not yet recorded.",
    review: "Open",
  },
  {
    issue: "SI-0044",
    partner: "Vector Controls",
    package: "Controller commissioning · WO-0187 dependency",
    custodian: "Nashik test bench · Salim Khot",
    material: "ITM-0042 · PLC CPU · S7-1200 series",
    issued: 4,
    consumed: 2,
    returned: 1,
    damaged: 0,
    unitValue: 42500,
    note: "Serialized units remain company stock until work acceptance.",
    review: "Open",
  },
  {
    issue: "SI-0039",
    partner: "Axis Industrial",
    package: "Wiring harness sub-assembly · PO-0118 line 1",
    custodian: "Axis stores · no named custodian since 28 Oct",
    material: "ITM-0214 · Panel enclosure · IP65",
    issued: 4,
    consumed: 4,
    returned: 0,
    damaged: 0,
    unitValue: 6400,
    note: "Fully consumed. Reconciliation was due 28 Oct and is still open.",
    review: "Overdue",
  },
];
