import { useEffect, useRef } from "react";
import "./threads.css";

/**
 * Background art: separate strands drifting in from the left and converging into one thread.
 * Two depth layers (far: thin, cool, soft; near: brighter teal with travelling light pulses),
 * gentle pointer parallax, paused off-screen, and fully static under reduced motion.
 * Teal and steel-blue only; it never carries meaning, so it is aria-hidden.
 */

const KNOT = { x: 1180, y: 470 };

/** Smooth path through waypoints (Catmull-Rom converted to cubic Bezier). */
function smooth(p: [number, number][]) {
  let d = `M ${p[0][0]} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A strand drifts in from the left with its own gentle wave, gathers into the braid, and leaves as one thread. */
function strand(y: number, d: number, w = 40) {
  const K = KNOT.y;
  const at = (t: number) => y + (K - y) * t;
  return smooth([
    [-140, y],
    [220, at(0.12) + w],
    [560, at(0.45) - w * 0.9],
    [900, at(0.82) + w * 0.45],
    [KNOT.x, K + d],
    [1440, K - 34 + d * 1.5 - w * 0.2],
    [1760, K - 70 + d * 2.4],
  ]);
}

const FAR = [
  { y: 110, d: -14, w: 46 },
  { y: 250, d: -9, w: -38 },
  { y: 410, d: -3, w: 52 },
  { y: 600, d: 4, w: -44 },
  { y: 750, d: 10, w: 36 },
  { y: 880, d: 15, w: -50 },
].map((s) => strand(s.y, s.d, s.w));

const NEAR = [
  { y: 180, d: -10, w: -42, pulse: 0 },
  { y: 330, d: -4, w: 34, pulse: -1 },
  { y: 520, d: 1, w: -30, pulse: 1 },
  { y: 676, d: 6, w: 44, pulse: -1 },
  { y: 820, d: 11, w: -36, pulse: 2 },
].map((s) => ({ d: strand(s.y, s.d, s.w), pulse: s.pulse }));

export function ThreadArt({ align = "xMidYMid", parallax = true, className = "" }: { align?: string; parallax?: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const far = useRef<SVGSVGElement>(null);
  const near = useRef<SVGSVGElement>(null);

  // Pause the pulses while the art is off-screen, so scrolling the rest of the page costs nothing.
  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pointer parallax: fine pointers only, never under reduced motion. Writes transforms directly (no re-render).
  useEffect(() => {
    if (!parallax) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (mq.matches || !fine.matches) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      raf = 0;
      if (far.current) far.current.style.transform = `translate3d(${(-nx * 10).toFixed(2)}px, ${(-ny * 7).toFixed(2)}px, 0)`;
      if (near.current) near.current.style.transform = `translate3d(${(-nx * 22).toFixed(2)}px, ${(-ny * 14).toFixed(2)}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      nx = e.clientX / window.innerWidth - 0.5;
      ny = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [parallax]);

  const par = `${align} slice`;
  return (
    <div ref={root} className={`thr ${className}`} aria-hidden>
      <svg ref={far} className="thr-layer thr-far" viewBox="0 0 1600 900" preserveAspectRatio={par} focusable="false">
        <defs>
          <linearGradient id="thr-far-grad" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1700" y2="0">
            <stop offset="0" stopColor="#3b8fb8" stopOpacity="0" />
            <stop offset="0.35" stopColor="#3b8fb8" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#45c4cd" stopOpacity="0.8" />
            <stop offset="1" stopColor="#45c4cd" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="thr-knot-grad">
            <stop offset="0" stopColor="#45c4cd" stopOpacity="0.34" />
            <stop offset="0.45" stopColor="#2a96a0" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2a96a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="thr-knot" cx={KNOT.x} cy={KNOT.y} rx="420" ry="260" fill="url(#thr-knot-grad)" />
        {FAR.map((d, i) => (
          <path key={i} d={d} className="thr-strand" stroke="url(#thr-far-grad)" />
        ))}
      </svg>
      <svg ref={near} className="thr-layer thr-near" viewBox="0 0 1600 900" preserveAspectRatio={par} focusable="false">
        <defs>
          <linearGradient id="thr-near-grad" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1700" y2="0">
            <stop offset="0" stopColor="#0b7a85" stopOpacity="0" />
            <stop offset="0.3" stopColor="#0b7a85" stopOpacity="0.7" />
            <stop offset="0.68" stopColor="#45c4cd" stopOpacity="1" />
            <stop offset="1" stopColor="#8fdce1" stopOpacity="0.35" />
          </linearGradient>
          {/* Pulses only light up away from the copy: invisible on the left, full on the right. */}
          <linearGradient id="thr-pulse-grad" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1700" y2="0">
            <stop offset="0" stopColor="#c9f4f6" stopOpacity="0" />
            <stop offset="0.36" stopColor="#c9f4f6" stopOpacity="0" />
            <stop offset="0.6" stopColor="#c9f4f6" stopOpacity="1" />
            <stop offset="1" stopColor="#c9f4f6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="thr-halo-grad" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1700" y2="0">
            <stop offset="0" stopColor="#45c4cd" stopOpacity="0" />
            <stop offset="0.36" stopColor="#45c4cd" stopOpacity="0" />
            <stop offset="0.62" stopColor="#45c4cd" stopOpacity="0.3" />
            <stop offset="1" stopColor="#45c4cd" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {NEAR.map((s, i) => (
          <path key={i} d={s.d} className="thr-strand" stroke="url(#thr-near-grad)" />
        ))}
        {NEAR.filter((s) => s.pulse >= 0).map((s) => (
          <g key={`p${s.pulse}`} className={`thr-pulse thr-pulse-${s.pulse}`}>
            <path d={s.d} pathLength={1000} className="thr-pulse-halo" stroke="url(#thr-halo-grad)" />
            <path d={s.d} pathLength={1000} className="thr-pulse-core" stroke="url(#thr-pulse-grad)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
