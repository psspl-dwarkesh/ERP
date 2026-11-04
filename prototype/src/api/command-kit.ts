/**
 * Small helpers for in-browser command bodies (modules/<m>/commands.ts) so they refuse
 * and record exactly what the API commands do: the same permission message, the
 * next human id for a prefix, and extra audit events when one action touches
 * several records.
 */
import type { Db } from "./client";
import { getSessionUser, type Level } from "./session";
import { ApiError } from "./store";
import type { ModuleKey } from "./types";

const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2, approve: 3, admin: 4 };

/** Mirrors server/src/core.ts requireLevel, so "View as" shows the API's refusal. */
export function requireLevel(module: ModuleKey, level: Level) {
  const u = getSessionUser();
  if (!u) return;
  const has = u.permissions[module] ?? "none";
  if (RANK[has] < RANK[level]) throw new ApiError(`Your role (${u.role}) has ${has === "none" ? "no" : has} access to ${module}; this needs ${level}.`, "FORBIDDEN");
}

/** Next id after the highest existing one (QUO-0242 → QUO-0243), like the server's id sequence. */
export function nextId(ids: string[], prefix: string, pad = 4) {
  const max = ids.reduce((m, id) => (id.startsWith(`${prefix}-`) ? Math.max(m, Number(id.slice(prefix.length + 1)) || 0) : m), 0);
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}

let seq = 0;
/** An audit event besides the one `mutate` writes — for the second record a command changes. */
export function addAudit(db: Db, action: string, reference: string, module: ModuleKey) {
  db.activity.unshift({ id: `ACT-${Date.now()}-${++seq}`, at: new Date().toISOString(), actor: getSessionUser()?.name ?? "Arjun Mehta", action, reference, module });
}

export const actorName = () => getSessionUser()?.name ?? "Arjun Mehta";
