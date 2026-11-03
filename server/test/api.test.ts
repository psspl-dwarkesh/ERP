import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { connect } from "../src/db/client";
import { DEMO_PASSWORD, seed } from "../src/db/seed";

let app: FastifyInstance;
let close: () => Promise<void>;
const cookies: Record<string, string> = {};

const EMAIL = {
  ops: "arjun.mehta@abc.example",
  pm: "ananya.rao@abc.example",
  stores: "imran.sheikh@abc.example",
  hr: "kavya.iyer@abc.example",
  finance: "ritu.agarwal@abc.example",
  qc: "deepa.kulkarni@abc.example",
  sales: "sana.kapoor@abc.example",
};

beforeAll(async () => {
  const conn = await connect({ memory: true });
  await conn.migrate();
  await seed(conn.db);
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

const get = (who: keyof typeof EMAIL, url: string) => app.inject({ method: "GET", url, headers: { cookie: cookies[who] } });
const cmd = (who: keyof typeof EMAIL, name: string, payload: unknown) =>
  app.inject({ method: "POST", url: `/api/commands/${name}`, headers: { cookie: cookies[who] }, payload: payload as object });

describe("authentication", () => {
  it("rejects a wrong password without revealing whether the account exists", async () => {
    const a = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL.ops, password: "nope" } });
    const b = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "nobody@abc.example", password: "nope" } });
    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.json().error.message).toBe(b.json().error.message);
  });

  it("sets an httpOnly session cookie and returns the profile with permissions", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL.pm, password: DEMO_PASSWORD } });
    expect(String(res.headers["set-cookie"])).toMatch(/HttpOnly/i);
    expect(res.json().user).toMatchObject({ name: "Ananya Rao", role: "Project manager" });
    expect(res.json().user.permissions.projects).toBe("edit");
  });

  it("requires a session for data", async () => {
    expect((await app.inject({ method: "GET", url: "/api/projects" })).statusCode).toBe(401);
  });

  it("locks an account after five failed attempts", async () => {
    for (let i = 0; i < 5; i++) await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL.stores, password: "wrong" } });
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL.stores, password: DEMO_PASSWORD } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/Too many failed attempts/);
  });

  it("refuses cross-site state changes", async () => {
    const res = await app.inject({ method: "POST", url: "/api/commands/notifications.markRead", headers: { cookie: cookies.ops, origin: "https://evil.example" }, payload: {} });
    expect(res.statusCode).toBe(403);
  });
});

describe("read models and permissions", () => {
  it("returns projects in the front-end shape, with children", async () => {
    const res = await get("ops", "/api/projects");
    expect(res.statusCode).toBe(200);
    const p = res.json().find((x: { id: string }) => x.id === "PRJ-0264");
    expect(p.milestones).toHaveLength(5);
    expect(p.team).toEqual(["EMP-0034", "EMP-0056", "EMP-0027", "EMP-0063"]);
    expect(p.contractValue).toBe(4850000);
  });

  it("keeps payroll away from roles without access", async () => {
    expect((await get("ops", "/api/payroll-runs")).statusCode).toBe(403);
    expect((await get("hr", "/api/payroll-runs")).statusCode).toBe(200);
  });

  it("filters search to modules the user can see", async () => {
    const ops = (await get("ops", "/api/search?q=PRJ-0264")).json();
    expect(ops.some((h: { id: string }) => h.id === "PRJ-0264")).toBe(true);
    const hr = (await get("hr", "/api/search?q=PRJ-0264")).json();
    expect(hr).toHaveLength(0);
  });
});

