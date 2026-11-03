/**
 * Demo reset for hosted demos (no terminal on Render): empties Threadline's own
 * tables and reseeds the ABC Limited workspace. Only for an admin of Users & Access,
 * only while demo accounts are enabled, and sessions survive so the admin stays signed in.
 */
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { Database } from "./db/client";
import * as schema from "./db/schema";
import { seed } from "./db/seed";

export const demoResetEnabled = () => process.env.DEMO_ACCOUNTS !== "false" && process.env.DEMO_RESET !== "false";

export async function resetDemoData(db: Database) {
  const tables = Object.values(schema)
    .filter((t) => is(t, PgTable))
    .map((t) => getTableName(t as PgTable));
  const keepSessions = await db.select().from(schema.sessions);
  await db.execute(sql.raw(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
  await seed(db);
  // Seed recreates the same user ids, so existing sessions stay valid.
  if (keepSessions.length) await db.insert(schema.sessions).values(keepSessions).onConflictDoNothing();
  return { tables: tables.length };
}
