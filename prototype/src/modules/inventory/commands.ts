/**
 * Inventory & Assembly commands that the shared mock API does not cover.
 * Each mirrors a future POST and goes through mutate(), so it is audited, persisted
 * and every screen refetches. Throw ApiError to reject.
 */
import { ApiError, api, mutate, type Db } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import type { StockMovement } from "../../api/types";

const ME = "Arjun Mehta";

function nextMovementId(db: Db) {
  return `MOV-${String(932 + db.movements.length).padStart(4, "0")}`;
}

/** QC decision on quarantined stock (INV-005). Release goes through the shared API, then relocates the stock. */
export async function decideQc(itemId: string, decision: "release" | "reject", note: string) {
  if (decision === "reject" && note.trim().length < 8) {
    throw new ApiError("Say why the lot is rejected (at least 8 characters) so the supplier return has a reason.", "VALIDATION");
  }
  if (decision === "release") {
    const qty = (await api.items()).find((i) => i.id === itemId)?.quarantined ?? 0;
    await api.releaseFromQc(itemId, true);
    return mutate(
      (db) => {
        const item = db.items.find((i) => i.id === itemId);
        if (!item) throw new ApiError(`Item ${itemId} not found`, "NOT_FOUND");
        item.warehouse = "Central warehouse";
        item.bin = "A-11";
        const receipt = db.movements.find((m) => m.itemId === itemId && m.status === "Blocked");
        if (receipt) receipt.status = "Posted";
        // The next requirements run sees the released stock as free.
        const free = Math.max(0, item.onHand - item.reserved - item.quarantined);
        db.boms.forEach((b) => b.lines.forEach((l) => l.itemId === itemId && (l.available = free)));
        return { qty, item };
      },
      undefined,
      0,
    );
  }
  return mutate(
    (db) => {
      const item = db.items.find((i) => i.id === itemId);
      if (!item) throw new ApiError(`Item ${itemId} not found`, "NOT_FOUND");
      if (!item.quarantined) throw new ApiError(`${item.id} has nothing on QC hold.`, "BLOCKED");
      const qty = item.quarantined;
      const receipt = db.movements.find((m) => m.itemId === itemId && m.status === "Blocked");
      const mv: StockMovement = {
        id: nextMovementId(db),
        type: "Return",
        itemId,
        item: item.name,
        qty: -qty,
        from: "QC bay",
        to: receipt?.from ?? "Supplier",
        reference: receipt ? receipt.reference : "QC rejection",
        at: new Date().toISOString(),
        by: ME,
        status: "Pending",
      };
      db.movements.unshift(mv);
      item.onHand -= qty;
      item.quarantined = 0;
      item.status = item.onHand - item.reserved > 0 ? "Available" : "Out of stock";
      item.lastMovement = TODAY;
      return { qty, item, movement: mv };
    },
    { action: "rejected at QC and raised a supplier return for", reference: itemId, module: "inventory" },
  );
}

/** Site acknowledges an in-transit transfer (INV-007). Until then it belongs to neither store. */
export function acknowledgeTransfer(movementId: string) {
  return mutate(
    (db) => {
      const mv = db.movements.find((m) => m.id === movementId);
      if (!mv) throw new ApiError(`Movement ${movementId} not found`, "NOT_FOUND");
      if (mv.status !== "In transit") throw new ApiError(`${mv.id} is ${mv.status.toLowerCase()}, not in transit.`, "BLOCKED");
      mv.status = "Posted";
      return mv;
    },
    { action: "acknowledged receipt at site of", reference: movementId, module: "inventory" },
  );
}

export interface CountLine {
  itemId: string;
  system: number;
  counted: number;
  reason: string;
}

/** Submit a count session: every variance becomes a pending adjustment that someone else approves (INV-024). */
export function submitCount(sessionId: string, lines: CountLine[]) {
  return mutate(
    (db) => {
      const missing = lines.filter((l) => Number.isNaN(l.counted));
      if (missing.length) throw new ApiError(`${missing.length} line${missing.length > 1 ? "s are" : " is"} not counted yet.`, "VALIDATION");
      const noReason = lines.filter((l) => l.counted !== l.system && !l.reason);
      if (noReason.length) throw new ApiError("Every variance needs a reason while the count is fresh.", "VALIDATION");
      const created: StockMovement[] = [];
      for (const l of lines) {
        if (l.counted === l.system) continue;
        const item = db.items.find((i) => i.id === l.itemId);
        if (!item) continue;
        const mv: StockMovement = {
          id: nextMovementId(db),
          type: "Adjustment",
          itemId: item.id,
          item: item.name,
          qty: l.counted - l.system,
          from: item.warehouse,
          to: `Count variance · ${l.reason}`,
          reference: sessionId,
          at: new Date().toISOString(),
          by: "Imran Sheikh",
          status: "Pending",
        };
        db.movements.unshift(mv);
        created.push(mv);
      }
      return created;
    },
    { action: "submitted count session", reference: sessionId, module: "inventory" },
  );
}

/** Approve or send back a pending adjustment. Approval posts it; the row is never edited afterwards. */
export function decideAdjustment(movementId: string, approve: boolean, note: string) {
  return mutate(
    (db) => {
      const mv = db.movements.find((m) => m.id === movementId);
      if (!mv) throw new ApiError(`Movement ${movementId} not found`, "NOT_FOUND");
      if (mv.status !== "Pending") throw new ApiError(`${mv.id} is already ${mv.status.toLowerCase()}.`, "BLOCKED");
      if (mv.by === ME) throw new ApiError("You counted this stock, so you can't approve its variance.", "BLOCKED");
      if (!approve && note.trim().length < 8) throw new ApiError("Say what the recount should check (at least 8 characters).", "VALIDATION");
      const item = db.items.find((i) => i.id === mv.itemId);
      if (approve && item) {
        if (item.onHand + mv.qty < item.reserved) {
          throw new ApiError(`Posting would leave ${item.id} with less on hand than is reserved. Release a reservation first.`, "BLOCKED");
        }
        item.onHand += mv.qty;
        item.lastMovement = TODAY;
      }
      mv.status = approve ? "Posted" : "Blocked";
      return mv;
    },
    { action: approve ? "approved count adjustment" : "sent back for recount", reference: movementId, module: "inventory" },
  );
}

/** Record the production QC result on a work order in testing (INV-020, INV-030). */
export function recordWorkOrderQc(woId: string, result: "Passed" | "Failed", note: string) {
  return mutate(
    (db) => {
      const wo = db.workOrders.find((w) => w.id === woId);
      if (!wo) throw new ApiError(`Work order ${woId} not found`, "NOT_FOUND");
      const testing = wo.stages.find((s) => s.key === "testing");
      if (testing?.status !== "Active") throw new ApiError("QC can only be recorded while the panel is in testing.", "BLOCKED");
      if (result === "Failed" && note.trim().length < 8) throw new ApiError("Describe the defect so rework can start (at least 8 characters).", "VALIDATION");
      wo.qc = result;
      if (result === "Failed") testing.note = `Rework: ${note.trim()}`;
      return wo;
    },
    { action: `recorded QC ${result.toLowerCase()} on`, reference: woId, module: "inventory" },
  );
}