describe("approvals", () => {
  it("does not let the maker approve their own requisition", async () => {
    const res = await cmd("pm", "approvals.decide", { id: "APR-0132", decision: "Approved", reason: "" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/maker ≠ checker/);
  });

  it("requires a reason to reject", async () => {
    const res = await cmd("ops", "approvals.decide", { id: "APR-0132", decision: "Rejected", reason: "no" });
    expect(res.statusCode).toBe(400);
  });

  it("enforces the designated approver role", async () => {
    const ops = await cmd("ops", "approvals.decide", { id: "APR-0121", decision: "Approved", reason: "" });
    expect(ops.statusCode).toBe(403);
    expect(ops.json().error.message).toMatch(/Finance owner/);
    const fin = await cmd("finance", "approvals.decide", { id: "APR-0121", decision: "Approved", reason: "" });
    expect(fin.statusCode).toBe(200);
  });

  it("approves PR-0084, updates the requisition, writes the audit trail, and refuses a second decision", async () => {
    const res = await cmd("ops", "approvals.decide", { id: "APR-0132", decision: "Approved", reason: "" });
    expect(res.statusCode).toBe(200);
    const prs = (await get("ops", "/api/purchase-requests")).json();
    expect(prs.find((p: { id: string }) => p.id === "PR-0084").status).toBe("Approved");
    const trail = (await get("ops", "/api/activity")).json();
    expect(trail[0]).toMatchObject({ actor: "Arjun Mehta", action: "approved", reference: "PR-0084" });
    expect((await cmd("ops", "approvals.decide", { id: "APR-0132", decision: "Approved", reason: "" })).statusCode).toBe(409);
  });
});

describe("inventory rules", () => {
  it("blocks issuing stock that is on QC hold", async () => {
    const res = await cmd("ops", "inventory.issueStock", { itemId: "ITM-0137", qty: 1, to: "WO-0187" });
    expect(res.statusCode).toBe(403); // operations head only views inventory
    const stores = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "deepa.kulkarni@abc.example", password: DEMO_PASSWORD } });
    const qc = String(stores.headers["set-cookie"]).split(";")[0];
    const held = await app.inject({ method: "POST", url: "/api/commands/inventory.issueStock", headers: { cookie: qc }, payload: { itemId: "ITM-0137", qty: 1, to: "WO-0187" } });
    expect(held.statusCode).toBe(409);
    expect(held.json().error.message).toMatch(/QC hold/);
    const tooMany = await app.inject({ method: "POST", url: "/api/commands/inventory.issueStock", headers: { cookie: qc }, payload: { itemId: "ITM-0089", qty: 39, to: "WO-0187" } });
    expect(tooMany.statusCode).toBe(409);
    const ok = await app.inject({ method: "POST", url: "/api/commands/inventory.issueStock", headers: { cookie: qc }, payload: { itemId: "ITM-0089", qty: 2, to: "WO-0187" } });
    expect(ok.statusCode).toBe(200);
    const items = (await get("ops", "/api/items")).json();
    expect(items.find((i: { id: string }) => i.id === "ITM-0089").onHand).toBe(46);
  });

  it("commits wiring and reports the assembly block from BOM shortages", async () => {
    const stores = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "deepa.kulkarni@abc.example", password: DEMO_PASSWORD } });
    const qc = String(stores.headers["set-cookie"]).split(";")[0];
    const res = await app.inject({ method: "POST", url: "/api/commands/inventory.advanceWorkOrder", headers: { cookie: qc }, payload: { id: "WO-0187" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().blocked).toMatch(/Assembly is blocked: 3 BOM lines are short/);
    const wo = (await get("ops", "/api/work-orders")).json().find((w: { id: string }) => w.id === "WO-0187");
    expect(wo.stages.find((s: { key: string }) => s.key === "wiring").status).toBe("Done");
    expect(wo.stages.find((s: { key: string }) => s.key === "assembly").status).toBe("Blocked");
  });
});

describe("purchase flow", () => {
  it("awards RFQ-0041 with a rationale and raises PO once the requisition is approved", async () => {
    expect((await cmd("pm", "purchase.awardRfq", { id: "RFQ-0041", vendorId: "VEN-0021", rationale: "cheap" })).statusCode).toBe(400);
    const award = await cmd("pm", "purchase.awardRfq", { id: "RFQ-0041", vendorId: "VEN-0021", rationale: "Only full-fit quote that lands closest to need-by." });
    expect(award.statusCode).toBe(200);
    expect(award.json().data).toMatchObject({ status: "Awarded", awardedTo: "Vector Controls" });
    const po = await cmd("pm", "purchase.raisePurchaseOrder", { rfqId: "RFQ-0041" }); // PR-0084 approved above
    expect(po.statusCode).toBe(200);
    expect(po.json().data).toMatchObject({ vendor: "Vector Controls", value: 284000, status: "Issued" });
    expect((await cmd("pm", "purchase.raisePurchaseOrder", { rfqId: "RFQ-0041" })).statusCode).toBe(409);
  });

  it("refuses a receipt larger than what is outstanding", async () => {
    const res = await cmd("pm", "purchase.recordReceipt", { poId: "PO-0118", lines: [{ index: 1, received: 99, rejected: 0 }] });
    expect(res.statusCode).toBe(409);
  });
});

describe("subcontract custody (E2E-04)", () => {
  it("refuses damage without the partner's report, figures that go down, and closure with material outstanding", async () => {
    const noReport = await cmd("qc", "inventory.reconcileSubcontract", { issueId: "SI-0044", index: 1, consumed: 6, returned: 2, damaged: 2 });
    expect(noReport.statusCode).toBe(400);
    const down = await cmd("qc", "inventory.reconcileSubcontract", { issueId: "SI-0044", index: 1, consumed: 5, returned: 2, damaged: 1 });
    expect(down.statusCode).toBe(409);
    expect((await cmd("qc", "inventory.closeSubcontract", { issueId: "SI-0044" })).statusCode).toBe(409);
  });

  it("posts returns to stock, then routes damage to a variance approval that closes the issue", async () => {
    const before = (await get("ops", "/api/items")).json().find((i: { id: string }) => i.id === "ITM-0214").onHand;
    const lines = [
      { index: 0, consumed: 1, returned: 1, damaged: 0 },
      { index: 1, consumed: 6, returned: 3, damaged: 1 },
      { index: 2, consumed: 3, returned: 1, damaged: 0 },
    ];
    for (const l of lines) {
      const r = await cmd("qc", "inventory.reconcileSubcontract", { issueId: "SI-0044", ...l, partnerReport: "One PSU burnt on bench test; photos attached" });
      expect(r.statusCode, JSON.stringify(r.json())).toBe(200);
    }
    const after = (await get("ops", "/api/items")).json().find((i: { id: string }) => i.id === "ITM-0214").onHand;
    expect(after).toBe(before + 1);
    const close = await cmd("qc", "inventory.closeSubcontract", { issueId: "SI-0044" });
    expect(close.json().data.status).toBe("Variance in approval");
    const approval = (await get("ops", "/api/approvals")).json().find((a: { reference: string }) => a.reference === "SI-0044");
    expect((await cmd("qc", "approvals.decide", { id: approval.id, decision: "Approved", reason: "" })).statusCode).toBe(403);
    expect((await cmd("ops", "approvals.decide", { id: approval.id, decision: "Approved", reason: "" })).statusCode).toBe(200);
    const si = (await get("qc", "/api/subcontract-issues")).json().find((x: { id: string }) => x.id === "SI-0044");
    expect(si.status).toBe("Closed");
  });
});

