import { connect } from "./client";

const conn = await connect();
await conn.migrate();
console.log("Migrations applied.");
await conn.close();
