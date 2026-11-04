import cookie from "@fastify/cookie";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { ZodError } from "zod";
import type { ModuleKey } from "../../prototype/src/api/types";
import { activate, demoAccounts, login, logout, profile, resolveSession, SESSION_COOKIE } from "./auth";
import { adminFlowCommands } from "./commands/admin-flow";
import { commercialCommands } from "./commands/commercial";
import { commercialFlowCommands } from "./commands/commercial-flow";
import { custodyCommands } from "./commands/custody";
import { operationsCommands } from "./commands/operations";
import type { Command } from "./commands/registry";
import { AppError, can, requireLevel, type Actor } from "./core";
import type { Database } from "./db/client";
import { env } from "./env";
import { demoResetEnabled, resetDemoData } from "./demo-reset";
import { broadcast, liveCount, registerLive } from "./live";
import { registerAssist } from "./assist/route";
import { read } from "./read";

declare module "fastify" {
  interface FastifyRequest {
    actor: Actor | null;
  }
}

/** GET /api/<path> → read model, guarded by view permission on `module`. */
const RESOURCES: Record<string, { module: ModuleKey; load: (db: Database) => Promise<unknown> }> = {
  // Master data every signed-in user needs to resolve names and links.
  people: { module: "dashboard", load: read.people },
  customers: { module: "dashboard", load: read.customers },
  vendors: { module: "dashboard", load: read.vendors },
  items: { module: "dashboard", load: read.items },
  approvals: { module: "dashboard", load: read.approvals },
  activity: { module: "dashboard", load: read.activity },
  notifications: { module: "dashboard", load: read.notifications },
  projects: { module: "projects", load: (db) => read.projects(db) },
  movements: { module: "inventory", load: read.movements },
  boms: { module: "inventory", load: read.boms },
  "work-orders": { module: "inventory", load: read.workOrders },
  assets: { module: "assets", load: read.assets },
  tickets: { module: "assets", load: read.tickets },
  contracts: { module: "assets", load: read.contracts },
  calibrations: { module: "assets", load: read.calibrations },
  "purchase-requests": { module: "purchase", load: read.purchaseRequests },
  rfqs: { module: "purchase", load: read.rfqs },
  "purchase-orders": { module: "purchase", load: read.purchaseOrders },
  opportunities: { module: "crm", load: read.opportunities },
  quotations: { module: "sales", load: read.quotations },
  "sales-orders": { module: "sales", load: read.salesOrders },
  "billing-advices": { module: "sales", load: read.billingAdvices },
  "leave-requests": { module: "hr", load: read.leaveRequests },
  claims: { module: "hr", load: read.claims },
  "payroll-runs": { module: "payroll", load: read.payrollRuns },
  roles: { module: "users", load: read.roles },
  users: { module: "users", load: read.users },
  reports: { module: "reports", load: read.reports },
  "subcontract-issues": { module: "inventory", load: read.subcontractIssues },
  "exit-cases": { module: "hr", load: read.exitCases },
  postings: { module: "sales", load: read.postings },
};

const COMMANDS = new Map<string, Command>([...operationsCommands, ...commercialCommands, ...commercialFlowCommands, ...custodyCommands, ...adminFlowCommands].map((c) => [c.name, c]));

