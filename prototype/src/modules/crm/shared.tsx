import { CalendarClock, MoveRight } from "lucide-react";
import { api } from "../../api/client";
import { daysFrom, relativeDay } from "../../api/format";
import type { Opportunity, OpportunityStage, Vertical } from "../../api/types";
import { cx, type MenuItem } from "../../ds/components";

export const OPEN_STAGES: OpportunityStage[] = ["Lead", "Qualified", "Proposal", "Negotiation"];
export const ALL_STAGES: OpportunityStage[] = [...OPEN_STAGES, "Won", "Lost"];

export const isOpen = (o: Opportunity) => o.stage !== "Won" && o.stage !== "Lost";
export const weighted = (o: Opportunity) => (isOpen(o) ? Math.round((o.value * o.probability) / 100) : 0);

/** Short vertical label for tags on dense cards. */
export const VERTICAL_SHORT: Record<Vertical, string> = {
  "Turnkey automation": "Turnkey",
  "Panel assembly": "Panels",
  Instrumentation: "Instrumentation",
  Calibration: "Calibration",
  AMC: "AMC",
  "O&M": "O&M",
  "CSV / Manufacturing IT": "CSV / IT",
};

export function NextAction({ o, compact }: { o: Opportunity; compact?: boolean }) {
  const d = daysFrom(o.nextActionDue);
  const open = isOpen(o);
  const tone = !open ? "neutral" : d < 0 ? "risk" : d <= 1 ? "warn" : "neutral";
  return (
    <span className={cx("crm-next", `tone-${tone}`, compact && "is-compact")}>
      <CalendarClock size={13} aria-hidden />
      <span className="crm-next-text">{o.nextAction}</span>
      {open && <span className="crm-next-due">{d < 0 ? `Overdue ${-d} d` : relativeDay(o.nextActionDue)}</span>}
    </span>
  );
}

/** "Move to stage…" items for a Menu. Calls the shared command and reports through a toast. */
export function moveItems(o: Opportunity, toast: (t: { title: string; body?: string; tone?: "ok" | "warn" | "risk" | "info" }) => void): MenuItem[] {
  return [
    { heading: "Move to stage…" },
    ...ALL_STAGES.filter((s) => s !== o.stage).map<MenuItem>((s) => ({
      label: s,
      icon: MoveRight,
      tone: s === "Lost" ? "risk" : undefined,
      detail: s === "Won" ? "Hands over to Sales for a quotation-backed order" : s === "Lost" ? "Record the reason in a note" : undefined,
      onSelect: async () => {
        try {
          await api.moveOpportunity(o.id, s);
          toast({
            title: `${o.id} moved to ${s}`,
            body: s === "Won" ? "Sales can now convert the accepted quotation into an order — nothing is re-typed." : s === "Lost" ? "Add the loss reason in the opportunity so win/loss reporting stays honest." : `${o.name} · ${o.account}`,
            tone: s === "Lost" ? "warn" : "ok",
          });
        } catch (e) {
          toast({ title: "Couldn't move the opportunity", body: e instanceof Error ? e.message : String(e), tone: "risk" });
        }
      },
    })),
  ];
}
