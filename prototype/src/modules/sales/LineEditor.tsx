import { Plus, Trash2 } from "lucide-react";
import { inr } from "../../api/format";
import type { BillingType, QuoteLine } from "../../api/types";
import { Button, IconButton, Input, Select, cx } from "../../ds/components";
import { BILLING_TYPES, lineValue } from "./rules";

/** A line as typed: numbers stay text until submit so partial input ("1,2") isn't lost. */
export type DraftLine = { key: number; description: string; billing: BillingType | ""; qty: string; rate: string };

let keySeq = 0;
export const blankLine = (billing: BillingType | "" = ""): DraftLine => ({ key: ++keySeq, description: "", billing, qty: "1", rate: "" });
export const draftFrom = (l: QuoteLine): DraftLine => ({ key: ++keySeq, description: l.description, billing: l.billing, qty: String(l.qty), rate: String(l.rate) });

const num = (s: string) => Number(s.replace(/[,\s₹]/g, ""));
export const toLines = (rows: DraftLine[]): QuoteLine[] =>
  rows.map((r) => ({ description: r.description, billing: r.billing as BillingType, qty: num(r.qty), rate: num(r.rate) }));
export const draftTotal = (rows: DraftLine[]) => rows.reduce((a, r) => a + (Number.isFinite(num(r.qty)) && Number.isFinite(num(r.rate)) ? lineValue({ qty: num(r.qty), rate: num(r.rate) }) : 0), 0);

/** Which row an error like "Line 2: …" points at, so it can be marked. */
export const errorRow = (error: string | null | undefined) => {
  const m = error?.match(/^Line (\d+):/);
  return m ? Number(m[1]) - 1 : -1;
};

const BILLING_DETAIL: Record<BillingType, string> = {
  Material: "Supply — billed on delivery",
  Engineering: "Design and services — milestone billing",
  Commissioning: "Site work — billed on SAT",
  AMC: "Recurring cover — billed per period",
};

/**
 * Small priced-line editor for quotations: description, billing type, quantity, rate.
 * Billing type stays per line because the four bill differently (E2E-01 step 2).
 */
export function LineEditor({ rows, onChange, error, idPrefix }: { rows: DraftLine[]; onChange: (rows: DraftLine[]) => void; error?: string | null; idPrefix: string }) {
  const bad = errorRow(error);
  const set = (i: number, patch: Partial<DraftLine>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="sal-lines">
      <div className="sal-lines-head" aria-hidden>
        <span>Description</span>
        <span>Billing</span>
        <span className="sal-lines-num">Qty</span>
        <span className="sal-lines-num">Rate (₹)</span>
        <span className="sal-lines-num">Amount</span>
        <span />
      </div>
      <ol className="sal-lines-list">
        {rows.map((r, i) => {
          const amount = Number.isFinite(num(r.qty)) && Number.isFinite(num(r.rate)) ? lineValue({ qty: num(r.qty), rate: num(r.rate) }) : 0;
          return (
            <li key={r.key} className={cx("sal-line", bad === i && "is-invalid")}>
              <Input
                id={`${idPrefix}-desc-${i}`}
                aria-label={`Line ${i + 1} description`}
                className="sal-line-desc"
                value={r.description}
                invalid={bad === i}
                placeholder="e.g. PLC, I/O and panel"
                onChange={(e) => set(i, { description: e.target.value })}
              />
              <div className="sal-line-billing">
                <Select size="sm" label={`Line ${i + 1} billing type`} value={r.billing} placeholder="Billing" onChange={(v) => set(i, { billing: v })} options={BILLING_TYPES.map((b) => ({ value: b, label: b, detail: BILLING_DETAIL[b] }))} invalid={bad === i && !r.billing} />
              </div>
              <Input aria-label={`Line ${i + 1} quantity`} className="sal-line-qty" inputMode="decimal" value={r.qty} invalid={bad === i} onChange={(e) => set(i, { qty: e.target.value })} />
              <Input aria-label={`Line ${i + 1} rate in rupees`} className="sal-line-rate" inputMode="numeric" value={r.rate} invalid={bad === i} placeholder="0" onChange={(e) => set(i, { rate: e.target.value })} />
              <span className="sal-line-amount t-num">{amount ? inr(amount) : "—"}</span>
              <IconButton icon={Trash2} label={`Remove line ${i + 1}`} size="sm" disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
            </li>
          );
        })}
      </ol>
      <div className="sal-lines-foot">
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => onChange([...rows, blankLine()])} disabled={rows.length >= 50}>
          Add line
        </Button>
        <span className="sal-lines-total">
          <span className="sal-label">Value before tax</span>
          <strong className="t-num">{inr(draftTotal(rows))}</strong>
        </span>
      </div>
    </div>
  );
}
