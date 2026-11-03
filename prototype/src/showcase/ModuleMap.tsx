import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import type { ModuleKey } from "../api/types";
import { moduleDef } from "../app/modules";
import { href } from "../app/router";
import { MODULE_NODES } from "./content";
import { Reveal } from "./motion";

export function ModuleMap() {
  const [active, setActive] = useState<ModuleKey>("projects");
  const node = MODULE_NODES.find((n) => n.key === active)!;
  const linked = new Set<ModuleKey>([...node.links, ...MODULE_NODES.filter((n) => n.links.includes(active)).map((n) => n.key)]);
  const pos = (k: ModuleKey) => MODULE_NODES.find((n) => n.key === k)!;

  const edges: { a: ModuleKey; b: ModuleKey }[] = [];
  MODULE_NODES.forEach((n) => n.links.forEach((l) => edges.push({ a: n.key, b: l })));

  return (
    <section className="sc-section sc-map-section" id="modules">
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">Eleven modules, one data model</h2>
          <p className="sc-lede">No separate systems to sync. Pick a module to see who it hands work to. Identity, approvals, documents, audit and notifications are shared services underneath all of them.</p>
        </div>
        <Reveal className="sc-map-layout">
          <div className="sc-map" role="group" aria-label="Module map">
            <svg className="sc-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {edges.map(({ a, b }) => {
                const A = pos(a);
                const B = pos(b);
                const on = a === active || b === active;
                return <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className={on ? "is-on" : ""} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            <div className="sc-map-core" aria-hidden>
              <span className="sc-core-ring" />
              <span className="sc-core-ring sc-core-ring-2" />
              <span className="sc-core-label">
                Shared platform
                <small>Identity · approvals · audit · documents · notifications</small>
              </span>
            </div>
            {MODULE_NODES.map((n) => {
              const Icon = moduleDef(n.key).icon;
              const state = n.key === active ? "is-active" : linked.has(n.key) ? "is-linked" : "is-dim";
              return (
                <button
                  key={n.key}
                  className={`sc-map-node ${state}`}
                  style={{ left: `calc(9% + ${n.x * 0.82}%)`, top: `calc(7% + ${n.y * 0.86}%)` }}
                  onClick={() => setActive(n.key)}
                  onMouseEnter={() => setActive(n.key)}
                  onFocus={() => setActive(n.key)}
                  aria-pressed={n.key === active}
                >
                  <span className="sc-map-icon">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="sc-map-text">
                    <b>{n.label}</b>
                    <small>{n.short}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <aside className="sc-map-panel" aria-live="polite">
            <p className="sc-map-panel-kicker">{linked.size} connected modules</p>
            <h3 className="sc-h3">{node.label}</h3>
            <p className="sc-map-panel-desc">{moduleDef(node.key).description}</p>
            <ul className="sc-checks">
              {node.points.map((p) => (
                <li key={p}>
                  <Check size={15} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <div className="sc-map-links">
              {[...linked].map((k) => (
                <button key={k} className="sc-chip" onClick={() => setActive(k)}>
                  {moduleDef(k).label}
                </button>
              ))}
            </div>
            <a className="btn btn-secondary" href={href.module(node.key)}>
              Open {node.label} <ArrowRight size={16} aria-hidden />
            </a>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
