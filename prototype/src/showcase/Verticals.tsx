import { ArrowRight, Gauge } from "lucide-react";
import { useState } from "react";
import { moduleDef } from "../app/modules";
import { href } from "../app/router";
import { VERTICALS } from "./content";
import { Reveal } from "./motion";

export function Verticals() {
  const [key, setKey] = useState(VERTICALS[0].key);
  const v = VERTICALS.find((x) => x.key === key)!;
  return (
    <section className="sc-section sc-verticals" id="industries">
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">Seven ways of working, one company</h2>
          <p className="sc-lede">Projects, panels, trading, calibration, AMC, O&M and validation each run differently. Threadline gives each its own flow without splitting the company into separate systems.</p>
        </div>
        <Reveal className="sc-vert-layout">
          <div className="sc-vert-tabs" role="tablist" aria-label="Business verticals">
            {VERTICALS.map((x, i) => (
              <button key={x.key} role="tab" aria-selected={x.key === key} className={`sc-vert-tab ${x.key === key ? "is-active" : ""}`} onClick={() => setKey(x.key)}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b>{x.name}</b>
                  <small>{x.headline}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="sc-vert-panel" key={v.key} role="tabpanel">
            <h3 className="sc-h3">{v.headline}</h3>
            <p className="sc-vert-body">{v.body}</p>
            <ol className="sc-chain" aria-label="Typical flow">
              {v.chain.map((c, i) => (
                <li key={c} style={{ animationDelay: `${i * 90}ms` }}>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
            <div className="sc-vert-foot">
              <a className="sc-example" href={href.record(v.example.id)}>
                <span className="mono">{v.example.id}</span>
                <b>{v.example.title}</b>
                <small>{v.example.detail}</small>
                <ArrowRight size={16} aria-hidden className="sc-example-arrow" />
              </a>
              <div className="sc-vert-meta">
                <p className="sc-measure">
                  <Gauge size={15} aria-hidden /> {v.measure}
                </p>
                <p className="sc-vert-mods">
                  {v.modules.map((m) => moduleDef(m).label).join(" · ")}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
