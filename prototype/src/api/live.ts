/**
 * Live updates (API mode only). The server pushes "something changed" after every
 * committed command; we refetch, and tell the user when someone else did it.
 */
import { useEffect, useSyncExternalStore } from "react";
import { invalidate, API_MODE } from "./store";
import type { ModuleKey } from "./types";

export interface LiveChange {
  command: string;
  module: ModuleKey;
  actor: string;
  actorId: string;
  at: string;
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
let online = 0;
const onlineSubs = new Set<() => void>();
const changeSubs = new Set<(c: LiveChange) => void>();

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      onlineSubs.add(cb);
      return () => onlineSubs.delete(cb);
    },
    () => online,
  );
}

export function onRemoteChange(fn: (c: LiveChange) => void) {
  changeSubs.add(fn);
  return () => {
    changeSubs.delete(fn);
  };
}

/** Keep one event stream open while signed in; EventSource reconnects by itself. */
export function useLiveUpdates(userId: string | null) {
  useEffect(() => {
    if (API_MODE !== "remote" || !userId || typeof EventSource === "undefined") return;
    const es = new EventSource(`${BASE}/api/events`, { withCredentials: true });
    const setOnline = (n: number) => {
      online = n;
      onlineSubs.forEach((f) => f());
    };
    es.addEventListener("presence", (e) => setOnline(JSON.parse((e as MessageEvent).data).online ?? 0));
    es.addEventListener("ready", (e) => setOnline(JSON.parse((e as MessageEvent).data).online ?? 0));
    es.addEventListener("change", (e) => {
      const c = JSON.parse((e as MessageEvent).data) as LiveChange;
      if (c.actorId === userId) return; // our own command already refreshed the screen
      invalidate();
      changeSubs.forEach((f) => f(c));
    });
    return () => {
      es.close();
      setOnline(0);
    };
  }, [userId]);
}

/** "inventory.issueStock" → "issued stock". Short, human, for the notice. */
export function describe(command: string) {
  const verb: Record<string, string> = {
    "approvals.decide": "decided an approval",
    "inventory.issueStock": "issued stock",
    "inventory.decideQc": "recorded a QC decision",
    "inventory.advanceWorkOrder": "moved a work order on",
    "inventory.reconcileSubcontract": "reconciled subcontract material",
    "inventory.closeSubcontract": "submitted a subcontract reconciliation",
    "purchase.awardRfq": "awarded an RFQ",
    "purchase.raisePurchaseOrder": "raised a purchase order",
    "purchase.recordReceipt": "recorded a goods receipt",
    "purchase.createRequest": "created a requisition",
    "purchase.submitRequisition": "submitted a requisition",
    "assets.updateTicket": "updated a service ticket",
    "assets.resolveTicket": "resolved a service ticket",
    "crm.moveOpportunity": "moved an opportunity",
    "crm.createOpportunity": "created an opportunity",
    "sales.sendPosting": "sent a posting to accounting",
    "sales.retryPosting": "retried a posting",
    "sales.raiseCorrection": "raised a corrected advice",
    "hr.decideLeave": "decided a leave request",
    "hr.completeExitItem": "closed an exit checklist line",
    "projects.raiseChangeRequest": "raised a change request",
  };
  return verb[command] ?? "made a change";
}
