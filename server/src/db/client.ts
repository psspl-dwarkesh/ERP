import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
 * TLS to hosted Postgres, always verified. With DATABASE_SSL_CA the server trusts the
 * provider's CA (Supabase ships its own); otherwise Node's standard roots are used.
 */
function sslOptions() {
  if (!env.databaseSsl) return undefined;
  const caPath = env.databaseSslCa ? resolve(dirname(fileURLToPath(import.meta.url)), "../..", env.databaseSslCa) : "";
  if (caPath && !existsSync(caPath)) throw new Error(`DATABASE_SSL_CA points to ${caPath}, which doesn't exist.`);
  return caPath ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : { rejectUnauthorized: true };
}

/**
 * PGlite is single-process: a second process opening the same folder (say, `db:reset`
 * while the server runs) silently diverges from it. Refuse instead, naming the holder.
 */
function claimLock(dir: string) {
  const lock = resolve(dir, "..", "pglite.lock");
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8"));
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = pid !== process.pid;
    } catch {
      alive = false;
    }
    if (alive) throw new Error(`The local database is in use by process ${pid} (probably the API server). Stop it before running this command.`);
  }
  writeFileSync(lock, String(process.pid));
  const release = () => {
    try {
      if (readFileSync(lock, "utf8") === String(process.pid)) rmSync(lock);
    } catch {
      /* already gone */
    }
  };
  process.once("exit", release);
}

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
    const pool = new Pool({ connectionString: env.databaseUrl, max: env.dbPoolMax, ssl: sslOptions(), connectionTimeoutMillis: 15_000 });
    const db = drizzle(pool, { schema }) as unknown as Database;
    instance = { db, close: () => pool.end(), migrate: () => migrate(db as never, { migrationsFolder }) };
    return instance;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (!opts.memory) {
    mkdirSync(env.pgliteDir, { recursive: true });
    claimLock(env.pgliteDir);
  }
  const client = opts.memory ? new PGlite() : new PGlite(env.pgliteDir);
  const db = drizzle(client, { schema }) as unknown as Database;
  const conn = { db, close: () => client.close(), migrate: () => migrate(db as never, { migrationsFolder }) };
  if (!opts.memory) instance = conn;
  return conn;
}
