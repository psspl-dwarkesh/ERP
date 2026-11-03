import { ApiError, mutate, defineCommand } from "../../api/client";
import { NOW } from "../../api/fixtures";
import { inr } from "../../api/format";
import type { Approval } from "../../api/types";

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
