import { ArrowRight, CheckCircle2, Clock3, PackageCheck, ShieldCheck, Siren, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { API_MODE } from "../api/store";
import { prefersReducedMotion, useTicker } from "./motion";

const EVENTS = [
  { icon: Siren, tone: "risk", title: "P1 ticket logged", ref: "SR-0148", detail: "Northstar Pharma · entitlement AMC-0031 · 6 h response" },
  { icon: ShieldCheck, tone: "accent", title: "PR-0084 approved", ref: "APR-0132", detail: "₹2.84 L · Operations head · evidence: 3 quotes" },
  { icon: PackageCheck, tone: "ok", title: "6 transmitters released", ref: "GRN-0073", detail: "Re-test passed · moved QC bay → Central" },
  { icon: Wrench, tone: "info", title: "Wiring complete", ref: "WO-0187", detail: "96 / 96 terminations · assembly can start" },
] as const;

const STAGES = ["Kitting", "Fabrication", "Wiring", "Assembly", "Testing", "Dispatch"];

/** A living product window: events stream in, a work order advances, an SLA clock ticks. */
function HeroConsole() {
  const reduce = prefersReducedMotion();
  const tick = useTicker(2600, !reduce);
  const [secs, setSecs] = useState(4 * 3600 + 20 * 60);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 4 * 3600 + 20 * 60)), 1000);
    return () => clearInterval(id);
  }, [reduce]);
  const stage = 2 + (tick % 3);
  const shown = [0, 1, 2].map((i) => EVENTS[(tick + i) % EVENTS.length]);
  const hh = Math.floor(secs / 3600);
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="sc-console" aria-hidden>
      <div className="sc-console-bar">
        <span className="sc-dots"><i /><i /><i /></span>
        <span className="sc-console-url">threadline.app / abc-limited / dashboard</span>
        <span className="sc-live"><i /> Live</span>
      </div>
      <div className="sc-console-body">
        <aside className="sc-console-nav">
          {["Dashboard", "Projects", "Inventory", "Assets", "Purchase", "CRM", "Sales", "People"].map((n, i) => (
            <span key={n} className={i === 0 ? "is-on" : ""}>
              <b />
              {n}
            </span>
          ))}
        </aside>
        <div className="sc-console-main">
          <div className="sc-console-row">
            <div className="sc-mini-card sc-mini-sla">
              <span className="sc-mini-label"><Clock3 size={12} /> SR-0148 response</span>
              <span className="sc-mini-clock t-num">{hh}:{mm}:{ss}</span>
              <span className="sc-mini-foot">Karan Patel · en route</span>
            </div>
            <div className="sc-mini-card">
              <span className="sc-mini-label">PRJ-0264 · margin</span>
              <span className="sc-mini-value t-num">19.2%</span>
              <span className="sc-spark">
                {[34, 42, 38, 51, 47, 58, 54, 62].map((h, i) => (
                  <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                ))}
              </span>
            </div>
          </div>
          <div className="sc-mini-card sc-mini-wo">
            <div className="sc-mini-head">
              <span className="sc-mini-label">WO-0187 · Line 03 control panel</span>
              <span className="sc-pill">Stage {stage + 1} / 6</span>
            </div>
            <ol className="sc-mini-steps">
              {STAGES.map((s, i) => (
                <li key={s} className={i < stage ? "done" : i === stage ? "active" : ""}>
                  <span>{i < stage ? <CheckCircle2 size={12} /> : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <ul className="sc-feed" key={tick}>
            {shown.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={e.ref + i} className={`sc-feed-item tone-${e.tone}`} style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="sc-feed-icon"><Icon size={14} /></span>
                  <span className="sc-feed-text">
                    <b>{e.title}</b>
                    <span>{e.detail}</span>
                  </span>
                  <span className="sc-feed-ref mono">{e.ref}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Light, minimal hero: one claim on the left, the living product console on the right. */
export function Hero() {
  return (
    <section className="sc-hero" id="top">
      <div className="sc-wrap sc-hero-inner">
        <div className="sc-hero-copy">
          <p className="sc-hero-kicker">ERP for engineering, panel and field-service firms</p>
          <h1 className="sc-hero-title t-display">
            Every job, one <span className="sc-hero-accent">unbroken thread.</span>
          </h1>
          <p className="sc-hero-lede">
            Threadline carries a job from the first enquiry to the installed asset and its service contract, with cost, people and approvals on the same record.
          </p>
          <div className="sc-hero-ctas">
            <a className="btn btn-primary btn-lg sc-cta" href={API_MODE === "remote" ? "#/login?pick=1" : "#/app/dashboard"}>
              Open the live demo <ArrowRight size={18} aria-hidden />
            </a>
            <a
              className="btn btn-secondary btn-lg"
              href="#/?s=thread"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("thread")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Follow one job
            </a>
          </div>
          <p className="sc-hero-facts">
            <span>11 modules</span>
            <span>7 business verticals</span>
            <span>12 end-to-end flows</span>
            <span>{API_MODE === "remote" ? "Sign in with a demo account" : "Demo data, runs in your browser"}</span>
          </p>
        </div>
        <HeroConsole />
      </div>
    </section>
  );
}
