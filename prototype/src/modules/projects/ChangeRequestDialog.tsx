import { FilePen } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { inr } from "../../api/format";
import { useMutation } from "../../api/hooks";
import type { Project } from "../../api/types";
import { Button, Callout, Dialog, Field, Input, Select, Textarea, useToast } from "../../ds/components";
import { raiseChangeRequest, type ChangeKind } from "./commands";

const KINDS: { value: ChangeKind; label: string; detail: string }[] = [
  { value: "Scope variation", label: "Scope variation", detail: "Work added or removed from the order" },
  { value: "Schedule extension", label: "Schedule extension", detail: "A milestone or handover date moves" },
  { value: "Cost variation", label: "Cost variation", detail: "Budget changes without a scope change" },
  { value: "Technical deviation", label: "Technical deviation", detail: "Alternative make, model or method" },
];

type Errors = Partial<Record<"title" | "kind" | "cost" | "days" | "reason", string>>;

export function ChangeRequestDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(raiseChangeRequest);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ChangeKind | "">("");
  const [milestone, setMilestone] = useState<string>("none");
  const [cost, setCost] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setKind("");
      setMilestone("none");
      setCost("");
      setDays("");
      setReason("");
      setErrors({});
      setTried(false);
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const costNum = cost.trim() === "" ? 0 : Number(cost.replace(/[,\s₹]/g, ""));
  const daysNum = days.trim() === "" ? 0 : Number(days);

  const validate = (): Errors => {
    const e: Errors = {};
    if (title.trim().length < 6) e.title = title.trim() ? "Use at least 6 characters so the approver can tell changes apart." : "Give the change a short title.";
    if (!kind) e.kind = "Choose what kind of change this is.";
    if (Number.isNaN(costNum)) e.cost = "Enter the impact in rupees, e.g. 85000 or -20000.";
    else if (Math.abs(costNum) > project.contractValue) e.cost = `That's more than the whole contract (${inr(project.contractValue)}).`;
    if (Number.isNaN(daysNum) || !Number.isInteger(daysNum)) e.days = "Whole days only, e.g. 7 or -3.";
    if (kind === "Schedule extension" && !daysNum && !e.days) e.days = "A schedule extension needs the number of days it moves.";
    if (reason.trim().length < 20) e.reason = reason.trim() ? `${20 - reason.trim().length} more characters — say what changed and who asked for it.` : "Explain why the change is needed.";
    return e;
  };

  useEffect(() => {
    if (tried) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, kind, cost, days, reason, tried]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setTried(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = await m.run({ projectId: project.id, title, kind: kind as ChangeKind, costImpact: costNum, scheduleDays: daysNum, milestoneId: milestone === "none" ? undefined : milestone, reason });
    if (r) {
      onOpenChange(false);
      toast({ title: `Change request ${r.id} raised on ${project.id}`, body: "Sent to the commercial head. Budget and dates stay as they are until it's approved.", tone: "accent" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={FilePen}
      title="Raise change request"
      description={`${project.id} · ${project.name} · ${project.customer}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="prj-cr-form" loading={m.pending}>
            Submit for approval
          </Button>
        </>
      }
    >
      <form id="prj-cr-form" className="prj-form" onSubmit={submit} noValidate>
        {m.error && <Callout tone="risk" title="The change request wasn't raised">{m.error}</Callout>}
        <Field label="Title" required htmlFor="cr-title" error={errors.title} hint="What changes, in a few words.">
          <Input id="cr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Move SAT to 25 Nov for I/O module delivery" invalid={!!errors.title} autoFocus />
        </Field>
        <div className="prj-form-2">
          <Field label="Type" required htmlFor="cr-kind" error={errors.kind}>
            <Select id="cr-kind" label="Change type" value={kind} onChange={setKind} options={KINDS} placeholder="Choose a type" invalid={!!errors.kind} />
          </Field>
          <Field label="Affected milestone" optional htmlFor="cr-ms">
            <Select
              id="cr-ms"
              label="Affected milestone"
              value={milestone}
              onChange={setMilestone}
              options={[{ value: "none", label: "Whole project" }, ...project.milestones.filter((x) => x.status !== "Done").map((x) => ({ value: x.id, label: `${x.id} · ${x.gate ?? x.name}`, detail: x.name }))]}
            />
          </Field>
        </div>
        <div className="prj-form-2">
          <Field label="Cost impact" optional htmlFor="cr-cost" error={errors.cost} hint={!errors.cost && costNum ? `${costNum > 0 ? "Adds" : "Removes"} ${inr(Math.abs(costNum))} · ${((Math.abs(costNum) / project.contractValue) * 100).toFixed(1)}% of contract` : "Negative for a saving."}>
            <Input id="cr-cost" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" suffix="₹" invalid={!!errors.cost} />
          </Field>
          <Field label="Schedule impact" optional={kind !== "Schedule extension"} required={kind === "Schedule extension"} htmlFor="cr-days" error={errors.days} hint="Calendar days the affected date moves.">
            <Input id="cr-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="0" suffix="days" invalid={!!errors.days} />
          </Field>
        </div>
        <Field label="Reason and evidence" required htmlFor="cr-reason" error={errors.reason} hint="Who asked for it, what changed, and which document supports it. Saved to the audit trail.">
          <Textarea id="cr-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!errors.reason} placeholder="e.g. PLC I/O modules on PR-0084 ship 10 Nov; loop test moves 5 days and SAT follows. Customer agreed in the 2 Nov site meeting (MOM attached)." />
        </Field>
      </form>
    </Dialog>
  );
}
