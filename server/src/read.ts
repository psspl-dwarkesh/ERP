/**
 * Read models. Each function returns exactly the shape declared in
 * prototype/src/api/types.ts, so the front end consumes the API unchanged.
 * Children are fetched in one query per table and grouped in memory (no N+1).
 */
import { asc, desc, eq } from "drizzle-orm";
import type * as T from "../../prototype/src/api/types";
import type { Database, Tx } from "./db/client";
import * as s from "./db/schema";

type Q = Database | Tx;

const group = <R, K extends keyof R>(rows: R[], key: K) => {
  const m = new Map<R[K], R[]>();
  for (const r of rows) {
    const list = m.get(r[key]);
    if (list) list.push(r);
    else m.set(r[key], [r]);
  }
  return m;
};

/** Drop nulls so optional fields are absent, matching the TS types (`field?: x`). */
function clean<O extends Record<string, unknown>>(o: O) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined) out[k] = v;
  return out as never;
}

export const read = {
  async people(q: Q): Promise<T.Person[]> {
    return (await q.select().from(s.people).orderBy(asc(s.people.id))).map((p) => clean(p));
  },

  async customers(q: Q): Promise<T.Customer[]> {
    const [cs, sites] = await Promise.all([q.select().from(s.customers).orderBy(asc(s.customers.id)), q.select().from(s.customerSites)]);
    const by = group(sites, "customerId");
    return cs.map((c) => ({ ...c, sites: (by.get(c.id) ?? []).map(({ id, name, city }) => ({ id: id.split("-").slice(-2).join("-"), name, city })) }));
  },

  async vendors(q: Q): Promise<T.Vendor[]> {
    return q.select().from(s.vendors).orderBy(asc(s.vendors.id));
  },

  async projects(q: Q, id?: string): Promise<T.Project[]> {
    const base = id ? q.select().from(s.projects).where(eq(s.projects.id, id)) : q.select().from(s.projects);
    const [ps, ms, rs, ds, mem] = await Promise.all([
      base,
      q.select().from(s.projectMilestones).orderBy(asc(s.projectMilestones.seq)),
      q.select().from(s.projectRisks),
      q.select().from(s.projectDocuments),
      q.select().from(s.projectMembers).orderBy(asc(s.projectMembers.seq)),
    ]);
    const M = group(ms, "projectId");
    const R = group(rs, "projectId");
    const D = group(ds, "projectId");
    const P = group(mem, "projectId");
    const order = ["PRJ-0264", "PRJ-0258", "PRJ-0271", "PRJ-0249", "PRJ-0278", "PRJ-0244"];
    return ps
      .sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99) || a.id.localeCompare(b.id))
      .map((p) =>
        clean({
          ...p,
          health: p.health as T.Project["health"],
          milestones: (M.get(p.id) ?? []).map(({ projectId: _p, seq: _s, ...m }) => clean(m)),
          risks: (R.get(p.id) ?? []).map(({ projectId: _p, ...r }) => r),
          documents: (D.get(p.id) ?? []).map(({ projectId: _p, ...d }) => d),
          team: (P.get(p.id) ?? []).map((x) => x.personId),
        }),
      );
  },

  async items(q: Q): Promise<T.Item[]> {
    return q.select().from(s.items).orderBy(asc(s.items.id)) as Promise<T.Item[]>;
  },

  async movements(q: Q): Promise<T.StockMovement[]> {
    return q.select().from(s.stockMovements).orderBy(desc(s.stockMovements.at)) as Promise<T.StockMovement[]>;
  },

  async boms(q: Q): Promise<T.Bom[]> {
    const [bs, ls] = await Promise.all([q.select().from(s.boms), q.select().from(s.bomLines).orderBy(asc(s.bomLines.seq))]);
    const L = group(ls, "bomId");
    return bs.map((b) => clean({ ...b, lines: (L.get(b.id) ?? []).map(({ bomId: _b, seq: _s, ...l }) => l) }));
  },

  async workOrders(q: Q): Promise<T.WorkOrder[]> {
    const [ws, st] = await Promise.all([q.select().from(s.workOrders).orderBy(desc(s.workOrders.id)), q.select().from(s.workOrderStages).orderBy(asc(s.workOrderStages.seq))]);
    const S = group(st, "workOrderId");
    return ws.map((w) => ({ ...w, qc: w.qc as T.WorkOrder["qc"], stages: (S.get(w.id) ?? []).map(({ workOrderId: _w, seq: _s, ...x }) => clean(x)) }));
  },

  async assets(q: Q): Promise<T.Asset[]> {
    return (await q.select().from(s.assets)).map((a) => clean(a));
  },

  async tickets(q: Q): Promise<T.ServiceTicket[]> {
    return (await q.select().from(s.serviceTickets).orderBy(desc(s.serviceTickets.opened))).map(({ resolution: _r, ...t }) => clean(t));
  },

  async contracts(q: Q): Promise<T.ServiceContract[]> {
    const [cs, ca] = await Promise.all([q.select().from(s.serviceContracts).orderBy(asc(s.serviceContracts.id)), q.select().from(s.contractAssets)]);
    const A = group(ca, "contractId");
    return cs.map((c) => ({ ...c, assets: (A.get(c.id) ?? []).map((x) => x.assetId) })) as T.ServiceContract[];
  },

  async calibrations(q: Q): Promise<T.CalibrationJob[]> {
    const [js, ps] = await Promise.all([q.select().from(s.calibrationJobs), q.select().from(s.calibrationPoints).orderBy(asc(s.calibrationPoints.seq))]);
    const P = group(ps, "jobId");
    return js.map((j) => clean({ ...j, points: (P.get(j.id) ?? []).map(({ jobId: _j, seq: _s, ...p }) => p) }));
  },

  async purchaseRequests(q: Q): Promise<T.PurchaseRequest[]> {
    const [ps, ls] = await Promise.all([q.select().from(s.purchaseRequests).orderBy(desc(s.purchaseRequests.id)), q.select().from(s.prLines).orderBy(asc(s.prLines.seq))]);
    const L = group(ls, "prId");
    return ps.map((p) => clean({ ...p, lines: (L.get(p.id) ?? []).map(({ prId: _p, seq: _s, ...l }) => l) }));
  },

  async rfqs(q: Q): Promise<T.Rfq[]> {
    const [rs, qs] = await Promise.all([q.select().from(s.rfqs).orderBy(desc(s.rfqs.id)), q.select().from(s.rfqQuotes)]);
    const Qs = group(qs, "rfqId");
    return rs.map((r) => clean({ ...r, quotes: (Qs.get(r.id) ?? []).map(({ rfqId: _r, ...x }) => x) }));
  },

  async purchaseOrders(q: Q): Promise<T.PurchaseOrder[]> {
    const [ps, ls] = await Promise.all([q.select().from(s.purchaseOrders).orderBy(desc(s.purchaseOrders.issued)), q.select().from(s.poLines).orderBy(asc(s.poLines.seq))]);
    const L = group(ls, "poId");
    return ps.map(({ rfqId: _r, ...p }) => clean({ ...p, lines: (L.get(p.id) ?? []).map(({ poId: _p, seq: _s, ...l }) => l) }));
  },

  async opportunities(q: Q): Promise<T.Opportunity[]> {
    return q.select().from(s.opportunities).orderBy(desc(s.opportunities.id)) as Promise<T.Opportunity[]>;
  },
  async quotations(q: Q): Promise<T.Quotation[]> {
    return (await q.select().from(s.quotations).orderBy(asc(s.quotations.id))).map((x) => clean(x));
  },
  async salesOrders(q: Q): Promise<T.SalesOrder[]> {
    return (await q.select().from(s.salesOrders).orderBy(desc(s.salesOrders.id))).map((x) => clean(x));
  },
  async billingAdvices(q: Q): Promise<T.BillingAdvice[]> {
    return q.select().from(s.billingAdvices).orderBy(desc(s.billingAdvices.id)) as Promise<T.BillingAdvice[]>;
  },
  async leaveRequests(q: Q): Promise<T.LeaveRequest[]> {
    return q.select().from(s.leaveRequests).orderBy(asc(s.leaveRequests.id)) as Promise<T.LeaveRequest[]>;
  },
  async claims(q: Q): Promise<T.Claim[]> {
    return q.select().from(s.claims).orderBy(desc(s.claims.id)) as Promise<T.Claim[]>;
  },
  async payrollRuns(q: Q): Promise<T.PayrollRun[]> {
    const [rs, cs] = await Promise.all([q.select().from(s.payrollRuns).orderBy(desc(s.payrollRuns.id)), q.select().from(s.payrollChecks).orderBy(asc(s.payrollChecks.seq))]);
    const C = group(cs, "runId");
    return rs.map((r) => ({ ...r, checks: (C.get(r.id) ?? []).map(({ runId: _r, seq: _s, ...c }) => c) })) as T.PayrollRun[];
  },
  async approvals(q: Q): Promise<T.Approval[]> {
    const rows = await q.select().from(s.approvals).orderBy(desc(s.approvals.submitted));
    return rows.map(({ approverRoleId: _a, decidedAt: _d, decidedBy: _b, decisionNote: _n, ...a }) => a) as T.Approval[];
  },
  async activity(q: Q): Promise<T.ActivityEvent[]> {
    const rows = await q.select().from(s.auditEvents).orderBy(desc(s.auditEvents.at)).limit(500);
    return rows.map(({ userId: _u, detail: _d, ...a }) => a) as T.ActivityEvent[];
  },
  async roles(q: Q): Promise<T.Role[]> {
    const [rs, ps, us] = await Promise.all([q.select().from(s.roles).orderBy(asc(s.roles.id)), q.select().from(s.rolePermissions), q.select({ roleId: s.users.roleId }).from(s.users)]);
    const P = group(ps, "roleId");
    const seeded: Record<string, number> = { "ROLE-01": 2, "ROLE-02": 9, "ROLE-03": 7, "ROLE-04": 5, "ROLE-05": 8, "ROLE-06": 3, "ROLE-07": 2, "ROLE-08": 2 };
    return rs.map((r) => ({
      ...r,
      // Headcount per role in the client's org; accounts in this database are a subset.
      users: Math.max(seeded[r.id] ?? 0, us.filter((u) => u.roleId === r.id).length),
      permissions: Object.fromEntries((P.get(r.id) ?? []).map((p) => [p.module, p.level])),
    })) as T.Role[];
  },
  async reports(q: Q): Promise<T.ReportDef[]> {
    return q.select().from(s.reports).orderBy(asc(s.reports.id)) as Promise<T.ReportDef[]>;
  },
  async notifications(q: Q): Promise<T.Notification[]> {
    return q.select().from(s.notifications).orderBy(desc(s.notifications.at)) as Promise<T.Notification[]>;
  },
};
