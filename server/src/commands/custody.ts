/**
 * Commands for the three accountability journeys:
 *  E2E-04 subcontract custody · E2E-12 exit & handover · E2E-10 accounting outbox.
 * Rules mirror the browser mock exactly (prototype/src/modules/{inventory,hr,sales}/commands.ts).
 */
import { and, asc, eq, like, max } from "drizzle-orm";
import { z } from "zod";
import { audit, fail, inr, nextId, today } from "../core";
import type { Tx } from "../db/client";
import * as s from "../db/schema";
import { read } from "../read";
import { command } from "./registry";

const id = z.string().min(3).max(40);
const outstanding = (l: { issued: number; consumed: number; returned: number; damaged: number }) => l.issued - l.consumed - l.returned - l.damaged;

/* ================================================================ E2E-04 */
export const reconcileSubcontract = command({
  name: "inventory.reconcileSubcontract",
  module: "inventory",
  level: "edit",
  input: z.object({ issueId: id, index: z.number().int().nonnegative(), consumed: z.number().int().nonnegative(), returned: z.number().int().nonnegative(), damaged: z.number().int().nonnegative(), partnerReport: z.string().max(2000).default("") }),
  async run({ tx, actor }, { issueId, index, consumed, returned, damaged, partnerReport }) {
    const [si] = await tx.select().from(s.subcontractIssues).where(eq(s.subcontractIssues.id, issueId)).for("update");
    if (!si) throw fail.notFound("Subcontract issue", issueId);
    if (si.status !== "Open") throw fail.blocked(`${si.id} is ${si.status.toLowerCase()}; figures are frozen.`);
    const [line] = await tx.select().from(s.subcontractLines).where(and(eq(s.subcontractLines.issueId, issueId), eq(s.subcontractLines.seq, index))).for("update");
    if (!line) throw fail.notFound("Line", String(index + 1));
    if (consumed < line.consumed || returned < line.returned || damaged < line.damaged) {
      throw fail.blocked("Recorded figures can't go down. A correction is a new movement against the issue, not an edit.");
    }
    if (consumed + returned + damaged > line.issued) {
      throw fail.validation(`That accounts for ${consumed + returned + damaged} of ${line.issued} issued. Nothing can be used that wasn't issued.`);
    }
    if (damaged > line.damaged && partnerReport.trim().length < 12 && !si.partnerReport) {
      throw fail.validation("Damage needs the partner's report (at least 12 characters) before it is recorded.");
    }
    const back = returned - line.returned;
    if (back > 0) {
      const [item] = await tx.select().from(s.items).where(eq(s.items.id, line.itemId)).for("update");
      if (item) {
        await tx.update(s.items).set({ onHand: item.onHand + back, lastMovement: today() }).where(eq(s.items.id, item.id));
        await tx.insert(s.stockMovements).values({ id: await nextId(tx, "MOV"), type: "Return", itemId: item.id, item: item.name, qty: back, from: `${si.partner} · ${si.id}`, to: item.warehouse, reference: si.id, at: new Date().toISOString(), by: actor.name, status: "Posted" });
      }
    }
    await tx.update(s.subcontractLines).set({ consumed, returned, damaged }).where(and(eq(s.subcontractLines.issueId, issueId), eq(s.subcontractLines.seq, index)));
    if (partnerReport.trim()) await tx.update(s.subcontractIssues).set({ partnerReport: partnerReport.trim() }).where(eq(s.subcontractIssues.id, issueId));
    await audit(tx, actor, `reconciled ${consumed} used / ${returned} returned / ${damaged} damaged on`, issueId, "inventory", { line: line.itemId });
    return (await read.subcontractIssues(tx)).find((x) => x.id === issueId);
  },
});

