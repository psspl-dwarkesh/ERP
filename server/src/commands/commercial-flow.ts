/**
 * E2E-01 · enquiry to execution: opportunity → quotation (with revisions and the
 * discount gate) → customer acceptance → sales order → project. The rules live in
 * prototype/src/modules/sales/rules.ts and prototype/src/modules/projects/plan.ts,
 * shared with the in-browser commands so both modes refuse the same things.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { BUDGET_SHARE, milestonePlan, planProblem } from "../../../prototype/src/modules/projects/plan";
import {
  ACCEPTABLE_STATUSES,
  BILLING_TYPES,
  DISCOUNT_AUTHORITY_PCT,
  OPEN_QUOTE_STATUSES,
  QUOTE_VALIDITY_DAYS,
  discountApprovalTitle,
  discountPct,
  isLapsed,
  lineProblem,
  needsDiscountApproval,
  nextRevision,
  quoteValue,
} from "../../../prototype/src/modules/sales/rules";
import type { QuoteLine, Vertical } from "../../../prototype/src/api/types";
import { addDays, audit, fail, inr, nextId, requireLevel, today } from "../core";
import type { Tx } from "../db/client";
import * as s from "../db/schema";
import { read } from "../read";
import { command } from "./registry";

const id = z.string().min(3).max(40);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date as YYYY-MM-DD");
const line = z.object({
  description: z.string().max(300),
  billing: z.enum(BILLING_TYPES as [QuoteLine["billing"], ...QuoteLine["billing"][]]),
  qty: z.number().max(1_000_000),
  rate: z.number().max(10_000_000_000),
});
const lines = z.array(line).max(200);

function checkLines(ls: QuoteLine[]) {
  const problem = lineProblem(ls);
  if (problem) throw fail.validation(problem);
  return ls.map((l) => ({ ...l, description: l.description.trim(), rate: Math.round(l.rate) }));
}

async function insertLines(tx: Tx, quotationId: string, revision: string, ls: QuoteLine[]) {
  await tx.insert(s.quotationLines).values(ls.map((l, seq) => ({ quotationId, revision, seq, ...l })));
}

/** The approval governing the quotation's current revision, if that revision needed one. */
async function revisionApproval(tx: Tx, q: { id: string; title: string; revision: string }) {
  const [a] = await tx
    .select()
    .from(s.approvals)
    .where(and(eq(s.approvals.reference, q.id), eq(s.approvals.title, discountApprovalTitle(q, q.revision))));
  return a;
}

const quotation = async (tx: Tx, quotationId: string) => (await read.quotations(tx)).find((x) => x.id === quotationId);

/* ================================================================ 1 · Opportunity → quotation */
export const startQuotation = command({
  name: "crm.startQuotation",
  module: "crm",
  level: "edit",
  input: z.object({ opportunityId: id, lines }),
  async run({ tx, actor }, input) {
    requireLevel(actor, "sales", "edit"); // the quotation is a Sales record
    const [o] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, input.opportunityId)).for("update");
    if (!o) throw fail.notFound("Opportunity", input.opportunityId);
    if (o.stage === "Won" || o.stage === "Lost") throw fail.blocked(`${o.id} is ${o.stage.toLowerCase()}. Quotations start from an open opportunity.`);
    const [open] = await tx
      .select()
      .from(s.quotations)
      .where(and(eq(s.quotations.opportunityId, o.id), inArray(s.quotations.status, OPEN_QUOTE_STATUSES)));
    if (open) throw fail.blocked(`${open.id} rev ${open.revision} is still open (${open.status}). Revise it instead of starting a second quotation.`);
    const ls = checkLines(input.lines);
    const quoteId = await nextId(tx, "QUO");
    const value = quoteValue(ls);
    await tx.insert(s.quotations).values({
      id: quoteId,
      opportunityId: o.id,
      customer: o.account,
      title: o.name,
      revision: "A",
      value,
      validUntil: addDays(today(), QUOTE_VALIDITY_DAYS),
      status: "Draft",
      owner: actor.name,
      revisionNote: "First issue",
    });
    await insertLines(tx, quoteId, "A", ls);
    await tx.update(s.opportunities).set({ stage: "Proposal", nextAction: `Send ${quoteId} rev A to ${o.account}`, nextActionDue: addDays(today(), 3) }).where(eq(s.opportunities.id, o.id));
    await audit(tx, actor, `started ${quoteId} (${inr(value)}) from`, o.id, "crm", { quotation: quoteId });
    await audit(tx, actor, `drafted rev A from ${o.id}:`, quoteId, "sales", { lines: ls.length, value });
    return quotation(tx, quoteId);
  },
});

