import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { date, inr } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import { navigate } from "../../app/router";
import { Button, Callout, Dialog, Field, IconButton, Input, Select, Switch, useToast } from "../../ds/components";
import { submitRequisition } from "./commands";
import { OPS_HEAD_THRESHOLD, addDays, approverFor, daysBetween } from "./util";

type Source = "project" | "bom" | "reorder" | "maintenance" | "general";
const SOURCES: { value: Source; label: string; detail: string }[] = [
  { value: "bom", label: "BOM shortage", detail: "Released BOM needs more than is free" },
  { value: "project", label: "Project site need", detail: "Material or service for a project" },
  { value: "reorder", label: "Reorder level", detail: "Stock fell below its reorder point" },
  { value: "maintenance", label: "Maintenance demand", detail: "Spares for AMC, O&M or internal assets" },
  { value: "general", label: "General procurement", detail: "Tools, consumables, services" },
];
const UOMS = ["nos", "m", "set", "kg", "lot", "job"].map((u) => ({ value: u, label: u }));

interface Line {
  key: number;
  item: string;
  qty: string;
  uom: string;
}
type Errors = { title?: string; source?: string; project?: string; needBy?: string; value?: string; lines?: Record<number, { item?: string; qty?: string }>; linesEmpty?: string };

let lineKey = 1;
const blankLine = (): Line => ({ key: lineKey++, item: "", qty: "", uom: "nos" });