export const closeSubcontract = command({
  name: "inventory.closeSubcontract",
  module: "inventory",
  level: "edit",
  input: z.object({ issueId: id }),
  async run({ tx, actor }, { issueId }) {
    const [si] = await tx.select().from(s.subcontractIssues).where(eq(s.subcontractIssues.id, issueId)).for("update");
    if (!si) throw fail.notFound("Subcontract issue", issueId);
    if (si.status !== "Open") throw fail.blocked(`${si.id} is already ${si.status.toLowerCase()}.`);
    const lines = await tx.select().from(s.subcontractLines).where(eq(s.subcontractLines.issueId, issueId)).orderBy(asc(s.subcontractLines.seq));
    const open = lines.filter((l) => outstanding(l) > 0);
    if (open.length) throw fail.blocked(`${open.length} line${open.length > 1 ? "s still have" : " still has"} material outstanding at ${si.partner}. Outstanding can't be zeroed without a movement.`);
    const variance = lines.reduce((a, l) => a + l.damaged * l.unitValue, 0);
    let status = "Closed";
    if (variance > 0) {
      status = "Variance in approval";
      await tx.insert(s.approvals).values({
        id: await nextId(tx, "APR"),
        type: "Subcontract variance",
        module: "inventory",
        reference: si.id,
        title: `${si.partner} · ${si.package.split(" · ")[0]}`,
        maker: actor.name,
        value: `${inr(variance)} damaged`,
        submitted: new Date().toISOString(),
        level: "Level 1 of 1 · Operations head",
        approverRoleId: "ROLE-01",
        status: "Pending",
        evidence: [si.partnerReport ? `Partner report: ${si.partnerReport}` : "No partner report", ...lines.filter((l) => l.damaged).map((l) => `${l.damaged} × ${l.item}`)],
      });
    }
    await tx.update(s.subcontractIssues).set({ status }).where(eq(s.subcontractIssues.id, issueId));
    await audit(tx, actor, "submitted reconciliation for closure on", issueId, "inventory", { variance });
    return (await read.subcontractIssues(tx)).find((x) => x.id === issueId);
  },
});

/* ================================================================ E2E-12 */
export const completeExitItem = command({
  name: "hr.completeExitItem",
  module: "hr",
  level: "edit",
  input: z.object({ caseId: id, key: z.enum(["identity", "custody", "commitment", "claim", "delegation", "allocation"]), outcome: z.string().max(2000), detail: z.string().max(200).default("") }),
  async run({ tx, actor }, { caseId, key, outcome, detail }) {
    const [c] = await tx.select().from(s.exitCases).where(eq(s.exitCases.id, caseId)).for("update");
    if (!c) throw fail.notFound("Exit", caseId);
    if (c.status === "Closed") throw fail.blocked(`${c.id} is closed.`);
    const [item] = await tx.select().from(s.exitItems).where(and(eq(s.exitItems.caseId, caseId), eq(s.exitItems.key, key))).for("update");
    if (!item) throw fail.notFound("Checklist line", key);
    if (item.status !== "Open") throw fail.blocked(`“${item.item}” is already closed.`);
    const d = detail.trim();
    if (outcome.trim().length < 8) throw fail.validation("Write what was done (at least 8 characters). It is the evidence on the exit record.");
    if (key === "custody") {
      if (d.length < 4) throw fail.validation("Record the condition the instrument came back in.");
      const assetId = item.reference.match(/AST-\d{4}/)?.[0];
      if (assetId) await tx.update(s.assets).set({ custodian: "Central lab store" }).where(eq(s.assets.id, assetId));
    }
    if (key === "commitment" || key === "delegation") {
      const [p] = await tx.select().from(s.people).where(eq(s.people.name, d));
      if (!p) throw fail.validation("Choose who takes this over.");
      if (p.id === c.personId) throw fail.validation("The leaver can't take over their own commitment.");
    }
    if (key === "claim") {
      const claimId = item.reference.match(/CLM-\d{4}/)?.[0];
      const [claim] = claimId ? await tx.select().from(s.claims).where(eq(s.claims.id, claimId)) : [];
      if (claim?.status === "Pending") throw fail.blocked(`${claim.id} is still pending. Approve or reject it in Claims first; payroll settles it in the full and final.`);
    }
    if (key === "identity" && d && d > c.lastDay) throw fail.validation(`Access must end on or before the last working day (${c.lastDay}).`);
    const evidence = [outcome.trim(), d && key !== "identity" ? `→ ${d}` : d ? `· ends ${d}` : ""].filter(Boolean).join(" ");
    await tx.update(s.exitItems).set({ status: "Done", outcome: evidence, doneBy: actor.name, doneAt: new Date().toISOString() }).where(and(eq(s.exitItems.caseId, caseId), eq(s.exitItems.key, key)));
    await audit(tx, actor, `closed exit line “${key}” on`, caseId, "hr", { outcome: evidence });
    return (await read.exitCases(tx)).find((x) => x.id === caseId);
  },
});

