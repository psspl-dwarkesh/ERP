/**
 * Cross-cutting pieces every route and command uses: typed errors, the signed-in
 * actor, permission checks, record id sequences and the audit trail.
 */
import { eq, sql } from "drizzle-orm";
import type { ModuleKey } from "../../prototype/src/api/types";
import type { Tx } from "./db/client";
import { env } from "./env";
import { auditEvents, idSequences } from "./db/schema";

export type ErrorCode = "VALIDATION" | "BLOCKED" | "NOT_FOUND" | "FORBIDDEN" | "UNAUTHENTICATED" | "CONFLICT";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BLOCKED: 409,
  CONFLICT: 409,
};

/** A business-rule refusal. Its message is written for the person who caused it. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const fail = {
  validation: (m: string) => new AppError("VALIDATION", m),
  blocked: (m: string) => new AppError("BLOCKED", m),
  notFound: (what: string, id: string) => new AppError("NOT_FOUND", `${what} ${id} not found`),
  forbidden: (m: string) => new AppError("FORBIDDEN", m),
};

/* ---------------------------------------------------------------- permissions */
export type Level = "none" | "view" | "edit" | "approve" | "admin";
const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2, approve: 3, admin: 4 };

export interface Actor {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  personId: string | null;
  permissions: Record<ModuleKey, Level>;
}

export function can(actor: Actor, module: ModuleKey, level: Level) {
  return RANK[actor.permissions[module] ?? "none"] >= RANK[level];
}

export function requireLevel(actor: Actor, module: ModuleKey, level: Level) {
  if (!can(actor, module, level)) {
    throw fail.forbidden(`Your role (${actor.roleName}) has ${actor.permissions[module] ?? "no"} access to ${module}; this needs ${level}.`);
  }
}

/* ---------------------------------------------------------------- business clock */
/** "Today" for business rules. The demo dataset is anchored to 3 Nov 2026. */
export const today = () => env.businessDate;

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- ids */
/** Next human id for a prefix (PR → PR-0087). Row-locked, so concurrent creates never collide. */
export async function nextId(tx: Tx, prefix: string, pad = 4) {
  const rows = await tx
    .update(idSequences)
    .set({ next: sql`${idSequences.next} + 1` })
    .where(eq(idSequences.prefix, prefix))
    .returning({ n: sql<number>`${idSequences.next} - 1` });
  let n = rows[0]?.n;
  if (n === undefined) {
    await tx.insert(idSequences).values({ prefix, next: 2 });
    n = 1;
  }
  return `${prefix}-${String(n).padStart(pad, "0")}`;
}

/* ---------------------------------------------------------------- audit */
export async function audit(tx: Tx, actor: Actor, action: string, reference: string, module: ModuleKey, detail?: unknown) {
  await tx.insert(auditEvents).values({
    id: await nextId(tx, "ACT", 6),
    at: new Date().toISOString(),
    actor: actor.name,
    userId: actor.userId,
    action,
    reference,
    module,
    detail: detail ?? null,
  });
}

/** ₹48.50 L / ₹1.42 Cr / ₹8,450 — same format the UI uses, for messages and evidence lines. */
export function inr(value: number) {
  const v = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2)} L`;
  return `${sign}₹${v.toLocaleString("en-IN")}`;
}
