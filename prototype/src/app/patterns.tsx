/**
 * Domain patterns shared across modules. These encode ERP-specific ideas
 * (a record chain, SLA clocks, approvals with evidence) on top of the base components.
 */
import { CheckCircle2, Clock3, FileCheck2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ago, duration, minutesUntil } from "../api/format";
import { useMutation } from "../api/hooks";
import type { Approval, Item, Tone } from "../api/types";
import { Button, Dialog, Field, Meter, RadioCards, RecordLink, Status, Textarea, Tooltip, cx, useToast } from "../ds/components";
import { href } from "./router";

/* ---------------------------------------------------------------- Record thread */
export interface ThreadNode {
  id: string;
  kind: string;
  label: string;
  status: string;
}

export function RecordThread({ nodes, compact }: { nodes: ThreadNode[]; compact?: boolean }) {
  return (
    <ol className={cx("thread", compact && "thread-compact")} aria-label="Linked records">
      {nodes.map((n, i) => (
        <li key={n.id} className="thread-node" style={{ ["--i" as string]: i }}>
          <a href={href.record(n.id)} className="thread-card">
            <span className="thread-kind">{n.kind}</span>
            <span className="thread-id mono">{n.id}</span>
            {!compact && <span className="thread-label">{n.label}</span>}
            <Status size="sm">{n.status}</Status>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** The canonical PRJ-0264 chain, used by dashboard, showcase and projects. */
export const FLAGSHIP_THREAD: ThreadNode[] = [
  { id: "SO-0196", kind: "Sales order", label: "Northstar Pharma · ₹48.50 L", status: "In fulfilment" },
  { id: "PRJ-0264", kind: "Project", label: "Process automation upgrade", status: "At risk" },
  { id: "BOM-042", kind: "Engineering BOM", label: "Rev C released · 7 lines", status: "Released" },
  { id: "PR-0084", kind: "Requisition", label: "PLC I/O modules · ₹2.84 L", status: "Awaiting approval" },
  { id: "WO-0187", kind: "Work order", label: "Panel at wiring stage", status: "In progress" },
  { id: "AST-0042", kind: "Installed asset", label: "Line 03 control panel", status: "In service" },
  { id: "SR-0148", kind: "Service ticket", label: "P1 · response due 14:00", status: "Assigned" },
];

/* ---------------------------------------------------------------- Health */
export function HealthDots({ health }: { health: { schedule: Tone; cost: Tone; material: Tone } }) {
  const label = (t: Tone) => (t === "ok" ? "On plan" : t === "warn" ? "Watch" : t === "risk" ? "At risk" : "Not started");
  return (
    <span className="health">
      {(["schedule", "cost", "material"] as const).map((k) => (
        <Tooltip key={k} content={`${k[0].toUpperCase() + k.slice(1)}: ${label(health[k])}`}>
          <span className={cx("health-dot", `tone-${health[k]}`)} aria-label={`${k}: ${label(health[k])}`} />
        </Tooltip>
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- SLA */
export function SlaClock({ due, done }: { due: string; done?: boolean }) {
  const mins = minutesUntil(due);
  const tone: Tone = done ? "ok" : mins < 0 ? "risk" : mins < 180 ? "warn" : "neutral";
  return (
    <span className={cx("sla", `tone-${tone}`)}>
      <Clock3 size={13} aria-hidden />
      {done ? "Met" : mins < 0 ? `Breached ${duration(-mins)}` : `${duration(mins)} left`}
    </span>
  );
}

/* ---------------------------------------------------------------- Stock meter */
export function StockMeter({ item }: { item: Pick<Item, "onHand" | "reserved" | "quarantined" | "onOrder" | "uom"> }) {
  const free = Math.max(0, item.onHand - item.reserved - item.quarantined);
  return (
    <div className="stock-meter">
      <Meter
        segments={[
          { value: free, tone: "ok", label: "Free" },
          { value: item.reserved, tone: "info", label: "Reserved" },
          { value: item.quarantined, tone: "warn", label: "QC hold" },
          { value: item.onOrder, tone: "neutral", label: "On order" },
        ]}
      />
      <span className="stock-meter-legend">
        <b>{free}</b> free · {item.reserved} reserved{item.quarantined ? ` · ${item.quarantined} on hold` : ""}
        {item.onOrder ? ` · ${item.onOrder} on order` : ""}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Approval */
export function ApprovalDialog({ approval, open, onOpenChange }: { approval: Approval | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const [decision, setDecision] = useState<"Approved" | "Rejected" | "">("");
  const [reason, setReason] = useState("");
  const m = useMutation(api.decideApproval);

  useEffect(() => {
    if (open) {
      setDecision("");
      setReason("");
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, approval?.id]);

  if (!approval) return null;
  const decided = approval.status !== "Pending";

  const submit = async () => {
    if (!decision) return;
    const r = await m.run(approval.id, decision, reason);
    if (r) {
      onOpenChange(false);
      toast({
        title: decision === "Approved" ? `${approval.reference} approved` : `${approval.reference} returned to ${approval.maker}`,
        body: decision === "Approved" ? "The maker has been notified and the next step is unblocked." : "Your reason is attached to the record.",
        tone: decision === "Approved" ? "ok" : "warn",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={ShieldCheck}
      title={approval.title}
      description={`${approval.type} · ${approval.level}`}
      footer={
        decided ? (
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant={decision === "Rejected" ? "danger" : "primary"} disabled={!decision} loading={m.pending} onClick={submit}>
              {decision === "Rejected" ? "Return with reason" : "Confirm approval"}
            </Button>
          </>
        )
      }
    >
      <div className="approval-body">
        <div className="approval-summary">
          <div>
            <span className="approval-label">Reference</span>
            <RecordLink id={approval.reference} />
          </div>
          <div>
            <span className="approval-label">Value</span>
            <span className="t-strong t-num">{approval.value}</span>
          </div>
          <div>
            <span className="approval-label">Raised by</span>
            <span>
              {approval.maker} · {ago(approval.submitted)}
            </span>
          </div>
        </div>
        <div>
          <p className="approval-label">Evidence attached</p>
          <ul className="evidence">
            {approval.evidence.map((e) => (
              <li key={e}>
                <FileCheck2 size={15} aria-hidden />
                {e}
              </li>
            ))}
          </ul>
        </div>
        {decided ? (
          <Status>{approval.status}</Status>
        ) : (
          <>
            <RadioCards
              label="Decision"
              columns={2}
              value={decision}
              onChange={(v) => {
                setDecision(v);
                m.reset();
              }}
              options={[
                { value: "Approved", title: <span className="row" style={{ gap: 6 }}><CheckCircle2 size={16} color="var(--ok)" /> Approve</span>, detail: "Unblocks the next step" },
                { value: "Rejected", title: <span className="row" style={{ gap: 6 }}><XCircle size={16} color="var(--risk)" /> Return</span>, detail: "Maker must revise" },
              ]}
            />
            <Field label={decision === "Rejected" ? "Reason for returning" : "Note"} optional={decision !== "Rejected"} required={decision === "Rejected"} error={m.error} htmlFor="approval-reason" hint="Saved to the audit trail with your name and time.">
              <Textarea id="approval-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={decision === "Rejected" ? "What needs to change before this can be approved?" : "Optional note for the maker"} invalid={!!m.error} rows={3} />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
