/**
 * Commercial & administrative commands: purchase, CRM, projects, sales,
 * people, payroll, reports and audit-only exports.
 */
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, audit, fail, inr, nextId, today } from "../core";
import * as s from "../db/schema";
import { read } from "../read";
import { command } from "./registry";

const id = z.string().min(3).max(40);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date as YYYY-MM-DD");
const OPS_HEAD_THRESHOLD = 200_000;

/* ================================================================ Purchase */
export const createPurchaseRequest = command({
  name: "purchase.createRequest",
  module: "purchase",
  level: "edit",
  input: z.object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    source: z.string().trim().min(2).max(200),
    projectId: id.optional(),
    value: z.number().int().positive().max(10_000_000_000),
    needBy: isoDate,
    lines: z.array(z.object({ item: z.string().trim().min(1).max(200), qty: z.number().int().positive(), uom: z.string().min(1).max(12) })).min(1).max(100),
  }),
  async run({ tx, actor }, input) {
    if (input.projectId) {
      const [p] = await tx.select({ id: s.projects.id }).from(s.projects).where(eq(s.projects.id, input.projectId));
      if (!p) throw fail.validation(`Project ${input.projectId} doesn't exist.`);
    }
    const prId = await nextId(tx, "PR");
    await tx.insert(s.purchaseRequests).values({ id: prId, title: input.title, source: input.source, projectId: input.projectId ?? null, requester: actor.name, value: input.value, needBy: input.needBy, status: "Draft" });
    await tx.insert(s.prLines).values(input.lines.map((l, seq) => ({ ...l, prId, seq })));
    await audit(tx, actor, "created draft", prId, "purchase");
    return (await read.purchaseRequests(tx)).find((p) => p.id === prId);
  },
});

export const submitRequisition = command({
  name: "purchase.submitRequisition",
  module: "purchase",
  level: "edit",
  input: z.object({ prId: id }),
  async run({ tx, actor }, { prId }) {
    const [pr] = await tx.select().from(s.purchaseRequests).where(eq(s.purchaseRequests.id, prId)).for("update");
    if (!pr) throw fail.notFound("Requisition", prId);
    if (pr.status !== "Draft") throw fail.blocked(`${pr.id} is already ${pr.status.toLowerCase()}.`);
    const lines = await tx.select().from(s.prLines).where(eq(s.prLines.prId, prId));
    if (!lines.length || lines.some((l) => !l.item.trim() || l.qty <= 0)) throw fail.validation("Every line needs an item and a quantity before it can be submitted.");
    const [project] = pr.projectId ? await tx.select().from(s.projects).where(eq(s.projects.id, pr.projectId)) : [];
    const headroom = project ? project.budget - project.committed : undefined;
    if (project && headroom !== undefined && pr.value > headroom) {
      throw fail.blocked(`${inr(pr.value)} exceeds ${project.id}'s remaining budget of ${inr(headroom)}. Raise a cost change request on the project first.`);
    }
    const ops = pr.value > OPS_HEAD_THRESHOLD;
    const approvalId = await nextId(tx, "APR");
    await tx.insert(s.approvals).values({
      id: approvalId,
      type: "Purchase requisition",
      module: "purchase",
      reference: pr.id,
      title: pr.title,
      maker: pr.requester,
      value: inr(pr.value),
      submitted: new Date().toISOString(),
      level: ops ? "Level 2 of 2 · Operations head" : "Level 2 of 2 · Purchase head",
      approverRoleId: ops ? "ROLE-01" : null,
      status: "Pending",
      evidence: [`Source: ${pr.source}`, `${lines.length} line${lines.length === 1 ? "" : "s"} · need by ${pr.needBy}`, project ? `Project budget headroom ${inr(headroom!)}` : "General procurement budget"],
    });
    await tx.update(s.purchaseRequests).set({ status: "Awaiting approval" }).where(eq(s.purchaseRequests.id, pr.id));
    await audit(tx, actor, "submitted for approval", pr.id, "purchase");
    return (await read.approvals(tx)).find((a) => a.id === approvalId);
  },
});

