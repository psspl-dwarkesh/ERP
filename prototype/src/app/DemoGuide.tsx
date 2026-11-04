/**
 * Walkthrough: a docked, non-blocking guide. It opens on a short menu of tracks
 * rather than one long list, so a first-time viewer can pick what they want to
 * be shown. Steps know they are done by reading the records themselves, so the
 * guide works the same against the browser build and the API.
 */
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Circle, Compass, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, API_MODE, resetDemo } from "../api/client";
import { useQuery } from "../api/hooks";
import { Button, Progress, Tooltip, cx, useToast } from "../ds/components";
import { navigate } from "./router";

const OPEN_KEY = "threadline-guide-open";
const SEEN_KEY = "threadline-guide-seen";
const TRACK_KEY = "threadline-guide-track";

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
  return [seen, () => { setSeen([]); write(SEEN_KEY, "[]"); }] as const;
}

type Step = { title: string; show: string; to: string; done: boolean };
type Track = { id: string; title: string; blurb: string; minutes: string; steps: Step[] };

export function DemoGuide() {
  const toast = useToast();
  const [open, setOpen] = useState(() => read(OPEN_KEY) === "1");
  const [collapsed, setCollapsed] = useState(false);
  const [track, setTrack] = useState<string | null>(() => read(TRACK_KEY));
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
  useEffect(() => write(TRACK_KEY, track ?? ""), [track]);
  const looked = (prefix: string) => seen.some((s) => s.startsWith(prefix));

  const tracks = useMemo<Track[]>(() => {
    const approved = approvals.data?.find((a) => a.reference === "PR-0084")?.status === "Approved";
    const awarded = rfqs.data?.find((r) => r.id === "RFQ-0041")?.status === "Awarded";
    const ordered = !!pos.data?.some((p) => p.title.includes("RFQ-0041"));
    const released = items.data?.find((i) => i.id === "ITM-0137")?.quarantined === 0;

    const approve: Step = { title: "Approve the PLC requisition", show: "Dashboard → Review & decide. Try returning it without a reason first.", to: "/app/dashboard", done: approved };
    const award: Step = { title: "Award the supplier on fit and date", show: "RFQ-0041: the cheapest quote has a technical deviation.", to: "/app/purchase/RFQ-0041", done: awarded };
    const raise: Step = { title: "Raise the purchase order", show: "Same page, once awarded and approved.", to: "/app/purchase/RFQ-0041", done: ordered };
    const release: Step = { title: "Release the held transmitters", show: "Stock → ITM-0137 → Record QC decision. Issuing is refused until then.", to: "/app/inventory/ITM-0137", done: released };

    return [
      {
        id: "job",
        title: "Follow one job, end to end",
        blurb: "Enquiry to installed asset, with every control that bites along the way.",
        minutes: "10 min",
        steps: [
          { title: "Open the at-risk project", show: "PRJ-0264: the loop test is blocked by material.", to: "/app/projects/PRJ-0264", done: looked("/app/projects/PRJ-0264") },
          approve,
          award,
          raise,
          release,
          { title: "Move the panel past wiring", show: "Assembly → Complete wiring. Assembly stays blocked by shortages.", to: "/app/inventory?tab=assembly", done: wos.data?.find((w) => w.id === "WO-0187")?.stages.find((s) => s.key === "wiring")?.status === "Done" },
          { title: "Dispatch an engineer to the P1", show: "SR-0148: entitlement from AMC-0031, SLA clock running.", to: "/app/assets/SR-0148", done: ["En route", "On site", "Resolved", "Closed"].includes(tickets.data?.find((t) => t.id === "SR-0148")?.status ?? "") },
          { title: "Reconcile material at a partner", show: "Subcontract: every unit used, returned, damaged or outstanding.", to: "/app/inventory?tab=subcontract", done: !!subs.data?.some((s) => s.status !== "Open") },
          { title: "Correct a billing mismatch", show: "Reconciliation → Correct BA-0060. Never re-sent, superseded.", to: "/app/sales?tab=reconciliation", done: postings.data?.find((p) => p.key === "BA-0060/R1")?.state === "Superseded" },
          { title: "Close a leaver's checklist line", show: "People → Exits: custody needs the condition on return.", to: "/app/hr?tab=exits", done: (exits.data?.[0]?.items.filter((i) => i.status !== "Open").length ?? 0) > 1 },
          { title: "Show who did what", show: "Users & Access → Audit: every step above, by name and time.", to: "/app/users?tab=audit", done: looked("/app/users?tab=audit") },
        ],
      },
      {
        id: "buy",
        title: "Approve and buy",
        blurb: "The commercial slice: nothing can be ordered before it is approved.",
        minutes: "4 min",
        steps: [approve, award, raise, release],
      },
      {
        id: "roles",
        title: "See how roles change the workspace",
        blurb: "The same records, a different job. Permissions are refused by the server, not hidden in the menu.",
        minutes: "3 min",
        steps: [
          { title: "Look at the sidebar", show: "As the operations head, Payroll and Users & Access carry a lock.", to: "/app/dashboard", done: looked("/app/dashboard") },
          { title: "Open Payroll anyway", show: "The API answers 403. The rule lives on the server, not in the menu.", to: "/app/payroll", done: looked("/app/payroll") },
          { title: "Switch to the finance owner", show: "Account menu → Switch role → Ritu Agarwal. Payroll opens; other things close.", to: "/app/dashboard", done: looked("/app/payroll?") || looked("/app/users") },
          { title: "Read the audit trail", show: "Users & Access → Audit: who did what, by name and time.", to: "/app/users?tab=audit", done: looked("/app/users?tab=audit") },
        ],
      },
    ];
  }, [seen, approvals.data, rfqs.data, pos.data, items.data, wos.data, tickets.data, subs.data, postings.data, exits.data]);

  const active = tracks.find((t) => t.id === track) ?? null;
  const headline = tracks[0];
  const headlineDone = headline.steps.filter((s) => s.done).length;

  if (!open) {
    return (
      <Tooltip content="Guided walkthrough" side="left">
        <button className="guide-fab" onClick={() => setOpen(true)} aria-label="Open walkthrough">
          <Compass size={18} aria-hidden />
          <span>Walkthrough</span>
          <span className="guide-fab-count">
            {headlineDone}/{headline.steps.length}
          </span>
        </button>
      </Tooltip>
    );
  }

  const done = active ? active.steps.filter((s) => s.done).length : 0;
  const next = active ? active.steps.findIndex((s) => !s.done) : -1;

  return (
    <aside className={cx("guide", collapsed && "is-collapsed")} aria-label="Walkthrough">
      <div className="guide-head">
        {track ? (
          <button className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Back to all walkthroughs" onClick={() => setTrack(null)}>
            <ArrowLeft size={15} />
          </button>
        ) : (
          <Compass size={16} aria-hidden className="guide-icon" />
        )}
        <div className="guide-head-text">
          <b>{active ? active.title : track === "video" ? "Overview" : "Walkthrough"}</b>
          <span>{active ? `${done} of ${active.steps.length} steps` : track === "video" ? "2½ minutes" : "Pick what you want to be shown"}</span>
        </div>
        <button className="icon-btn icon-btn-ghost icon-btn-sm" aria-label={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Close walkthrough" onClick={() => setOpen(false)}>
          <X size={15} />
        </button>
      </div>

      {active && <Progress value={(done / active.steps.length) * 100} size="sm" tone={done === active.steps.length ? "ok" : "accent"} label="Walkthrough progress" />}

      {!collapsed && (
        <>
          {/* ---- the menu ---- */}
          {!track && (
            <div className="guide-menu">
              <button className="guide-video-card" onClick={() => setTrack("video")}>
                <img src="walkthrough-poster.jpg" alt="" aria-hidden />
                <span className="guide-video-play" aria-hidden>
                  <Play size={16} />
                </span>
                <span className="guide-video-text">
                  <b>Watch the overview</b>
                  <small>2½ min · the modules, the controls, and how a role changes the workspace</small>
                </span>
              </button>
              <p className="guide-menu-label">Or be walked through it</p>
              <ul className="guide-tracks">
                {tracks.map((t) => {
                  const d = t.steps.filter((s) => s.done).length;
                  return (
                    <li key={t.id}>
                      <button onClick={() => setTrack(t.id)}>
                        <span className="guide-track-text">
                          <b>{t.title}</b>
                          <small>{t.blurb}</small>
                          <span className="guide-track-meta">
                            {t.steps.length} steps · {t.minutes}
                            {d > 0 && <em>{d} done</em>}
                          </span>
                        </span>
                        <ChevronRight size={16} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ---- the video ---- */}
          {track === "video" && (
            <div className="guide-video">
              <video src="walkthrough.mp4" poster="walkthrough-poster.jpg" controls preload="metadata" playsInline />
              <p className="t-muted">
                Recorded in this workspace against the live database. It covers the record chain, the controls and how a role changes what you can open.
              </p>
            </div>
          )}

          {/* ---- a track ---- */}
          {active && (
            <>
              <ol className="guide-steps">
                {active.steps.map((s, i) => (
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
                {done === active.steps.length ? <span className="guide-done">Story complete.</span> : <span className="t-muted">Steps tick themselves off from the records.</span>}
                {API_MODE === "mock" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => {
                      resetDemo();
                      clearSeen();
                      toast({ title: "Progress reset", body: "Records and the guide are back at step 1." });
                      navigate("/app/dashboard");
                    }}
                  >
                    Restart
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
