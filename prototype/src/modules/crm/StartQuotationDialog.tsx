import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { inr } from "../../api/format";
import { useMutation } from "../../api/hooks";
import type { BillingType, Opportunity, Vertical } from "../../api/types";
import { href, navigate } from "../../app/router";
import { Button, Callout, Dialog, KeyValues, useToast } from "../../ds/components";
import { LineEditor, blankLine, draftTotal, errorRow, toLines, type DraftLine } from "../sales/LineEditor";
import { QUOTE_VALIDITY_DAYS } from "../sales/rules";
import { startQuotation } from "./commands";

/** The billing types a vertical usually quotes, as a starting set of blank lines. */
const STARTER: Record<Vertical, BillingType[]> = {
  "Turnkey automation": ["Material", "Engineering", "Commissioning"],
  "Panel assembly": ["Material", "Engineering"],
  Instrumentation: ["Material", "Commissioning"],
  Calibration: ["Engineering"],
  AMC: ["AMC"],
  "O&M": ["AMC"],
  "CSV / Manufacturing IT": ["Engineering"],
};

export function StartQuotationDialog({ opportunity: o, open, onOpenChange }: { opportunity: Opportunity; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(startQuotation);
  const [rows, setRows] = useState<DraftLine[]>([]);

  useEffect(() => {
    if (open) {
      setRows(STARTER[o.vertical].map((b) => blankLine(b)));
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, o.id]);

  const total = draftTotal(rows);
  const gap = total - o.value;
  const lineError = errorRow(m.error) >= 0 || m.error?.startsWith("Add at least");

  const submit = async () => {
    const q = await m.run(o.id, toLines(rows));
    if (!q) return;
    onOpenChange(false);
    toast({
      title: `${q.id} rev A drafted`,
      body: `${inr(q.value)} for ${q.customer}. ${o.id} moved to Proposal; send the quotation from Sales when it's ready.`,
      action: { label: `Open ${q.id}`, onClick: () => navigate(href.record(q.id)) },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      icon={FileText}
      title="Start quotation"
      description={`Rev A for ${o.account}, drafted from ${o.id}. Account, title and owner carry over; nothing is sent until you send it.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Create draft quotation
          </Button>
        </>
      }
    >
      <div className="stack">
        <KeyValues
          columns={3}
          items={[
            { label: "Customer", value: o.account },
            { label: "Title", value: o.name },
            { label: "Valid for", value: `${QUOTE_VALIDITY_DAYS} days from today` },
          ]}
        />
        <LineEditor idPrefix="sq" rows={rows} onChange={(r) => { setRows(r); m.reset(); }} error={m.error} />
        {total > 0 && Math.abs(gap) >= Math.max(1, o.value * 0.1) && !m.error && (
          <p className="crm-drawer-hint">
            Lines total {inr(total)}, {gap > 0 ? `${inr(gap)} above` : `${inr(-gap)} below`} the opportunity's expected {inr(o.value)}. The opportunity keeps its estimate; the quotation carries the priced value.
          </p>
        )}
        {m.error && (
          <Callout tone={lineError ? "warn" : "risk"} title={lineError ? "Check the lines" : "The quotation wasn't created"}>
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}