export async function buildApp(db: Database, opts: { logger?: boolean; serveFrontend?: boolean } = {}) {
  const app = Fastify({
    logger: opts.logger === false ? false : { level: env.logLevel, redact: ["req.headers.cookie", "req.body.password", "req.body.token"] },
    bodyLimit: 1_000_000,
    trustProxy: true,
  });
  await app.register(cookie);
  app.decorateRequest("actor", null);

  // Cross-site mode: when CORS_ORIGIN is set the front end is served from a
  // different origin (e.g. Vercel) than this API, so the session cookie must be
  // SameSite=None (which the browser only accepts together with Secure).
  const crossSite = env.corsOrigin !== "";

  /* ---- CORS: let the configured front-end origin call the API with its cookie ----
     CORS_ORIGIN="*" reflects any origin (allow-all); otherwise only that exact origin. */
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && crossSite && (env.corsOrigin === "*" || origin === env.corsOrigin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type");
      reply.header("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") return reply.status(204).send();
  });

  /* ---- security headers on every response ---- */
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "same-origin");
    reply.header("X-Frame-Options", "DENY");
    return payload;
  });

  /* ---- cross-site request guard: state-changing calls must come from our own origin ---- */
  app.addHook("onRequest", async (req) => {
    if (req.method === "GET" || req.method === "HEAD" || !req.url.startsWith("/api/")) return;
    const origin = req.headers.origin;
    if (origin) {
      const host = req.headers["x-forwarded-host"] ?? req.headers.host;
      const sameOrigin = new URL(origin).host === host;
      if (!sameOrigin && env.corsOrigin !== "*" && origin !== env.corsOrigin) throw new AppError("FORBIDDEN", "Cross-site request refused.");
    }
    const type = req.headers["content-type"] ?? "";
    if (req.method === "POST" && !type.startsWith("application/json")) throw new AppError("VALIDATION", "Send JSON (Content-Type: application/json).");
  });

  /* ---- session ---- */
  app.addHook("preHandler", async (req) => {
    if (!req.url.startsWith("/api/")) return;
    req.actor = await resolveSession(db, req.cookies[SESSION_COOKIE]);
  });

  const actorOf = (req: FastifyRequest) => {
    if (!req.actor) throw new AppError("UNAUTHENTICATED", "Your session has ended. Sign in again.");
    return req.actor;
  };

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return reply.status(400).send({ error: { code: "VALIDATION", message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input" } });
    }
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode && e.statusCode < 500) return reply.status(e.statusCode).send({ error: { code: "VALIDATION", message: e.message ?? "Bad request" } });
    req.log.error(err);
    return reply.status(500).send({ error: { code: "INTERNAL", message: "Something went wrong on the server. It has been logged." } });
  });

  /* ================================================================ routes */
  // Health = the database answers. Hosts restart the service when this fails.
  app.get("/api/health", async (_req, reply) => {
    const started = Date.now();
    try {
      await db.execute(sql`select 1`);
    } catch {
      return reply.status(503).send({ ok: false, error: { code: "DB_UNAVAILABLE", message: "Database unreachable" } });
    }
    return { ok: true, businessDate: env.businessDate, engine: env.databaseUrl ? "postgresql" : "pglite", dbMs: Date.now() - started, online: liveCount() };
  });

  registerLive(app, actorOf);

  registerAssist(app, db, actorOf); // POST /api/assist — Claude answers when ANTHROPIC_API_KEY is set

  const setSession = (reply: FastifyReply, token: string, expires: string) =>
    reply.setCookie(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: crossSite ? "none" : "lax", secure: env.cookieSecure, expires: new Date(expires) });

  app.post<{ Body: { email?: string; password?: string } }>("/api/auth/login", async (req, reply) => {
    const { email = "", password = "" } = req.body ?? {};
    if (!email || !password) throw new AppError("VALIDATION", "Enter your email and password.");
    limitSignIns(req.ip);
    const s = await login(db, email, password, { ip: req.ip, userAgent: req.headers["user-agent"] });
    setSession(reply, s.token, s.expiresAt);
    const actor = (await resolveSession(db, s.token))!;
    return { user: await profile(db, actor) };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await logout(db, req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: "/", sameSite: crossSite ? "none" : "lax", secure: env.cookieSecure });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => ({ user: await profile(db, actorOf(req)) }));

  /** Accept an invite: the one-time token from the activation link plus a new password. No session needed. */
  app.post<{ Body: { token?: string; password?: string } }>("/api/auth/activate", async (req) => {
    const { token = "", password = "" } = req.body ?? {};
    limitSignIns(req.ip);
    return activate(db, String(token), String(password));
  });

  /** Demo sign-in helper: lists accounts (never passwords). Disable with DEMO_ACCOUNTS=false. */
  app.get("/api/auth/demo-accounts", async () => (process.env.DEMO_ACCOUNTS === "false" ? [] : demoAccounts(db)));

  app.get<{ Params: { resource: string } }>("/api/:resource", async (req) => {
    const r = RESOURCES[req.params.resource];
    if (!r) throw new AppError("NOT_FOUND", `No resource /api/${req.params.resource}`);
    requireLevel(actorOf(req), r.module, "view");
    return r.load(db);
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id", async (req) => {
    requireLevel(actorOf(req), "projects", "view");
    const [p] = await read.projects(db, req.params.id);
    if (!p) throw new AppError("NOT_FOUND", `Project ${req.params.id} not found`);
    return p;
  });

  app.get<{ Querystring: { q?: string } }>("/api/search", async (req) => searchRecords(db, actorOf(req), req.query.q ?? ""));

  /** Hosted demos: an Users & Access admin can restore the starting data without a terminal. */
  app.post("/api/admin/reset-demo", async (req) => {
    const actor = actorOf(req);
    if (!demoResetEnabled()) throw new AppError("FORBIDDEN", "Demo reset is disabled on this deployment.");
    requireLevel(actor, "users", "admin");
    const out = await resetDemoData(db);
    broadcast({ command: "admin.resetDemo", module: "dashboard", actor: actor.name, actorId: actor.userId, at: new Date().toISOString() });
    req.log.warn({ actor: actor.userId }, "demo data reset");
    return { ok: true, ...out };
  });

  app.post<{ Params: { name: string }; Body: unknown }>("/api/commands/:name", async (req) => {
    const actor = actorOf(req);
    const cmd = COMMANDS.get(req.params.name);
    if (!cmd) throw new AppError("NOT_FOUND", `Unknown command ${req.params.name}`);
    requireLevel(actor, cmd.module, cmd.level);
    const input = cmd.input.parse(req.body ?? {});
    const result = (await db.transaction((tx) => cmd.run({ tx, actor }, input))) as { blocked?: string } | null;
    // Committed: tell every other open session (that may see this module) to refresh.
    broadcast({ command: cmd.name, module: cmd.module, actor: actor.name, actorId: actor.userId, at: new Date().toISOString() });
    // A command may commit real progress and still report a stop (e.g. a stage done, the next blocked).
    if (result && typeof result === "object" && "blocked" in result && typeof result.blocked === "string") return { data: null, blocked: result.blocked };
    return { data: result };
  });

  /* ---- single-process deploy: serve the built front end ---- */
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../../prototype/dist");
  if (opts.serveFrontend !== false && existsSync(dist)) {
    const { default: fastifyStatic } = await import("@fastify/static");
    await app.register(fastifyStatic, { root: dist, index: "index.html" });
  }

  return app;
}

