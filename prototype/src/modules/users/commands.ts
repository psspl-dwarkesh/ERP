import { mutate } from "../../api/client";
import type { ModuleKey } from "../../api/types";

/** USR-010/016: exports are audit events too. */
export function logExport(what: string, reference: string, module: ModuleKey = "users") {
  return mutate(() => null, { action: `exported ${what} —`, reference, module }, 120);
}
