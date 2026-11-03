import { ApiError, defineCommand, mutate } from "../../api/client";

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
