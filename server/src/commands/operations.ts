/**
 * Operations commands: approvals, inventory & assembly, assets & service.
 * Rules mirror the front-end mock exactly; here they run in a transaction with
 * row locks, so two people issuing the last units can't both succeed.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, fail, nextId, requireLevel, today, type Actor } from "../core";
import type { Tx } from "../db/client";
import * as s from "../db/schema";
import { read } from "../read";
import { applyPayrollReversal } from "./admin-flow";
import { command } from "./registry";

const id = z.string().min(3).max(40);
const note = z.string().max(2000).default("");

async function lockItem(tx: Tx, itemId: string) {
  const [item] = await tx.select().from(s.items).where(eq(s.items.id, itemId)).for("update");
  if (!item) throw fail.notFound("Item", itemId);
  return item;
}

async function movement(tx: Tx, m: Omit<typeof s.stockMovements.$inferInsert, "id" | "at">) {
  const row = { ...m, id: await nextId(tx, "MOV"), at: new Date().toISOString() };
  await tx.insert(s.stockMovements).values(row);
  return row;
}

/* ================================================================ Approvals */
export const decideApproval = command({
  name: "approvals.decide",
  module: "dashboard",
  level: "view",
  input: z.object({ id, decision: z.enum(["Approved", "Rejected"]), reason: note }),
  async run({ tx, actor }, { id: approvalId, decision, reason }) {
    const [a] = await tx.select().from(s.approvals).where(eq(s.approvals.id, approvalId)).for("update");
    if (!a) throw fail.notFound("Approval", approvalId);
    if (a.status !== "Pending") throw fail.blocked(`${a.reference} was already ${a.status.toLowerCase()}${a.decidedBy ? ` by ${a.decidedBy}` : ""}.`);
    if (a.maker === actor.name) throw fail.forbidden("You raised this request, so someone else has to decide it (maker ≠ checker).");
    if (a.approverRoleId) {
      if (a.approverRoleId !== actor.roleId) {
        const [role] = await tx.select().from(s.roles).where(eq(s.roles.id, a.approverRoleId));
        throw fail.forbidden(`This approval waits on the ${role?.name ?? "designated"} role. Your role (${actor.roleName}) can view it but not decide it.`);
      }
    } else {
      requireLevel(actor, a.module as never, "approve");
    }
    if (decision === "Rejected" && reason.trim().length < 8) {
      throw fail.validation("Give a reason of at least 8 characters so the maker can act on it.");
    }
    await tx
      .update(s.approvals)
      .set({ status: decision, decidedBy: actor.name, decidedAt: new Date().toISOString(), decisionNote: reason.trim() || null })
      .where(eq(s.approvals.id, a.id));
    if (a.reference.startsWith("PR-")) {
      await tx.update(s.purchaseRequests).set({ status: decision }).where(and(eq(s.purchaseRequests.id, a.reference), eq(s.purchaseRequests.status, "Awaiting approval")));
    }
    if (a.reference.startsWith("CLM-")) {
      await tx.update(s.claims).set({ status: decision }).where(eq(s.claims.id, a.reference));
    }
    if (a.reference.startsWith("SI-")) {
      // An approved variance closes the issue; a rejected one reopens it for recount.
      await tx.update(s.subcontractIssues).set({ status: decision === "Approved" ? "Closed" : "Open" }).where(eq(s.subcontractIssues.id, a.reference));
    }
    await audit(tx, actor, decision === "Approved" ? "approved" : "rejected", a.reference, a.module as never, reason ? { reason } : undefined);
    if (a.type === "Payroll reversal") await applyPayrollReversal(tx, actor, a.reference, decision);
    return (await read.approvals(tx)).find((x) => x.id === a.id);
  },
});

