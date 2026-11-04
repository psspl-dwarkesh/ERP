import { ApiError, api, mutate, defineCommand } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { actorName, addAudit, nextId, requireLevel } from "../../api/command-kit";
import { inr } from "../../api/format";
import type { Opportunity, Quotation, QuoteLine, Vertical } from "../../api/types";
import { OPEN_QUOTE_STATUSES, QUOTE_VALIDITY_DAYS, lineProblem, quoteValue } from "../sales/rules";

function nextOppId(list: Opportunity[]) {
  const max = list.reduce((m, o) => Math.max(m, Number(o.id.split("-")[1]) || 0), 0);
  return `OPP-${String(max + 1).padStart(4, "0")}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** CRM-013: a renewal opportunity created from a contract nearing its end date. */
async function createRenewalOpportunityLocal(contractId: string) {
  const id = nextOppId(await api.opportunities());
  return mutate(
    (db) => {
      const c = db.contracts.find((x) => x.id === contractId);
      if (!c) throw new ApiError(`Contract ${contractId} not found`, "NOT_FOUND");
      if (db.opportunities.some((o) => o.name.includes(contractId) && o.stage !== "Lost")) {
        throw new ApiError(`A renewal opportunity for ${contractId} already exists.`, "BLOCKED");
      }
      const owner = db.customers.find((x) => x.name === c.customer)?.accountOwner ?? "Sana Kapoor";
      const opp: Opportunity = {
        id,
        name: `${contractId} renewal — ${c.type} for ${c.customer}`,
        account: c.customer,
        vertical: c.type === "AMC" ? "AMC" : "O&M",
        stage: "Qualified",
        value: Math.round((c.annualValue * 1.05) / 1000) * 1000,
        probability: 70,
        owner,
        closeDate: addDays(c.end, -14),
        nextAction: `Review ${c.visitsUsed} of ${c.visitsIncluded} visits used and send renewal terms`,
        nextActionDue: addDays(TODAY, 3),
        source: "Renewal",
      };
      db.opportunities.unshift(opp);
      return opp;
    },
    { action: `created from ${contractId} expiry:`, reference: id, module: "crm" },
  );
}

export interface NewOpportunityInput {
  name: string;
  account: string;
  vertical: Vertical | "";
  value: number;
  closeDate: string;
  source: Opportunity["source"] | "";
}

/** CRM-002/003: capture a new lead with source, vertical and owner. */
async function createOpportunityLocal(input: NewOpportunityInput, owner: string) {
  const id = nextOppId(await api.opportunities());
  return mutate(
    (db) => {
      if (input.name.trim().length < 4) throw new ApiError("Give the opportunity a name of at least 4 characters.", "VALIDATION");
      if (!input.account) throw new ApiError("Choose the customer account.", "VALIDATION");
      if (!input.vertical) throw new ApiError("Choose the vertical that will deliver this work.", "VALIDATION");
      if (!input.source) throw new ApiError("Record where the enquiry came from.", "VALIDATION");
      if (!Number.isFinite(input.value) || input.value <= 0) throw new ApiError("Enter an expected value in rupees.", "VALIDATION");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.closeDate) || input.closeDate < TODAY) throw new ApiError("Expected close must be today or later, as YYYY-MM-DD.", "VALIDATION");
      const dupe = db.opportunities.find((o) => o.account === input.account && o.name.trim().toLowerCase() === input.name.trim().toLowerCase());
      if (dupe) throw new ApiError(`${dupe.id} already tracks “${dupe.name}” for ${dupe.account}. Update that record instead.`, "BLOCKED");
      const opp: Opportunity = {
        id,
        name: input.name.trim(),
        account: input.account,
        vertical: input.vertical,
        stage: "Lead",
        value: Math.round(input.value),
        probability: 10,
        owner,
        closeDate: input.closeDate,
        nextAction: "Qualify scope, budget and decision date",
        nextActionDue: addDays(TODAY, 2),
        source: input.source,
      };
      db.opportunities.unshift(opp);
      return opp;
    },
    { action: "created lead", reference: id, module: "crm" },
  );
}

/** CRM-005: a presales note on the opportunity, kept in the audit trail. */
function logOpportunityNoteLocal(id: string, note: string) {
  return mutate(
    (db) => {
      if (note.trim().length < 4) throw new ApiError("Write at least a few words so the next person can act on it.", "VALIDATION");
      const o = db.opportunities.find((x) => x.id === id);
      if (!o) throw new ApiError(`Opportunity ${id} not found`, "NOT_FOUND");
      return o;
    },
    { action: `noted “${note.trim()}” on`, reference: id, module: "crm" },
    260,
  );
}

/**
 * E2E-01 step 2 (CRM-007, CRM-018, SAL-002): a Draft quotation from the opportunity —
 * account, title and owner carried over, value = sum of the priced lines. The
 * opportunity moves to Proposal. Same rules as crm.startQuotation on the API.
 */
function startQuotationLocal(opportunityId: string, lines: QuoteLine[]) {
  return mutate((db) => {
    requireLevel("crm", "edit");
    requireLevel("sales", "edit");
    const o = db.opportunities.find((x) => x.id === opportunityId);
    if (!o) throw new ApiError(`Opportunity ${opportunityId} not found`, "NOT_FOUND");
    if (o.stage === "Won" || o.stage === "Lost") throw new ApiError(`${o.id} is ${o.stage.toLowerCase()}. Quotations start from an open opportunity.`, "BLOCKED");
    const open = db.quotations.find((q) => q.opportunityId === o.id && OPEN_QUOTE_STATUSES.includes(q.status));
    if (open) throw new ApiError(`${open.id} rev ${open.revision} is still open (${open.status}). Revise it instead of starting a second quotation.`, "BLOCKED");
    const problem = lineProblem(lines);
    if (problem) throw new ApiError(problem, "VALIDATION");
    const clean = lines.map((l) => ({ ...l, description: l.description.trim(), rate: Math.round(l.rate) }));
    const value = quoteValue(clean);
    const q: Quotation = {
      id: nextId(db.quotations.map((x) => x.id), "QUO"),
      opportunityId: o.id,
      customer: o.account,
      title: o.name,
      revision: "A",
      value,
      validUntil: addDays(TODAY, QUOTE_VALIDITY_DAYS),
      status: "Draft",
      owner: actorName(),
      revisionNote: "First issue",
      lines: clean,
    };
    db.quotations.push(q);
    Object.assign(o, { stage: "Proposal", nextAction: `Send ${q.id} rev A to ${o.account}`, nextActionDue: addDays(TODAY, 3) });
    addAudit(db, `started ${q.id} (${inr(value)}) from`, o.id, "crm");
    addAudit(db, `drafted rev A from ${o.id}:`, q.id, "sales");
    return q;
  });
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const createRenewalOpportunity = defineCommand("crm.createRenewalOpportunity", (contractId) => ({ contractId }), createRenewalOpportunityLocal);
export const createOpportunity = defineCommand("crm.createOpportunity", (input, owner) => ({ input, owner }), createOpportunityLocal);
export const logOpportunityNote = defineCommand("crm.logOpportunityNote", (id, note) => ({ id, note }), logOpportunityNoteLocal);
export const startQuotation = defineCommand("crm.startQuotation", (opportunityId, lines) => ({ opportunityId, lines }), startQuotationLocal);
