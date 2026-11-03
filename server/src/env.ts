import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Runtime configuration. Everything has a safe local default so `npm run dev` works
 * with zero setup; production sets DATABASE_URL, SESSION_SECRET and COOKIE_SECURE.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  /** postgres://… → real PostgreSQL. Unset → embedded PGlite (real Postgres in WASM) under PGLITE_DIR. */
  databaseUrl: process.env.DATABASE_URL ?? "",
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
