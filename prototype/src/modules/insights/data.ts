/**
 * Loads the records the Insights engine reads, asking only for modules the signed-in
 * role may view (the API would refuse the rest), and builds the engine's dataset.
 */
import { useMemo } from "react";
import { api } from "../../api/client";
import { http } from "../../api/http";
import { API_MODE } from "../../api/store";
import { NOW, TODAY } from "../../api/fixtures";
import { useQuery } from "../../api/hooks";
import { canAccess, useSession, type SessionUser } from "../../api/session";
import type { ModuleKey } from "../../api/types";
import { analyze, type Analysis, type Dataset } from "./engine";

const MODULES: ModuleKey[] = ["dashboard", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll"];
const none = async () => undefined;

export function visibleModules(user: SessionUser | null) {
  return MODULES.filter((m) => canAccess(user, m));
}

type InsightsState = { ds: Dataset | null; analysis: Analysis | null; loading: boolean; error?: Error };

/**
 * API mode: the server loads the role's records and runs the engine, in one request
 * (GET /api/insights) instead of ~24 list calls plus browser-side computation.
 */
function useInsightsFromServer(): InsightsState {
  const user = useSession().user;
  const res = useQuery(() => http.get<{ dataset: Dataset; analysis: Analysis }>("/insights"), [user?.id]);
  return { ds: res.data?.dataset ?? null, analysis: res.data?.analysis ?? null, loading: res.loading, error: res.error };
}

/** Pick once per build so hook order never changes between renders. */
export const useInsights: () => InsightsState = API_MODE === "remote" ? useInsightsFromServer : useInsightsInBrowser;

function useInsightsInBrowser(): InsightsState {
  const user = useSession().user;
  const visible = visibleModules(user);
  const v = (m: ModuleKey) => visible.includes(m);
  const q = <T,>(m: ModuleKey, loader: () => Promise<T>) => useQuery<T | undefined>(v(m) ? loader : none, [v(m)]);

  /* eslint-disable react-hooks/rules-of-hooks -- fixed call order: one query per resource */
  const r = {
    projects: q("projects", api.projects),
    items: q("dashboard", api.items),
    boms: q("inventory", api.boms),
    workOrders: q("inventory", api.workOrders),
    movements: q("inventory", api.movements),
    subcontractIssues: q("inventory", api.subcontractIssues),
    assets: q("assets", api.assets),
    tickets: q("assets", api.tickets),
    contracts: q("assets", api.contracts),
    calibrations: q("assets", api.calibrations),
    purchaseRequests: q("purchase", api.purchaseRequests),
    rfqs: q("purchase", api.rfqs),
    purchaseOrders: q("purchase", api.purchaseOrders),
    vendors: q("dashboard", api.vendors),
    salesOrders: q("sales", api.salesOrders),
    billingAdvices: q("sales", api.billingAdvices),
    postings: q("sales", api.postings),
    quotations: q("sales", api.quotations),
    opportunities: q("crm", api.opportunities),
    approvals: q("dashboard", api.approvals),
    people: q("dashboard", api.people),
    leaveRequests: q("hr", api.leaveRequests),
    claims: q("hr", api.claims),
    payrollRuns: q("payroll", api.payrollRuns),
    exitCases: q("hr", api.exitCases),
  };
  /* eslint-enable react-hooks/rules-of-hooks */

  const entries = Object.entries(r);
  const loading = entries.some(([, s]) => s.loading);
  const error = entries.map(([, s]) => s.error).find(Boolean);
  const stamp = entries.map(([, s]) => s.data).filter(Boolean).length;

  return useMemo(() => {
    if (loading) return { ds: null, analysis: null, loading, error };
    const data = Object.fromEntries(entries.map(([k, s]) => [k, s.data])) as Partial<Dataset>;
    const ds: Dataset = {
      ...data,
      // Approvals are readable by everyone; keep only those in modules this role can open.
      approvals: data.approvals?.filter((a) => visible.includes(a.module)),
      today: TODAY,
      now: NOW,
      visible,
      user: user ? { name: user.name, role: user.role, approveModules: MODULES.filter((m) => canAccess(user, m, "approve")) } : undefined,
    };
    return { ds, analysis: analyze(ds), loading: false, error };
    // Recompute when any resource reloads (useQuery hands back new arrays after a mutation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, stamp, user?.id, visible.join(","), ...entries.map(([, s]) => s.data)]);
}