/* ================================================================ 2 · Revision */
export const reviseQuotation = command({
  name: "sales.reviseQuotation",
  module: "sales",
  level: "edit",
  input: z.object({ quotationId: id, changes: z.object({ lines, validUntil: isoDate.optional() }), reason: z.string().max(2000) }),
  async run({ tx, actor }, { quotationId, changes, reason }) {
    const [q] = await tx.select().from(s.quotations).where(eq(s.quotations.id, quotationId)).for("update");
    if (!q) throw fail.notFound("Quotation", quotationId);
    if (q.status === "Accepted") throw fail.blocked(`${q.id} rev ${q.revision} was accepted and is now fixed. Changes go through an order amendment.`);
    if (reason.trim().length < 10) throw fail.validation("Say what changed and why (at least 10 characters). It stays on the revision.");
    const pending = await revisionApproval(tx, q);
    if (pending?.status === "Pending") throw fail.blocked(`Rev ${q.revision} is waiting on ${pending.level.split(" · ")[1] ?? "its approver"} (${pending.id}). Decide it before issuing another revision.`);
    const next = nextRevision(q.revision);
    if (!next) throw fail.blocked(`${q.id} has reached rev Z. Start a fresh quotation from the opportunity.`);
    const ls = checkLines(changes.lines);
    const validUntil = changes.validUntil ?? addDays(today(), QUOTE_VALIDITY_DAYS);
    if (validUntil < today()) throw fail.validation("Validity must run to today or later.");
    const value = quoteValue(ls);
    const [revA] = await tx.select().from(s.quotationRevisions).where(and(eq(s.quotationRevisions.quotationId, q.id), eq(s.quotationRevisions.revision, "A")));
    const [oldest] = revA ? [revA] : await tx.select().from(s.quotationRevisions).where(eq(s.quotationRevisions.quotationId, q.id)).orderBy(asc(s.quotationRevisions.revision)).limit(1);
    const firstIssue = oldest?.value ?? q.value;
    const gated = needsDiscountApproval(firstIssue, value);

    await tx.insert(s.quotationRevisions).values({ quotationId: q.id, revision: q.revision, value: q.value, validUntil: q.validUntil, wasStatus: q.status, note: q.revisionNote, supersededAt: new Date().toISOString(), supersededBy: actor.name });
    await tx.update(s.quotations).set({ revision: next, value, validUntil, status: gated ? "In review" : "Draft", revisionNote: reason.trim() }).where(eq(s.quotations.id, q.id));
    await insertLines(tx, q.id, next, ls);
    let approvalId: string | undefined;
    if (gated) {
      approvalId = await nextId(tx, "APR");
      const pct = discountPct(firstIssue, value);
      await tx.insert(s.approvals).values({
        id: approvalId,
        type: "Quotation discount",
        module: "sales",
        reference: q.id,
        title: discountApprovalTitle(q, next),
        maker: actor.name,
        value: `${inr(value)} · ${pct}% below first issue`,
        submitted: new Date().toISOString(),
        level: "Level 1 of 1 · Operations head",
        approverRoleId: "ROLE-01",
        status: "Pending",
        evidence: [reason.trim(), `First issue ${inr(firstIssue)} → rev ${next} ${inr(value)}; owner's authority is ${DISCOUNT_AUTHORITY_PCT}%`, `${q.customer} · valid until ${validUntil}`],
      });
    }
    if (q.opportunityId) await tx.update(s.opportunities).set({ nextAction: gated ? `Rev ${next} discount waiting on Operations head` : `Send ${q.id} rev ${next} to ${q.customer}`, nextActionDue: addDays(today(), 2) }).where(eq(s.opportunities.id, q.opportunityId));
    await audit(tx, actor, `issued rev ${next} superseding rev ${q.revision}${gated ? ", discount sent for approval" : ""}:`, q.id, "sales", { reason: reason.trim(), value, approval: approvalId });
    return { quotation: await quotation(tx, q.id), approvalId };
  },
});

