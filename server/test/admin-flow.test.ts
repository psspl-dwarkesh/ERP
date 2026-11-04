import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { connect } from "../src/db/client";
import * as s from "../src/db/schema";
import { DEMO_PASSWORD, seed } from "../src/db/seed";

let app: FastifyInstance;
let close: () => Promise<void>;
let db: Awaited<ReturnType<typeof connect>>["db"];
const cookies: Record<string, string> = {};

const EMAIL = {
  ops: "arjun.mehta@abc.example",
  hr: "kavya.iyer@abc.example",
  finance: "ritu.agarwal@abc.example",
  admin: "it.admin@abc.example",
  stores: "imran.sheikh@abc.example",
};
type Who = keyof typeof EMAIL | "invitee";

const signIn = (email: string, password: string) => app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });

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
    const res = await signIn(email, DEMO_PASSWORD);
    expect(res.statusCode, `${k} login`).toBe(200);
    cookies[k] = String(res.headers["set-cookie"]).split(";")[0];
  }
}, 60_000);

afterAll(async () => close?.());

const get = (who: Who, url: string) => app.inject({ method: "GET", url, headers: { cookie: cookies[who] } });
const cmd = (who: Who, name: string, payload: unknown) => app.inject({ method: "POST", url: `/api/commands/${name}`, headers: { cookie: cookies[who] }, payload: payload as object });
const run = async (id = "PAY-2026-11") => (await get("hr", "/api/payroll-runs")).json().find((r: { id: string }) => r.id === id);
const check = async (name: string) => (await run()).checks.find((c: { name: string }) => c.name === name);

