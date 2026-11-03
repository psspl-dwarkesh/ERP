/**
 * E2E-12 exit & handover. The checklist is the record: each line is closed by
 * its owner with evidence, and the exit closes only when no line is open.
 */
import { ApiError, defineCommand, mutate } from "../../api/client";
import type { ExitItemKey } from "../../api/types";

const ME = "Arjun Mehta";

export interface ExitItemInput {
  outcome: string;
  /** custody: condition on return · commitment / delegation: the new owner */
  detail?: string;
}

export const completeExitItem = defineCommand(
  "hr.completeExitItem",
  (caseId: string, key: ExitItemKey, input: ExitItemInput) => ({ caseId, key, ...input }),
  (caseId: string, key: ExitItemKey, input: ExitItemInput) =>
    mutate(
      (db) => {
        const c = db.exitCases.find((x) => x.id === caseId);
        if (!c) throw new ApiError(`Exit ${caseId} not found`, "NOT_FOUND");
        if (c.status === "Closed") throw new ApiError(`${c.id} is closed.`, "BLOCKED");
        const item = c.items.find((i) => i.key === key);
        if (!item) throw new ApiError("That checklist line doesn't exist.", "NOT_FOUND");
        if (item.status !== "Open") throw new ApiError(`“${item.item}” is already closed.`, "BLOCKED");
        const detail = input.detail?.trim() ?? "";
        if (input.outcome.trim().length < 8) throw new ApiError("Write what was done (at least 8 characters). It is the evidence on the exit record.", "VALIDATION");
        if (key === "custody") {
          if (detail.length < 4) throw new ApiError("Record the condition the instrument came back in.", "VALIDATION");
          const asset = db.assets.find((a) => a.id === "AST-0086");
          if (asset) asset.custodian = "Central lab store";
        }
        if (key === "commitment" || key === "delegation") {
          const person = db.people.find((p) => p.name === detail);
          if (!person) throw new ApiError("Choose who takes this over.", "VALIDATION");
          if (person.id === c.personId) throw new ApiError("The leaver can't take over their own commitment.", "VALIDATION");
        }
        if (key === "claim") {
          const claim = db.claims.find((x) => x.id === "CLM-0071");
          if (claim && claim.status === "Pending") throw new ApiError("CLM-0071 is still pending. Approve or reject it in Claims first; payroll settles it in the full and final.", "BLOCKED");
        }
        if (key === "identity" && detail && detail > c.lastDay) {
          throw new ApiError(`Access must end on or before the last working day (${c.lastDay}).`, "VALIDATION");
        }
        Object.assign(item, {
          status: "Done",
          outcome: [input.outcome.trim(), detail && key !== "identity" ? `→ ${detail}` : detail ? `· ends ${detail}` : ""].filter(Boolean).join(" "),
          doneBy: ME,
          doneAt: new Date().toISOString(),
        });
        return c;
      },
      { action: `closed exit line “${key}” on`, reference: caseId, module: "hr" },
    ),
);

export const closeExit = defineCommand(
  "hr.closeExit",
  (caseId: string) => ({ caseId }),
  (caseId: string) =>
    mutate(
      (db) => {
        const c = db.exitCases.find((x) => x.id === caseId);
        if (!c) throw new ApiError(`Exit ${caseId} not found`, "NOT_FOUND");
        const open = c.items.filter((i) => i.status === "Open");
        if (open.length) throw new ApiError(`${open.length} line${open.length > 1 ? "s are" : " is"} still open: ${open.map((i) => i.item.toLowerCase()).join(", ")}.`, "BLOCKED");
        c.status = "Closed";
        return c;
      },
      { action: "closed exit", reference: caseId, module: "hr" },
    ),
);
