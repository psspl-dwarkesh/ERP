import { mutate, defineCommand } from "../../api/client";
import type { ModuleKey } from "../../api/types";

/** USR-010/016: exports are audit events too. */
function logExportLocal(what: string, reference: string, module: ModuleKey = "users") {
  return mutate(() => null, { action: `exported ${what} —`, reference, module }, 120);
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
const logExportCmd = defineCommand("users.logExport", (what: string, reference: string, module: ModuleKey) => ({ what, reference, module }), logExportLocal);
export const logExport = (what: string, reference: string, module: ModuleKey = "users") => logExportCmd(what, reference, module);