/* ================================================================ Draft → Sent */
export const sendQuotation = command({
  name: "sales.sendQuotation",
  module: "sales",
  level: "edit",
  input: z.object({ quotationId: id }),
  async run({ tx, actor }, { quotationId }) {
    const [q] = await tx.select().from(s.quotations).where(eq(s.quotations.id, quotationId)).for("update");
    if (!q) throw fail.notFound("Quotation", quotationId);
    if (q.status !== "Draft" && q.status !== "In review") throw fail.blocked(`${q.id} rev ${q.revision} is ${q.status.toLowerCase()}; only a draft or an approved revision is sent.`);
    if (isLapsed(q, today())) throw fail.blocked(`Rev ${q.revision} lapsed on ${q.validUntil}. Issue a new revision with refreshed prices.`);
    const a = await revisionApproval(tx, q);
    if (a?.status === "Pending") throw fail.blocked(`Rev ${q.revision} can't be sent while its discount waits on ${a.level.split(" · ")[1] ?? "approval"} (${a.id}).`);
    if (a?.status === "Rejected") throw fail.blocked(`The discount on rev ${q.revision} was rejected (${a.id}). Issue a revision within the ${DISCOUNT_AUTHORITY_PCT}% authority.`);
    await tx.update(s.quotations).set({ status: "Sent" }).where(eq(s.quotations.id, q.id));
    if (q.opportunityId) await tx.update(s.opportunities).set({ nextAction: `Follow up ${q.id} rev ${q.revision} with ${q.customer}`, nextActionDue: addDays(today(), 5) }).where(eq(s.opportunities.id, q.opportunityId));
    await audit(tx, actor, `sent rev ${q.revision} to ${q.customer}:`, q.id, "sales");
    return quotation(tx, q.id);
  },
});

/* ================================================================ 3 · Acceptance → sales order */
export const recordAcceptance = command({
  name: "sales.recordAcceptance",
  module: "sales",
  level: "edit",
  input: z.object({ quotationId: id, customerPo: z.string().max(80), acceptedOn: isoDate }),
  async run({ tx, actor }, { quotationId, customerPo, acceptedOn }) {
    const [q] = await tx.select().from(s.quotations).where(eq(s.quotations.id, quotationId)).for("update");
    if (!q) throw fail.notFound("Quotation", quotationId);
    if (q.status === "Accepted") throw fail.blocked(`${q.id} rev ${q.revision} was already accepted.`);
    if (!ACCEPTABLE_STATUSES.includes(q.status as never)) throw fail.blocked(`${q.id} rev ${q.revision} is ${q.status.toLowerCase()}. The customer can only accept a revision that was sent.`);
    const po = customerPo.trim();
    if (po.length < 3) throw fail.validation("Enter the customer's PO or contract reference.");
    if (acceptedOn > today()) throw fail.validation("Acceptance can't be dated in the future.");
    if (isLapsed(q, acceptedOn)) throw fail.blocked(`Rev ${q.revision} lapsed on ${q.validUntil}. Issue a new revision with refreshed prices before recording acceptance.`);
    const a = await revisionApproval(tx, q);
    if (a?.status === "Pending") throw fail.blocked(`Rev ${q.revision}'s discount is still waiting on ${a.level.split(" · ")[1] ?? "approval"} (${a.id}).`);
    if (a?.status === "Rejected") throw fail.blocked(`The discount on rev ${q.revision} was rejected (${a.id}). It can't be accepted at this price.`);
    const [dupe] = await tx.select({ id: s.salesOrders.id }).from(s.salesOrders).where(and(eq(s.salesOrders.customer, q.customer), eq(s.salesOrders.customerPo, po)));
    if (dupe) throw fail.blocked(`PO ${po} is already booked on ${dupe.id}. Check the reference with ${q.customer}.`);

    const soId = await nextId(tx, "SO");
    await tx.update(s.quotations).set({ status: "Accepted" }).where(eq(s.quotations.id, q.id));
    await tx.insert(s.salesOrders).values({ id: soId, quotationId: q.id, customer: q.customer, title: q.title, value: q.value, billed: 0, booked: acceptedOn, status: "Confirmed", owner: q.owner, customerPo: po, acceptedOn });
    if (q.opportunityId) {
      await tx.update(s.opportunities).set({ stage: "Won", probability: 100, nextAction: `Open the project from ${soId}`, nextActionDue: addDays(today(), 2) }).where(eq(s.opportunities.id, q.opportunityId));
      await audit(tx, actor, `won — ${q.id} rev ${q.revision} accepted as ${soId}:`, q.opportunityId, "crm", { order: soId });
    }
    await audit(tx, actor, `recorded acceptance of rev ${q.revision} on PO ${po}:`, q.id, "sales", { order: soId });
    await audit(tx, actor, `booked from ${q.id} rev ${q.revision} at ${inr(q.value)}:`, soId, "sales", { customerPo: po });
    return { quotation: await quotation(tx, q.id), order: (await read.salesOrders(tx)).find((o) => o.id === soId) };
  },
});