export const awardRfq = command({
  name: "purchase.awardRfq",
  module: "purchase",
  level: "edit",
  input: z.object({ id, vendorId: id, rationale: z.string().max(2000) }),
  async run({ tx, actor }, { id: rfqId, vendorId, rationale }) {
    const [rfq] = await tx.select().from(s.rfqs).where(eq(s.rfqs.id, rfqId)).for("update");
    if (!rfq) throw fail.notFound("RFQ", rfqId);
    if (rfq.status === "Awarded") throw fail.blocked(`${rfq.id} was already awarded to ${rfq.awardedTo}.`);
    if (rationale.trim().length < 12) throw fail.validation("Record why this supplier was chosen (at least 12 characters).");
    const [q] = await tx.select().from(s.rfqQuotes).where(and(eq(s.rfqQuotes.rfqId, rfqId), eq(s.rfqQuotes.vendorId, vendorId)));
    if (!q) throw fail.notFound("Quote from", vendorId);
    await tx.update(s.rfqs).set({ status: "Awarded", awardedTo: q.vendor, awardRationale: rationale.trim() }).where(eq(s.rfqs.id, rfqId));
    await audit(tx, actor, `awarded to ${q.vendor}:`, rfq.id, "purchase", { rationale });
    return (await read.rfqs(tx)).find((r) => r.id === rfqId);
  },
});

export const raisePurchaseOrder = command({
  name: "purchase.raisePurchaseOrder",
  module: "purchase",
  level: "edit",
  input: z.object({ rfqId: id }),
  async run({ tx, actor }, { rfqId }) {
    const [rfq] = await tx.select().from(s.rfqs).where(eq(s.rfqs.id, rfqId)).for("update");
    if (!rfq) throw fail.notFound("RFQ", rfqId);
    if (rfq.status !== "Awarded" || !rfq.awardedTo) throw fail.blocked("Award the RFQ to a supplier before raising the order.");
    const [existing] = await tx.select({ id: s.purchaseOrders.id }).from(s.purchaseOrders).where(eq(s.purchaseOrders.rfqId, rfqId));
    if (existing) throw fail.blocked(`${existing.id} already exists for ${rfq.id}.`);
    const [pr] = await tx.select().from(s.purchaseRequests).where(eq(s.purchaseRequests.id, rfq.prId)).for("update");
    if (pr && pr.status !== "Approved" && pr.status !== "Converted") {
      throw fail.blocked(`${pr.id} is ${pr.status.toLowerCase()}. The order can be raised once the requisition is approved.`);
    }
    const [quote] = await tx.select().from(s.rfqQuotes).where(and(eq(s.rfqQuotes.rfqId, rfqId), eq(s.rfqQuotes.vendor, rfq.awardedTo)));
    const poId = await nextId(tx, "PO");
    await tx.insert(s.purchaseOrders).values({ id: poId, vendor: quote.vendor, title: `${rfq.title} · ${rfq.id}`, projectId: rfq.projectId, rfqId, value: quote.price, issued: today(), expected: addDays(today(), quote.leadDays), status: "Issued" });
    const lines = pr ? await tx.select().from(s.prLines).where(eq(s.prLines.prId, pr.id)).orderBy(asc(s.prLines.seq)) : [];
    const poLines = (lines.length ? lines : [{ item: rfq.title, qty: 1, uom: "lot" }]).map((l, seq) => ({ poId, seq, item: l.item, ordered: l.qty, received: 0, rejected: 0, uom: l.uom }));
    await tx.insert(s.poLines).values(poLines);
    for (const l of poLines) {
      await tx.update(s.items).set({ onOrder: sql`${s.items.onOrder} + ${l.ordered}` }).where(eq(s.items.name, l.item));
    }
    if (pr) await tx.update(s.purchaseRequests).set({ status: "Converted" }).where(eq(s.purchaseRequests.id, pr.id));
    await tx.update(s.vendors).set({ openPOs: sql`${s.vendors.openPOs} + 1` }).where(eq(s.vendors.id, quote.vendorId));
    if (rfq.projectId) await tx.update(s.projects).set({ committed: sql`${s.projects.committed} + ${quote.price}` }).where(eq(s.projects.id, rfq.projectId));
    await audit(tx, actor, "raised purchase order from", rfqId, "purchase", { po: poId });
    return (await read.purchaseOrders(tx)).find((p) => p.id === poId);
  },
});