/* ================================================================ Inventory */
export const issueStock = command({
  name: "inventory.issueStock",
  module: "inventory",
  level: "edit",
  input: z.object({ itemId: id, qty: z.number().int().positive().max(100000), to: z.string().min(2).max(120) }),
  async run({ tx, actor }, { itemId, qty, to }) {
    const item = await lockItem(tx, itemId);
    const free = item.onHand - item.reserved - item.quarantined;
    if (item.quarantined > 0 && free <= 0) throw fail.blocked(`${item.id} is on QC hold. Release it through inspection before issuing.`);
    if (qty > free) throw fail.blocked(`Only ${free} ${item.uom} free to issue (${item.reserved} reserved, ${item.quarantined} on hold).`);
    await tx.update(s.items).set({ onHand: item.onHand - qty, lastMovement: today() }).where(eq(s.items.id, item.id));
    const mv = await movement(tx, { type: "Issue", itemId, item: item.name, qty, from: item.warehouse, to, reference: to, by: actor.name, status: "Posted" });
    await audit(tx, actor, `issued ${qty} ${item.uom} of`, item.id, "inventory", { to });
    return mv;
  },
});

export const decideQc = command({
  name: "inventory.decideQc",
  module: "inventory",
  level: "edit",
  input: z.object({ itemId: id, decision: z.enum(["release", "reject"]), note }),
  async run({ tx, actor }, { itemId, decision, note: why }) {
    const item = await lockItem(tx, itemId);
    if (!item.quarantined) throw fail.blocked(`${item.id} has nothing on QC hold.`);
    if (decision === "reject" && why.trim().length < 8) {
      throw fail.validation("Say why the lot is rejected (at least 8 characters) so the supplier return has a reason.");
    }
    const [receipt] = await tx
      .select()
      .from(s.stockMovements)
      .where(and(eq(s.stockMovements.itemId, itemId), eq(s.stockMovements.status, "Blocked")))
      .limit(1);
    const qty = item.quarantined;
    if (decision === "release") {
      await tx.update(s.items).set({ status: "Available", quarantined: 0, warehouse: "Central warehouse", bin: "A-11", lastMovement: today() }).where(eq(s.items.id, item.id));
      if (receipt) await tx.update(s.stockMovements).set({ status: "Posted" }).where(eq(s.stockMovements.id, receipt.id));
      await movement(tx, { type: "QC release", itemId, item: item.name, qty, from: "QC bay", to: "Central warehouse", reference: receipt?.reference.split(" · ")[0] ?? "QC release", by: actor.name, status: "Posted" });
      // The next requirements run sees the released stock as free.
      const free = Math.max(0, item.onHand - item.reserved);
      await tx.update(s.bomLines).set({ available: free }).where(eq(s.bomLines.itemId, itemId));
      await audit(tx, actor, "released from QC", item.id, "inventory", why ? { note: why } : undefined);
      return { qty, decision };
    }
    const onHand = item.onHand - qty;
    await tx
      .update(s.items)
      .set({ onHand, quarantined: 0, status: onHand - item.reserved > 0 ? "Available" : "Out of stock", lastMovement: today() })
      .where(eq(s.items.id, item.id));
    await movement(tx, { type: "Return", itemId, item: item.name, qty: -qty, from: "QC bay", to: receipt?.from ?? "Supplier", reference: receipt?.reference ?? "QC rejection", by: actor.name, status: "Pending" });
    await audit(tx, actor, "rejected at QC and raised a supplier return for", item.id, "inventory", { note: why });
    return { qty, decision };
  },
});

export const acknowledgeTransfer = command({
  name: "inventory.acknowledgeTransfer",
  module: "inventory",
  level: "edit",
  input: z.object({ movementId: id }),
  async run({ tx, actor }, { movementId }) {
    const [mv] = await tx.select().from(s.stockMovements).where(eq(s.stockMovements.id, movementId)).for("update");
    if (!mv) throw fail.notFound("Movement", movementId);
    if (mv.status !== "In transit") throw fail.blocked(`${mv.id} is ${mv.status.toLowerCase()}, not in transit.`);
    await tx.update(s.stockMovements).set({ status: "Posted" }).where(eq(s.stockMovements.id, mv.id));
    await audit(tx, actor, "acknowledged receipt at site of", mv.id, "inventory");
    return { ...mv, status: "Posted" };
  },
});