describe("exit & handover (E2E-12)", () => {
  it("won't close the claim line over a pending claim, or end access after the last day", async () => {
    const claim = await cmd("hr", "hr.completeExitItem", { caseId: "EXT-0003", key: "claim", outcome: "Settled in full and final" });
    expect(claim.statusCode).toBe(409);
    expect(claim.json().error.message).toMatch(/CLM-0071 is still pending/);
    const late = await cmd("hr", "hr.completeExitItem", { caseId: "EXT-0003", key: "identity", outcome: "Deactivation scheduled", detail: "2026-11-20" });
    expect(late.statusCode).toBe(400);
  });

  it("closes lines with evidence and refuses to close the exit while any line is open", async () => {
    const custody = await cmd("hr", "hr.completeExitItem", { caseId: "EXT-0003", key: "custody", outcome: "AST-0086 received at the lab store", detail: "Working, case intact" });
    expect(custody.statusCode).toBe(200);
    const asset = (await get("ops", "/api/assets")).json().find((a: { id: string }) => a.id === "AST-0086");
    expect(asset.custodian).toBe("Central lab store");
    const self = await cmd("hr", "hr.completeExitItem", { caseId: "EXT-0003", key: "commitment", outcome: "PO-0112 handed over", detail: "Priya Menon" });
    expect(self.statusCode).toBe(400);
    expect((await cmd("hr", "hr.closeExit", { caseId: "EXT-0003" })).statusCode).toBe(409);
  });
});

describe("accounting outbox (E2E-10)", () => {
  it("retries a failed send under the same key and won't retry a sent one", async () => {
    const r = await cmd("sales", "sales.retryPosting", { key: "BA-0064/R1" });
    expect(r.statusCode).toBe(200);
    expect(r.json().data.state).toBe("Sent");
    expect((await cmd("sales", "sales.retryPosting", { key: "BA-0064/R1" })).statusCode).toBe(409);
  });

  it("turns an unequal acknowledgement into Needs attention, and a correction supersedes rather than re-sends", async () => {
    const ack = await cmd("sales", "sales.recordAcknowledgement", { key: "BA-0062/R1", external: "ACC-INV/26-27/0460", posted: 150000 });
    expect(ack.json().data.state).toBe("Needs attention");
    const fix = await cmd("sales", "sales.raiseCorrection", { key: "BA-0060/R1", amount: 1246400, reason: "5% retention per SO-0188 clause 7.2" });
    expect(fix.statusCode).toBe(200);
    expect(fix.json().data).toMatchObject({ key: "BA-0060/R2", state: "Queued", supersedes: "BA-0060/R1" });
    const all = (await get("sales", "/api/postings")).json();
    expect(all.find((p: { key: string }) => p.key === "BA-0060/R1").state).toBe("Superseded");
  });

  it("queues an advice only after its approval, and only once", async () => {
    // APR-0121 (BA-0063) was approved by the finance owner in the approvals suite above.
    const first = await cmd("sales", "sales.queuePosting", { adviceId: "BA-0063" });
    expect(first.statusCode).toBe(200);
    expect(first.json().data).toMatchObject({ key: "BA-0063/R1", state: "Queued" });
    expect((await cmd("sales", "sales.queuePosting", { adviceId: "BA-0063" })).statusCode).toBe(409);
  });

  it("refuses to queue an advice whose approval is still pending", async () => {
    const conn = await connect({ memory: true }); // a pending approval on an advice needs its own dataset
    await conn.migrate();
    await seed(conn.db);
    const fresh = await buildApp(conn.db, { logger: false, serveFrontend: false });
    const login = await fresh.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL.sales, password: DEMO_PASSWORD } });
    const res = await fresh.inject({ method: "POST", url: "/api/commands/sales.queuePosting", headers: { cookie: String(login.headers["set-cookie"]).split(";")[0] }, payload: { adviceId: "BA-0063" } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/waiting on Finance owner/);
    await fresh.close();
    await conn.close();
  }, 60_000);
});
