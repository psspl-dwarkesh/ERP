import { ApiError, defineCommand, mutate, type Db } from "../../api/client";
import { actorName, addAudit, nextId, requireLevel } from "../../api/command-kit";
import { TODAY } from "../../api/fixtures";
import { inr } from "../../api/format";
import type { Approval, QuoteLine, QuoteRevision, SalesOrder } from "../../api/types";
import { addDays } from "../projects/util";
import {
  ACCEPTABLE_STATUSES,
  DISCOUNT_AUTHORITY_PCT,
  QUOTE_VALIDITY_DAYS,
  discountApprovalTitle,
  discountPct,
  firstIssueValue,
  isLapsed,
  lineProblem,
  needsDiscountApproval,
  nextRevision,
  quoteValue,
  revisionApproval,
} from "./rules";

/**
 * E2E-10: a mismatch stops at "needs attention". This records who was asked to resolve it;
 * it never re-sends the advice or edits the accounting invoice.
 */
function escalateMismatchLocal(adviceId: string, resolution: "retention" | "reissue") {
  return mutate(
    (db) => {
      const ba = db.billingAdvices.find((b) => b.id === adviceId);
      if (!ba) throw new ApiError(`Billing advice ${adviceId} not found`, "NOT_FOUND");
      if (ba.status !== "Mismatch") throw new ApiError(`${adviceId} is ${ba.status}; only a mismatch can be escalated.`, "BLOCKED");
      return ba;
    },
    {
      action: resolution === "retention" ? "asked Finance owner to confirm 5% retention on" : "asked accounting to re-issue the invoice for",
      reference: adviceId,
      module: "sales",
    },
  );
}

/* ================================================================ Accounting outbox (E2E-10) */
const nowIso = () => new Date().toISOString();

/** Hand a queued posting to accounting. The key goes with it; the provider dedupes on it. */
export const sendPosting = defineCommand(
  "sales.sendPosting",
  (key: string) => ({ key }),
  (key: string) =>
    mutate(
      (db) => {
        const p = db.postings.find((x) => x.key === key);
        if (!p) throw new ApiError(`Posting ${key} not found`, "NOT_FOUND");
        if (p.state !== "Queued") throw new ApiError(`${key} is ${p.state.toLowerCase()}; only a queued posting is sent.`, "BLOCKED");
        Object.assign(p, { state: "Sent", attempts: p.attempts + 1, lastAttempt: nowIso(), lastError: undefined });
        return p;
      },
      { action: "sent to accounting", reference: key, module: "sales" },
    ),
);

/** Retry a failed send under the same key, so accounting can never post it twice. */
export const retryPosting = defineCommand(
  "sales.retryPosting",
  (key: string) => ({ key }),
  (key: string) =>
    mutate(
      (db) => {
        const p = db.postings.find((x) => x.key === key);
        if (!p) throw new ApiError(`Posting ${key} not found`, "NOT_FOUND");
        if (p.state !== "Failed") throw new ApiError(`${key} is ${p.state.toLowerCase()}. Only a failed transport is retried — a sent posting waits for its answer.`, "BLOCKED");
        Object.assign(p, { state: "Sent", attempts: p.attempts + 1, lastAttempt: nowIso(), lastError: undefined });
        return p;
      },
      { action: "retried with the same key", reference: key, module: "sales" },
    ),
);

/** Record accounting's answer. Equal amounts reconcile; a difference stops at Needs attention. */
export const recordAcknowledgement = defineCommand(
  "sales.recordAcknowledgement",
  (key: string, external: string, posted: number) => ({ key, external, posted }),
  (key: string, external: string, posted: number) =>
    mutate(
      (db) => {
        const p = db.postings.find((x) => x.key === key);
        if (!p) throw new ApiError(`Posting ${key} not found`, "NOT_FOUND");
        if (p.state !== "Sent") throw new ApiError(`${key} is ${p.state.toLowerCase()}; an acknowledgement answers a sent posting.`, "BLOCKED");
        if (external.trim().length < 4) throw new ApiError("Enter accounting's invoice or voucher number.", "VALIDATION");
        if (!Number.isFinite(posted) || posted <= 0) throw new ApiError("Enter the amount accounting posted.", "VALIDATION");
        Object.assign(p, { state: posted === p.amount ? "Acknowledged" : "Needs attention", posted, external: external.trim() });
        if (posted === p.amount) {
          const advice = db.billingAdvices.find((b) => b.id === p.advice);
          if (advice) advice.status = "Posted";
        }
        return p;
      },
      { action: "recorded accounting acknowledgement on", reference: key, module: "sales" },
    ),
);