export const recordReceipt = command({
  name: "purchase.recordReceipt",
  module: "purchase",
  level: "edit",
  input: z.object({ poId: id, lines: z.array(z.object({ index: z.number().int().nonnegative(), received: z.number().int().nonnegative(), rejected: z.number().int().nonnegative() })).max(200) }),
  async run({ tx, actor }, { poId, lines }) {
    const [po] = await tx.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, poId)).for("update");
    if (!po) throw fail.notFound("Purchase order", poId);
    if (po.status === "Closed" || po.status === "Cancelled") throw fail.blocked(`${po.id} is ${po.status.toLowerCase()}; receipts can't be recorded.`);
    const real = lines.filter((l) => l.received > 0);
    if (!real.length) throw fail.validation("Enter a received quantity on at least one line.");
    const pl = await tx.select().from(s.poLines).where(eq(s.poLines.poId, poId)).orderBy(asc(s.poLines.seq)).for("update");
    for (const l of real) {
      const line = pl[l.index];
      if (!line) throw fail.validation(`Line ${l.index + 1} doesn't exist on ${po.id}.`);
      const open = line.ordered - line.received;
      if (l.received > open) throw fail.blocked(`${line.item}: ${l.received} received but only ${open} outstanding. Excess needs a decision with the vendor first.`);
      if (l.rejected > l.received) throw fail.validation(`${line.item}: can't reject more than arrived.`);
    }
    const grn = await nextId(tx, "GRN");
    for (const l of real) {
      const line = pl[l.index];
      line.received += l.received;
      line.rejected += l.rejected;
      await tx.update(s.poLines).set({ received: line.received, rejected: line.rejected }).where(and(eq(s.poLines.poId, poId), eq(s.poLines.seq, line.seq)));
      const [item] = await tx.select().from(s.items).where(eq(s.items.name, line.item)).for("update");
      if (!item) continue; // non-stock lines (services, consumables) don't touch the ledger
      const accepted = l.received - l.rejected;
      await tx.update(s.items).set({ onHand: item.onHand + accepted, onOrder: Math.max(0, item.onOrder - l.received), lastMovement: today() }).where(eq(s.items.id, item.id));
      await tx.insert(s.stockMovements).values({ id: await nextId(tx, "MOV"), type: "Receipt", itemId: item.id, item: item.name, qty: accepted, from: po.vendor, to: item.warehouse, reference: `${grn} · ${po.id}`, at: new Date().toISOString(), by: actor.name, status: "Posted" });
    }
    const status = pl.every((l) => l.received >= l.ordered) ? "Received" : "Part received";
    await tx.update(s.purchaseOrders).set({ status }).where(eq(s.purchaseOrders.id, poId));
    await audit(tx, actor, "recorded a goods receipt on", poId, "purchase", { grn, lines: real });
    return { po: (await read.purchaseOrders(tx)).find((p) => p.id === poId), grn };
  },
});

/* ================================================================ CRM */
const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
const VERTICALS = ["Turnkey automation", "Panel assembly", "Instrumentation", "Calibration", "AMC", "O&M", "CSV / Manufacturing IT"] as const;

