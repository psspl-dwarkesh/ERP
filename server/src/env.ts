import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Local secrets live in server/.env (git-ignored). Real environment variables always win.
const dotenv = resolve(here, "../.env");
if (existsSync(dotenv) && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  for (const line of readFileSync(dotenv, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/**
 * Runtime configuration. Everything has a safe local default so `npm run dev` works
 * with zero setup; production sets DATABASE_URL, SESSION_SECRET and COOKIE_SECURE.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  /** postgres://… → real PostgreSQL. Unset → embedded PGlite (real Postgres in WASM) under PGLITE_DIR. */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** TLS to the database. Defaults on for any non-local host (Supabase, Neon and Render require it). */
  databaseSsl: process.env.DATABASE_SSL ? process.env.DATABASE_SSL === "true" : !/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? ""),
  /** Path to the database's CA certificate (Supabase: Project Settings → Database → SSL → Download certificate). */
  databaseSslCa: process.env.DATABASE_SSL_CA ?? "",
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 10),
  pgliteDir: process.env.PGLITE_DIR ?? resolve(here, "../.data/pglite"),
  /** Session lifetime in hours. */
  sessionHours: Number(process.env.SESSION_HOURS ?? 12),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  /** The demo dataset is written for Tue 3 Nov 2026; business rules read "today" from here. */
  businessDate: process.env.BUSINESS_DATE ?? "2026-11-03",
  /** Allowed browser origin when the front end is served from a different host than the API. */
  corsOrigin: process.env.CORS_ORIGIN ?? "",
  logLevel: process.env.LOG_LEVEL ?? "info",
};
