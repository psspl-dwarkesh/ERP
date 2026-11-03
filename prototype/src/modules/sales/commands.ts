import { ApiError, mutate } from "../../api/client";

/**
 * E2E-10: a mismatch stops at "needs attention". This records who was asked to resolve it;
 * it never re-sends the advice or edits the accounting invoice.
 */
export function escalateMismatch(adviceId: string, resolution: "retention" | "reissue") {
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