export const closeExit = command({
  name: "hr.closeExit",
  module: "hr",
  level: "edit",
  input: z.object({ caseId: id }),
  async run({ tx, actor }, { caseId }) {
    const [c] = await tx.select().from(s.exitCases).where(eq(s.exitCases.id, caseId)).for("update");
    if (!c) throw fail.notFound("Exit", caseId);
    const open = (await tx.select().from(s.exitItems).where(eq(s.exitItems.caseId, caseId))).filter((i) => i.status === "Open");
    if (open.length) throw fail.blocked(`${open.length} line${open.length > 1 ? "s are" : " is"} still open: ${open.map((i) => i.item.toLowerCase()).join(", ")}.`);
    await tx.update(s.exitCases).set({ status: "Closed" }).where(eq(s.exitCases.id, caseId));
    await audit(tx, actor, "closed exit", caseId, "hr");
    return (await read.exitCases(tx)).find((x) => x.id === caseId);
  },
});

/* ================================================================ E2E-10 */
async function lockPosting(tx: Tx, key: string) {
  const [p] = await tx.select().from(s.accountingPostings).where(eq(s.accountingPostings.key, key)).for("update");
  if (!p) throw fail.notFound("Posting", key);
  return p;
}

export const sendPosting = command({
  name: "sales.sendPosting",
  module: "sales",
  level: "edit",
  input: z.object({ key: z.string().min(3).max(40) }),
  async run({ tx, actor }, { key }) {
    const p = await lockPosting(tx, key);
    if (p.state !== "Queued") throw fail.blocked(`${key} is ${p.state.toLowerCase()}; only a queued posting is sent.`);
    await tx.update(s.accountingPostings).set({ state: "Sent", attempts: p.attempts + 1, lastAttempt: new Date().toISOString(), lastError: null }).where(eq(s.accountingPostings.key, key));
    await audit(tx, actor, "sent to accounting", key, "sales");
    return { ...p, state: "Sent" };
  },
});

export const retryPosting = command({
  name: "sales.retryPosting",
  module: "sales",
  level: "edit",
  input: z.object({ key: z.string().min(3).max(40) }),
  async run({ tx, actor }, { key }) {
    const p = await lockPosting(tx, key);
    if (p.state !== "Failed") throw fail.blocked(`${key} is ${p.state.toLowerCase()}. Only a failed transport is retried — a sent posting waits for its answer.`);
    await tx.update(s.accountingPostings).set({ state: "Sent", attempts: p.attempts + 1, lastAttempt: new Date().toISOString(), lastError: null }).where(eq(s.accountingPostings.key, key));
    await audit(tx, actor, "retried with the same key", key, "sales");
    return { ...p, state: "Sent" };
  },
});

