import { NOW, TODAY } from "./fixtures";

/** ₹48.50 L, ₹1.42 Cr, ₹8,450 — Indian grouping and units. */
export function inr(value: number, opts: { compact?: boolean } = {}) {
  const compact = opts.compact ?? true;
  const sign = value < 0 ? "−" : "";
  const v = Math.abs(value);
  if (compact && v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)} Cr`;
  if (compact && v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2)} L`;
  return `${sign}₹${v.toLocaleString("en-IN")}`;
}

export function num(value: number) {
  return value.toLocaleString("en-IN");
}

export function pct(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "18 Nov 2026" (or "18 Nov" when short). Accepts ISO date or datetime. */
export function date(iso: string, short = false) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return short ? `${d} ${MONTHS[m - 1]}` : `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function time(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

/** Whole days from demo "today" to the given date (negative = past). */
export function daysFrom(iso: string) {
  const a = Date.parse(TODAY);
  const b = Date.parse(iso.slice(0, 10));
  return Math.round((b - a) / 86400000);
}

export function relativeDay(iso: string) {
  const d = daysFrom(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${-d} days ago`;
  return `In ${d} days`;
}

/** "2 h ago" relative to the demo clock. */
export function ago(iso: string) {
  const mins = Math.round((Date.parse(NOW) - Date.parse(iso)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

/** Minutes until an ISO datetime from the demo clock. */
export function minutesUntil(iso: string) {
  return Math.round((Date.parse(iso) - Date.parse(NOW)) / 60000);
}

export function duration(mins: number) {
  const sign = mins < 0 ? "−" : "";
  const m = Math.abs(mins);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${sign}${h} h ${String(r).padStart(2, "0")} m` : `${sign}${r} m`;
}
