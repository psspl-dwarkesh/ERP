/** Drop everything, re-run migrations, reseed. Local/demo use only. */
import { sql } from "drizzle-orm";
import { connect } from "./client";
import { DEMO_PASSWORD, seed } from "./seed";

const conn = await connect();
await conn.db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
await conn.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
await conn.db.execute(sql`CREATE SCHEMA public`);
await conn.migrate();
await seed(conn.db);
console.log(`Database reset and reseeded. Demo password: ${DEMO_PASSWORD}`);
await conn.close();