export const submitCount = command({
  name: "inventory.submitCount",
  module: "inventory",
  level: "edit",
  input: z.object({
    sessionId: id,
    lines: z.array(z.object({ itemId: id, system: z.number().int(), counted: z.number().int().nonnegative(), reason: z.string().max(200).default("") })).min(1).max(500),
  }),
  async run({ tx, actor }, { sessionId, lines }) {
    if (lines.some((l) => l.counted !== l.system && !l.reason.trim())) throw fail.validation("Every variance needs a reason while the count is fresh.");
    const created = [];
    for (const l of lines) {
      if (l.counted === l.system) continue;
      const [item] = await tx.select().from(s.items).where(eq(s.items.id, l.itemId));
      if (!item) continue;
      created.push(
        await movement(tx, { type: "Adjustment", itemId: item.id, item: item.name, qty: l.counted - l.system, from: item.warehouse, to: `Count variance · ${l.reason.trim()}`, reference: sessionId, by: actor.name, status: "Pending" }),
      );
    }
    await audit(tx, actor, "submitted count session", sessionId, "inventory", { variances: created.length });
    return created;
  },
});

export const decideAdjustment = command({
  name: "inventory.decideAdjustment",
  module: "inventory",
  level: "edit",
  input: z.object({ movementId: id, approve: z.boolean(), note }),
  async run({ tx, actor }, { movementId, approve, note: why }) {
    const [mv] = await tx.select().from(s.stockMovements).where(eq(s.stockMovements.id, movementId)).for("update");
    if (!mv) throw fail.notFound("Movement", movementId);
    if (mv.status !== "Pending") throw fail.blocked(`${mv.id} is already ${mv.status.toLowerCase()}.`);
    if (mv.by === actor.name) throw fail.forbidden("You counted this stock, so you can't approve its variance.");
    if (!approve && why.trim().length < 8) throw fail.validation("Say what the recount should check (at least 8 characters).");
    if (approve) {
      const item = await lockItem(tx, mv.itemId);
      if (item.onHand + mv.qty < item.reserved) {
        throw fail.blocked(`Posting would leave ${item.id} with less on hand than is reserved. Release a reservation first.`);
      }
      await tx.update(s.items).set({ onHand: item.onHand + mv.qty, lastMovement: today() }).where(eq(s.items.id, item.id));
    }
    await tx.update(s.stockMovements).set({ status: approve ? "Posted" : "Blocked" }).where(eq(s.stockMovements.id, mv.id));
    await audit(tx, actor, approve ? "approved count adjustment" : "sent back for recount", mv.id, "inventory", why ? { note: why } : undefined);
    return { ...mv, status: approve ? "Posted" : "Blocked" };
  },
});

async function workOrderStages(tx: Tx, woId: string) {
  return tx.select().from(s.workOrderStages).where(eq(s.workOrderStages.workOrderId, woId)).orderBy(asc(s.workOrderStages.seq)).for("update");
}

export const advanceWorkOrder = command({
  name: "inventory.advanceWorkOrder",
  module: "inventory",
  level: "edit",
  input: z.object({ id }),
  async run({ tx, actor }, { id: woId }) {
    const [wo] = await tx.select().from(s.workOrders).where(eq(s.workOrders.id, woId)).for("update");
    if (!wo) throw fail.notFound("Work order", woId);
    const stages = await workOrderStages(tx, woId);
    const idx = stages.findIndex((x) => x.status === "Active");
    if (idx === -1) throw fail.validation("No active stage to complete.");
    const cur = stages[idx];
    const next = stages[idx + 1];
    const setStage = (seq: number, v: Partial<typeof s.workOrderStages.$inferInsert>) =>
      tx.update(s.workOrderStages).set(v).where(and(eq(s.workOrderStages.workOrderId, woId), eq(s.workOrderStages.seq, seq)));

    if (next?.key === "assembly") {
      const lines = await tx.select().from(s.bomLines).where(eq(s.bomLines.bomId, wo.bomId));
      const short = lines.filter((l) => l.available + l.reserved < l.required);
      if (short.length) {
        // The current stage really is done; the block is recorded on the next one. Committed, then reported.
        await setStage(cur.seq, { status: "Done", done: today() });
        await setStage(next.seq, { status: "Blocked", note: `${short.length} BOM lines short — waiting on PR-0084` });
        await audit(tx, actor, `completed ${cur.name.toLowerCase()} on`, wo.id, "inventory");
        return { blocked: `${cur.name} done. Assembly is blocked: ${short.length} BOM lines are short.` };
      }
    }
    if (next?.key === "dispatch" && wo.qc !== "Passed") throw fail.blocked("Dispatch needs a passed QC record first.");
    await setStage(cur.seq, { status: "Done", done: today() });
    if (next) await setStage(next.seq, { status: "Active" });
    if (next?.key === "testing") await tx.update(s.workOrders).set({ qc: "Pending review" }).where(eq(s.workOrders.id, wo.id));
    await audit(tx, actor, `completed ${cur.name.toLowerCase()} on`, wo.id, "inventory");
    return (await read.workOrders(tx)).find((w) => w.id === wo.id);
  },
});

