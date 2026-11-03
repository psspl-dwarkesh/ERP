import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "../env";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A transaction handle has the same query API as the database. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

let instance: { db: Database; close: () => Promise<void>; migrate: () => Promise<void> } | null = null;

/**
 * One connection layer, two engines:
 *  - DATABASE_URL set  → node-postgres pool against a real PostgreSQL server.
 *  - otherwise         → PGlite, the real PostgreSQL engine compiled to WASM, stored on disk.
 * Pass `memory: true` for an isolated throwaway database (tests).
 */
export async function connect(opts: { memory?: boolean } = {}) {
  if (instance && !opts.memory) return instance;
  if (env.databaseUrl && !opts.memory) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: env.databaseUrl, max: 10 });
    const db = drizzle(pool, { schema }) as unknown as Database;
    instance = { db, close: () => pool.end(), migrate: () => migrate(db as never, { migrationsFolder }) };
    return instance;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (!opts.memory) mkdirSync(env.pgliteDir, { recursive: true });
  const client = opts.memory ? new PGlite() : new PGlite(env.pgliteDir);
  const db = drizzle(client, { schema }) as unknown as Database;
  const conn = { db, close: () => client.close(), migrate: () => migrate(db as never, { migrationsFolder }) };
  if (!opts.memory) instance = conn;
  return conn;
}
