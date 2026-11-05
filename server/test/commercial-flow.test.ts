/**
 * E2E-01 against the real API: opportunity → quotation → revisions and the discount
 * gate → acceptance → sales order → project, plus the refusals along the way.
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { connect, type Database } from "../src/db/client";
import * as s from "../src/db/schema";
import { DEMO_PASSWORD, seed } from "../src/db/seed";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
const cookies: Record<string, string> = {};
const EMAIL = { sales: "sana.kapoor@pinnacle.example", ops: "arjun.mehta@pinnacle.example", pm: "ananya.rao@pinnacle.example" };

beforeAll(async () => {
  const conn = await connect({ memory: true });
  await conn.migrate();
  await seed(conn.db);
  db = conn.db;
  app = await buildApp(conn.db, { logger: false, serveFrontend: false });
  close = async () => {
    await app.close();
    await conn.close();
  };
  for (const [k, email] of Object.entries(EMAIL)) {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: DEMO_PASSWORD } });
    expect(res.statusCode, `${k} login`).toBe(200);
    cookies[k] = String(res.headers["set-cookie"]).split(";")[0];
  }
}, 60_000);

afterAll(async () => close?.());

type Who = keyof typeof EMAIL;
const get = async (who: Who, url: string) => (await app.inject({ method: "GET", url, headers: { cookie: cookies[who] } })).json();
const cmd = (who: Who, name: string, payload: unknown) => app.inject({ method: "POST", url: `/api/commands/${name}`, headers: { cookie: cookies[who] }, payload: payload as object });
const find = async <T extends { id: string }>(url: string, id: string): Promise<T> => ((await get("ops", url)) as T[]).find((x) => x.id === id)!;

const LINES = [
  { description: "PLC, remote I/O and HMI", billing: "Material", qty: 1, rate: 3_600_000 },
  { description: "Application engineering", billing: "Engineering", qty: 120, rate: 15_000 },
  { description: "Site commissioning", billing: "Commissioning", qty: 1, rate: 1_000_000 },
];
const TOTAL = 3_600_000 + 1_800_000 + 1_000_000; // ₹64 L

describe("E2E-01 · enquiry to execution", () => {
  let quoteId = "";
  let orderId = "";

  it("starts a draft quotation from the opportunity and moves it to Proposal", async () => {
    const res = await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0081", lines: LINES });
    expect(res.statusCode, res.body).toBe(200);
    const q = res.json().data;
    quoteId = q.id;
    expect(q).toMatchObject({ opportunityId: "OPP-0081", customer: "Summit Engineering", revision: "A", status: "Draft", value: TOTAL, owner: "Sana Kapoor" });
    expect(q.id).toMatch(/^QUO-\d{4}$/);
    expect(q.lines).toHaveLength(3);
    const opp = await find<{ id: string; stage: string }>("/api/opportunities", "OPP-0081");
    expect(opp.stage).toBe("Proposal");
  });

  it("refuses a second open quotation, closed opportunities, bad lines and roles without access", async () => {
    const again = await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0081", lines: LINES });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.message).toMatch(/still open/);
    expect((await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0069", lines: LINES })).statusCode).toBe(409); // Won
    expect((await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0066", lines: LINES })).statusCode).toBe(409); // Lost
    expect((await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0084", lines: [] })).statusCode).toBe(400);
    const zeroRate = await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0084", lines: [{ ...LINES[0], rate: 0 }] });
    expect(zeroRate.statusCode).toBe(400);
    expect(zeroRate.json().error.message).toMatch(/Line 1/);
    expect((await cmd("pm", "crm.startQuotation", { opportunityId: "OPP-0084", lines: LINES })).statusCode).toBe(403);
  });

  it("issues a revision inside the owner's authority without approval and keeps rev A as history", async () => {
    expect((await cmd("sales", "sales.reviseQuotation", { quotationId: quoteId, changes: { lines: LINES }, reason: "short" })).statusCode).toBe(400);
    const lines = [LINES[0], { ...LINES[1], qty: 100 }, LINES[2]]; // −₹3 L, 4.7% below first issue
    const res = await cmd("sales", "sales.reviseQuotation", { quotationId: quoteId, changes: { lines }, reason: "Engineering hours trimmed after site survey" });
    expect(res.statusCode, res.body).toBe(200);
    const { quotation: q, approvalId } = res.json().data;
    expect(approvalId).toBeUndefined();
    expect(q).toMatchObject({ revision: "B", status: "Draft", value: TOTAL - 300_000, revisionNote: "Engineering hours trimmed after site survey" });
    expect(q.revisions).toHaveLength(1);
    expect(q.revisions[0]).toMatchObject({ revision: "A", value: TOTAL, wasStatus: "Draft", note: "First issue", supersededBy: "Sana Kapoor" });
    expect(q.revisions[0].lines).toHaveLength(3);
  });

  it("gates a discount beyond the authority, measured from the first issue, behind an approval", async () => {
    const lines = [{ ...LINES[0], rate: 3_200_000 }, { ...LINES[1], qty: 100 }, LINES[2]]; // ₹57 L, 10.9% below rev A
    const res = await cmd("sales", "sales.reviseQuotation", { quotationId: quoteId, changes: { lines }, reason: "Competitive price to match the customer's budget" });
    expect(res.statusCode, res.body).toBe(200);
    const { quotation: q, approvalId } = res.json().data;
    expect(q).toMatchObject({ revision: "C", status: "In review", value: 5_700_000 });
    expect(approvalId).toMatch(/^APR-/);
    const approval = await find<{ id: string; status: string; title: string; reference: string }>("/api/approvals", approvalId);
    expect(approval).toMatchObject({ status: "Pending", reference: quoteId, title: expect.stringContaining("Rev C") });

    // Nothing moves while the gate is open.
    expect((await cmd("sales", "sales.sendQuotation", { quotationId: quoteId })).statusCode).toBe(409);
    expect((await cmd("sales", "sales.recordAcceptance", { quotationId: quoteId, customerPo: "SE/PO/26/0442", acceptedOn: "2026-11-03" })).statusCode).toBe(409);
    expect((await cmd("sales", "sales.reviseQuotation", { quotationId: quoteId, changes: { lines }, reason: "Another try at the price" })).statusCode).toBe(409);

    // The maker can't approve their own discount; the Operations head can.
    expect((await cmd("sales", "approvals.decide", { id: approvalId, decision: "Approved", reason: "" })).statusCode).toBe(403);
    const ok = await cmd("ops", "approvals.decide", { id: approvalId, decision: "Approved", reason: "Strategic account" });
    expect(ok.statusCode, ok.body).toBe(200);
  });

  it("sends the approved revision and records acceptance as a sales order at the quoted value", async () => {
    const sent = await cmd("sales", "sales.sendQuotation", { quotationId: quoteId });
    expect(sent.statusCode, sent.body).toBe(200);
    expect(sent.json().data.status).toBe("Sent");

    expect((await cmd("sales", "sales.recordAcceptance", { quotationId: quoteId, customerPo: "SE/PO/26/0442", acceptedOn: "2026-12-01" })).statusCode).toBe(400); // future
    expect((await cmd("sales", "sales.recordAcceptance", { quotationId: quoteId, customerPo: "", acceptedOn: "2026-11-03" })).statusCode).toBe(400);

    const res = await cmd("sales", "sales.recordAcceptance", { quotationId: quoteId, customerPo: "SE/PO/26/0442", acceptedOn: "2026-11-03" });
    expect(res.statusCode, res.body).toBe(200);
    const { quotation: q, order } = res.json().data;
    orderId = order.id;
    expect(q.status).toBe("Accepted");
    expect(order).toMatchObject({ quotationId: quoteId, customer: "Summit Engineering", value: 5_700_000, billed: 0, status: "Confirmed", customerPo: "SE/PO/26/0442", acceptedOn: "2026-11-03" });
    expect(order.id).toMatch(/^SO-\d{4}$/);
    const opp = await find<{ id: string; stage: string; probability: number }>("/api/opportunities", "OPP-0081");
    expect(opp).toMatchObject({ stage: "Won", probability: 100 });

    // The accepted revision is fixed.
    expect((await cmd("sales", "sales.reviseQuotation", { quotationId: quoteId, changes: { lines: LINES }, reason: "Customer asked for one more panel" })).statusCode).toBe(409);
    expect((await cmd("sales", "sales.recordAcceptance", { quotationId: quoteId, customerPo: "SE/PO/26/0443", acceptedOn: "2026-11-03" })).statusCode).toBe(409);
  });

  it("opens the project from the order with the order's value, the vertical's milestone plan and an 80% budget", async () => {
    const payload = { salesOrderId: orderId, manager: "Ananya Rao", start: "2026-11-10", due: "2027-05-28" };
    expect((await cmd("sales", "projects.openFromOrder", payload)).statusCode).toBe(403); // Sales can view projects, not open them
    expect((await cmd("pm", "projects.openFromOrder", { ...payload, due: "2026-11-01" })).statusCode).toBe(400);
    expect((await cmd("pm", "projects.openFromOrder", { ...payload, manager: "Nobody Here" })).statusCode).toBe(400);

    const res = await cmd("pm", "projects.openFromOrder", payload);
    expect(res.statusCode, res.body).toBe(200);
    const p = res.json().data;
    expect(p).toMatchObject({ customer: "Summit Engineering", customerId: "CUS-0038", site: "Bhiwandi works", vertical: "Turnkey automation", manager: "Ananya Rao", status: "Planning", salesOrder: orderId, contractValue: 5_700_000, budget: 4_560_000 });
    const billable = p.milestones.filter((m: { billable?: number }) => m.billable);
    expect(billable.map((m: { billable: number }) => m.billable)).toEqual([1_140_000, 2_280_000, 2_280_000]);
    expect(p.milestones.at(-1).due).toBe("2027-05-28");
    expect(p.team).toEqual(["EMP-0034"]);

    const so = await find<{ id: string; projectId?: string; status: string }>("/api/sales-orders", orderId);
    expect(so).toMatchObject({ projectId: p.id, status: "In fulfilment" });

    const again = await cmd("pm", "projects.openFromOrder", payload);
    expect(again.statusCode).toBe(409);
    expect(again.json().error.message).toMatch(/already delivered through/);
  });

  it("refuses a project for an order with no quotation behind it", async () => {
    const res = await cmd("pm", "projects.openFromOrder", { salesOrderId: "SO-0201", manager: "Ananya Rao", start: "2026-11-10", due: "2027-03-31" });
    expect(res.statusCode).toBe(409);
  });

  it("refuses acceptance of a lapsed quotation and of a draft that was never sent", async () => {
    await db.update(s.quotations).set({ validUntil: "2026-10-31" }).where(eq(s.quotations.id, "QUO-0240"));
    const lapsed = await cmd("sales", "sales.recordAcceptance", { quotationId: "QUO-0240", customerPo: "MF/PO/26/2790", acceptedOn: "2026-11-03" });
    expect(lapsed.statusCode).toBe(409);
    expect(lapsed.json().error.message).toMatch(/lapsed/);
    const draft = await cmd("sales", "sales.recordAcceptance", { quotationId: "QUO-0242", customerPo: "NSP/PO/26/1300", acceptedOn: "2026-11-03" });
    expect(draft.statusCode).toBe(409);
  });

  it("refuses a customer PO already booked against another order", async () => {
    const res = await cmd("sales", "crm.startQuotation", { opportunityId: "OPP-0084", lines: [{ description: "Calibration of 40 instruments", billing: "Engineering", qty: 40, rate: 13_500 }] });
    expect(res.statusCode, res.body).toBe(200);
    const q = res.json().data;
    expect((await cmd("sales", "sales.sendQuotation", { quotationId: q.id })).statusCode).toBe(200);
    const dupe = await cmd("sales", "sales.recordAcceptance", { quotationId: q.id, customerPo: "AB/CAL/26/007", acceptedOn: "2026-11-03" }); // SO-0172
    expect(dupe.statusCode).toBe(409);
    expect(dupe.json().error.message).toMatch(/already booked/);
  });
});