/**
 * A mismatch is answered by a corrected advice under a new key, never by re-sending
 * the old one. The original stays as evidence, marked superseded.
 */
export const raiseCorrection = defineCommand(
  "sales.raiseCorrection",
  (key: string, amount: number, reason: string) => ({ key, amount, reason }),
  (key: string, amount: number, reason: string) =>
    mutate(
      (db) => {
        const p = db.postings.find((x) => x.key === key);
        if (!p) throw new ApiError(`Posting ${key} not found`, "NOT_FOUND");
        if (p.state !== "Needs attention") throw new ApiError(`Only a posting that needs attention is corrected; ${key} is ${p.state.toLowerCase()}.`, "BLOCKED");
        if (reason.trim().length < 12) throw new ApiError("Say why the amount changes (at least 12 characters). It goes on the corrected advice.", "VALIDATION");
        if (!Number.isFinite(amount) || amount <= 0) throw new ApiError("Enter the corrected amount.", "VALIDATION");
        const rev = Math.max(...db.postings.filter((x) => x.advice === p.advice).map((x) => Number(x.key.split("/R")[1]) || 1)) + 1;
        const next = { key: `${p.advice}/R${rev}`, advice: p.advice, party: p.party, projectId: p.projectId, state: "Queued" as const, attempts: 0, amount: Math.round(amount), supersedes: p.key, note: reason.trim() };
        db.postings.unshift(next);
        Object.assign(p, { state: "Superseded", supersededBy: next.key });
        return next;
      },
      { action: "raised a corrected advice superseding", reference: key, module: "sales" },
    ),
);

/** Put an approved advice in the outbox. An advice still in approval can't be posted. */
export const queuePosting = defineCommand(
  "sales.queuePosting",
  (adviceId: string) => ({ adviceId }),
  (adviceId: string) =>
    mutate(
      (db) => {
        const ba = db.billingAdvices.find((b) => b.id === adviceId);
        if (!ba) throw new ApiError(`Billing advice ${adviceId} not found`, "NOT_FOUND");
        if (db.postings.some((x) => x.advice === adviceId)) throw new ApiError(`${adviceId} is already in the outbox.`, "BLOCKED");
        const approval = db.approvals.find((a) => a.reference === adviceId);
        if (approval && approval.status !== "Approved") throw new ApiError(`${adviceId} is waiting on ${approval.level.split(" · ")[1] ?? "its approver"}. It can be posted once approved.`, "BLOCKED");
        const p = { key: `${adviceId}/R1`, advice: adviceId, party: ba.customer, state: "Queued" as const, attempts: 0, amount: ba.value, note: `${ba.trigger}. Queued under its key; nothing is sent until you send it.` };
        db.postings.unshift(p);
        ba.status = "Sent to accounting";
        return p;
      },
      { action: "queued for accounting", reference: adviceId, module: "sales" },
    ),
);

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const escalateMismatch = defineCommand("sales.escalateMismatch", (adviceId, resolution) => ({ adviceId, resolution }), escalateMismatchLocal);

/* ================================================================ Quotation → order (E2E-01) */
/* Same rules as server/src/commands/commercial-flow.ts; both import ./rules. */

function quoteFor(db: Db, quotationId: string) {
  const q = db.quotations.find((x) => x.id === quotationId);
  if (!q) throw new ApiError(`Quotation ${quotationId} not found`, "NOT_FOUND");
  return q;
}
const approverOf = (a: Approval) => a.level.split(" · ")[1] ?? "its approver";

export interface RevisionChanges {
  lines: QuoteLine[];
  validUntil?: string;
}

/**
 * SAL-003/019: a new revision (A → B …). The previous one is kept as it stood, marked
 * superseded. A price more than the owner's authority below the first issue goes to the
 * Operations head and the revision waits In review.
 */
