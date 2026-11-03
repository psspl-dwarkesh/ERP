/**
 * Inventory & Assembly commands that the shared mock API does not cover.
 * Each mirrors a future POST and goes through mutate(), so it is audited, persisted
 * and every screen refetches. Throw ApiError to reject.
 */
import { ApiError, api, defineCommand, mutate, type Db } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import type { StockMovement } from "../../api/types";

const ME = "Arjun Mehta";

function nextMovementId(db: Db) {
  return `MOV-${String(932 + db.movements.length).padStart(4, "0")}`;
}

/** QC decision on quarantined stock (INV-005). Release goes through the shared API, then relocates the stock. */
async function decideQcLocal(itemId: string, decision: "release" | "reject", note: string) {
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
function acknowledgeTransferLocal(movementId: string) {
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
function submitCountLocal(sessionId: string, lines: CountLine[]) {
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
function decideAdjustmentLocal(movementId: string, approve: boolean, note: string) {
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
function recordWorkOrderQcLocal(woId: string, result: "Passed" | "Failed", note: string) {
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

/* ================================================================ Subcontract custody (E2E-04) */
export interface ReconcileFigures {
  consumed: number;
  returned: number;
  damaged: number;
}

export const outstandingOf = (l: { issued: number; consumed: number; returned: number; damaged: number }) => l.issued - l.consumed - l.returned - l.damaged;

/**
 * Record what the partner used, sent back or damaged. Posted figures only grow:
 * a correction is a new movement, never an edit. Returns post a stock movement,
 * and damage can't be recorded without the partner's report.
 */
export const reconcileSubcontractLine = defineCommand(
  "inventory.reconcileSubcontract",
  (issueId: string, index: number, figures: ReconcileFigures, partnerReport: string = "") => ({ issueId, index, ...figures, partnerReport }),
  (issueId: string, index: number, figures: ReconcileFigures, partnerReport: string = "") =>
    mutate(
      (db) => {
        const si = db.subcontractIssues.find((x) => x.id === issueId);
        if (!si) throw new ApiError(`Subcontract issue ${issueId} not found`, "NOT_FOUND");
        if (si.status !== "Open") throw new ApiError(`${si.id} is ${si.status.toLowerCase()}; figures are frozen.`, "BLOCKED");
        const line = si.lines[index];
        if (!line) throw new ApiError("That line doesn't exist.", "NOT_FOUND");
        const { consumed, returned, damaged } = figures;
        if ([consumed, returned, damaged].some((v) => !Number.isInteger(v) || v < 0)) throw new ApiError("Enter whole, non-negative quantities.", "VALIDATION");
        if (consumed < line.consumed || returned < line.returned || damaged < line.damaged) {
          throw new ApiError("Recorded figures can't go down. A correction is a new movement against the issue, not an edit.", "BLOCKED");
        }
        if (consumed + returned + damaged > line.issued) {
          throw new ApiError(`That accounts for ${consumed + returned + damaged} of ${line.issued} issued. Nothing can be used that wasn't issued.`, "VALIDATION");
        }
        if (damaged > line.damaged && partnerReport.trim().length < 12 && !si.partnerReport) {
          throw new ApiError("Damage needs the partner's report (at least 12 characters) before it is recorded.", "VALIDATION");
        }
        const back = returned - line.returned;
        if (back > 0) {
          const item = db.items.find((i) => i.id === line.itemId);
          if (item) {
            item.onHand += back;
            item.lastMovement = TODAY;
            db.movements.unshift({
              id: nextMovementId(db), type: "Return", itemId: item.id, item: item.name, qty: back, from: `${si.partner} · ${si.id}`, to: item.warehouse,
              reference: si.id, at: new Date().toISOString(), by: ME, status: "Posted",
            });
          }
        }
        Object.assign(line, { consumed, returned, damaged });
        if (partnerReport.trim()) si.partnerReport = partnerReport.trim();
        return si;
      },
      { action: `reconciled ${figures.consumed} used / ${figures.returned} returned / ${figures.damaged} damaged on`, reference: issueId, module: "inventory" },
    ),
);

/** Close the issue once nothing is outstanding. Damage turns closure into a variance approval for someone else. */
export const closeSubcontractIssue = defineCommand(
  "inventory.closeSubcontract",
  (issueId: string) => ({ issueId }),
  (issueId: string) =>
    mutate(
      (db) => {
        const si = db.subcontractIssues.find((x) => x.id === issueId);
        if (!si) throw new ApiError(`Subcontract issue ${issueId} not found`, "NOT_FOUND");
        if (si.status !== "Open") throw new ApiError(`${si.id} is already ${si.status.toLowerCase()}.`, "BLOCKED");
        const open = si.lines.filter((l) => outstandingOf(l) > 0);
        if (open.length) throw new ApiError(`${open.length} line${open.length > 1 ? "s still have" : " still has"} material outstanding at ${si.partner}. Outstanding can't be zeroed without a movement.`, "BLOCKED");
        const variance = si.lines.reduce((a, l) => a + l.damaged * l.unitValue, 0);
        if (variance > 0) {
          const n = Math.max(0, ...db.approvals.map((a) => Number(a.id.split("-")[1]) || 0)) + 1;
          db.approvals.unshift({
            id: `APR-${String(n).padStart(4, "0")}`, type: "Subcontract variance", module: "inventory", reference: si.id,
            title: `${si.partner} · ${si.package.split(" · ")[0]}`, maker: si.issuedBy, value: `₹${variance.toLocaleString("en-IN")} damaged`,
            submitted: new Date().toISOString(), level: "Level 1 of 1 · Operations head", status: "Pending",
            evidence: [si.partnerReport ? `Partner report: ${si.partnerReport}` : "No partner report", ...si.lines.filter((l) => l.damaged).map((l) => `${l.damaged} × ${l.item}`)],
          });
          si.status = "Variance in approval";
        } else {
          si.status = "Closed";
        }
        return si;
      },
      { action: "submitted reconciliation for closure on", reference: issueId, module: "inventory" },
    ),
);

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const decideQc = defineCommand("inventory.decideQc", (itemId, decision, note) => ({ itemId, decision, note }), decideQcLocal);
export const acknowledgeTransfer = defineCommand("inventory.acknowledgeTransfer", (movementId) => ({ movementId }), acknowledgeTransferLocal);
export const submitCount = defineCommand("inventory.submitCount", (sessionId, lines) => ({ sessionId, lines }), submitCountLocal);
export const decideAdjustment = defineCommand("inventory.decideAdjustment", (movementId, approve, note) => ({ movementId, approve, note }), decideAdjustmentLocal);
export const recordWorkOrderQc = defineCommand("inventory.recordWorkOrderQc", (woId, result, note) => ({ woId, result, note }), recordWorkOrderQcLocal);