export const moveOpportunity = command({
  name: "crm.moveOpportunity",
  module: "crm",
  level: "edit",
  input: z.object({ id, stage: z.enum(STAGES) }),
  async run({ tx, actor }, { id: oppId, stage }) {
    const [o] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, oppId)).for("update");
    if (!o) throw fail.notFound("Opportunity", oppId);
    const probability = stage === "Won" ? 100 : stage === "Lost" ? 0 : o.probability;
    await tx.update(s.opportunities).set({ stage, probability }).where(eq(s.opportunities.id, oppId));
    await audit(tx, actor, `moved to ${stage}:`, oppId, "crm");
    return { ...o, stage, probability };
  },
});

export const createOpportunity = command({
  name: "crm.createOpportunity",
  module: "crm",
  level: "edit",
  input: z.object({
    input: z.object({ name: z.string(), account: z.string(), vertical: z.string(), value: z.number(), closeDate: z.string(), source: z.string() }),
    owner: z.string().optional(),
  }),
  async run({ tx, actor }, { input, owner }) {
    if (input.name.trim().length < 4) throw fail.validation("Give the opportunity a name of at least 4 characters.");
    if (!input.account) throw fail.validation("Choose the customer account.");
    if (!VERTICALS.includes(input.vertical as never)) throw fail.validation("Choose the vertical that will deliver this work.");
    if (!["Tender", "Referral", "Existing customer", "Website", "Renewal"].includes(input.source)) throw fail.validation("Record where the enquiry came from.");
    if (!Number.isFinite(input.value) || input.value <= 0) throw fail.validation("Enter an expected value in rupees.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.closeDate) || input.closeDate < today()) throw fail.validation("Expected close must be today or later, as YYYY-MM-DD.");
    const [dupe] = await tx
      .select()
      .from(s.opportunities)
      .where(and(eq(s.opportunities.account, input.account), sql`lower(trim(${s.opportunities.name})) = lower(trim(${input.name}))`));
    if (dupe) throw fail.blocked(`${dupe.id} already tracks “${dupe.name}” for ${dupe.account}. Update that record instead.`);
    const oppId = await nextId(tx, "OPP");
    const row = { id: oppId, name: input.name.trim(), account: input.account, vertical: input.vertical, stage: "Lead", value: Math.round(input.value), probability: 10, owner: owner || actor.name, closeDate: input.closeDate, nextAction: "Qualify scope, budget and decision date", nextActionDue: addDays(today(), 2), source: input.source };
    await tx.insert(s.opportunities).values(row);
    await audit(tx, actor, "created lead", oppId, "crm");
    return row;
  },
});

export const createRenewalOpportunity = command({
  name: "crm.createRenewalOpportunity",
  module: "crm",
  level: "edit",
  input: z.object({ contractId: id }),
  async run({ tx, actor }, { contractId }) {
    const [c] = await tx.select().from(s.serviceContracts).where(eq(s.serviceContracts.id, contractId));
    if (!c) throw fail.notFound("Contract", contractId);
    const [dupe] = await tx.select().from(s.opportunities).where(and(sql`${s.opportunities.name} like ${"%" + contractId + "%"}`, ne(s.opportunities.stage, "Lost")));
    if (dupe) throw fail.blocked(`A renewal opportunity for ${contractId} already exists (${dupe.id}).`);
    const [cust] = await tx.select().from(s.customers).where(eq(s.customers.name, c.customer));
    const oppId = await nextId(tx, "OPP");
    const row = {
      id: oppId,
      name: `${contractId} renewal — ${c.type} for ${c.customer}`,
      account: c.customer,
      vertical: c.type === "AMC" ? "AMC" : "O&M",
      stage: "Qualified",
      value: Math.round((c.annualValue * 1.05) / 1000) * 1000,
      probability: 70,
      owner: cust?.accountOwner ?? "Sana Kapoor",
      closeDate: addDays(c.end, -14),
      nextAction: `Review ${c.visitsUsed} of ${c.visitsIncluded} visits used and send renewal terms`,
      nextActionDue: addDays(today(), 3),
      source: "Renewal",
    };
    await tx.insert(s.opportunities).values(row);
    await audit(tx, actor, `created from ${contractId} expiry:`, oppId, "crm");
    return row;
  },
});

export const logOpportunityNote = command({
  name: "crm.logOpportunityNote",
  module: "crm",
  level: "edit",
  input: z.object({ id, note: z.string().max(2000) }),
  async run({ tx, actor }, { id: oppId, note }) {
    if (note.trim().length < 4) throw fail.validation("Write at least a few words so the next person can act on it.");
    const [o] = await tx.select({ id: s.opportunities.id }).from(s.opportunities).where(eq(s.opportunities.id, oppId));
    if (!o) throw fail.notFound("Opportunity", oppId);
    await audit(tx, actor, `noted “${note.trim()}” on`, oppId, "crm");
    return o;
  },
});

/* ================================================================ Projects */
export const raiseChangeRequest = command({
  name: "projects.raiseChangeRequest",
  module: "projects",
  level: "edit",
  input: z.object({
    projectId: id,
    title: z.string().max(200),
    kind: z.enum(["Scope variation", "Schedule extension", "Cost variation", "Technical deviation"]),
    costImpact: z.number().int(),
    scheduleDays: z.number().int(),
    milestoneId: z.string().optional(),
    reason: z.string().max(4000),
  }),
  async run({ tx, actor }, input) {
    const [project] = await tx.select().from(s.projects).where(eq(s.projects.id, input.projectId));
    if (!project) throw fail.notFound("Project", input.projectId);
    if (project.status === "Closed") throw fail.blocked("Closed projects can't take change requests. Reopen the project first.");
    if (input.title.trim().length < 6) throw fail.validation("Give the change a title of at least 6 characters.");
    if (input.reason.trim().length < 20) throw fail.validation("Explain the reason in at least 20 characters so the approver can judge it.");
    const [ms] = input.milestoneId ? await tx.select().from(s.projectMilestones).where(and(eq(s.projectMilestones.projectId, project.id), eq(s.projectMilestones.id, input.milestoneId))) : [];
    const impact = [input.costImpact ? `${input.costImpact > 0 ? "+" : ""}${inr(input.costImpact)}` : null, input.scheduleDays ? `${input.scheduleDays > 0 ? "+" : ""}${input.scheduleDays} days` : null].filter(Boolean);
    const approvalId = await nextId(tx, "APR");
    await tx.insert(s.approvals).values({
      id: approvalId,
      type: "Project change request",
      module: "projects",
      reference: project.id,
      title: `${input.kind}: ${input.title.trim()}`,
      maker: actor.name,
      value: impact.length ? impact.join(" · ") : "No cost or date impact",
      submitted: new Date().toISOString(),
      level: "Level 1 of 1 · Commercial head",
      approverRoleId: "ROLE-01",
      status: "Pending",
      evidence: [input.reason.trim(), ms ? `Affects ${ms.id} ${ms.name}` : `Project ${project.id} · ${project.customer}`],
    });
    await audit(tx, actor, "raised a change request on", project.id, "projects", { approval: approvalId });
    return (await read.approvals(tx)).find((a) => a.id === approvalId);
  },
});

/* ================================================================ Sales */
export const escalateMismatch = command({
  name: "sales.escalateMismatch",
  module: "sales",
  level: "edit",
  input: z.object({ adviceId: id, resolution: z.enum(["retention", "reissue"]) }),
  async run({ tx, actor }, { adviceId, resolution }) {
    const [ba] = await tx.select().from(s.billingAdvices).where(eq(s.billingAdvices.id, adviceId));
    if (!ba) throw fail.notFound("Billing advice", adviceId);
    if (ba.status !== "Mismatch") throw fail.blocked(`${adviceId} is ${ba.status}; only a mismatch can be escalated.`);
    await audit(tx, actor, resolution === "retention" ? "asked Finance owner to confirm 5% retention on" : "asked accounting to re-issue the invoice for", adviceId, "sales");
    return ba;
  },
});

/* ================================================================ People */
export const decideLeave = command({
  name: "hr.decideLeave",
  module: "hr",
  level: "view", // reporting managers decide their team's leave; HR admin can decide any
  input: z.object({ id, status: z.enum(["Approved", "Rejected"]) }),
  async run({ tx, actor }, { id: leaveId, status }) {
    const [l] = await tx.select().from(s.leaveRequests).where(eq(s.leaveRequests.id, leaveId)).for("update");
    if (!l) throw fail.notFound("Leave request", leaveId);
    if (l.status !== "Pending") throw fail.blocked(`${l.id} was already ${l.status.toLowerCase()}.`);
    if (actor.personId === l.personId) throw fail.forbidden("You can't decide your own leave.");
    await tx.update(s.leaveRequests).set({ status }).where(eq(s.leaveRequests.id, leaveId));
    if (status === "Approved" && l.from <= today() && l.to >= today()) {
      await tx.update(s.people).set({ status: "On leave" }).where(eq(s.people.id, l.personId));
    }
    await audit(tx, actor, `${status.toLowerCase()} leave`, l.id, "hr");
    return { ...l, status };
  },
});

/* ================================================================ Payroll, reports, exports */
export const chasePayrollInput = command({
  name: "payroll.chaseInput",
  module: "payroll",
  level: "edit",
  input: z.object({ runId: id, check: z.string().max(200) }),
  async run({ tx, actor }, { runId, check }) {
    const [run] = await tx.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, runId));
    if (!run) throw fail.notFound("Pay run", runId);
    if (run.status === "Locked") throw fail.blocked(`${runId} is locked. Inputs can't change after lock.`);
    await audit(tx, actor, `asked HR to resolve “${check}” on`, runId, "payroll");
    return { id: runId };
  },
});