/* ================================================================ 4 · Order → project */
export const openFromOrder = command({
  name: "projects.openFromOrder",
  module: "projects",
  level: "edit",
  input: z.object({ salesOrderId: id, manager: z.string().max(120), start: z.string().max(10), due: z.string().max(10) }),
  async run({ tx, actor }, { salesOrderId, manager, start, due }) {
    const [so] = await tx.select().from(s.salesOrders).where(eq(s.salesOrders.id, salesOrderId)).for("update");
    if (!so) throw fail.notFound("Sales order", salesOrderId);
    if (so.projectId) throw fail.blocked(`${so.id} is already delivered through ${so.projectId}.`);
    if (so.status === "Closed") throw fail.blocked(`${so.id} is closed. A project can't be opened against it.`);
    const [q] = so.quotationId ? await tx.select().from(s.quotations).where(eq(s.quotations.id, so.quotationId)) : [];
    const [o] = q?.opportunityId ? await tx.select().from(s.opportunities).where(eq(s.opportunities.id, q.opportunityId)).for("update") : [];
    if (!o) throw fail.blocked(`${so.id} has no accepted quotation and opportunity behind it, so there is no scope to plan from. Contract renewals run on their service schedule.`);
    const [pm] = await tx.select({ id: s.people.id, name: s.people.name }).from(s.people).where(eq(s.people.name, manager.trim()));
    if (!pm) throw fail.validation("Choose the project manager from the people directory.");
    const problem = planProblem(start, due, today());
    if (problem) throw fail.validation(problem);
    const [cust] = await tx.select().from(s.customers).where(eq(s.customers.name, o.account));
    if (!cust) throw fail.blocked(`${o.account} isn't in the customer master. Add the account before opening a project.`);
    const [site] = await tx.select().from(s.customerSites).where(eq(s.customerSites.customerId, cust.id)).orderBy(asc(s.customerSites.id)).limit(1);

    const prjId = await nextId(tx, "PRJ");
    const milestones = milestonePlan(o.vertical as Vertical, start, due, so.value, today());
    await tx.insert(s.projects).values({
      id: prjId,
      name: so.title,
      customerId: cust.id,
      customer: cust.name,
      site: site?.name ?? "Site to be confirmed",
      vertical: o.vertical,
      manager: pm.name,
      status: "Planning",
      progress: 0,
      start,
      due,
      salesOrder: so.id,
      contractValue: so.value,
      budget: Math.round(so.value * BUDGET_SHARE),
      committed: 0,
      incurred: 0,
      billed: so.billed,
      health: { schedule: "ok", cost: "ok", material: "neutral" },
    });
    await tx.insert(s.projectMilestones).values(milestones.map((m, seq) => ({ ...m, projectId: prjId, seq, done: m.done ?? null, billable: m.billable ?? null, gate: m.gate ?? null })));
    await tx.insert(s.projectMembers).values({ projectId: prjId, personId: pm.id, seq: 0 });
    await tx.update(s.salesOrders).set({ projectId: prjId, status: "In fulfilment" }).where(eq(s.salesOrders.id, so.id));
    await tx.update(s.opportunities).set({ nextAction: `Handed to Projects as ${prjId}`, nextActionDue: today() }).where(eq(s.opportunities.id, o.id));
    await audit(tx, actor, `opened from ${so.id} for ${pm.name}:`, prjId, "projects", { order: so.id, milestones: milestones.length });
    await audit(tx, actor, `handed to Projects as ${prjId}:`, so.id, "sales");
    return (await read.projects(tx, prjId))[0];
  },
});

export const commercialFlowCommands = [startQuotation, reviseQuotation, sendQuotation, recordAcceptance, openFromOrder];
