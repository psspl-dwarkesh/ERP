import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { buildContext } from "../src/assist/context";
import { loadActor } from "../src/auth";
import { connect, type Database } from "../src/db/client";
import { DEMO_PASSWORD, seed } from "../src/db/seed";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
const savedKey = process.env.ANTHROPIC_API_KEY;

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const conn = await connect({ memory: true });
  await conn.migrate();
  await seed(conn.db);
  db = conn.db;
  app = await buildApp(conn.db, { logger: false, serveFrontend: false });
  close = async () => {
    await app.close();
    await conn.close();
  };
}, 60_000);

afterAll(async () => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  await close?.();
});

const login = async (email: string) => {
  const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: DEMO_PASSWORD } });
  expect(res.statusCode).toBe(200);
  return String(res.headers["set-cookie"]).split(";")[0];
};
const ask = (cookie: string | undefined, payload: object) => app.inject({ method: "POST", url: "/api/assist", headers: cookie ? { cookie } : {}, payload });

describe("GET /api/insights (one round trip for the page)", () => {
  it("returns the computed analysis and the role's dataset", async () => {
    const res = await app.inject({ method: "GET", url: "/api/insights", headers: { cookie: await login("arjun.mehta@pinnacle.example") } });
    expect(res.statusCode).toBe(200);
    const { dataset, analysis } = res.json();
    expect(analysis.findings.length).toBeGreaterThan(10);
    expect(analysis.findings.some((f: { cites: string[] }) => f.cites.includes("PRJ-0264"))).toBe(true);
    expect(dataset.projects.length).toBeGreaterThan(0);
    expect(dataset.payrollRuns).toBeUndefined(); // operations head can't view payroll
  });

  it("requires a session and Insights access", async () => {
    expect((await app.inject({ method: "GET", url: "/api/insights" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/insights", headers: { cookie: await login("it.admin@pinnacle.example") } })).statusCode).toBe(403);
  });
});

describe("POST /api/assist", () => {
  it("requires a session", async () => {
    const res = await ask(undefined, { question: "What's blocking PRJ-0264?" });
    expect(res.statusCode).toBe(401);
  });

  it("answers 501 NOT_CONFIGURED when no Anthropic key is set", async () => {
    const res = await ask(await login("arjun.mehta@pinnacle.example"), { question: "What's blocking PRJ-0264?" });
    expect(res.statusCode).toBe(501);
    expect(res.json().error.code).toBe("NOT_CONFIGURED");
  });

  it("validates the question", async () => {
    const res = await ask(await login("arjun.mehta@pinnacle.example"), { question: "" });
    expect(res.statusCode).toBe(400);
  });

  it("refuses roles without Insights access", async () => {
    const res = await ask(await login("it.admin@pinnacle.example"), { question: "What's blocking PRJ-0264?" });
    expect(res.statusCode).toBe(403);
  });
});

describe("assist context", () => {
  it("holds only modules the role may view, without contact details", async () => {
    const hr = (await loadActor(db, "USR-0006"))!; // HR & payroll: no projects, inventory, purchase or sales
    const ctx = await buildContext(db, hr);
    const parsed = JSON.parse(ctx.json);
    expect(parsed.records.projects).toBeUndefined();
    expect(parsed.records.purchaseRequests).toBeUndefined();
    expect(parsed.records.billingAdvices).toBeUndefined();
    expect(parsed.records.payrollRuns).toBeDefined();
    expect(ctx.ids.has("PRJ-0264")).toBe(false);
    expect(ctx.json).not.toMatch(/@abc\.example/);
    expect(parsed.approvals).toBeUndefined();
    expect((parsed.records.approvals as { module: string }[]).every((a) => ["dashboard", "assets", "hr", "payroll"].includes(a.module))).toBe(true);
  });

  it("carries the rule-based findings for the operations head", async () => {
    const ops = (await loadActor(db, "USR-0001"))!;
    const ctx = await buildContext(db, ops);
    const parsed = JSON.parse(ctx.json);
    expect(parsed.findings.some((f: { title: string }) => f.title.includes("PRJ-0264"))).toBe(true);
    expect(parsed.records.payrollRuns).toBeUndefined(); // operations head has no payroll access
    expect(ctx.ids.has("PR-0084")).toBe(true);
  });
});
