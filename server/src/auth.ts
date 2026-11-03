/**
 * Password sign-in with server-side sessions.
 * The browser holds an opaque random token in an httpOnly cookie; the database
 * stores only its SHA-256, so a leaked table can't be replayed. Five failed
 * attempts lock the account for 15 minutes.
 */
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import type { ModuleKey } from "../../prototype/src/api/types";
import { AppError, type Actor, type Level } from "./core";
import type { Database } from "./db/client";
import { people, rolePermissions, roles, sessions, users } from "./db/schema";
import { env } from "./env";

export const SESSION_COOKIE = "tl_session";
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function loadActor(db: Database, userId: string): Promise<Actor | null> {
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email, roleId: users.roleId, roleName: roles.name, personId: users.personId, status: users.status })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, userId));
  if (!u || u.status !== "Active") return null;
  const perms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, u.roleId));
  return {
    userId: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    roleName: u.roleName,
    personId: u.personId,
    permissions: Object.fromEntries(perms.map((p) => [p.module, p.level])) as Record<ModuleKey, Level>,
  };
}

export async function login(db: Database, email: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const [u] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email.trim()})`);
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  const denied = new AppError("UNAUTHENTICATED", "That email and password don't match an active account.");
  if (!u) {
    await bcrypt.compare(password, DUMMY_HASH); // equalise timing with a real check
    throw denied;
  }
  // Compare as instants: Postgres returns "2026-11-04 01:14:53+00", JS ISO strings use "T" — never compare them as text.
  if (u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now()) {
    throw new AppError("FORBIDDEN", `Too many failed attempts. Try again after ${new Date(u.lockedUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`);
  }
  if (u.status !== "Active") throw denied;
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) {
    const failed = u.failedLogins + 1;
    await db
      .update(users)
      .set({ failedLogins: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null })
      .where(eq(users.id, u.id));
    throw denied;
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionHours * 3_600_000).toISOString();
  await db.insert(sessions).values({ id: sha256(token), userId: u.id, expiresAt, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null });
  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() }).where(eq(users.id, u.id));
  return { token, expiresAt, userId: u.id };
}

export async function resolveSession(db: Database, token: string | undefined) {
  if (!token) return null;
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date().toISOString())));
  return row ? loadActor(db, row.userId) : null;
}

export async function logout(db: Database, token: string | undefined) {
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

/** Public profile sent to the browser after sign-in. */
export async function profile(db: Database, actor: Actor) {
  const person = actor.personId ? (await db.select().from(people).where(eq(people.id, actor.personId)))[0] : undefined;
  return {
    id: actor.userId,
    name: actor.name,
    email: actor.email,
    role: actor.roleName,
    roleId: actor.roleId,
    personId: actor.personId,
    title: person?.role ?? actor.roleName,
    initials: person?.initials ?? actor.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""),
    permissions: actor.permissions,
  };
}

/** Accounts offered on the demo sign-in screen (never includes hashes). */
export async function demoAccounts(db: Database) {
  return db
    .select({ email: users.email, name: users.name, role: roles.name, roleId: users.roleId })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.status, "Active"))
    .orderBy(users.id);
}
