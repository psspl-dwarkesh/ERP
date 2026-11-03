/**
 * Drop Threadline's tables, re-run migrations, reseed. Only our own tables and the
 * migration journal are dropped, so a shared database (Supabase's `public` schema,
 * with its roles and grants) is left otherwise untouched.
 */
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { connect } from "./client";
import * as schema from "./schema";
import { DEMO_PASSWORD, seed } from "./seed";

const conn = await connect();
const tables = Object.values(schema).filter((t) => is(t, PgTable)).map((t) => getTableName(t as PgTable));
for (const name of tables) await conn.db.execute(sql.raw(`DROP TABLE IF EXISTS "${name}" CASCADE`));
await conn.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
await conn.migrate();
await seed(conn.db);
console.log(`Dropped and recreated ${tables.length} tables, reseeded. Demo password: ${DEMO_PASSWORD}`);
await conn.close();
