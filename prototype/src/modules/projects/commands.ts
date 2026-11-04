import { ApiError, mutate, defineCommand } from "../../api/client";
import { addAudit, nextId, requireLevel } from "../../api/command-kit";
import { NOW, TODAY } from "../../api/fixtures";
import { inr } from "../../api/format";
import type { Approval, Project } from "../../api/types";
import { BUDGET_SHARE, milestonePlan, planProblem } from "./plan";

export type ChangeKind = "Scope variation" | "Schedule extension" | "Cost variation" | "Technical deviation";

export interface ChangeRequestInput {
  projectId: string;
  title: string;
  kind: ChangeKind;
  costImpact: number; // rupees, may be 0
  scheduleDays: number; // may be 0
  milestoneId?: string;
  reason: string;
}

export const CHANGE_REQUEST_TYPE = "Project change request";

/**
 * A change request is an approval, not an edit: budget and dates stay as they are
 * until the commercial head decides. It lands in the shared approvals inbox.
 */
function raiseChangeRequestLocal(input: ChangeRequestInput) {
  return mutate(
    (db) => {
      const project = db.projects.find((p) => p.id === input.projectId);
      if (!project) throw new ApiError(`Project ${input.projectId} not found`, "VALIDATION");
      if (project.status === "Closed") throw new ApiError("Closed projects can't take change requests. Reopen the project first.", "BLOCKED");
      if (input.title.trim().length < 6) throw new ApiError("Give the change a title of at least 6 characters.", "VALIDATION");
      if (input.reason.trim().length < 20) throw new ApiError("Explain the reason in at least 20 characters so the approver can judge it.", "VALIDATION");
      const next = Math.max(0, ...db.approvals.map((a) => Number(a.id.split("-")[1]) || 0)) + 1;
      const ms = project.milestones.find((m) => m.id === input.milestoneId);
      const impact = [
        input.costImpact ? `${input.costImpact > 0 ? "+" : ""}${inr(input.costImpact)}` : null,
        input.scheduleDays ? `${input.scheduleDays > 0 ? "+" : ""}${input.scheduleDays} days` : null,
      ].filter(Boolean);
      const approval: Approval = {
        id: `APR-${String(next).padStart(4, "0")}`,
        type: CHANGE_REQUEST_TYPE,
        module: "projects",
        reference: project.id,
        title: `${input.kind}: ${input.title.trim()}`,
        maker: "Arjun Mehta",
        value: impact.length ? impact.join(" · ") : "No cost or date impact",
        submitted: NOW,
        level: "Level 1 of 1 · Commercial head",
        status: "Pending",
        evidence: [input.reason.trim(), ms ? `Affects ${ms.id} ${ms.name}` : `Project ${project.id} · ${project.customer}`],
      };
      db.approvals.unshift(approval);
      return approval;
    },
    { action: "raised a change request on", reference: input.projectId, module: "projects" },
  );
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const raiseChangeRequest = defineCommand("projects.raiseChangeRequest", (input) => (input), raiseChangeRequestLocal);

/**
 * E2E-01 step 6 (SAL-006, CRM-018): open the delivery project from a sales order.
 * Customer, site and vertical come from the opportunity behind the accepted quotation,
 * contract value from the order; milestones follow the vertical's billing pattern and
 * the working budget is 80% of value. Same rules as projects.openFromOrder on the API.
 */
export const openFromOrder = defineCommand(
  "projects.openFromOrder",
  (salesOrderId: string, manager: string, start: string, due: string) => ({ salesOrderId, manager, start, due }),
  (salesOrderId: string, manager: string, start: string, due: string) =>
    mutate((db) => {
      requireLevel("projects", "edit");
      const so = db.salesOrders.find((x) => x.id === salesOrderId);
      if (!so) throw new ApiError(`Sales order ${salesOrderId} not found`, "NOT_FOUND");
      if (so.projectId) throw new ApiError(`${so.id} is already delivered through ${so.projectId}.`, "BLOCKED");
      if (so.status === "Closed") throw new ApiError(`${so.id} is closed. A project can't be opened against it.`, "BLOCKED");
      const q = db.quotations.find((x) => x.id === so.quotationId);
      const o = db.opportunities.find((x) => x.id === q?.opportunityId);
      if (!o) throw new ApiError(`${so.id} has no accepted quotation and opportunity behind it, so there is no scope to plan from. Contract renewals run on their service schedule.`, "BLOCKED");
      const pm = db.people.find((p) => p.name === manager.trim());
      if (!pm) throw new ApiError("Choose the project manager from the people directory.", "VALIDATION");
      const problem = planProblem(start, due, TODAY);
      if (problem) throw new ApiError(problem, "VALIDATION");
      const cust = db.customers.find((c) => c.name === o.account);
      if (!cust) throw new ApiError(`${o.account} isn't in the customer master. Add the account before opening a project.`, "BLOCKED");
      const project: Project = {
        id: nextId(db.projects.map((p) => p.id), "PRJ"),
        name: so.title,
        customerId: cust.id,
        customer: cust.name,
        site: [...cust.sites].sort((a, b) => a.id.localeCompare(b.id))[0]?.name ?? "Site to be confirmed",
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
        milestones: milestonePlan(o.vertical, start, due, so.value, TODAY),
        risks: [],
        documents: [],
        team: [pm.id],
        health: { schedule: "ok", cost: "ok", material: "neutral" },
      };
      db.projects.push(project);
      Object.assign(so, { projectId: project.id, status: "In fulfilment" });
      Object.assign(o, { nextAction: `Handed to Projects as ${project.id}`, nextActionDue: TODAY });
      addAudit(db, `opened from ${so.id} for ${pm.name}:`, project.id, "projects");
      addAudit(db, `handed to Projects as ${project.id}:`, so.id, "sales");
      return project;
    }),
);
