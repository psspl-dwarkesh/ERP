import { useEffect, useRef, useState, type ReactNode } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    // Already on screen at mount (or no observer support): show now, never hide content.
    const r = el.getBoundingClientRect();
    if (!("IntersectionObserver" in window) || (r.top < window.innerHeight && r.bottom > 0)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 14% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** Fades and lifts its children into place when scrolled into view. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return (
    <Tag ref={ref as never} className={`sc-reveal ${seen ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Counts up to `to` once visible. */
export function CountUp({ to, duration = 1400, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (prefersReducedMotion()) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref} className="t-num">
      {v}
      {suffix}
    </span>
  );
}

/** Interval that pauses while the tab is hidden or the user asked for less motion. */
export function useTicker(ms: number, enabled = true) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (!document.hidden) setN((x) => x + 1);
    }, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
  return n;
}