export const recordWorkOrderQc = command({
  name: "inventory.recordWorkOrderQc",
  module: "inventory",
  level: "edit",
  input: z.object({ woId: id, result: z.enum(["Passed", "Failed"]), note }),
  async run({ tx, actor }, { woId, result, note: why }) {
    const [wo] = await tx.select().from(s.workOrders).where(eq(s.workOrders.id, woId)).for("update");
    if (!wo) throw fail.notFound("Work order", woId);
    const testing = (await workOrderStages(tx, woId)).find((x) => x.key === "testing");
    if (testing?.status !== "Active") throw fail.blocked("QC can only be recorded while the panel is in testing.");
    if (result === "Failed" && why.trim().length < 8) throw fail.validation("Describe the defect so rework can start (at least 8 characters).");
    await tx.update(s.workOrders).set({ qc: result }).where(eq(s.workOrders.id, woId));
    if (result === "Failed") {
      await tx.update(s.workOrderStages).set({ note: `Rework: ${why.trim()}` }).where(and(eq(s.workOrderStages.workOrderId, woId), eq(s.workOrderStages.seq, testing.seq)));
    }
    await audit(tx, actor, `recorded QC ${result.toLowerCase()} on`, woId, "inventory", why ? { note: why } : undefined);
    return { woId, result };
  },
});

/* ================================================================ Assets & service */
const TICKET_FLOW = ["New", "Assigned", "En route", "On site", "Resolved", "Closed"];

export const updateTicket = command({
  name: "assets.updateTicket",
  module: "assets",
  level: "edit",
  input: z.object({
    id,
    patch: z
      .object({ status: z.enum(["New", "Assigned", "En route", "On site"]).optional(), assignee: z.string().min(2).max(80).optional(), priority: z.enum(["P1", "P2", "P3", "P4"]).optional() })
      .refine((p) => Object.keys(p).length > 0, "Nothing to change"),
  }),
  async run({ tx, actor }, { id: ticketId, patch }) {
    const [t] = await tx.select().from(s.serviceTickets).where(eq(s.serviceTickets.id, ticketId)).for("update");
    if (!t) throw fail.notFound("Ticket", ticketId);
    if (t.status === "Resolved" || t.status === "Closed") throw fail.blocked(`${t.id} is ${t.status.toLowerCase()}. Reopen it before changing it.`);
    if (patch.status && TICKET_FLOW.indexOf(patch.status) > TICKET_FLOW.indexOf(t.status) + 1) {
      throw fail.blocked(`${t.id} is ${t.status}; it can't skip to ${patch.status}.`);
    }
    if (patch.status && patch.status !== "New" && !(patch.assignee ?? t.assignee)) throw fail.validation("Assign an engineer before moving the ticket on.");
    if (patch.assignee) {
      const [p] = await tx.select().from(s.people).where(eq(s.people.name, patch.assignee));
      if (!p) throw fail.validation(`${patch.assignee} isn't in the people register.`);
    }
    await tx.update(s.serviceTickets).set(patch).where(eq(s.serviceTickets.id, t.id));
    await audit(tx, actor, `set ${Object.entries(patch).map(([k, v]) => `${k} → ${v}`).join(", ")} on`, t.id, "assets");
    return { ...t, ...patch };
  },
});

