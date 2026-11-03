import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight } from "lucide-react";
import "./entry-page.css";

type Stage = {
  number: string;
  label: string;
  record: string;
  detail: string;
  note: string;
  route: string;
  sub?: string;
};

const stages: Stage[] = [
  {
    number: "A",
    label: "Order",
    record: "SO-0196",
    detail: "Confirmed customer order",
    note: "The sales commitment links the customer and project before delivery work starts.",
    route: "Sales",
  },
  {
    number: "B",
    label: "Project",
    record: "PRJ-0264",
    detail: "Process automation upgrade",
    note: "Scope, milestones and responsibility move into a delivery record.",
    route: "Projects",
    sub: "Project detail",
  },
  {
    number: "C",
    label: "Materials",
    record: "BOM-042",
    detail: "Released revision C",
    note: "Demand connects stock, QC status and purchasing before material is issued.",
    route: "Inventory",
    sub: "Requirements",
  },
  {
    number: "D",
    label: "Assembly",
    record: "WO-0187",
    detail: "Control panel work order",
    note: "The build passes through staged work and inspection before dispatch.",
    route: "Inventory",
    sub: "Panel assembly",
  },
  {
    number: "E",
    label: "Service",
    record: "AST-0042",
    detail: "Installed equipment",
    note: "An existing customer asset keeps service history and commitments in view.",
    route: "Assets",
  },
];

type Props = {
  enter: (route: string, sub?: string) => void;
};

export function EntryPage({ enter }: Props) {
  const [active, setActive] = useState(1);
  const stage = stages[active];

  return (
    <div className="entry-page">
      <header className="entry-header">
        <button className="entry-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="ABC Limited, return to top">
          <span className="entry-logo-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>ABC</strong><small>ENGINEERING OPERATIONS</small></span>
        </button>
        <nav aria-label="Entry navigation">
          <a href="#job-route" onClick={(event) => {
            event.preventDefault();
            document.getElementById("job-route")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}>Follow the job <ArrowDown size={14} /></a>
          <button className="entry-nav-action" onClick={() => enter("Dashboard")}>Enter workspace <ArrowUpRight size={17} /></button>
        </nav>
      </header>

      <main>
        <section className="entry-cover" aria-labelledby="entry-title">
          <div className="entry-cover-meta" aria-hidden="true">
            <span>ABC LIMITED / ERP CONCEPT</span>
            <span>ENGINEERING · PROJECTS · SERVICE</span>
            <span>03.11.26 / REV 01</span>
          </div>
          <div className="entry-statement">
            <h1 id="entry-title"><span>One job.</span><br /><span>Every handoff.</span></h1>
            <div className="entry-summary">
              <p>Follow a customer order through engineering, materials, assembly and field service. Every decision and commitment has a place in the same operating record.</p>
              <button className="entry-enter" onClick={() => enter("Dashboard")}>Open the working demo <ArrowRight size={21} /></button>
            </div>
          </div>

          <div id="job-route" className="entry-route" aria-label="Example engineering job route">
            <div className="entry-route-head">
              <span>FOLLOW ONE JOB</span>
              <span>EXAMPLE / PRJ-0264</span>
              <span>SELECT A HANDOFF TO INSPECT ITS RECORD</span>
            </div>
            <div className="entry-route-track" role="group" aria-label="Job handoffs">
              {stages.map((item, index) => (
                <button
                  key={item.record}
                  className={active === index ? "active" : ""}
                  onClick={() => setActive(index)}
                  aria-pressed={active === index}
                  type="button"
                >
                  <span className="entry-route-index"><i />{item.number}</span>
                  <strong>{item.label}</strong>
                  <small>{item.record}</small>
                  {index < stages.length - 1 && <ChevronRight className="entry-route-arrow" size={17} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="entry-current" aria-live="polite">
              <div className="entry-current-id"><span>ACTIVE RECORD</span><strong>{stage.record}</strong></div>
              <div className="entry-current-copy"><strong>{stage.detail}</strong><p>{stage.note}</p></div>
              <button onClick={() => enter(stage.route, stage.sub)} aria-label={`Open ${stage.label} in the demo workspace`}>
                Open {stage.label.toLowerCase()} <ArrowUpRight size={17} />
              </button>
            </div>
          </div>
          <div className="entry-cover-foot" aria-hidden="true"><span>ONE ENTITY / SEVEN DELIVERY VERTICALS</span><span>ELEVEN CONNECTED MODULES</span><span>SCROLL TO CONTINUE <ArrowDown size={13} /></span></div>
        </section>

        <section className="entry-proof" aria-label="What the workspace connects">
          <div className="entry-proof-lead"><h2>Work leaves a trace.</h2><p>For a project team, the useful question is what must happen next and which record proves it happened. The demo makes those handoffs inspectable.</p></div>
          <div className="entry-proof-list">
            <button onClick={() => enter("Inventory", "Requirements")}><span>01 / MATERIAL DEMAND</span><strong>BOM-042 → PR-0084</strong><small>Released items, shortage and purchase request</small><ArrowUpRight size={18}/></button>
            <button onClick={() => enter("Inventory", "Panel assembly")}><span>02 / BUILD CONTROL</span><strong>WO-0187 → QC hold</strong><small>Panel stages and the dispatch gate</small><ArrowUpRight size={18}/></button>
            <button onClick={() => enter("Assets", "Service desk")}><span>03 / INSTALLED BASE</span><strong>AST-0042 → SR-0148</strong><small>Customer equipment and service action</small><ArrowUpRight size={18}/></button>
          </div>
        </section>
      </main>

      <footer className="entry-footer"><div><span className="entry-foot-symbol"><Check size={16}/></span><span>ABC Limited · ERP design concept</span></div><span>Illustrative records based on the supplied draft scope</span><button onClick={() => enter("Dashboard")}>Enter workspace <ArrowUpRight size={15}/></button></footer>
    </div>
  );
}
