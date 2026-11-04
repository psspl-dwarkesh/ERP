/**
 * Commercial rules for quotations (E2E-01, SAL-002/003/019). Pure functions with no
 * browser or database dependency: the in-browser commands and the API commands in
 * server/src/commands/commercial-flow.ts import this same file, so both apply
 * identical rules.
 */
import type { BillingType, Quotation, QuoteLine } from "../../api/types";

export const BILLING_TYPES: BillingType[] = ["Material", "Engineering", "Commissioning", "AMC"];

/** The quotation owner may discount up to this much; beyond it the Operations head approves (SAL-019). */
export const DISCOUNT_AUTHORITY_PCT = 5;

/** A new quotation or revision is valid for this many days unless a date is given. */
export const QUOTE_VALIDITY_DAYS = 30;

/** Statuses of a quotation still in play: while one exists, the opportunity can't start another. */
export const OPEN_QUOTE_STATUSES: Quotation["status"][] = ["Draft", "Sent", "In review"];

/** The customer can only accept what they were sent. */
export const ACCEPTABLE_STATUSES: Quotation["status"][] = ["Sent", "In review"];

export const lineValue = (l: Pick<QuoteLine, "qty" | "rate">) => Math.round(l.qty * l.rate);
export const quoteValue = (lines: Pick<QuoteLine, "qty" | "rate">[]) => lines.reduce((a, l) => a + lineValue(l), 0);

/** First problem with a set of lines, written for the person editing them; null when they are fine. */
export function lineProblem(lines: QuoteLine[]): string | null {
  if (!lines.length) return "Add at least one priced line.";
  if (lines.length > 50) return "A quotation holds at most 50 lines. Group minor items.";
  for (const [i, l] of lines.entries()) {
    const n = `Line ${i + 1}`;
    if (l.description.trim().length < 3) return `${n}: describe what is being quoted.`;
    if (!BILLING_TYPES.includes(l.billing)) return `${n}: choose how it bills — material, engineering, commissioning or AMC.`;
    if (!Number.isFinite(l.qty) || l.qty <= 0) return `${n}: quantity must be more than zero.`;
    if (!Number.isFinite(l.rate) || l.rate <= 0) return `${n}: enter a rate in rupees.`;
  }
  return null;
}

/** A → B → … → Z. Null after Z: a 27th revision means the quotation should be re-issued. */
export function nextRevision(rev: string): string | null {
  const c = rev.toUpperCase().charCodeAt(0);
  return c >= 65 && c < 90 ? String.fromCharCode(c + 1) : null;
}

/**
 * Discount of a revision against the first issue (rev A), so a price can't be walked
 * down in steps that each stay inside the owner's authority. One decimal.
 */
export function discountPct(firstIssueValue: number, value: number) {
  if (firstIssueValue <= 0 || value >= firstIssueValue) return 0;
  return Math.round(((firstIssueValue - value) / firstIssueValue) * 1000) / 10;
}

export const needsDiscountApproval = (firstIssueValue: number, value: number) => discountPct(firstIssueValue, value) > DISCOUNT_AUTHORITY_PCT;

/** Value of the first issue: rev A from history, or the current value if this is still rev A or history predates capture. */
export function firstIssueValue(q: Pick<Quotation, "value" | "revisions">) {
  return q.revisions?.find((r) => r.revision === "A")?.value ?? q.revisions?.[0]?.value ?? q.value;
}

/** Title of the discount approval for one revision. The revision letter ties approval to revision. */
export const discountApprovalTitle = (q: Pick<Quotation, "title">, revision: string) => `Discount on ${q.title} · Rev ${revision}`;

/** The approval decision that governs the current revision, if it needed one. */
export function revisionApproval<A extends { reference: string; title: string; status: string }>(q: Pick<Quotation, "id" | "title" | "revision">, approvals: A[]): A | undefined {
  const title = discountApprovalTitle(q, q.revision);
  return approvals.find((a) => a.reference === q.id && a.title === title);
}

/** Validity has lapsed when the date is before `on`. */
export const isLapsed = (q: { validUntil: string; status: string }, on: string) => q.status === "Expired" || q.validUntil < on;
