import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type Database } from "../src/db/client";
import { seed } from "../src/db/seed";

/** The database refuses impossible states even if application code had a bug. */
let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  const conn = await connect({ memory: true });
  await conn.migrate();
  await seed(conn.db);
  db = conn.db;
  close = conn.close;
}, 60_000);

afterAll(async () => close?.());

const rejects = async (q: ReturnType<typeof sql>) => {
  try {
    await db.execute(q);
    return false;
  } catch {
    return true;
  }
};

describe("database integrity constraints", () => {
  it("never lets stock go negative", async () => {
    expect(await rejects(sql`update items set on_hand = -1 where id = 'ITM-0089'`)).toBe(true);
  });

  it("never receives more than was ordered", async () => {
    expect(await rejects(sql`update po_lines set received = ordered + 1 where po_id = 'PO-0118' and seq = 1`)).toBe(true);
  });

  it("never accounts for more subcontract material than was issued", async () => {
    expect(await rejects(sql`update subcontract_lines set consumed = issued + 1 where issue_id = 'SI-0044' and seq = 0`)).toBe(true);
  });

  it("only accepts known outbox states", async () => {
    expect(await rejects(sql`update accounting_postings set state = 'Paid' where key = 'BA-0061/R1'`)).toBe(true);
  });

  it("accepts a valid write", async () => {
    expect(await rejects(sql`update items set on_hand = on_hand + 1 where id = 'ITM-0089'`)).toBe(false);
  });
});
