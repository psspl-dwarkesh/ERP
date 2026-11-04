/**
 * Loads the Pinnacle Engineering demo dataset (the same fixtures the front end ships with)
 * plus one sign-in account per role. Idempotent only on an empty database: run
 * `npm run db:reset` to drop and reseed.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import * as fx from "../../../prototype/src/api/fixtures";
import { connect, type Database } from "./client";
import * as t from "./schema";

export const DEMO_PASSWORD = "Threadline@2026";

/** One account per role so every permission boundary can be demonstrated. */
export const DEMO_USERS = [
  { id: "USR-0000", name: "Demo (full access)", personId: null, roleId: "ROLE-00", mfa: false, email: "demo@abc.example" },
  { id: "USR-0001", name: "Arjun Mehta", personId: "EMP-0012", roleId: "ROLE-01", mfa: true },
  { id: "USR-0002", name: "Ananya Rao", personId: "EMP-0034", roleId: "ROLE-02", mfa: false },
  { id: "USR-0003", name: "Imran Sheikh", personId: "EMP-0104", roleId: "ROLE-03", mfa: false },
  { id: "USR-0004", name: "Karan Patel", personId: "EMP-0072", roleId: "ROLE-04", mfa: false },
  { id: "USR-0005", name: "Sana Kapoor", personId: "EMP-0081", roleId: "ROLE-05", mfa: false },
  { id: "USR-0006", name: "Kavya Iyer", personId: "EMP-0135", roleId: "ROLE-06", mfa: true },
  { id: "USR-0007", name: "Ritu Agarwal", personId: null, roleId: "ROLE-07", mfa: true, email: "ritu.agarwal@abc.example" },
  { id: "USR-0008", name: "IT Administrator", personId: null, roleId: "ROLE-08", mfa: true, email: "it.admin@abc.example" },
  { id: "USR-0009", name: "Deepa Kulkarni", personId: "EMP-0117", roleId: "ROLE-03", mfa: false },
] as const;

/** Who may decide each seeded approval. */
const APPROVER_ROLE: Record<string, string> = {
  "APR-0132": "ROLE-01", // PR-0084 above ₹2 L → operations head
  "APR-0129": "ROLE-01", // BOM revision release → operations head (acts as engineering head)
  "APR-0125": "ROLE-01", // site claim → reporting manager chain
  "APR-0121": "ROLE-07", // billing advice → finance owner
};

const MODULES = ["dashboard", "insights", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll", "users", "reports"] as const;

/**
 * Idempotently create the "Full access (demo)" role + sign-in account on an already-seeded
 * database (e.g. the hosted demo), so adding it doesn't need a destructive re-seed. Runs on
 * every boot; a fresh seed() already includes it, so this is then a no-op.
 */
export async function ensureFullAccess(db: Database) {
  const role = fx.roles.find((r) => r.id === "ROLE-00");
  if (!role) return;
  const hasRole = (await db.select().from(t.roles).where(eq(t.roles.id, role.id)).limit(1)).length > 0;
  if (!hasRole) {
    await db.insert(t.roles).values({ id: role.id, name: role.name, description: role.description });
    await db.insert(t.rolePermissions).values(MODULES.map((m) => ({ roleId: role.id, module: m, level: role.permissions[m] ?? "admin" })));
  }
  const hasUser = (await db.select().from(t.users).where(eq(t.users.id, "USR-0000")).limit(1)).length > 0;
  if (!hasUser) {
    await db.insert(t.users).values({ id: "USR-0000", name: "Demo (full access)", email: "demo@abc.example", personId: null, roleId: role.id, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10), mfaEnabled: false });
  }
}