describe("payroll run PAY-2026-11: inputs → review → approve → lock", () => {
  it("refuses to submit while a check is blocked", async () => {
    const res = await cmd("hr", "payroll.submitForReview", { runId: "PAY-2026-11" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/blocked/i);
    expect((await run()).status).toBe("Collecting inputs");
  });

  it("never acknowledges a blocked check, and wants a real note on a warning", async () => {
    const blocked = await cmd("hr", "payroll.resolveCheck", { runId: "PAY-2026-11", check: "New joiners have bank details", note: "Will be fixed next week by HR" });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.message).toMatch(/can't be acknowledged/);
    const short = await cmd("hr", "payroll.resolveCheck", { runId: "PAY-2026-11", check: "Attendance locked", note: "ok" });
    expect(short.statusCode).toBe(400);
    const finance = await cmd("finance", "payroll.resolveCheck", { runId: "PAY-2026-11", check: "Attendance locked", note: "Corrections are within tolerance" });
    expect(finance.statusCode).toBe(403);
  });

  it("clears the bank-details block only when both joiners are verified", async () => {
    const first = await cmd("hr", "hr.verifyBankDetails", { personId: "EMP-0221" });
    expect(first.statusCode).toBe(200);
    expect(first.json().data.joining.bank).toBe("Verified");
    expect(await check("New joiners have bank details")).toMatchObject({ status: "Blocked", detail: "1 of 5 joiners missing verified bank account" });
    expect((await cmd("hr", "hr.verifyBankDetails", { personId: "EMP-0221" })).statusCode).toBe(409);
    expect((await cmd("hr", "hr.verifyBankDetails", { personId: "EMP-0034" })).statusCode).toBe(409); // not a joiner
    expect((await cmd("finance", "hr.verifyBankDetails", { personId: "EMP-0222" })).statusCode).toBe(403);
    expect((await cmd("hr", "hr.verifyBankDetails", { personId: "EMP-0222" })).statusCode).toBe(200);
    expect((await check("New joiners have bank details")).status).toBe("Pass");
  });

  it("needs every warning acknowledged before review, then records the maker", async () => {
    const early = await cmd("hr", "payroll.submitForReview", { runId: "PAY-2026-11" });
    expect(early.statusCode).toBe(409);
    expect(early.json().error.message).toMatch(/Acknowledge 2 warnings/);
    for (const name of ["Attendance locked", "Claims cut-off"]) {
      const res = await cmd("hr", "payroll.resolveCheck", { runId: "PAY-2026-11", check: name, note: "Carried as arrears into December's run" });
      expect(res.statusCode, name).toBe(200);
    }
    expect((await check("Attendance locked")).acknowledged).toMatchObject({ by: "Kavya Iyer", note: "Carried as arrears into December's run" });
    const res = await cmd("hr", "payroll.submitForReview", { runId: "PAY-2026-11" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ status: "Ready for review", preparedBy: "Kavya Iyer" });
  });

  it("refuses to lock before approval", async () => {
    const res = await cmd("hr", "payroll.lockRun", { runId: "PAY-2026-11" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/only after the Finance owner approves/);
  });

  it("lets only the Finance owner approve, never the maker", async () => {
    expect((await cmd("hr", "payroll.approveRun", { runId: "PAY-2026-11" })).statusCode).toBe(403); // payroll: edit
    expect((await cmd("ops", "payroll.approveRun", { runId: "PAY-2026-11" })).statusCode).toBe(403); // no payroll access
    // A different role given payroll: approve still isn't the Finance owner.
    expect((await cmd("admin", "users.setPermission", { roleId: "ROLE-01", module: "payroll", level: "approve" })).statusCode).toBe(200);
    const wrongRole = await cmd("ops", "payroll.approveRun", { runId: "PAY-2026-11" });
    expect(wrongRole.statusCode).toBe(403);
    expect(wrongRole.json().error.message).toMatch(/Finance owner role/);
    expect((await cmd("admin", "users.setPermission", { roleId: "ROLE-01", module: "payroll", level: "none" })).statusCode).toBe(200);

    // Maker ≠ checker: a run the Finance owner prepared can't be approved by them.
    await db.insert(s.payrollRuns).values({ id: "PAY-TEST-01", period: "Test period", status: "Collecting inputs", employees: 1, gross: 1, deductions: 0, net: 1 });
    expect((await cmd("finance", "payroll.submitForReview", { runId: "PAY-TEST-01" })).statusCode).toBe(200);
    const maker = await cmd("finance", "payroll.approveRun", { runId: "PAY-TEST-01" });
    expect(maker.statusCode).toBe(403);
    expect(maker.json().error.message).toMatch(/maker ≠ checker/);

    const ok = await cmd("finance", "payroll.approveRun", { runId: "PAY-2026-11", note: "Totals tie to October plus joiners" });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data).toMatchObject({ status: "Approved", approvedBy: "Ritu Agarwal", preparedBy: "Kavya Iyer" });
    expect((await cmd("finance", "payroll.approveRun", { runId: "PAY-2026-11" })).statusCode).toBe(409);
  });

  it("locks explicitly and freezes inputs", async () => {
    const res = await cmd("hr", "payroll.lockRun", { runId: "PAY-2026-11" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ status: "Locked", lockedBy: "Kavya Iyer" });
    expect((await cmd("hr", "payroll.chaseInput", { runId: "PAY-2026-11", check: "Claims cut-off" })).statusCode).toBe(409);
    expect((await cmd("hr", "payroll.lockRun", { runId: "PAY-2026-11" })).statusCode).toBe(409);
  });

  it("reverses a locked run only through a reasoned approval the Finance owner decides", async () => {
    expect((await cmd("hr", "payroll.requestReversal", { runId: "PAY-2026-11", reason: "wrong" })).statusCode).toBe(400);
    const res = await cmd("hr", "payroll.requestReversal", { runId: "PAY-2026-11", reason: "Site allowance for Nashik was missed" });
    expect(res.statusCode).toBe(200);
    const approval = res.json().data;
    expect(approval).toMatchObject({ type: "Payroll reversal", reference: "PAY-2026-11", status: "Pending", maker: "Kavya Iyer" });
    expect((await cmd("hr", "payroll.requestReversal", { runId: "PAY-2026-11", reason: "Site allowance for Nashik was missed" })).statusCode).toBe(409);
    expect((await run()).status).toBe("Locked"); // intact until decided
    expect((await cmd("ops", "approvals.decide", { id: approval.id, decision: "Approved", reason: "" })).statusCode).toBe(403);
    expect((await cmd("finance", "approvals.decide", { id: approval.id, decision: "Approved", reason: "" })).statusCode).toBe(200);
    expect(await run()).toMatchObject({ status: "Collecting inputs" });
    const activity = (await get("admin", "/api/activity")).json();
    expect(activity.some((a: { action: string; reference: string }) => a.reference === "PAY-2026-11" && a.action === "locked pay run")).toBe(true);
  });
});

describe("users & access", () => {
  let activationPath = "";
  let inviteeId = "";
  const NEW = { name: "Test Storekeeper", email: "test.storekeeper@abc.example", password: "Correct-Horse-9" };

  it("lets only a Users & Access admin invite, and returns the activation link once", async () => {
    expect((await cmd("hr", "users.invite", { name: NEW.name, email: NEW.email, roleId: "ROLE-03" })).statusCode).toBe(403);
    expect((await cmd("admin", "users.invite", { name: NEW.name, email: "not-an-email", roleId: "ROLE-03" })).statusCode).toBe(400);
    const res = await cmd("admin", "users.invite", { name: NEW.name, email: NEW.email, roleId: "ROLE-03" });
    expect(res.statusCode).toBe(200);
    const out = res.json().data;
    expect(out.user).toMatchObject({ name: NEW.name, status: "Invited", roleId: "ROLE-03" });
    expect(out.activationPath).toMatch(/^#\/activate\?token=[\w-]{40,}$/);
    activationPath = out.activationPath;
    inviteeId = out.user.id;
    // The token is stored only as a hash and never appears in the user list.
    const [row] = await db.select().from(s.users).where(eq(s.users.id, inviteeId));
    expect(row.inviteTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify((await get("admin", "/api/users")).json())).not.toContain(activationPath.split("=")[1]);
    expect((await cmd("admin", "users.invite", { name: "Someone", email: NEW.email.toUpperCase(), roleId: "ROLE-03" })).statusCode).toBe(409);
  });

  it("activates with the token and a strong-enough password, once; then the person signs in", async () => {
    const token = activationPath.split("token=")[1];
    expect((await signIn(NEW.email, NEW.password)).statusCode).toBe(401); // not active yet
    const act = (body: object) => app.inject({ method: "POST", url: "/api/auth/activate", payload: body });
    expect((await act({ token, password: "short" })).statusCode).toBe(400);
    expect((await act({ token: "made-up-token", password: NEW.password })).statusCode).toBe(400);
    const ok = await act({ token, password: NEW.password });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ ok: true, email: NEW.email });
    expect((await act({ token, password: NEW.password })).statusCode).toBe(400); // one-time
    const login = await signIn(NEW.email, NEW.password);
    expect(login.statusCode).toBe(200);
    expect(login.json().user).toMatchObject({ name: NEW.name, role: "Stores & QC" });
    cookies.invitee = String(login.headers["set-cookie"]).split(";")[0];
  });

  it("applies a permission change on the next request, with before → after in the audit trail", async () => {
    expect((await get("invitee", "/api/leave-requests")).statusCode).toBe(403);
    expect((await cmd("hr", "users.setPermission", { roleId: "ROLE-03", module: "hr", level: "view" })).statusCode).toBe(403);
    const res = await cmd("admin", "users.setPermission", { roleId: "ROLE-03", module: "hr", level: "view" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions.hr).toBe("view");
    expect((await get("invitee", "/api/leave-requests")).statusCode).toBe(200);
    const [ev] = (await db.select().from(s.auditEvents)).filter((a) => a.reference === "ROLE-03" && a.action.startsWith("changed hr access"));
    expect(ev.action).toBe("changed hr access none → view on");
    expect(ev.detail).toEqual({ module: "hr", before: "none", after: "view" });
  });

  it("keeps at least one active Users & Access admin", async () => {
    const res = await cmd("admin", "users.setPermission", { roleId: "ROLE-08", module: "users", level: "edit" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/last Users & Access admin/);
    expect((await get("admin", "/api/roles")).json().find((r: { id: string }) => r.id === "ROLE-08").permissions.users).toBe("admin");
  });

  it("deactivates another user, ends their sessions and refuses their sign-in; never yourself", async () => {
    const self = await cmd("admin", "users.deactivate", { userId: "USR-0008" });
    expect(self.statusCode).toBe(403);
    expect((await cmd("hr", "users.deactivate", { userId: inviteeId })).statusCode).toBe(403);
    expect((await get("invitee", "/api/auth/me")).statusCode).toBe(200);
    const res = await cmd("admin", "users.deactivate", { userId: inviteeId });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ sessionsEnded: 1, user: { status: "Deactivated" } });
    expect((await get("invitee", "/api/auth/me")).statusCode).toBe(401);
    expect((await signIn(NEW.email, NEW.password)).statusCode).toBe(401);
    expect((await cmd("admin", "users.deactivate", { userId: inviteeId })).statusCode).toBe(409);
  });

  it("seeds the other account states and they can't sign in", async () => {
    const users = (await get("admin", "/api/users")).json();
    expect(users.find((u: { id: string }) => u.id === "USR-0010")).toMatchObject({ status: "Invited" });
    expect(users.find((u: { id: string }) => u.id === "USR-0011")).toMatchObject({ status: "Deactivated" });
    expect((await signIn("suresh.pillai@abc.example", DEMO_PASSWORD)).statusCode).toBe(401);
    expect((await get("stores", "/api/users")).statusCode).toBe(403);
  });
});