export function NewRequisitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const projects = useQuery(api.projects);
  const create = useMutation(api.createPurchaseRequest);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Source | "">("");
  const [projectId, setProjectId] = useState("none");
  const [needBy, setNeedBy] = useState("");
  const [value, setValue] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [sendNow, setSendNow] = useState(true);
  const [tried, setTried] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setTitle("");
      setSource("");
      setProjectId("none");
      setNeedBy("");
      setValue("");
      setLines([blankLine()]);
      setSendNow(true);
      setTried(false);
      setErrors({});
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const project = (projects.data ?? []).find((p) => p.id === projectId);
  const valueNum = Number(value.replace(/[,\s₹]/g, ""));
  const headroom = project ? project.budget - project.committed : undefined;
  const needsProject = source === "bom" || source === "project";

  const validate = (): Errors => {
    const e: Errors = {};
    if (title.trim().length < 6) e.title = title.trim() ? "At least 6 characters, so approvers can tell requisitions apart." : "What are you buying?";
    if (!source) e.source = "Choose where the demand comes from.";
    if (needsProject && !project) e.project = source === "bom" ? "A BOM shortage belongs to a project." : "Choose the project this is for.";
    if (source === "bom" && project && !project.bom) e.project = `${project.id} has no released BOM. Use “Project site need” instead.`;
    if (!needBy) e.needBy = "When must it be on site or in stores?";
    else if (daysBetween(TODAY, needBy) < 1) e.needBy = `Need-by must be after today (${date(TODAY, true)}).`;
    if (!value.trim()) e.value = "Enter the estimated value.";
    else if (!Number.isFinite(valueNum) || valueNum <= 0) e.value = "A positive amount in rupees, e.g. 125000.";
    const le: Record<number, { item?: string; qty?: string }> = {};
    lines.forEach((l) => {
      const q = Number(l.qty);
      const r: { item?: string; qty?: string } = {};
      if (!l.item.trim()) r.item = "Describe the item";
      if (!l.qty.trim() || !Number.isFinite(q) || q <= 0) r.qty = "Qty > 0";
      if (r.item || r.qty) le[l.key] = r;
    });
    if (Object.keys(le).length) e.lines = le;
    if (!lines.length) e.linesEmpty = "Add at least one line.";
    return e;
  };

  useEffect(() => {
    if (tried) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, source, projectId, needBy, value, lines, tried]);

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setTried(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const src = source === "bom" ? `${project!.bom} shortage` : SOURCES.find((s) => s.value === source)!.label;
    const pr = await create.run({
      title: title.trim(),
      source: src,
      projectId: project?.id,
      value: valueNum,
      needBy,
      lines: lines.map((l) => ({ item: l.item.trim(), qty: Number(l.qty), uom: l.uom })),
    });
    if (!pr) return;
    let submitted = false;
    if (sendNow) {
      setSubmitting(true);
      try {
        await submitRequisition(pr.id);
        submitted = true;
      } catch (err) {
        // The draft exists; say why it didn't go into approval instead of losing it.
        onOpenChange(false);
        toast({ title: `${pr.id} saved as draft, not submitted`, body: err instanceof Error ? err.message : String(err), tone: "warn", action: { label: "Open", onClick: () => navigate(`/app/purchase/${pr.id}?tab=requisitions`) } });
        return;
      } finally {
        setSubmitting(false);
      }
    }
    onOpenChange(false);
    toast({
      title: submitted ? `${pr.id} submitted for approval` : `${pr.id} saved as draft`,
      body: submitted ? `Routed to the ${approverFor(valueNum).role.toLowerCase()} · ${inr(valueNum)}` : "Submit it when the lines are final.",
      tone: submitted ? "accent" : "ok",
      action: { label: "Open", onClick: () => navigate(`/app/purchase/${pr.id}?tab=requisitions`) },
    });
  };

  const route = Number.isFinite(valueNum) && valueNum > 0 ? approverFor(valueNum) : null;
  const pending = create.pending || submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={ClipboardList}
      title="New purchase requisition"
      description="Requisitions are approved before any RFQ or order goes out."
      footer={
        <>
          <Switch checked={sendNow} onChange={setSendNow} label="Submit for approval now" />
          <span className="pur-footer-spacer" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="pur-pr-form" loading={pending}>
            {sendNow ? "Create and submit" : "Save draft"}
          </Button>
        </>
      }
    >
      <form id="pur-pr-form" className="pur-form" onSubmit={onSubmit} noValidate>
        {create.error && <Callout tone="risk" title="The requisition wasn't created">{create.error}</Callout>}
        <Field label="Title" required htmlFor="pr-title" error={errors.title}>
          <Input id="pr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Profinet cables for Line 03 site" invalid={!!errors.title} autoFocus />
        </Field>
        <div className="pur-form-2">
          <Field label="Raised from" required htmlFor="pr-source" error={errors.source}>
            <Select id="pr-source" label="Raised from" value={source} onChange={setSource} options={SOURCES} placeholder="Choose the demand source" invalid={!!errors.source} />
          </Field>
          <Field
            label="Project"
            required={needsProject}
            optional={!needsProject}
            htmlFor="pr-project"
            error={errors.project}
            hint={project ? `${project.customer} · budget headroom ${inr(headroom!)}` : undefined}
          >
            <Select
              id="pr-project"
              label="Project"
              value={projectId}
              onChange={setProjectId}
              invalid={!!errors.project}
              options={[{ value: "none", label: "No project", detail: "General, stock or maintenance" }, ...(projects.data ?? []).filter((p) => p.status !== "Closed").map((p) => ({ value: p.id, label: `${p.id} · ${p.name}`, detail: `${p.customer}${p.bom ? ` · ${p.bom}` : ""}` }))]}
            />
          </Field>
        </div>
        <div className="pur-form-2">
          <Field label="Need by" required htmlFor="pr-needby" error={errors.needBy} hint={needBy && !errors.needBy ? `${daysBetween(TODAY, needBy)} days from today` : "Date it must be on site or in stores."}>
            <Input id="pr-needby" type="date" min={addDays(TODAY, 1)} value={needBy} onChange={(e) => setNeedBy(e.target.value)} invalid={!!errors.needBy} />
          </Field>
          <Field
            label="Estimated value"
            required
            htmlFor="pr-value"
            error={errors.value}
            hint={route ? `${inr(valueNum)} · approved by the ${route.role.toLowerCase()}${valueNum > OPS_HEAD_THRESHOLD ? " (above ₹2 L)" : ""}` : "Drives the approval route."}
          >
            <Input id="pr-value" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" suffix="₹" invalid={!!errors.value} />
          </Field>
        </div>
        {project && headroom !== undefined && valueNum > headroom && !errors.value && (
          <Callout tone="warn" title={`Over ${project.id}'s remaining budget by ${inr(valueNum - headroom)}`}>
            It can be saved as a draft, but the budget check will stop it at submission until a cost change request is approved on the project.
          </Callout>
        )}

        <fieldset className="pur-lines">
          <legend className="field-label">
            Lines <span className="field-required" aria-hidden>*</span>
          </legend>
          <div className="pur-lines-head" aria-hidden>
            <span>Item or service</span>
            <span>Qty</span>
            <span>Unit</span>
            <span />
          </div>
          {lines.map((l, i) => {
            const le = errors.lines?.[l.key];
            return (
              <div key={l.key} className="pur-line">
                <div className="pur-line-cell">
                  <Input aria-label={`Line ${i + 1} item`} value={l.item} onChange={(e) => setLine(l.key, { item: e.target.value })} placeholder="e.g. Digital input module · 16 DI" invalid={!!le?.item} />
                  {le?.item && <span className="pur-line-err">{le.item}</span>}
                </div>
                <div className="pur-line-cell">
                  <Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} placeholder="0" invalid={!!le?.qty} />
                  {le?.qty && <span className="pur-line-err">{le.qty}</span>}
                </div>
                <Select label={`Line ${i + 1} unit`} value={l.uom} onChange={(v) => setLine(l.key, { uom: v })} options={UOMS} />
                <IconButton icon={Trash2} label={lines.length === 1 ? "A requisition needs one line" : `Remove line ${i + 1}`} size="sm" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} type="button" />
              </div>
            );
          })}
          <div>
            <Button size="sm" variant="ghost" icon={Plus} type="button" onClick={() => setLines((ls) => [...ls, blankLine()])}>
              Add line
            </Button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
