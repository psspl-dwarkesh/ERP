import type { ReactNode } from "react";
import { NOW } from "../../api/fixtures";
import { date, daysFrom, inr, minutesUntil } from "../../api/format";
import type { Bom, Opportunity, Person, Project, PurchaseOrder, ServiceContract, ServiceTicket } from "../../api/types";
import { Progress, RecordLink, Status } from "../../ds/components";

export interface PreviewData {
  projects: Project[];
  boms: Bom[];
  purchaseOrders: PurchaseOrder[];
  tickets: ServiceTicket[];
  contracts: ServiceContract[];
  people: Person[];
  opportunities: Opportunity[];
}

export interface PreviewCol {
  header: string;
  align?: "right";
}
export interface PreviewRow {
  id: string;
  cells: ReactNode[];
  csv: (string | number)[];
}
export interface Preview {
  cols: PreviewCol[];
  rows: PreviewRow[];
  total?: ReactNode[];
  csvHeaders: string[];
  note: string;
}

const pct = (n: number) => `${Math.round(n)}%`;

/** Live previews built from the same operational records the report will read. */
export const PREVIEWS: Record<string, (d: PreviewData) => Preview> = {
  "RPT-PM-01": (d) => ({
    cols: [{ header: "Project" }, { header: "Contract", align: "right" }, { header: "Budget", align: "right" }, { header: "Committed", align: "right" }, { header: "Incurred", align: "right" }, { header: "Billed", align: "right" }, { header: "Est. margin", align: "right" }],
    rows: d.projects.map((p) => {
      const margin = ((p.contractValue - p.budget) / p.contractValue) * 100;
      return {
        id: p.id,
        cells: [<RecordLink id={p.id}>{p.name}</RecordLink>, inr(p.contractValue), inr(p.budget), inr(p.committed), inr(p.incurred), inr(p.billed), <span className={margin < 22 ? "rpt-warn" : ""}>{pct(margin)}</span>],
        csv: [p.id, p.name, p.contractValue, p.budget, p.committed, p.incurred, p.billed, pct(margin)],
      };
    }),
    total: ["Portfolio", inr(d.projects.reduce((a, p) => a + p.contractValue, 0)), inr(d.projects.reduce((a, p) => a + p.budget, 0)), inr(d.projects.reduce((a, p) => a + p.committed, 0)), inr(d.projects.reduce((a, p) => a + p.incurred, 0)), inr(d.projects.reduce((a, p) => a + p.billed, 0)), ""],
    csvHeaders: ["Project", "Name", "Contract (₹)", "Budget (₹)", "Committed (₹)", "Incurred (₹)", "Billed (₹)", "Est. margin"],
    note: "Estimated margin = (contract − budget) ÷ contract. Labour arrives as an aggregate cost, never person-level pay.",
  }),
  "RPT-INV-01": (d) => {
    const lines = d.boms.flatMap((b) => b.lines.map((l) => ({ b, l, short: Math.max(0, l.required - l.reserved - l.available) })));
    return {
      cols: [{ header: "BOM" }, { header: "Item" }, { header: "Required", align: "right" }, { header: "Reserved", align: "right" }, { header: "Free", align: "right" }, { header: "On order", align: "right" }, { header: "Short", align: "right" }],
      rows: lines
        .sort((a, b) => b.short - a.short)
        .map(({ b, l, short }) => ({
          id: `${b.id}-${l.itemId}`,
          cells: [<RecordLink id={b.id} />, <RecordLink id={l.itemId}>{l.item}</RecordLink>, `${l.required} ${l.uom}`, l.reserved, l.available, l.onOrder, short ? <b className="rpt-risk">{short}</b> : <span className="t-muted">0</span>],
          csv: [b.id, l.itemId, l.item, l.required, l.reserved, l.available, l.onOrder, short],
        })),
      csvHeaders: ["BOM", "Item", "Item name", "Required", "Reserved", "Free", "On order", "Short"],
      note: "Short = required − reserved − free stock. QC-held stock counts as not free.",
    };
  },
  "RPT-PUR-01": (d) => ({
    cols: [{ header: "PO" }, { header: "Vendor" }, { header: "Expected" }, { header: "Ageing", align: "right" }, { header: "Lines open", align: "right" }, { header: "Value", align: "right" }, { header: "Status" }],
    rows: d.purchaseOrders
      .filter((p) => p.status !== "Closed" && p.status !== "Cancelled")
      .sort((a, b) => a.expected.localeCompare(b.expected))
      .map((p) => {
        const late = -daysFrom(p.expected);
        const open = p.lines.filter((l) => l.received < l.ordered).length;
        return {
          id: p.id,
          cells: [<RecordLink id={p.id} />, p.vendor, date(p.expected, true), late > 0 ? <b className="rpt-risk">{late} d late</b> : p.status === "Received" ? <span className="t-muted">Received</span> : `due in ${-late} d`, open, inr(p.value), <Status>{p.status}</Status>],
          csv: [p.id, p.vendor, p.expected, late > 0 ? late : 0, open, p.value, p.status],
        };
      }),
    csvHeaders: ["PO", "Vendor", "Expected", "Days late", "Lines open", "Value (₹)", "Status"],
    note: "Ageing counts calendar days past the expected receipt date at report time.",
  }),
  "RPT-AST-01": (d) => {
    const by = new Map<string, ServiceTicket[]>();
    d.tickets.forEach((t) => by.set(t.customer, [...(by.get(t.customer) ?? []), t]));
    return {
      cols: [{ header: "Customer" }, { header: "Contract" }, { header: "Tickets", align: "right" }, { header: "Met", align: "right" }, { header: "Breached", align: "right" }, { header: "At risk now", align: "right" }, { header: "Attainment" }],
      rows: [...by.entries()].map(([customer, ts]) => {
        const closed = ts.filter((t) => t.status === "Resolved" || t.status === "Closed");
        const breached = ts.filter((t) => !closed.includes(t) && minutesUntil(t.slaDue) < 0).length;
        const atRisk = ts.filter((t) => !closed.includes(t) && minutesUntil(t.slaDue) >= 0 && minutesUntil(t.slaDue) < 360).length;
        const met = closed.length;
        const decided = met + breached;
        const att = decided ? (met / decided) * 100 : 0;
        const contract = d.contracts.find((c) => c.customer === customer);
        return {
          id: customer,
          cells: [customer, contract ? <RecordLink id={contract.id}>{contract.responseHours} h</RecordLink> : <span className="t-muted">None</span>, ts.length, met, breached, atRisk ? <b className="rpt-warn">{atRisk}</b> : 0, decided ? <span className="rpt-bar"><Progress value={att} tone={att >= 95 ? "ok" : "warn"} size="sm" /> {pct(att)}</span> : <span className="t-muted">No closures yet</span>],
          csv: [customer, contract?.id ?? "", ts.length, met, breached, atRisk, decided ? pct(att) : ""],
        };
      }),
    csvHeaders: ["Customer", "Contract", "Tickets", "Met", "Breached", "At risk now", "Attainment"],
    note: `Attainment = met ÷ (met + breached) for closed or breached tickets. "At risk" = open with under 6 h left at ${NOW.slice(11, 16)} IST.`,
    };
  },
  "RPT-HR-01": (d) => ({
    cols: [{ header: "Person" }, { header: "Role" }, { header: "Deployed to" }, { header: "Location" }, { header: "Until" }, { header: "Utilisation", align: "right" }],
    rows: d.people
      .filter((p) => p.assignment)
      .sort((a, b) => (a.assignmentUntil ?? "").localeCompare(b.assignmentUntil ?? ""))
      .map((p) => ({
        id: p.id,
        cells: [<RecordLink id={p.id}>{p.name}</RecordLink>, p.role, <RecordLink id={p.assignment!} />, p.location, p.assignmentUntil ? `${date(p.assignmentUntil, true)}${daysFrom(p.assignmentUntil) <= 7 ? " · ends soon" : ""}` : "—", pct(p.utilisation)],
        csv: [p.id, p.name, p.role, p.assignment ?? "", p.location, p.assignmentUntil ?? "", p.utilisation],
      })),
    csvHeaders: ["Employee", "Name", "Role", "Deployed to", "Location", "Until", "Utilisation %"],
    note: "No salary or rate data — the roster shows who is where, until when, against which record.",
  }),
  "RPT-CRM-01": (d) => {
    const open = d.opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost");
    const by = new Map<string, Opportunity[]>();
    open.forEach((o) => by.set(o.vertical, [...(by.get(o.vertical) ?? []), o]));
    const rows = [...by.entries()].map(([v, os]) => ({ v, os, value: os.reduce((a, o) => a + o.value, 0), w: os.reduce((a, o) => a + (o.value * o.probability) / 100, 0) })).sort((a, b) => b.w - a.w);
    const maxW = Math.max(...rows.map((r) => r.w), 1);
    return {
      cols: [{ header: "Vertical" }, { header: "Open deals", align: "right" }, { header: "Stages" }, { header: "Value", align: "right" }, { header: "Weighted" }, { header: "Next close" }],
      rows: rows.map((r) => ({
        id: r.v,
        cells: [r.v, r.os.length, r.os.map((o) => o.stage).join(", "), inr(r.value), <span className="rpt-bar"><Progress value={(r.w / maxW) * 100} size="sm" /> {inr(Math.round(r.w))}</span>, date(r.os.map((o) => o.closeDate).sort()[0], true)],
        csv: [r.v, r.os.length, r.os.map((o) => o.stage).join(" / "), r.value, Math.round(r.w), r.os.map((o) => o.closeDate).sort()[0]],
      })),
      total: ["All verticals", open.length, "", inr(open.reduce((a, o) => a + o.value, 0)), inr(Math.round(open.reduce((a, o) => a + (o.value * o.probability) / 100, 0))), ""],
      csvHeaders: ["Vertical", "Open deals", "Stages", "Value (₹)", "Weighted (₹)", "Next close"],
      note: "Weighted = value × stage probability. Won and lost deals are excluded.",
    };
  },
};

/** Proposed columns for reports whose sample layout isn't signed off yet (RPT-018). */
export const PROPOSED: Record<string, string[]> = {
  "RPT-PM-02": ["Project", "Milestone", "Gate", "Due", "Days late", "Billable value", "Blocking record"],
  "RPT-INV-03": ["Serial", "Item", "GRN", "QC result", "Issued to", "Work order", "Installed asset"],
  "RPT-SAL-01": ["Order", "Customer", "Order value", "Billed", "Unbilled", "Eligible milestones", "Advice status"],
  "RPT-AST-02": ["Instrument", "Custodian", "Due date", "Window", "Last certificate", "Status"],
  "RPT-INV-02": ["Item", "Location", "Opening", "Receipts", "Issues", "Closing", "Valuation"],
  "RPT-PAY-01": ["Employee", "Department", "Gross", "Deductions", "Net", "Bank status"],
  "RPT-USR-01": ["Time", "Actor", "Action", "Record", "Before", "After"],
};
