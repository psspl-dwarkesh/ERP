/**
 * Default project set-up when an order becomes a project (E2E-01 step 6, SAL-006).
 * Pure functions shared by the in-browser command and the API command, so a project
 * opened in either mode gets the same milestones, billing split and budget.
 */
import type { Milestone, Vertical } from "../../api/types";

/** Working budget as a share of contract value until the project manager re-plans it. */
export const BUDGET_SHARE = 0.8;

type Step = { name: string; at: number; share: number; gate?: string };

/**
 * Billing pattern per vertical: where each milestone falls between start (0) and
 * due (1), and the share of contract value it releases. Shares sum to 100.
 * Non-billing steps (share 0) are gates the billing ones depend on.
 */
export const BILLING_PATTERN: Record<Vertical, Step[]> = {
  "Turnkey automation": [
    { name: "Design approval & URS sign-off", at: 0.2, share: 20, gate: "Design" },
    { name: "Panel FAT", at: 0.55, share: 40, gate: "FAT" },
    { name: "Installation & loop test", at: 0.8, share: 0, gate: "Loop test" },
    { name: "SAT & handover", at: 1, share: 40, gate: "SAT" },
  ],
  "Panel assembly": [
    { name: "GA drawing approval", at: 0.2, share: 20, gate: "Design" },
    { name: "Panel FAT", at: 0.7, share: 40, gate: "FAT" },
    { name: "Delivery, SAT & handover", at: 1, share: 40, gate: "SAT" },
  ],
  Instrumentation: [
    { name: "Datasheet & hook-up approval", at: 0.2, share: 20, gate: "Design" },
    { name: "Material at site", at: 0.5, share: 30, gate: "Delivery" },
    { name: "Loop checks", at: 0.8, share: 30, gate: "Loop test" },
    { name: "Commissioning & handover", at: 1, share: 20, gate: "SAT" },
  ],
  Calibration: [
    { name: "Instrument list & schedule agreed", at: 0.1, share: 0 },
    { name: "Calibration complete", at: 0.85, share: 70 },
    { name: "Certificates issued", at: 1, share: 30, gate: "Certificate" },
  ],
  AMC: [
    { name: "Quarter 1 service", at: 0.25, share: 25 },
    { name: "Quarter 2 service", at: 0.5, share: 25 },
    { name: "Quarter 3 service", at: 0.75, share: 25 },
    { name: "Quarter 4 service", at: 1, share: 25 },
  ],
  "O&M": [
    { name: "Quarter 1 operations", at: 0.25, share: 25 },
    { name: "Quarter 2 operations", at: 0.5, share: 25 },
    { name: "Quarter 3 operations", at: 0.75, share: 25 },
    { name: "Quarter 4 operations", at: 1, share: 25 },
  ],
  "CSV / Manufacturing IT": [
    { name: "Validation plan approved", at: 0.2, share: 20, gate: "Design" },
    { name: "IQ/OQ executed", at: 0.6, share: 40, gate: "OQ" },
    { name: "PQ & summary report", at: 1, share: 40, gate: "PQ" },
  ],
};

function addDays(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** Milestones MS-1…n with dates spread over the plan and billable values that add up to the contract value exactly. */
export function milestonePlan(vertical: Vertical, start: string, due: string, contractValue: number, today: string): Milestone[] {
  const steps = BILLING_PATTERN[vertical] ?? BILLING_PATTERN["Turnkey automation"];
  const span = Math.max(1, daysBetween(start, due));
  const lastBillable = steps.map((s) => s.share > 0).lastIndexOf(true);
  let allotted = 0;
  return steps.map((s, i) => {
    const billable = s.share > 0 ? (i === lastBillable ? contractValue - allotted : Math.round((contractValue * s.share) / 100)) : undefined;
    if (billable) allotted += billable;
    const m: Milestone = { id: `MS-${i + 1}`, name: s.name, due: i === steps.length - 1 ? due : addDays(start, Math.round(span * s.at)), status: i === 0 && start <= today ? "In progress" : "Upcoming" };
    if (billable) m.billable = billable;
    if (s.gate) m.gate = s.gate;
    return m;
  });
}

/** First problem with the dates for a new project; null when they work. */
export function planProblem(start: string, due: string, today: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(start) || Number.isNaN(Date.parse(start))) return "Enter the start date as YYYY-MM-DD.";
  if (!iso.test(due) || Number.isNaN(Date.parse(due))) return "Enter the due date as YYYY-MM-DD.";
  if (due <= start) return "The due date must be after the start date.";
  if (due < today) return "The due date is already past. Agree a realistic handover date first.";
  if (daysBetween(start, due) > 1100) return "Plans longer than three years need a phased contract; split the order.";
  return null;
}