export const logReportExport = command({
  name: "reports.logExport",
  module: "reports",
  level: "view",
  input: z.object({ reportId: id, rows: z.number().int().nonnegative() }),
  async run({ tx, actor }, { reportId, rows }) {
    const [r] = await tx.select().from(s.reports).where(eq(s.reports.id, reportId));
    if (!r) throw fail.notFound("Report", reportId);
    if (r.restricted && !["ROLE-06", "ROLE-07", "ROLE-08"].includes(actor.roleId)) {
      await audit(tx, actor, "was refused export of", reportId, "reports");
      throw fail.forbidden(`${r.name} is restricted to ${r.owner}. Export refused and logged.`);
    }
    await audit(tx, actor, `exported ${rows} rows of`, reportId, "reports");
    return { id: reportId };
  },
});

export const logExport = command({
  name: "users.logExport",
  module: "dashboard",
  level: "view",
  input: z.object({ what: z.string().max(200), reference: z.string().max(60), module: z.string().max(20).default("users") }),
  async run({ tx, actor }, { what, reference, module }) {
    await audit(tx, actor, `exported ${what} —`, reference, module as never);
    return null;
  },
});

export const markNotificationsRead = command({
  name: "notifications.markRead",
  module: "dashboard",
  level: "view",
  input: z.object({}).default({}),
  async run({ tx }) {
    await tx.update(s.notifications).set({ read: true }).where(eq(s.notifications.read, false));
    return null;
  },
});

export const commercialCommands = [createPurchaseRequest, submitRequisition, awardRfq, raisePurchaseOrder, recordReceipt, moveOpportunity, createOpportunity, createRenewalOpportunity, logOpportunityNote, raiseChangeRequest, escalateMismatch, decideLeave, chasePayrollInput, logReportExport, logExport, markNotificationsRead];

