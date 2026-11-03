import { TODAY } from "../../api/fixtures";
import { navigate } from "../../app/router";
import type { Approval, PurchaseOrder, PurchaseRequest, Rfq, SupplierQuote, Tone, Vendor } from "../../api/types";

const DAY = 86400000;

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);
}

/** Purchases above this value need the operations head; below it, the purchase head. */
export const OPS_HEAD_THRESHOLD = 200000;

export function approverFor(value: number) {
  return value > OPS_HEAD_THRESHOLD ? { role: "Operations head", person: "Arjun Mehta" } : { role: "Purchase head", person: undefined };
}

/**
 * The shared decideApproval command only writes back to PR-0084, so for any other
 * requisition the decided approval is the source of truth.
 */
export function prStatus(pr: PurchaseRequest, approvals: Approval[]): PurchaseRequest["status"] {
  if (pr.status !== "Awaiting approval") return pr.status;
  const a = approvals.find((x) => x.reference === pr.id);
  if (a && a.status === "Approved") return "Approved";
  if (a && a.status === "Rejected") return "Rejected";
  return pr.status;
}

/* ------------------------------------------------------------ RFQ evaluation */
export interface QuoteEval {
  q: SupplierQuote;
  vendor?: Vendor;
  arrival: string;
  lateBy: number; // days after need-by, 0 if on time
  priceDelta: number; // vs lowest
  lowest: boolean;
  fastest: boolean;
  fullFit: boolean;
}

export function evaluateRfq(rfq: Rfq, needBy: string | undefined, vendors: Vendor[]) {
  const minPrice = Math.min(...rfq.quotes.map((q) => q.price));
  const minLead = Math.min(...rfq.quotes.map((q) => q.leadDays));
  const evals: QuoteEval[] = rfq.quotes.map((q) => {
    const arrival = addDays(TODAY, q.leadDays);
    const lateBy = needBy ? Math.max(0, daysBetween(needBy, arrival)) : 0;
    return {
      q,
      vendor: vendors.find((v) => v.id === q.vendorId),
      arrival,
      lateBy,
      priceDelta: q.price - minPrice,
      lowest: q.price === minPrice,
      fastest: q.leadDays === minLead,
      fullFit: q.technicalFit === "Full",
    };
  });

  // Fit first (a deviation needs engineering approval before it can be ordered),
  // then lateness against the need-by date, then price, then vendor on-time record.
  const fitRank = (e: QuoteEval) => (e.q.technicalFit === "Full" ? 0 : e.q.technicalFit === "Partial" ? 1 : 2);
  const ranked = [...evals].sort((a, b) => fitRank(a) - fitRank(b) || a.lateBy - b.lateBy || a.q.price - b.q.price || (b.vendor?.onTimeRate ?? 0) - (a.vendor?.onTimeRate ?? 0));
  const rec = ranked[0];
  return { evals, rec, reason: recommendationReason(rec, evals, needBy) };
}

function recommendationReason(rec: QuoteEval | undefined, evals: QuoteEval[], needBy?: string) {
  if (!rec) return "";
  if (evals.length === 1) return `Only ${rec.q.vendor} quoted, so an award needs a single-source justification.`;
  const lowest = evals.find((e) => e.lowest)!;
  const timing = rec.lateBy === 0 ? "lands before the need-by date" : `lands ${fmt(rec.arrival)}, ${rec.lateBy} day${rec.lateBy === 1 ? "" : "s"} after the ${needBy ? fmt(needBy) : ""} need-by — the earliest of any compliant quote`;
  const fit = rec.fullFit ? "is a full technical fit" : `is the closest technical fit (${rec.q.technicalFit.toLowerCase()})`;
  let price: string;
  if (rec === lowest) price = "and is also the lowest price";
  else {
    const why = !lowest.fullFit ? `which ${lowest.q.technicalFit === "Deviation" ? "offers a deviation that needs design approval" : "only partly meets the specification"}` : `which lands ${lowest.lateBy - rec.lateBy} days later`;
    price = `and costs ${inr(rec.priceDelta)} more than ${lowest.q.vendor}, ${why}`;
  }
  return `${rec.q.vendor} ${fit}, ${timing}, ${price}.`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
function inr(v: number) {
  return v >= 1e5 ? `₹${(v / 1e5).toFixed(2)} L` : `₹${v.toLocaleString("en-IN")}`;
}

export const fitTone = (f: SupplierQuote["technicalFit"]): Tone => (f === "Full" ? "ok" : f === "Partial" ? "warn" : "risk");

/* ------------------------------------------------------------ PO receipts */
export function poTotals(po: PurchaseOrder) {
  const ordered = po.lines.reduce((s, l) => s + l.ordered, 0);
  const received = po.lines.reduce((s, l) => s + l.received, 0);
  const rejected = po.lines.reduce((s, l) => s + l.rejected, 0);
  const accepted = received - rejected;
  const outstanding = po.lines.reduce((s, l) => s + Math.max(0, l.ordered - l.received), 0);
  return { ordered, received, rejected, accepted, outstanding };
}

export function poOverdue(po: PurchaseOrder) {
  if (po.status === "Received" || po.status === "Closed" || po.status === "Cancelled") return 0;
  return Math.max(0, daysBetween(po.expected, TODAY));
}

/** Opens a record over the current tab, so closing returns to the same list. */
export function openRecord(id: string, tab: string) {
  navigate(`/app/purchase/${encodeURIComponent(id)}?tab=${tab}`);
}

/** Split a free-text source like "BOM-042 rev C shortage" into text and record ids. */
export function splitRefs(text: string) {
  return text.split(/([A-Z]{2,4}-\d{3,4})/g).filter(Boolean).map((t) => ({ text: t, isId: /^[A-Z]{2,4}-\d{3,4}$/.test(t) }));
}