export const reviseQuotation = defineCommand(
  "sales.reviseQuotation",
  (quotationId: string, changes: RevisionChanges, reason: string) => ({ quotationId, changes, reason }),
  (quotationId: string, changes: RevisionChanges, reason: string) =>
    mutate((db) => {
      requireLevel("sales", "edit");
      const q = quoteFor(db, quotationId);
      if (q.status === "Accepted") throw new ApiError(`${q.id} rev ${q.revision} was accepted and is now fixed. Changes go through an order amendment.`, "BLOCKED");
      if (reason.trim().length < 10) throw new ApiError("Say what changed and why (at least 10 characters). It stays on the revision.", "VALIDATION");
      const pending = revisionApproval(q, db.approvals);
      if (pending?.status === "Pending") throw new ApiError(`Rev ${q.revision} is waiting on ${approverOf(pending)} (${pending.id}). Decide it before issuing another revision.`, "BLOCKED");
      const next = nextRevision(q.revision);
      if (!next) throw new ApiError(`${q.id} has reached rev Z. Start a fresh quotation from the opportunity.`, "BLOCKED");
      const problem = lineProblem(changes.lines);
      if (problem) throw new ApiError(problem, "VALIDATION");
      const lines = changes.lines.map((l) => ({ ...l, description: l.description.trim(), rate: Math.round(l.rate) }));
      const validUntil = changes.validUntil ?? addDays(TODAY, QUOTE_VALIDITY_DAYS);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw new ApiError("Use a date as YYYY-MM-DD", "VALIDATION");
      if (validUntil < TODAY) throw new ApiError("Validity must run to today or later.", "VALIDATION");
      const value = quoteValue(lines);
      const firstIssue = firstIssueValue(q);
      const gated = needsDiscountApproval(firstIssue, value);

      const superseded: QuoteRevision = { revision: q.revision, value: q.value, validUntil: q.validUntil, wasStatus: q.status, supersededAt: nowIso(), supersededBy: actorName() };
      if (q.revisionNote) superseded.note = q.revisionNote;
      if (q.lines?.length) superseded.lines = q.lines;
      Object.assign(q, { revisions: [...(q.revisions ?? []), superseded], revision: next, value, validUntil, status: gated ? "In review" : "Draft", revisionNote: reason.trim(), lines });

      let approvalId: string | undefined;
      if (gated) {
        approvalId = nextId(db.approvals.map((a) => a.id), "APR");
        const pct = discountPct(firstIssue, value);
        db.approvals.unshift({
          id: approvalId,
          type: "Quotation discount",
          module: "sales",
          reference: q.id,
          title: discountApprovalTitle(q, next),
          maker: actorName(),
          value: `${inr(value)} · ${pct}% below first issue`,
          submitted: nowIso(),
          level: "Level 1 of 1 · Operations head",
          status: "Pending",
          evidence: [reason.trim(), `First issue ${inr(firstIssue)} → rev ${next} ${inr(value)}; owner's authority is ${DISCOUNT_AUTHORITY_PCT}%`, `${q.customer} · valid until ${validUntil}`],
        });
      }
      const o = db.opportunities.find((x) => x.id === q.opportunityId);
      if (o) Object.assign(o, { nextAction: gated ? `Rev ${next} discount waiting on Operations head` : `Send ${q.id} rev ${next} to ${q.customer}`, nextActionDue: addDays(TODAY, 2) });
      addAudit(db, `issued rev ${next} superseding rev ${superseded.revision}${gated ? ", discount sent for approval" : ""}:`, q.id, "sales");
      return { quotation: q, approvalId };
    }),
);

