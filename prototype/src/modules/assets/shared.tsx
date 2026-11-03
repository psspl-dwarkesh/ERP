import { daysFrom, relativeDay } from "../../api/format";
import type { Asset, Person, ServiceContract, ServiceTicket, Tone } from "../../api/types";
import { navigate } from "../../app/router";
import { Tag, cx } from "../../ds/components";

export type AstTab = "tickets" | "assets" | "contracts" | "calibration";

export function openAssetsRecord(id: string, tab?: string) {
  navigate(`/app/assets/${encodeURIComponent(id)}${tab ? `?tab=${tab}` : ""}`);
}

export const FIELD_ROLES = ["Service Engineer", "Field Technician", "Commissioning Engineer", "Calibration Engineer", "Validation Lead", "QC Inspector"];

export const BOARD: ServiceTicket["status"][] = ["New", "Assigned", "En route", "On site", "Resolved"];

export const isOpen = (t: ServiceTicket) => t.status !== "Resolved" && t.status !== "Closed";

export function Prio({ p }: { p: ServiceTicket["priority"] }) {
  return (
    <span className={`prio prio-${p.toLowerCase()}`} aria-label={`Priority ${p}`}>
      {p}
    </span>
  );
}

export function OwnershipTag({ asset }: { asset: Pick<Asset, "ownership"> }) {
  return asset.ownership === "Customer" ? <Tag tone="info">Customer-installed</Tag> : <Tag tone="violet">Company-owned</Tag>;
}

/** A due date with tone by urgency: overdue red, within a week amber. */
export function DueText({ iso, label }: { iso: string; label?: string }) {
  const d = daysFrom(iso);
  const tone: Tone = d < 0 ? "risk" : d <= 7 ? "warn" : "neutral";
  return (
    <span className={cx("ast-due", `tone-${tone}`)}>
      {label && <span className="ast-due-label">{label}</span>}
      {relativeDay(iso)}
    </span>
  );
}

export function personDetail(p: Person) {
  return `${p.role} · ${p.location} · ${p.status}${p.assignment ? ` on ${p.assignment}` : ""}`;
}

/** Days left on a contract and whether it is close to renewal. */
export function contractWindow(c: ServiceContract) {
  const left = daysFrom(c.end);
  return { left, renewal: c.status === "Renewal due" || left <= 60 };
}