/** Cross-record search, limited to modules the user may view. */
async function searchRecords(db: Database, actor: Actor, q: string) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  type Hit = { id: string; title: string; subtitle: string; module: ModuleKey };
  const hits: Hit[] = [];
  const add = (m: ModuleKey, id: string, title: string, subtitle: string) => {
    if (hits.length < 12 && `${id} ${title} ${subtitle}`.toLowerCase().includes(term)) hits.push({ id, title, subtitle, module: m });
  };
  const ok = (m: ModuleKey) => can(actor, m, "view");
  if (ok("projects")) (await read.projects(db)).forEach((p) => add("projects", p.id, p.name, `${p.customer} · ${p.status}`));
  if (ok("inventory")) {
    (await read.items(db)).forEach((i) => add("inventory", i.id, i.name, `${i.warehouse} · ${i.status}`));
    (await read.workOrders(db)).forEach((w) => add("inventory", w.id, w.name, `Work order · ${w.projectId}`));
    (await read.boms(db)).forEach((b) => add("inventory", b.id, b.name, `BOM rev ${b.revision} · ${b.status}`));
  }
  if (ok("assets")) {
    (await read.assets(db)).forEach((a) => add("assets", a.id, a.name, `${a.customer ?? "Company-owned"} · ${a.site}`));
    (await read.tickets(db)).forEach((t) => add("assets", t.id, t.title, `${t.customer} · ${t.priority} · ${t.status}`));
    (await read.contracts(db)).forEach((c) => add("assets", c.id, `${c.type} · ${c.customer}`, `Contract · ${c.status}`));
  }
  if (ok("purchase")) {
    (await read.purchaseRequests(db)).forEach((p) => add("purchase", p.id, p.title, `Requisition · ${p.status}`));
    (await read.rfqs(db)).forEach((r) => add("purchase", r.id, r.title, `RFQ · ${r.status}`));
    (await read.purchaseOrders(db)).forEach((p) => add("purchase", p.id, p.title, `${p.vendor} · ${p.status}`));
  }
  if (ok("crm")) (await read.opportunities(db)).forEach((o) => add("crm", o.id, o.name, `${o.account} · ${o.stage}`));
  if (ok("sales")) {
    (await read.salesOrders(db)).forEach((s) => add("sales", s.id, s.title, `${s.customer} · ${s.status}`));
    (await read.quotations(db)).forEach((s) => add("sales", s.id, s.title, `Quotation rev ${s.revision} · ${s.status}`));
  }
  if (ok("hr")) (await read.people(db)).forEach((p) => add("hr", p.id, p.name, `${p.role} · ${p.location}`));
  return hits;
}

/* ---------------------------------------------------------------- sign-in throttle */
// Per-IP ceiling on sign-in attempts, on top of the per-account lockout in auth.ts,
// so one address can't spray passwords across many accounts. In-memory: one process.
const SIGNIN_WINDOW_MS = 10 * 60_000;
const SIGNIN_MAX = Number(process.env.SIGNIN_MAX_PER_IP ?? 30);
const signIns = new Map<string, number[]>();

function limitSignIns(ip: string) {
  const now = Date.now();
  const recent = (signIns.get(ip) ?? []).filter((t) => now - t < SIGNIN_WINDOW_MS);
  if (recent.length >= SIGNIN_MAX) {
    const wait = Math.ceil((SIGNIN_WINDOW_MS - (now - recent[0])) / 60_000);
    throw new AppError("FORBIDDEN", `Too many sign-in attempts from this network. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
  }
  recent.push(now);
  signIns.set(ip, recent);
  if (signIns.size > 10_000) signIns.clear(); // bound memory under abuse
}
