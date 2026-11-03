import { Handshake } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { verticals } from "../../api/fixtures";
import { useMutation, useQuery } from "../../api/hooks";
import type { Opportunity, Vertical } from "../../api/types";
import { navigate } from "../../app/router";
import { Button, Dialog, Field, Input, Select, useToast } from "../../ds/components";
import { createOpportunity, type NewOpportunityInput } from "./commands";

const EMPTY: NewOpportunityInput = { name: "", account: "", vertical: "", value: 0, closeDate: "", source: "" };
const SOURCES: Opportunity["source"][] = ["Existing customer", "Referral", "Tender", "Website", "Renewal"];

export function NewOpportunityDialog({ open, onOpenChange, tab }: { open: boolean; onOpenChange: (o: boolean) => void; tab: string }) {
  const toast = useToast();
  const customers = useQuery(api.customers);
  const [form, setForm] = useState(EMPTY);
  const [valueText, setValueText] = useState("");
  const m = useMutation(createOpportunity);
  const me = api.currentUser();

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setValueText("");
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof NewOpportunityInput>(k: K, v: NewOpportunityInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    m.reset();
  };

  const submit = async () => {
    const lakh = Number(valueText.replace(/,/g, ""));
    const r = await m.run({ ...form, value: lakh * 100000 }, me.name);
    if (r) {
      onOpenChange(false);
      toast({ title: `${r.id} added as a lead`, body: `${r.name} · ${r.account}. Qualify it to move it on the board.` });
      navigate(`/app/crm/${r.id}?tab=${tab}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Handshake}
      title="New opportunity"
      description="Starts as a Lead at 10%. Account, vertical and value carry through to the quotation and order."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Create lead
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Opportunity name" htmlFor="opp-name" required>
          <Input id="opp-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Packaging line PLC retrofit" autoFocus />
        </Field>
        <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
          <Field label="Account" htmlFor="opp-account" required hint="Existing customers only — new accounts go through duplicate check.">
            <Select id="opp-account" label="Account" value={form.account} onChange={(v) => set("account", v)} placeholder="Choose account" options={(customers.data ?? []).map((c) => ({ value: c.name, label: c.name, detail: c.industry }))} />
          </Field>
          <Field label="Vertical" htmlFor="opp-vertical" required>
            <Select id="opp-vertical" label="Vertical" value={form.vertical} onChange={(v) => set("vertical", v as Vertical)} placeholder="Choose vertical" options={verticals.map((v) => ({ value: v, label: v }))} />
          </Field>
          <Field label="Expected value" htmlFor="opp-value" required>
            <Input id="opp-value" inputMode="decimal" value={valueText} onChange={(e) => { setValueText(e.target.value); m.reset(); }} placeholder="12.5" suffix="₹ lakh" />
          </Field>
          <Field label="Expected close" htmlFor="opp-close" required>
            <Input id="opp-close" value={form.closeDate} onChange={(e) => set("closeDate", e.target.value)} placeholder="2026-12-15" />
          </Field>
        </div>
        <Field label="Source" htmlFor="opp-source" required error={m.error}>
          <Select id="opp-source" label="Source" value={form.source} onChange={(v) => set("source", v)} placeholder="Where did it come from?" options={SOURCES.map((s) => ({ value: s, label: s }))} invalid={!!m.error} />
        </Field>
      </div>
    </Dialog>
  );
}
