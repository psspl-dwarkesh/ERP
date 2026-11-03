import { ApiError, mutate, defineCommand } from "../../api/client";

/** Ask HR to chase a blocked payroll input. Logged; no message actually leaves the demo. */
function chasePayrollInputLocal(runId: string, check: string) {
  return mutate(
    (db) => {
      const run = db.payrollRuns.find((r) => r.id === runId);
      if (!run) throw new ApiError(`Pay run ${runId} not found`, "NOT_FOUND");
      if (run.status === "Locked") throw new ApiError(`${runId} is locked. Inputs can't change after lock.`, "BLOCKED");
      return run;
    },
    { action: `asked HR to resolve “${check}” on`, reference: runId, module: "payroll" },
    300,
  );
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const chasePayrollInput = defineCommand("payroll.chaseInput", (runId, check) => ({ runId, check }), chasePayrollInputLocal);
