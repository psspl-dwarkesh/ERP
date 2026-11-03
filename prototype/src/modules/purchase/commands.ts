import { ApiError, mutate } from "../../api/client";
import { NOW, TODAY } from "../../api/fixtures";
import { inr } from "../../api/format";
import type { Approval, PurchaseOrder } from "../../api/types";
import { OPS_HEAD_THRESHOLD, addDays, prStatus } from "./util";

const nextNum = (ids: string[]) => Math.max(0, ...ids.map((id) => Number(id.split("-")[1]) || 0)) + 1;

/** Send a draft requisition into the approval route its value requires. */
export function submitRequisition(prId: string) {
  return mutate(
    (db) => {
      const pr = db.purchaseRequests.find((p) => p.id === prId);
      if (!pr) throw new ApiError(`Requisition ${prId} not found`, "VALIDATION");
      if (pr.status !== "Draft") throw new ApiError(`${pr.id} is already ${pr.status.toLowerCase()}.`, "BLOCKED");
      if (!pr.lines.length || pr.lines.some((l) => !l.item.trim() || l.qty <= 0)) throw new ApiError("Every line needs an item and a quantity before it can be submitted.", "VALIDATION");
      const project = pr.projectId ? db.projects.find((p) => p.id === pr.projectId) : undefined;
      const headroom = project ? project.budget - project.committed : undefined;
      if (project && headroom !== undefined && pr.value > headroom) {
        throw new ApiError(`${inr(pr.value)} exceeds ${project.id}'s remaining budget of ${inr(headroom)}. Raise a cost change request on the project first.`, "BLOCKED");
      }
      const ops = pr.value > OPS_HEAD_THRESHOLD;
      const approval: Approval = {
        id: `APR-${String(nextNum(db.approvals.map((a) => a.id))).padStart(4, "0")}`,
        type: "Purchase requisition",
        module: "purchase",
        reference: pr.id,
        title: pr.title,
        maker: pr.requester,
        value: inr(pr.value),
        submitted: NOW,
        level: ops ? "Level 2 of 2 · Operations head" : "Level 2 of 2 · Purchase head",
        status: "Pending",
        evidence: [`Source: ${pr.source}`, `${pr.lines.length} line${pr.lines.length === 1 ? "" : "s"} · need by ${pr.needBy}`, project ? `Project budget headroom ${inr(headroom!)}` : "General procurement budget"],
      };
      pr.status = "Awaiting approval";
      db.approvals.unshift(approval);
      return approval;
    },
    { action: "submitted for approval", reference: prId, module: "purchase" },
  );
}

/** Turn an awarded RFQ into a purchase order. Blocked until the requisition is approved. */
export function raisePurchaseOrder(rfqId: string) {
  return mutate(
    (db) => {
      const rfq = db.rfqs.find((r) => r.id === rfqId);
      if (!rfq) throw new ApiError(`RFQ ${rfqId} not found`, "VALIDATION");
      if (rfq.status !== "Awarded" || !rfq.awardedTo) throw new ApiError("Award the RFQ to a supplier before raising the order.", "BLOCKED");
      if (db.purchaseOrders.some((p) => p.title.includes(rfq.id))) throw new ApiError(`A purchase order already exists for ${rfq.id}.`, "BLOCKED");
      const pr = db.purchaseRequests.find((p) => p.id === rfq.prId);
      if (pr) {
        const status = prStatus(pr, db.approvals);
        if (status !== "Approved" && status !== "Converted") {
          throw new ApiError(`${pr.id} is ${status.toLowerCase()}. The order can be raised once the requisition is approved.`, "BLOCKED");
        }
      }
      const quote = rfq.quotes.find((q) => q.vendor === rfq.awardedTo)!;
      const taken = new Set(db.purchaseOrders.map((p) => p.id));
      const id = !taken.has("PO-0121") ? "PO-0121" : `PO-${String(nextNum([...taken])).padStart(4, "0")}`;
      const po: PurchaseOrder = {
        id,
        vendor: quote.vendor,
        title: `${rfq.title} · ${rfq.id}`,
        projectId: rfq.projectId,
        value: quote.price,
        issued: TODAY,
        expected: addDays(TODAY, quote.leadDays),
        status: "Issued",
        lines: (pr?.lines ?? [{ item: rfq.title, qty: 1, uom: "lot" }]).map((l) => ({ item: l.item, ordered: l.qty, received: 0, rejected: 0, uom: l.uom })),
      };
      db.purchaseOrders.unshift(po);
      if (pr) pr.status = "Converted";
      const v = db.vendors.find((x) => x.id === quote.vendorId);
      if (v) v.openPOs += 1;
      return po;
    },
    { action: `raised purchase order from`, reference: rfqId, module: "purchase" },
  );
}

export interface ReceiptLine {
  index: number;
  received: number;
  rejected: number;
}

/** Record a goods receipt against PO lines. Rejected units are part of what arrived. */
export function recordReceipt(poId: string, lines: ReceiptLine[]) {
  return mutate(
    (db) => {
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new ApiError(`Purchase order ${poId} not found`, "VALIDATION");
      if (po.status === "Closed" || po.status === "Cancelled") throw new ApiError(`${po.id} is ${po.status.toLowerCase()}; receipts can't be recorded.`, "BLOCKED");
      const real = lines.filter((l) => l.received > 0);
      if (!real.length) throw new ApiError("Enter a received quantity on at least one line.", "VALIDATION");
      for (const l of real) {
        const line = po.lines[l.index];
        const open = line.ordered - line.received;
        if (l.received > open) throw new ApiError(`${line.item}: ${l.received} received but only ${open} outstanding. Excess needs a decision with the vendor first.`, "BLOCKED");
        if (l.rejected > l.received) throw new ApiError(`${line.item}: can't reject more than arrived.`, "VALIDATION");
      }
      real.forEach((l) => {
        po.lines[l.index].received += l.received;
        po.lines[l.index].rejected += l.rejected;
      });
      po.status = po.lines.every((l) => l.received >= l.ordered) ? "Received" : "Part received";
      const grnNums = db.movements.flatMap((m) => [...m.reference.matchAll(/GRN-(\d+)/g)].map((x) => Number(x[1])));
      const grn = `GRN-${String(Math.max(73, ...grnNums) + 1).padStart(4, "0")}`;
      real.forEach((l) => {
        const line = po.lines[l.index];
        const item = db.items.find((i) => i.name === line.item);
        if (!item) return; // non-stock lines (services, consumables) don't touch the ledger
        const accepted = l.received - l.rejected;
        item.onHand += accepted;
        item.onOrder = Math.max(0, item.onOrder - l.received);
        item.lastMovement = TODAY;
        db.movements.unshift({
          id: `MOV-${String(932 + db.movements.length).padStart(4, "0")}`,
          type: "Receipt",
          itemId: item.id,
          item: item.name,
          qty: accepted,
          from: po.vendor,
          to: item.warehouse,
          reference: `${grn} · ${po.id}`,
          at: new Date().toISOString(),
          by: "Arjun Mehta",
          status: "Posted",
        });
      });
      return { po, grn };
    },
    { action: "recorded a goods receipt on", reference: poId, module: "purchase" },
  );
}
