/**
 * Demo guide: a docked, non-blocking checklist that walks a client through the
 * PRJ-0264 story. Each step knows it is done by reading the records themselves,
 * so it works the same against the browser demo and the API.
 */
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Compass, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, API_MODE, resetDemo } from "../api/client";
import { useQuery } from "../api/hooks";
import { Button, Progress, Tooltip, cx, useToast } from "../ds/components";
import { navigate } from "./router";

const OPEN_KEY = "threadline-guide-open";
const SEEN_KEY = "threadline-guide-seen";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

const safe = <T,>(fn: () => Promise<T[]>) => () => fn().catch(() => [] as T[]);

/** Routes the client has looked at during the demo (for "look at" steps). */
function useSeenRoutes() {
  const [seen, setSeen] = useState<string[]>(() => JSON.parse(read(SEEN_KEY) ?? "[]"));
  useEffect(() => {
    const on = () => {
      const h = window.location.hash.replace(/^#/, "");
      setSeen((s) => {
        if (s.includes(h)) return s;
        const next = [...s, h].slice(-60);
        write(SEEN_KEY, JSON.stringify(next));
        return next;
      });
    };
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [seen, () => { write(SEEN_KEY, "[]"); setSeen([]); }] as const;
}

export function DemoGuide() {
  const toast = useToast();
  const [open, setOpen] = useState(() => read(OPEN_KEY) === "1");
  const [collapsed, setCollapsed] = useState(false);
  const [seen, clearSeen] = useSeenRoutes();
  const approvals = useQuery(safe(api.approvals));
  const rfqs = useQuery(safe(api.rfqs));
  const pos = useQuery(safe(api.purchaseOrders));
  const items = useQuery(safe(api.items));
  const wos = useQuery(safe(api.workOrders));
  const tickets = useQuery(safe(api.tickets));
  const subs = useQuery(safe(api.subcontractIssues));
  const postings = useQuery(safe(api.postings));
  const exits = useQuery(safe(api.exitCases));

  useEffect(() => write(OPEN_KEY, open ? "1" : "0"), [open]);

  const looked = (prefix: string) => seen.some((s) => s.startsWith(prefix));
  const steps = useMemo(
    () => [
      { title: "Open the at-risk project", show: "PRJ-0264: the loop test is blocked by material.", to: "/app/projects/PRJ-0264", done: looked("/app/projects/PRJ-0264") },
      { title: "Approve the PLC requisition", show: "Dashboard → Review & decide. Try returning it without a reason first.", to: "/app/dashboard", done: approvals.data?.find((a) => a.reference === "PR-0084")?.status === "Approved" },
      { title: "Award the supplier on fit and date", show: "RFQ-0041: the cheapest quote has a technical deviation.", to: "/app/purchase/RFQ-0041", done: rfqs.data?.find((r) => r.id === "RFQ-0041")?.status === "Awarded" },
      { title: "Raise the purchase order", show: "Same page, once awarded and approved.", to: "/app/purchase/RFQ-0041", done: !!pos.data?.some((p) => p.title.includes("RFQ-0041")) },
      { title: "Release the held transmitters", show: "Stock → ITM-0137 → Record QC decision. Issuing is refused until then.", to: "/app/inventory/ITM-0137", done: items.data?.find((i) => i.id === "ITM-0137")?.quarantined === 0 },
      { title: "Move the panel past wiring", show: "Assembly → Complete wiring. Assembly stays blocked by shortages.", to: "/app/inventory?tab=assembly", done: wos.data?.find((w) => w.id === "WO-0187")?.stages.find((s) => s.key === "wiring")?.status === "Done" },
      { title: "Dispatch an engineer to the P1", show: "SR-0148: entitlement from AMC-0031, SLA clock running.", to: "/app/assets/SR-0148", done: ["En route", "On site", "Resolved", "Closed"].includes(tickets.data?.find((t) => t.id === "SR-0148")?.status ?? "") },
      { title: "Reconcile material at a partner", show: "Subcontract: every unit used, returned, damaged or outstanding.", to: "/app/inventory?tab=subcontract", done: !!subs.data?.some((s) => s.status !== "Open") },
      { title: "Correct a billing mismatch", show: "Reconciliation → Correct BA-0060. Never re-sent, superseded.", to: "/app/sales?tab=reconciliation", done: postings.data?.find((p) => p.key === "BA-0060/R1")?.state === "Superseded" },
      { title: "Close a leaver's checklist line", show: "People → Exits: custody needs the condition on return.", to: "/app/hr?tab=exits", done: (exits.data?.[0]?.items.filter((i) => i.status !== "Open").length ?? 0) > 1 },
      { title: "Show who did what", show: "Users & Access → Audit: every step above, by name and time.", to: "/app/users?tab=audit", done: looked("/app/users?tab=audit") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seen, approvals.data, rfqs.data, pos.data, items.data, wos.data, tickets.data, subs.data, postings.data, exits.data],
  );
  const done = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);

  if (!open) {
    return (
      <Tooltip content="Guided client demo" side="left">
        <button className="guide-fab" onClick={() => setOpen(true)} aria-label="Open demo guide">
          <Compass size={18} aria-hidden />
          <span>Demo guide</span>
          <span className="guide-fab-count">
            {done}/{steps.length}
          </span>
        </button>
      </Tooltip>
    );
  }

  return (
    <aside className={cx("guide", collapsed && "is-collapsed")} aria-label="Demo guide">
      <div className="guide-head">
        <Compass size={16} aria-hidden className="guide-icon" />
        <div className="guide-head-text">
          <b>Demo guide · one job, end to end</b>
          <span>
            {done} of {steps.length} steps
          </span>
        </div>
        <button className="icon-btn icon-btn-ghost icon-btn-sm" aria-label={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Close demo guide" onClick={() => setOpen(false)}>
          <X size={15} />
        </button>
      </div>
      <Progress value={(done / steps.length) * 100} size="sm" tone={done === steps.length ? "ok" : "accent"} label="Demo progress" />
      {!collapsed && (
        <>
          <ol className="guide-steps">
            {steps.map((s, i) => (
              <li key={s.title} className={cx("guide-step", s.done && "is-done", i === next && "is-next")}>
                <button onClick={() => navigate(s.to)}>
                  {s.done ? <CheckCircle2 size={16} aria-hidden /> : <Circle size={16} aria-hidden />}
                  <span className="guide-step-text">
                    <b>{s.title}</b>
                    {i === next && <small>{s.show}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="guide-foot">
            {done === steps.length ? <span className="guide-done">Story complete.</span> : <span className="t-muted">Steps tick themselves off from the records.</span>}
            {API_MODE === "mock" && (
              <Button
                size="sm"
                variant="ghost"
                icon={RotateCcw}
                onClick={() => {
                  resetDemo();
                  clearSeen();
                  toast({ title: "Demo reset", body: "Records and the guide are back at step 1." });
                  navigate("/app/dashboard");
                }}
              >
                Restart
              </Button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