export async function seed(db: Database) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.transaction(async (tx) => {
    await tx.insert(t.roles).values(fx.roles.map((r) => ({ id: r.id, name: r.name, description: r.description })));
    await tx.insert(t.rolePermissions).values(
      fx.roles.flatMap((r) => MODULES.map((m) => ({ roleId: r.id, module: m, level: r.permissions[m] ?? "none" }))),
    );
    await tx.insert(t.people).values(fx.people.map((p) => ({ ...p, assignment: p.assignment ?? null, assignmentUntil: p.assignmentUntil ?? null, reportsTo: p.reportsTo ?? null, joining: p.joining ?? null })));
    await tx.insert(t.users).values(
      DEMO_USERS.map((u) => ({
        id: u.id,
        name: u.name,
        email: "email" in u ? u.email : fx.people.find((p) => p.id === u.personId)!.email,
        personId: u.personId,
        roleId: u.roleId,
        passwordHash: hash,
        mfaEnabled: u.mfa,
        lastLoginAt: fx.accounts.find((a) => a.id === u.id)?.lastActive ?? null,
      })),
    );
    // The other lifecycle states (invited, deactivated): no usable password, so they can't sign in.
    const others = fx.accounts.filter((a) => !DEMO_USERS.some((u) => u.id === a.id));
    if (others.length) {
      await tx.insert(t.users).values(
        others.map((a) => ({ id: a.id, name: a.name, email: a.email, personId: a.employeeId ?? null, roleId: a.roleId, passwordHash: "!", mfaEnabled: a.mfa === "On", status: a.status, note: a.note ?? null, lastLoginAt: a.lastActive ?? null })),
      );
    }

    await tx.insert(t.customers).values(fx.customers.map(({ sites: _s, ...c }) => c));
    await tx.insert(t.customerSites).values(fx.customers.flatMap((c) => c.sites.map((s) => ({ ...s, id: `${c.id}-${s.id}`, customerId: c.id }))));
    await tx.insert(t.vendors).values(fx.vendors);

    await tx.insert(t.projects).values(fx.projects.map(({ milestones: _m, risks: _r, documents: _d, team: _t, ...p }) => p));
    await tx.insert(t.projectMilestones).values(
      fx.projects.flatMap((p) => p.milestones.map((m, i) => ({ ...m, projectId: p.id, seq: i, done: m.done ?? null, billable: m.billable ?? null, gate: m.gate ?? null }))),
    );
    const risks = fx.projects.flatMap((p) => p.risks.map((r) => ({ ...r, projectId: p.id })));
    if (risks.length) await tx.insert(t.projectRisks).values(risks);
    const docs = fx.projects.flatMap((p) => p.documents.map((d) => ({ ...d, projectId: p.id })));
    if (docs.length) await tx.insert(t.projectDocuments).values(docs);
    await tx.insert(t.projectMembers).values(fx.projects.flatMap((p) => p.team.map((personId, seq) => ({ projectId: p.id, personId, seq }))));

    await tx.insert(t.items).values(fx.items);
    await tx.insert(t.stockMovements).values(fx.movements);
    await tx.insert(t.boms).values(fx.boms.map(({ lines: _l, ...b }) => ({ ...b, releasedOn: b.releasedOn ?? null })));
    await tx.insert(t.bomLines).values(fx.boms.flatMap((b) => b.lines.map((l, seq) => ({ ...l, bomId: b.id, seq }))));
    await tx.insert(t.workOrders).values(fx.workOrders.map(({ stages: _s, ...w }) => w));
    await tx.insert(t.workOrderStages).values(fx.workOrders.flatMap((w) => w.stages.map((s, seq) => ({ ...s, workOrderId: w.id, seq, done: s.done ?? null, note: s.note ?? null }))));

    await tx.insert(t.serviceContracts).values(fx.contracts.map(({ assets: _a, ...c }) => c));
    await tx.insert(t.assets).values(fx.assets.map((a) => ({ ...a, customer: a.customer ?? null, contractId: a.contractId ?? null, warrantyEnd: a.warrantyEnd ?? null, nextService: a.nextService ?? null, calibrationDue: a.calibrationDue ?? null, projectId: a.projectId ?? null })));
    await tx.insert(t.contractAssets).values(fx.contracts.flatMap((c) => c.assets.map((assetId) => ({ contractId: c.id, assetId }))));
    await tx.insert(t.serviceTickets).values(fx.tickets.map((x) => ({ ...x, contractId: x.contractId ?? null, assignee: x.assignee ?? null })));
    await tx.insert(t.calibrationJobs).values(fx.calibrations.map(({ points: _p, ...c }) => ({ ...c, certificate: c.certificate ?? null })));
    const points = fx.calibrations.flatMap((c) => c.points.map((p, seq) => ({ ...p, jobId: c.id, seq })));
    if (points.length) await tx.insert(t.calibrationPoints).values(points);

    await tx.insert(t.purchaseRequests).values(fx.purchaseRequests.map(({ lines: _l, ...p }) => ({ ...p, projectId: p.projectId ?? null })));
    await tx.insert(t.prLines).values(fx.purchaseRequests.flatMap((p) => p.lines.map((l, seq) => ({ ...l, prId: p.id, seq }))));
    await tx.insert(t.rfqs).values(fx.rfqs.map(({ quotes: _q, ...r }) => ({ ...r, projectId: r.projectId ?? null, awardedTo: r.awardedTo ?? null })));
    await tx.insert(t.rfqQuotes).values(fx.rfqs.flatMap((r) => r.quotes.map((q) => ({ ...q, rfqId: r.id }))));
    await tx.insert(t.purchaseOrders).values(fx.purchaseOrders.map(({ lines: _l, ...p }) => ({ ...p, projectId: p.projectId ?? null })));
    await tx.insert(t.poLines).values(fx.purchaseOrders.flatMap((p) => p.lines.map((l, seq) => ({ ...l, poId: p.id, seq }))));

    await tx.insert(t.opportunities).values(fx.opportunities);
    await tx.insert(t.quotations).values(fx.quotations.map(({ lines: _l, revisions: _r, ...q }) => ({ ...q, opportunityId: q.opportunityId ?? null, revisionNote: q.revisionNote ?? null })));
    const quoteLines = fx.quotations.flatMap((q) => (q.lines ?? []).map((l, seq) => ({ ...l, quotationId: q.id, revision: q.revision, seq })));
    if (quoteLines.length) await tx.insert(t.quotationLines).values(quoteLines);
    await tx.insert(t.salesOrders).values(fx.salesOrders.map((s) => ({ ...s, quotationId: s.quotationId ?? null, projectId: s.projectId ?? null, customerPo: s.customerPo ?? null, acceptedOn: s.acceptedOn ?? null })));
    await tx.insert(t.billingAdvices).values(fx.billingAdvices);

    await tx.insert(t.leaveRequests).values(fx.leaveRequests);
    await tx.insert(t.claims).values(fx.claims);
    await tx.insert(t.payrollRuns).values(fx.payrollRuns.map(({ checks: _c, ...r }) => r));
    const checks = fx.payrollRuns.flatMap((r) => r.checks.map(({ name, status, detail }, seq) => ({ name, status, detail, runId: r.id, seq })));
    if (checks.length) await tx.insert(t.payrollChecks).values(checks);

    await tx.insert(t.approvals).values(fx.approvals.map((a) => ({ ...a, approverRoleId: APPROVER_ROLE[a.id] ?? null })));
    await tx.insert(t.auditEvents).values(fx.activity.map((a) => ({ ...a, userId: null, detail: null })));
    await tx.insert(t.reports).values(fx.reports);
    await tx.insert(t.notifications).values(fx.notifications);

    await tx.insert(t.subcontractIssues).values(fx.subcontractIssues.map(({ lines: _l, ...si }) => ({ ...si, poId: si.poId ?? null, projectId: si.projectId ?? null, partnerReport: si.partnerReport ?? null })));
    await tx.insert(t.subcontractLines).values(fx.subcontractIssues.flatMap((si) => si.lines.map((l, seq) => ({ ...l, issueId: si.id, seq }))));
    await tx.insert(t.exitCases).values(fx.exitCases.map(({ items: _i, ...c }) => c));
    await tx.insert(t.exitItems).values(
      fx.exitCases.flatMap((c) => c.items.map((i, seq) => ({ ...i, caseId: c.id, seq, outcome: i.outcome ?? null, doneBy: i.doneBy ?? null, doneAt: i.doneAt ?? null }))),
    );
    await tx.insert(t.accountingPostings).values(
      fx.postings.map((p) => ({ ...p, projectId: p.projectId ?? null, lastAttempt: p.lastAttempt ?? null, lastError: p.lastError ?? null, posted: p.posted ?? null, external: p.external ?? null, supersedes: p.supersedes ?? null, supersededBy: p.supersededBy ?? null })),
    );

    // Counters continue after the highest seeded number of each prefix.
    const allIds = [
      ...fx.projects.map((x) => x.id), ...fx.items.map((x) => x.id), ...fx.movements.map((x) => x.id), ...fx.assets.map((x) => x.id),
      ...fx.tickets.map((x) => x.id), ...fx.purchaseRequests.map((x) => x.id), ...fx.rfqs.map((x) => x.id), ...fx.purchaseOrders.map((x) => x.id),
      ...fx.opportunities.map((x) => x.id), ...fx.quotations.map((x) => x.id), ...fx.salesOrders.map((x) => x.id), ...fx.billingAdvices.map((x) => x.id),
      ...fx.leaveRequests.map((x) => x.id), ...fx.claims.map((x) => x.id), ...fx.approvals.map((x) => x.id), ...fx.calibrations.map((x) => x.id),
      ...fx.subcontractIssues.map((x) => x.id), ...fx.exitCases.map((x) => x.id), ...fx.accounts.map((x) => x.id),
      "GRN-0073", "CNT-0013", "ACT-0007", "N-4", "PO-0120",
    ];
    const max = new Map<string, number>();
    for (const id of allIds) {
      const [prefix, n] = id.split("-");
      max.set(prefix, Math.max(max.get(prefix) ?? 0, Number(n) || 0));
    }
    max.set("MOV", Math.max(max.get("MOV") ?? 0, 931));
    await tx.insert(t.idSequences).values([...max].map(([prefix, n]) => ({ prefix, next: n + 1 })));
  });
}

/* CLI: `npm run db:seed` */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const conn = await connect();
  await conn.migrate();
  const existing = await conn.db.select().from(t.roles).limit(1);
  if (existing.length) {
    console.log("Database already has data. Use `npm run db:reset` to start over.");
  } else {
    await seed(conn.db);
    console.log(`Seeded demo data. Sign in as any demo user with password ${DEMO_PASSWORD}`);
  }
  await conn.close();
}
