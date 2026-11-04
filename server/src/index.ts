import { buildApp } from "./app";
import { connect } from "./db/client";
import * as schema from "./db/schema";
import { DEMO_PASSWORD, ensureFullAccess, seed } from "./db/seed";
import { env } from "./env";

const conn = await connect();
await conn.migrate();
// First run on an empty database: load the demo workspace so the app is usable immediately.
if (!(await conn.db.select().from(schema.roles).limit(1)).length && process.env.AUTO_SEED !== "false") {
  await seed(conn.db);
  console.log(`Seeded the ABC Limited demo workspace. Demo password: ${DEMO_PASSWORD}`);
}
// Backstage presenter account: ensure it exists even on an already-seeded database. Never fatal.
await ensureFullAccess(conn.db).catch((e) => console.error("ensureFullAccess failed:", e));

const app = await buildApp(conn.db);
const shutdown = async () => {
  await app.close();
  await conn.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: env.port, host: env.host });
app.log.info(`Threadline API on http://${env.host}:${env.port} · ${env.databaseUrl ? "PostgreSQL" : `PGlite at ${env.pgliteDir}`}`);
