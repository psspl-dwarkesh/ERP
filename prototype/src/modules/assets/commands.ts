/**
 * Assets & Service commands the shared mock API does not cover. Each goes through
 * mutate(): audited, persisted, and every screen refetches. Throw ApiError to reject.
 */
import { ApiError, mutate } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import type { StockMovement } from "../../api/types";

const ME = "Arjun Mehta";

export interface SpareUse {
  itemId: string;
  qty: number;
}

/**
 * Resolve a ticket from the field worksheet (AST-015, AST-016). A resolution note is required,
 * and every spare consumed posts an Issue movement against the ticket so stock and visit agree.
 */
export function resolveTicket(id: string, note: string, spares: SpareUse[]) {
  return mutate(
    (db) => {
      const t = db.tickets.find((x) => x.id === id);
      if (!t) throw new ApiError(`Ticket ${id} not found`, "NOT_FOUND");
      if (t.status !== "On site") throw new ApiError("Only a visit that is on site can be resolved.", "BLOCKED");
      if (note.trim().length < 12) throw new ApiError("Write what was found and done (at least 12 characters). It goes on the customer's visit report.", "VALIDATION");
      for (const s of spares) {
        const item = db.items.find((i) => i.id === s.itemId);
        if (!item) throw new ApiError(`Spare ${s.itemId} not found`, "NOT_FOUND");
        const free = item.onHand - item.reserved - item.quarantined;
        if (s.qty > free) throw new ApiError(`Only ${free} ${item.uom} of ${item.id} free. Return the extra to stores or raise a site issue first.`, "BLOCKED");
      }
      for (const s of spares) {
        const item = db.items.find((i) => i.id === s.itemId)!;
        item.onHand -= s.qty;
        item.lastMovement = TODAY;
        const mv: StockMovement = {
          id: `MOV-${String(932 + db.movements.length).padStart(4, "0")}`,
          type: "Issue",
          itemId: item.id,
          item: item.name,
          qty: s.qty,
          from: item.warehouse,
          to: `${t.site} · ${t.id}`,
          reference: `${t.id} spares`,
          at: new Date().toISOString(),
          by: t.assignee ?? ME,
          status: "Posted",
        };
        db.movements.unshift(mv);
      }
      t.status = "Resolved";
      if (t.contractId) {
        const c = db.contracts.find((x) => x.id === t.contractId);
        if (c && !t.chargeable) c.visitsUsed = Math.min(c.visitsIncluded, c.visitsUsed + 1);
      }
      return t;
    },
    { action: "resolved with visit report", reference: id, module: "assets" },
  );
}

/** Record the reviewer's disposition of an out-of-tolerance calibration (AST-008, E2E-07). */
export function dispositionCalibration(id: string, choice: "adjust" | "external", note: string) {
  return mutate(
    (db) => {
      const job = db.calibrations.find((c) => c.id === id);
      if (!job) throw new ApiError(`Calibration ${id} not found`, "NOT_FOUND");
      if (!job.points.some((p) => !p.pass)) throw new ApiError("Every point is within tolerance; there is nothing to disposition.", "BLOCKED");
      if (note.trim().length < 8) throw new ApiError("Record the reason for this disposition (at least 8 characters).", "VALIDATION");
      job.status = "Failed";
      const asset = db.assets.find((a) => a.id === job.assetId);
      if (asset) asset.status = "Under repair";
      return { job, choice };
    },
    { action: "recorded out-of-tolerance disposition on", reference: id, module: "assets" },
  );
}