export const recordAcknowledgement = command({
  name: "sales.recordAcknowledgement",
  module: "sales",
  level: "edit",
  input: z.object({ key: z.string().min(3).max(40), external: z.string().max(80), posted: z.number() }),
  async run({ tx, actor }, { key, external, posted }) {
    const p = await lockPosting(tx, key);
    if (p.state !== "Sent") throw fail.blocked(`${key} is ${p.state.toLowerCase()}; an acknowledgement answers a sent posting.`);
    if (external.trim().length < 4) throw fail.validation("Enter accounting's invoice or voucher number.");
    if (!Number.isFinite(posted) || posted <= 0) throw fail.validation("Enter the amount accounting posted.");
    const state = Math.round(posted) === p.amount ? "Acknowledged" : "Needs attention";
    await tx.update(s.accountingPostings).set({ state, posted: Math.round(posted), external: external.trim() }).where(eq(s.accountingPostings.key, key));
    if (state === "Acknowledged") await tx.update(s.billingAdvices).set({ status: "Posted" }).where(eq(s.billingAdvices.id, p.advice));
    await audit(tx, actor, "recorded accounting acknowledgement on", key, "sales", { external, posted });
    return { ...p, state, posted: Math.round(posted), external: external.trim() };
  },
});

export const raiseCorrection = command({
  name: "sales.raiseCorrection",
  module: "sales",
  level: "edit",
  input: z.object({ key: z.string().min(3).max(40), amount: z.number(), reason: z.string().max(2000) }),
  async run({ tx, actor }, { key, amount, reason }) {
    const p = await lockPosting(tx, key);
    if (p.state !== "Needs attention") throw fail.blocked(`Only a posting that needs attention is corrected; ${key} is ${p.state.toLowerCase()}.`);
    if (reason.trim().length < 12) throw fail.validation("Say why the amount changes (at least 12 characters). It goes on the corrected advice.");
    if (!Number.isFinite(amount) || amount <= 0) throw fail.validation("Enter the corrected amount.");
    const revs = await tx.select({ key: s.accountingPostings.key }).from(s.accountingPostings).where(like(s.accountingPostings.key, `${p.advice}/R%`));
    const rev = Math.max(...revs.map((r) => Number(r.key.split("/R")[1]) || 1)) + 1;
    const next = { key: `${p.advice}/R${rev}`, advice: p.advice, party: p.party, projectId: p.projectId, state: "Queued", attempts: 0, amount: Math.round(amount), supersedes: p.key, note: reason.trim() };
    await tx.insert(s.accountingPostings).values(next);
    await tx.update(s.accountingPostings).set({ state: "Superseded", supersededBy: next.key }).where(eq(s.accountingPostings.key, key));
    await audit(tx, actor, "raised a corrected advice superseding", key, "sales", { amount, reason });
    return next;
  },
});

export const queuePosting = command({
  name: "sales.queuePosting",
  module: "sales",
  level: "edit",
  input: z.object({ adviceId: id }),
  async run({ tx, actor }, { adviceId }) {
    const [ba] = await tx.select().from(s.billingAdvices).where(eq(s.billingAdvices.id, adviceId)).for("update");
    if (!ba) throw fail.notFound("Billing advice", adviceId);
    const [existing] = await tx.select({ n: max(s.accountingPostings.key) }).from(s.accountingPostings).where(eq(s.accountingPostings.advice, adviceId));
    if (existing?.n) throw fail.blocked(`${adviceId} is already in the outbox.`);
    const [approval] = await tx.select().from(s.approvals).where(eq(s.approvals.reference, adviceId));
    if (approval && approval.status !== "Approved") throw fail.blocked(`${adviceId} is waiting on ${approval.level.split(" · ")[1] ?? "its approver"}. It can be posted once approved.`);
    const row = { key: `${adviceId}/R1`, advice: adviceId, party: ba.customer, state: "Queued", attempts: 0, amount: ba.value, note: `${ba.trigger}. Queued under its key; nothing is sent until you send it.` };
    await tx.insert(s.accountingPostings).values(row);
    await tx.update(s.billingAdvices).set({ status: "Sent to accounting" }).where(eq(s.billingAdvices.id, adviceId));
    await audit(tx, actor, "queued for accounting", adviceId, "sales");
    return row;
  },
});

export const custodyCommands = [reconcileSubcontract, closeSubcontract, completeExitItem, closeExit, sendPosting, retryPosting, recordAcknowledgement, raiseCorrection, queuePosting];

