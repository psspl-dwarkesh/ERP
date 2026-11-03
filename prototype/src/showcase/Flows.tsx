import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { moduleDef } from "../app/modules";
import { FLOWS } from "./content";
import { Reveal } from "./motion";

export function Flows() {
  const [id, setId] = useState("E2E-02");
  const f = FLOWS.find((x) => x.id === id)!;
  const modules = [...new Set(f.steps.map((s) => s.module))];
  return (
    <section className="sc-section sc-flows" id="flows">
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">Twelve flows that cross modules</h2>
          <p className="sc-lede">The scope names twelve end-to-end business scenarios. Each one is a chain of handoffs with a control gate and known exceptions, drawn here the way it runs in Threadline.</p>
        </div>
        <Reveal className="sc-flow-layout">
          <ul className="sc-flow-list" role="tablist" aria-label="End-to-end flows">
            {FLOWS.map((x) => (
              <li key={x.id}>
                <button role="tab" aria-selected={x.id === id} className={`sc-flow-tab ${x.id === id ? "is-active" : ""}`} onClick={() => setId(x.id)}>
                  <span className="mono">{x.id}</span>
                  {x.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="sc-flow-panel" key={f.id} role="tabpanel">
            <div className="sc-flow-title">
              <span className="mono">{f.id}</span>
              <h3 className="sc-h3">{f.name}</h3>
            </div>
            <div className="sc-swim" style={{ ["--lanes" as string]: modules.length, ["--steps" as string]: f.steps.length }}>
              {modules.map((m, li) => (
                <div key={m} className="sc-lane" style={{ gridRow: li + 1 }}>
                  <span className="sc-lane-label">{moduleDef(m).label}</span>
                </div>
              ))}
              {f.steps.map((s, i) => (
                <div
                  key={s.label}
                  className="sc-swim-step"
                  style={{ gridRow: modules.indexOf(s.module) + 1, gridColumn: i + 2, animationDelay: `${150 + i * 140}ms` }}
                >
                  <span className="sc-swim-n mono">{i + 1}</span>
                  {s.label}
                </div>
              ))}
              <svg
                className="sc-swim-line"
                aria-hidden
                preserveAspectRatio="none"
                viewBox={`0 0 ${f.steps.length * 100} ${modules.length * 100}`}
                style={{ gridColumn: `2 / span ${f.steps.length}`, gridRow: `1 / span ${modules.length}` }}
              >
                <polyline
                  points={f.steps.map((s, i) => `${i * 100 + 50},${modules.indexOf(s.module) * 100 + 50}`).join(" ")}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="sc-flow-notes">
              <p>
                <ShieldCheck size={16} aria-hidden />
                <span>
                  <b>Control gate</b>
                  {f.gate}
                </span>
              </p>
              <p>
                <AlertTriangle size={16} aria-hidden />
                <span>
                  <b>Exceptions handled</b>
                  {f.exception}
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