/** Draft (or an approved In-review revision) → Sent. Nothing is e-mailed; this records that it went. */
export const sendQuotation = defineCommand(
  "sales.sendQuotation",
  (quotationId: string) => ({ quotationId }),
  (quotationId: string) =>
    mutate((db) => {
      requireLevel("sales", "edit");
      const q = quoteFor(db, quotationId);
      if (q.status !== "Draft" && q.status !== "In review") throw new ApiError(`${q.id} rev ${q.revision} is ${q.status.toLowerCase()}; only a draft or an approved revision is sent.`, "BLOCKED");
      if (isLapsed(q, TODAY)) throw new ApiError(`Rev ${q.revision} lapsed on ${q.validUntil}. Issue a new revision with refreshed prices.`, "BLOCKED");
      const a = revisionApproval(q, db.approvals);
      if (a?.status === "Pending") throw new ApiError(`Rev ${q.revision} can't be sent while its discount waits on ${approverOf(a)} (${a.id}).`, "BLOCKED");
      if (a?.status === "Rejected") throw new ApiError(`The discount on rev ${q.revision} was rejected (${a.id}). Issue a revision within the ${DISCOUNT_AUTHORITY_PCT}% authority.`, "BLOCKED");
      q.status = "Sent";
      const o = db.opportunities.find((x) => x.id === q.opportunityId);
      if (o) Object.assign(o, { nextAction: `Follow up ${q.id} rev ${q.revision} with ${q.customer}`, nextActionDue: addDays(TODAY, 5) });
      addAudit(db, `sent rev ${q.revision} to ${q.customer}:`, q.id, "sales");
      return q;
    }),
);

/**
 * SAL-004/005: the customer's acceptance of the sent revision becomes a sales order at the
 * quoted value with their PO reference. The opportunity is won; the revision is fixed.
 */
export const recordAcceptance = defineCommand(
  "sales.recordAcceptance",
  (quotationId: string, customerPo: string, acceptedOn: string) => ({ quotationId, customerPo, acceptedOn }),
  (quotationId: string, customerPo: string, acceptedOn: string) =>
    mutate((db) => {
      requireLevel("sales", "edit");
      const q = quoteFor(db, quotationId);
      if (q.status === "Accepted") throw new ApiError(`${q.id} rev ${q.revision} was already accepted.`, "BLOCKED");
      if (!ACCEPTABLE_STATUSES.includes(q.status)) throw new ApiError(`${q.id} rev ${q.revision} is ${q.status.toLowerCase()}. The customer can only accept a revision that was sent.`, "BLOCKED");
      const po = customerPo.trim();
      if (po.length < 3) throw new ApiError("Enter the customer's PO or contract reference.", "VALIDATION");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(acceptedOn)) throw new ApiError("Use a date as YYYY-MM-DD", "VALIDATION");
      if (acceptedOn > TODAY) throw new ApiError("Acceptance can't be dated in the future.", "VALIDATION");
      if (isLapsed(q, acceptedOn)) throw new ApiError(`Rev ${q.revision} lapsed on ${q.validUntil}. Issue a new revision with refreshed prices before recording acceptance.`, "BLOCKED");
      const a = revisionApproval(q, db.approvals);
      if (a?.status === "Pending") throw new ApiError(`Rev ${q.revision}'s discount is still waiting on ${approverOf(a)} (${a.id}).`, "BLOCKED");
      if (a?.status === "Rejected") throw new ApiError(`The discount on rev ${q.revision} was rejected (${a.id}). It can't be accepted at this price.`, "BLOCKED");
      const dupe = db.salesOrders.find((o) => o.customer === q.customer && o.customerPo === po);
      if (dupe) throw new ApiError(`PO ${po} is already booked on ${dupe.id}. Check the reference with ${q.customer}.`, "BLOCKED");

      const order: SalesOrder = { id: nextId(db.salesOrders.map((o) => o.id), "SO"), quotationId: q.id, customer: q.customer, title: q.title, value: q.value, billed: 0, booked: acceptedOn, status: "Confirmed", owner: q.owner, customerPo: po, acceptedOn };
      q.status = "Accepted";
      db.salesOrders.unshift(order);
      const o = db.opportunities.find((x) => x.id === q.opportunityId);
      if (o) {
        Object.assign(o, { stage: "Won", probability: 100, nextAction: `Open the project from ${order.id}`, nextActionDue: addDays(TODAY, 2) });
        addAudit(db, `won — ${q.id} rev ${q.revision} accepted as ${order.id}:`, o.id, "crm");
      }
      addAudit(db, `recorded acceptance of rev ${q.revision} on PO ${po}:`, q.id, "sales");
      addAudit(db, `booked from ${q.id} rev ${q.revision} at ${inr(q.value)}:`, order.id, "sales");
      return { quotation: q, order };
    }),
);
