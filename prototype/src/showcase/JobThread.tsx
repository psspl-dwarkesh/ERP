import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { href } from "../app/router";
import { Status } from "../ds/components";
import { JOB_STOPS } from "./content";
import { prefersReducedMotion, useInView } from "./motion";

const PATH = "M 30 110 C 110 110, 120 40, 200 40 S 300 120, 380 110 S 470 30, 560 40 S 660 130, 740 110 S 830 30, 900 45 S 960 100, 990 90";

export function JobThread() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!prefersReducedMotion());
  const [sectionRef, seen] = useInView<HTMLElement>(0.25);
  const pathRef = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number; len: number }[]>([]);
  const [total, setTotal] = useState(1);
  const [pulse, setPulse] = useState<{ x: number; y: number }>({ x: 30, y: 110 });
  const fromLen = useRef(0);

  // Place stops evenly along the path once it is measurable.
  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    setTotal(L);
    setPoints(
      JOB_STOPS.map((_, i) => {
        const len = (L * i) / (JOB_STOPS.length - 1);
        const pt = p.getPointAtLength(len);
        return { x: pt.x, y: pt.y, len };
      }),
    );
  }, []);

  // Auto-advance while visible.
  useEffect(() => {
    if (!playing || !seen) return;
    const id = setInterval(() => {
      if (!document.hidden) setActive((a) => (a + 1) % JOB_STOPS.length);
    }, 3800);
    return () => clearInterval(id);
  }, [playing, seen]);

  // Animate the pulse along the path to the active stop.
  useEffect(() => {
    const p = pathRef.current;
    if (!p || !points.length) return;
    const target = points[active].len;
    const start = fromLen.current;
    if (prefersReducedMotion()) {
      const pt = p.getPointAtLength(target);
      setPulse({ x: pt.x, y: pt.y });
      fromLen.current = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = Math.min(1100, 260 + Math.abs(target - start) * 0.9);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const len = start + (target - start) * e;
      const pt = p.getPointAtLength(len);
      setPulse({ x: pt.x, y: pt.y });
      fromLen.current = len;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, points]);

  const stop = JOB_STOPS[active];
  const go = (i: number) => {
    setActive((i + JOB_STOPS.length) % JOB_STOPS.length);
  };

  return (
    <section className="sc-section sc-thread" id="thread" ref={sectionRef}>
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">Follow one job through the business</h2>
          <p className="sc-lede">
            One record, PRJ-0264, from tender enquiry to the service ticket logged this morning. Pick any stop to see what happens there, who owns it, and which control stops a mistake moving downstream.
          </p>
        </div>

        <div className={`sc-thread-stage ${seen ? "is-in" : ""}`}>
          <svg className="sc-thread-svg" viewBox="0 0 1020 160" role="img" aria-label="Job route across nine stops">
            <defs>
              <linearGradient id="sc-thread-grad" x1="0" x2="1">
                <stop offset="0" stopColor="var(--teal-300)" />
                <stop offset="1" stopColor="var(--teal-500)" />
              </linearGradient>
              <radialGradient id="sc-pulse-grad">
                <stop offset="0" stopColor="var(--teal-glow)" stopOpacity="0.55" />
                <stop offset="1" stopColor="var(--teal-glow)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path ref={pathRef} d={PATH} className="sc-thread-base" />
            <path
              d={PATH}
              pathLength={1}
              className="sc-thread-done"
              style={{ strokeDasharray: "1 1", strokeDashoffset: seen && points.length ? 1 - points[active].len / total : 1 }}
            />
            {points.map((pt, i) => (
              <g
                key={JOB_STOPS[i].key}
                className={`sc-stop ${i === active ? "is-active" : ""} ${i < active ? "is-done" : ""}`}
                transform={`translate(${pt.x} ${pt.y})`}
                onClick={() => {
                  setPlaying(false);
                  go(i);
                }}
              >
                <circle r="16" className="sc-stop-halo" />
                <circle r="8" className="sc-stop-dot" />
                <text y={pt.y < 80 ? -24 : 34} textAnchor="middle" className="sc-stop-label">
                  {JOB_STOPS[i].label}
                </text>
              </g>
            ))}
            <circle cx={pulse.x} cy={pulse.y} r="26" fill="url(#sc-pulse-grad)" className="sc-pulse-glow" />
            <circle cx={pulse.x} cy={pulse.y} r="5" className="sc-pulse" />
          </svg>

          <div className="sc-stop-tabs" role="tablist" aria-label="Job stops">
            {JOB_STOPS.map((s, i) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={i === active}
                className={`sc-stop-tab ${i === active ? "is-active" : ""}`}
                onClick={() => {
                  setPlaying(false);
                  go(i);
                }}
              >
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="sc-stop-panel" key={stop.key} role="tabpanel">
            <div className="sc-stop-copy">
              <div className="sc-stop-meta">
                <span className="sc-stop-module">{stop.moduleLabel}</span>
                <span className="mono sc-stop-id">{stop.record}</span>
              </div>
              <h3 className="sc-h3">{stop.title}</h3>
              <p className="sc-stop-happens">{stop.happens}</p>
              <ul className="sc-stop-facts">
                <li>
                  <ShieldCheck size={16} aria-hidden />
                  <span>
                    <b>Control</b>
                    {stop.control}
                  </span>
                </li>
                <li>
                  <UserRound size={16} aria-hidden />
                  <span>
                    <b>Owner</b>
                    {stop.owner}
                  </span>
                </li>
              </ul>
            </div>
            <div className="sc-stop-record">
              <div className="sc-record-card">
                <div className="sc-record-top">
                  <span className="mono">{stop.record}</span>
                  <Status>{stop.status}</Status>
                </div>
                <p className="sc-record-title">{stop.title}</p>
                <div className="sc-record-links">
                  {JOB_STOPS.slice(Math.max(0, active - 1), active + 2).map((s) => (
                    <span key={s.key} className={s.key === stop.key ? "is-self" : ""}>
                      {s.record}
                    </span>
                  ))}
                </div>
                <div className="sc-record-bar">
                  <span style={{ width: `${((active + 1) / JOB_STOPS.length) * 100}%` }} />
                </div>
                <p className="sc-record-foot">
                  Stop {active + 1} of {JOB_STOPS.length} · linked both ways
                </p>
              </div>
              <a className="btn btn-primary sc-record-open" href={href.record(stop.record)}>
                Open {stop.record} in the demo <ArrowRight size={16} aria-hidden />
              </a>
            </div>
          </div>

          <div className="sc-thread-controls">
            <button className="icon-btn icon-btn-secondary" aria-label="Previous stop" onClick={() => { setPlaying(false); go(active - 1); }}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
              {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              <span>{playing ? "Pause tour" : "Play tour"}</span>
            </button>
            <button className="icon-btn icon-btn-secondary" aria-label="Next stop" onClick={() => { setPlaying(false); go(active + 1); }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