export const resolveTicket = command({
  name: "assets.resolveTicket",
  module: "assets",
  level: "edit",
  input: z.object({ id, note: z.string().max(4000), spares: z.array(z.object({ itemId: id, qty: z.number().int().positive() })).max(50) }),
  async run({ tx, actor }, { id: ticketId, note: why, spares }) {
    const [t] = await tx.select().from(s.serviceTickets).where(eq(s.serviceTickets.id, ticketId)).for("update");
    if (!t) throw fail.notFound("Ticket", ticketId);
    if (t.status !== "On site") throw fail.blocked("Only a visit that is on site can be resolved.");
    if (why.trim().length < 12) throw fail.validation("Write what was found and done (at least 12 characters). It goes on the customer's visit report.");
    const locked = new Map<string, Awaited<ReturnType<typeof lockItem>>>();
    for (const sp of spares) {
      const item = locked.get(sp.itemId) ?? (await lockItem(tx, sp.itemId));
      locked.set(sp.itemId, item);
      const free = item.onHand - item.reserved - item.quarantined;
      if (sp.qty > free) throw fail.blocked(`Only ${free} ${item.uom} of ${item.id} free. Return the extra to stores or raise a site issue first.`);
      item.onHand -= sp.qty;
    }
    for (const sp of spares) {
      const item = locked.get(sp.itemId)!;
      await tx.update(s.items).set({ onHand: item.onHand, lastMovement: today() }).where(eq(s.items.id, item.id));
      await movement(tx, { type: "Issue", itemId: item.id, item: item.name, qty: sp.qty, from: item.warehouse, to: `${t.site} · ${t.id}`, reference: `${t.id} spares`, by: t.assignee ?? actor.name, status: "Posted" });
    }
    await tx.update(s.serviceTickets).set({ status: "Resolved", resolution: why.trim() }).where(eq(s.serviceTickets.id, t.id));
    if (t.contractId && !t.chargeable) {
      await tx
        .update(s.serviceContracts)
        .set({ visitsUsed: sql`least(${s.serviceContracts.visitsIncluded}, ${s.serviceContracts.visitsUsed} + 1)` })
        .where(eq(s.serviceContracts.id, t.contractId));
    }
    await audit(tx, actor, "resolved with visit report", t.id, "assets", { spares });
    return { ...t, status: "Resolved" };
  },
});

export const dispositionCalibration = command({
  name: "assets.dispositionCalibration",
  module: "assets",
  level: "edit",
  input: z.object({ id, choice: z.enum(["adjust", "external"]), note: z.string().max(2000) }),
  async run({ tx, actor }, { id: jobId, choice, note: why }) {
    const [job] = await tx.select().from(s.calibrationJobs).where(eq(s.calibrationJobs.id, jobId)).for("update");
    if (!job) throw fail.notFound("Calibration", jobId);
    const pts = await tx.select().from(s.calibrationPoints).where(eq(s.calibrationPoints.jobId, jobId));
    if (!pts.some((p) => !p.pass)) throw fail.blocked("Every point is within tolerance; there is nothing to disposition.");
    if (why.trim().length < 8) throw fail.validation("Record the reason for this disposition (at least 8 characters).");
    await tx.update(s.calibrationJobs).set({ status: "Failed" }).where(eq(s.calibrationJobs.id, jobId));
    await tx.update(s.assets).set({ status: "Under repair" }).where(eq(s.assets.id, job.assetId));
    await audit(tx, actor, "recorded out-of-tolerance disposition on", jobId, "assets", { choice, note: why });
    return { id: jobId, choice };
  },
});

export const operationsCommands = [decideApproval, issueStock, decideQc, acknowledgeTransfer, submitCount, decideAdjustment, advanceWorkOrder, recordWorkOrderQc, updateTicket, resolveTicket, dispositionCalibration];

export type { Actor };
