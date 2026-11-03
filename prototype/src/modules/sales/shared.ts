import { daysFrom } from "../../api/format";
import type { Approval, BillingAdvice, Milestone, Project, Quotation, SalesOrder } from "../../api/types";

export const unbilled = (o: SalesOrder) => Math.max(0, o.value - o.billed);
export const billedPct = (o: SalesOrder) => (o.value ? Math.round((o.billed / o.value) * 100) : 0);

/** What the approval trail says about an advice, layered over its stored status. */
export function adviceStatus(ba: BillingAdvice, approvals: Approval[]): string {
  const a = approvals.find((x) => x.reference === ba.id);
  if (a?.status === "Approved" && ba.status === "Ready for review") return "Approved";
  if (a?.status === "Rejected") return "Rejected";
  return ba.status;
}

/** Illustrative accounting-side facts. The accounting system and its interface are undecided (SAL-013, SYS-06). */
export const ACCOUNTING: Record<string, { ref?: string; value?: number; note: string }> = {
  "BA-0061": { ref: "ACC-INV/26-27/0391", value: 1455000, note: "Invoice reference received from accounting; amounts agree." },
  "BA-0064": { note: "Sent 01 Oct. Waiting for the accounting invoice reference." },
  "BA-0060": { ref: "ACC-INV/26-27/0418", value: 1246400, note: "Accounting invoiced ₹65,600 less than the advice." },
  "BA-0063": { note: "Not sent. Finance owner review comes first." },
};

export const MISMATCH = {
  id: "BA-0060",
  adviceValue: 1312000,
  invoiceValue: 1246400,
  cause: "Accounting held back 5% retention when it raised the invoice. SO-0188 has no retention term recorded, so Threadline expected the full milestone value.",
  detected: "2026-10-12",
};

export type MilestoneBilling = { label: string; tone: "ok" | "warn" | "risk" | "info" | "neutral" | "accent"; adviceId?: string };

/** Billing state of each project milestone, read from milestone status and advices — never typed by hand. */
export function milestoneBilling(project: Project, advices: BillingAdvice[], approvals: Approval[]): (Milestone & { billing: MilestoneBilling })[] {
  let cumulative = 0;
  return project.milestones.map((m) => {
    const ba = advices.find((b) => b.trigger.startsWith(`${m.id} `));
    let billing: MilestoneBilling;
    if (!m.billable) billing = { label: "Not a billing milestone", tone: "neutral" };
    else if (ba) {
      const s = adviceStatus(ba, approvals);
      billing = { label: s === "Posted" ? "Billed" : s === "Mismatch" ? "Mismatch" : s === "Ready for review" ? "Advice in review" : s, tone: s === "Posted" ? "ok" : s === "Mismatch" || s === "Rejected" ? "risk" : s === "Ready for review" ? "warn" : "info", adviceId: ba.id };
    } else if (m.status === "Done") {
      cumulative += m.billable;
      billing = cumulative <= project.billed ? { label: "Billed", tone: "ok" } : { label: "Eligible — raise advice", tone: "warn" };
    } else if (m.status === "Late" || m.status === "Blocked") billing = { label: `Not earned · ${m.status.toLowerCase()}`, tone: "risk" };
    else billing = { label: "Not yet earned", tone: "neutral" };
    if (ba && m.status === "Done" && m.billable) cumulative += m.billable;
    return { ...m, billing };
  });
}

/** Quotation validity: flags anything that is still open and expires within 21 days. */
export function validity(q: Quotation): { label: string; tone: "warn" | "risk" | "neutral" } {
  const d = daysFrom(q.validUntil);
  if (q.status === "Accepted") return { label: "Accepted", tone: "neutral" };
  if (d < 0) return { label: `Lapsed ${-d} d ago`, tone: "risk" };
  if (d <= 21) return { label: `Expires in ${d} d`, tone: "warn" };
  return { label: `${d} days left`, tone: "neutral" };
}

/** Illustrative revision trail and commercial gate per quotation (E2E-01 step 3–4). */
export const QUOTE_DETAIL: Record<string, { discount: number; authority: number; changes: Record<string, string>; lines?: { kind: "Material" | "Service" | "AMC"; text: string; value: number }[] }> = {
  "QUO-0221": {
    discount: 3,
    authority: 5,
    changes: { A: "First issue after URS sign-off", B: "Added SAT support days; customer PO raised against this revision" },
    lines: [
      { kind: "Material", text: "PLC, I/O, field instruments and panel", value: 2910000 },
      { kind: "Service", text: "Engineering, FAT, installation and SAT", value: 1940000 },
    ],
  },
  "QUO-0237": {
    discount: 8,
    authority: 5,
    changes: { A: "First issue — 4 preventive visits, 6 h response" },
    lines: [
      { kind: "AMC", text: "Annual support cover — breakdown response 6 h", value: 690000 },
      { kind: "Service", text: "Preventive visits × 4", value: 440000 },
      { kind: "Material", text: "Critical spares kit", value: 110000 },
    ],
  },
  "QUO-0240": { discount: 4, authority: 5, changes: { A: "First issue — IP54 enclosures", B: "Customer asked for IP65 enclosures", C: "Revised delivery to 3 lots; price unchanged" } },
  "QUO-0242": { discount: 0, authority: 5, changes: { A: "Draft — technical proposal in preparation" } },
};
