import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ShieldCheck, SlidersHorizontal, Undo2, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { moduleForId } from "../../api/client";
import type { Item, StockMovement } from "../../api/types";
import { navigate } from "../../app/router";
import { RecordLink } from "../../ds/components";

export type InvTab = "stock" | "movements" | "mrp" | "assembly" | "counts";

export const freeQty = (i: Pick<Item, "onHand" | "reserved" | "quarantined">) => Math.max(0, i.onHand - i.reserved - i.quarantined);

/** Open a record inside this module while keeping the current tab, so closing returns to the same view. */
export function openInventoryRecord(id: string, tab?: string) {
  navigate(`/app/inventory/${encodeURIComponent(id)}${tab ? `?tab=${tab}` : ""}`);
}

export const MOVEMENT_ICON: Record<StockMovement["type"], LucideIcon> = {
  Receipt: ArrowDownToLine,
  Issue: ArrowUpFromLine,
  Transfer: ArrowLeftRight,
  Return: Undo2,
  Adjustment: SlidersHorizontal,
  "QC release": ShieldCheck,
};

const ID_RE = /\b([A-Z]{2,4}-\d{2,4}(?:-[A-Z])?)\b/g;

/** Render free text such as "GRN-0073 · PO-0109" with every known record id as a link. */
export function RefText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ID_RE)) {
    const id = m[1];
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(moduleForId(id) ? <RecordLink key={start} id={id} /> : <span key={start} className="mono inv-plain-id">{id}</span>);
    last = start + id.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="inv-ref">{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</span>;
}

/** Signed quantity as a ledger reads it: issues and returns out are negative. */
export function signedQty(m: StockMovement) {
  if (m.type === "Issue") return -Math.abs(m.qty);
  if (m.type === "Receipt" || m.type === "QC release") return Math.abs(m.qty);
  return m.qty;
}
