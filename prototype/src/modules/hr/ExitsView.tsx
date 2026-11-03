/**
 * E2E-12 · Offboarding & asset recovery. The checklist is the record itself:
 * every line has an owner and a due date, is closed with evidence, and the exit
 * can't close while any line is open.
 */
import { CheckCircle2, Circle, DoorOpen, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, Fragment, useState } from "react";
import { api } from "../../api/client";
import { ago, date, daysFrom, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { ExitCase, ExitItem } from "../../api/types";
import {
  Button,
  Callout,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  LoadingRows,
  Person,
  Progress,
  RecordLink,
  Select,
  Status,
  Textarea,
  Tooltip,
  cx,
  useToast,
} from "../../ds/components";
import { closeExit, completeExitItem } from "./commands";

const ID = /\b(?:AST|CAL|PR|PO|CLM|EMP|SR|PRJ|LV)-\d{4}\b/g;

/** Turn record ids inside free text into links. */
function Linked({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ID)) {
    parts.push(text.slice(last, m.index));
    parts.push(<RecordLink key={m.index} id={m[0]} />);
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

export function ExitsView() {
  const cases = useQuery(api.exitCases);
  const leave = useQuery(api.leaveRequests);
  if (cases.loading) return <LoadingRows rows={7} columns={4} />;
  const list = cases.data ?? [];
  if (!list.length) return <EmptyState icon={DoorOpen} title="No exits in progress">An exit opens when HR records an effective-dated resignation or end of contract.</EmptyState>;
  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {list.map((c) => (
        <ExitCard key={c.id} c={c} lateLeave={(leave.data ?? []).filter((l) => l.personId === c.personId && l.status !== "Rejected" && l.from > c.lastDay)} />
      ))}
    </div>
  );
}

function ExitCard({ c, lateLeave }: { c: ExitCase; lateLeave: { id: string; from: string; to: string; status: string }[] }) {
  const toast = useToast();
  const [editing, setEditing] = useState<ExitItem | null>(null);
  const close = useMutation(closeExit);
  const open = c.items.filter((i) => i.status === "Open");
  const doneCount = c.items.length - open.length;
  const daysLeft = daysFrom(c.lastDay);

  const finish = async () => {
    const r = await close.run(c.id);
    if (r) toast({ title: `${c.id} closed`, body: `Every line on ${c.person}'s exit is evidenced. Nothing is left in their name.` });
  };
  useEffect(() => {
    if (close.error) toast({ title: "Exit can't close yet", body: close.error, tone: "risk" });
  }, [close.error, toast]);

  return (
    <Card className="hr-exit-card">
      <CardHeader
        icon={DoorOpen}
        eyebrow={<span className="mono">{c.id}</span>}
        title={`${c.person} — ${open.length ? `${open.length} of ${c.items.length} lines open` : "every line closed"}`}
        description={`${c.role} · last working day ${date(c.lastDay)} (${relativeDay(c.lastDay).toLowerCase()}) · ${c.reason}`}
        actions={<Status tone={c.status === "Closed" ? "ok" : daysLeft <= 3 ? "warn" : "info"}>{c.status}</Status>}
      />
      <div className="hr-exit-progress">
        <Person name={c.person} detail={`${c.personId} · ${c.role}`} />
        <div className="hr-exit-meter">
          <Progress value={(doneCount / c.items.length) * 100} tone={open.length ? "accent" : "ok"} label="Checklist progress" />
          <span className="t-num">
            {doneCount}/{c.items.length} closed
          </span>
        </div>
      </div>

      {lateLeave.length > 0 && (
        <Callout tone="warn" title="Leave booked after the last working day">
          {lateLeave.map((l) => (
            <span key={l.id}>
              <RecordLink id={l.id} /> runs {date(l.from, true)}–{date(l.to, true)} ({l.status.toLowerCase()}).{" "}
            </span>
          ))}
          It can't be taken after {date(c.lastDay, true)}: reject it, or move it into the notice period. Payroll settles any balance in the full and final.
        </Callout>
      )}

      <ol className="hr-exit-list">
        {c.items.map((i) => {
          const overdue = i.status === "Open" && daysFrom(i.due) < 0;
          return (
            <li key={i.key} className={cx("hr-exit-line", i.status !== "Open" && "is-closed")}>
              <span className="hr-exit-mark" aria-hidden>
                {i.status === "Open" ? <Circle size={18} /> : <CheckCircle2 size={18} />}
              </span>
              <div className="hr-exit-main">
                <div className="hr-exit-title">
                  <b>{i.item}</b>
                  <span className="hr-exit-ref">
                    <Linked text={i.reference} />
                  </span>
                </div>
                <p className="hr-exit-rule">{i.rule}</p>
                {i.outcome && (
                  <p className="hr-exit-outcome">
                    <ShieldCheck size={14} aria-hidden /> <Linked text={i.outcome} />
                    {i.doneBy && (
                      <span className="t-muted">
                        {" "}
                        · {i.doneBy}
                        {i.doneAt ? `, ${ago(i.doneAt)}` : ""}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="hr-exit-side">
                <span className="hr-exit-owner">{i.owner}</span>
                {i.status === "Open" ? (
                  <>
                    <Status tone={overdue ? "risk" : daysFrom(i.due) <= 2 ? "warn" : "neutral"}>{overdue ? `Overdue · ${date(i.due, true)}` : `Due ${date(i.due, true)}`}</Status>
                    {c.status !== "Closed" && (
                      <Button size="sm" onClick={() => setEditing(i)}>
                        Close line
                      </Button>
                    )}
                  </>
                ) : (
                  <Status tone="ok">{i.status === "Done" ? "Done" : "Checked — nothing found"}</Status>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {c.status !== "Closed" && (
        <div className="hr-exit-foot">
          <p className="t-muted hr-small">An exit closes only when every line is evidenced — no orphaned custody, commitment or approval after the last day.</p>
          <Tooltip content={open.length ? `${open.length} line${open.length > 1 ? "s" : ""} still open` : "Close the exit record"}>
            <span>
              <Button variant="primary" disabled={open.length > 0} loading={close.pending} onClick={finish}>
                Close exit
              </Button>
            </span>
          </Tooltip>
        </div>
      )}

      {editing && <CloseLineDialog c={c} item={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function CloseLineDialog({ c, item, onClose }: { c: ExitCase; item: ExitItem; onClose: () => void }) {
  const toast = useToast();
  const people = useQuery(api.people);
  const claims = useQuery(api.claims);
  const m = useMutation(completeExitItem);
  const [outcome, setOutcome] = useState("");
  const [detail, setDetail] = useState(item.key === "identity" ? c.lastDay : "");
  const claim = claims.data?.find((x) => x.id === "CLM-0071");
  const others = (people.data ?? []).filter((p) => p.id !== c.personId).map((p) => ({ value: p.name, label: p.name, detail: `${p.role} · ${p.location}` }));

  const save = async () => {
    const r = await m.run(c.id, item.key, { outcome, detail });
    if (r) {
      toast({ title: `“${item.item}” closed on ${c.id}`, body: "The evidence is on the exit record and in the audit trail." });
      onClose();
    }
  };

  const placeholders: Record<ExitItem["key"], string> = {
    identity: "Deactivation scheduled for the last day at 18:30; privileged review recorded",
    custody: "AST-0086 received at the central lab store",
    commitment: "PO-0112 reassigned; acceptance of the 9 Nov delivery moves with it",
    claim: "CLM-0071 decided; payroll to settle in the full and final",
    delegation: "Calibration review queue delegated from 15 Nov until a replacement starts",
    allocation: "",
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={ShieldCheck}
      title={`Close “${item.item}”`}
      description={`${c.id} · ${c.person} · owner: ${item.owner}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={save}>
            Close line
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="hr-exit-rule">{item.rule}</p>
        {item.key === "claim" && claim && (
          <Callout tone={claim.status === "Pending" ? "warn" : "ok"} title={`CLM-0071 is ${claim.status.toLowerCase()}`}>
            {claim.status === "Pending" ? (
              <>
                Decide it first in <RecordLink id="CLM-0071">Claims</RecordLink>. This line can't close over an undecided claim.
              </>
            ) : (
              "The claim is decided; payroll settles it in the full and final."
            )}
          </Callout>
        )}
        {item.key === "identity" && (
          <Field label="Access ends on" htmlFor="ex-d" hint={`On or before ${date(c.lastDay)}`}>
            <Input id="ex-d" type="date" value={detail} max={c.lastDay} onChange={(e) => setDetail(e.target.value)} />
          </Field>
        )}
        {item.key === "custody" && (
          <Field label="Condition on return" required htmlFor="ex-cond">
            <Input id="ex-cond" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. Working, case intact, calibration due" />
          </Field>
        )}
        {(item.key === "commitment" || item.key === "delegation") && (
          <Field label={item.key === "commitment" ? "New owner" : "Delegate approvals to"} required>
            <Select label="Person" value={detail} onChange={setDetail} options={others} placeholder="Choose a person" />
          </Field>
        )}
        <Field label="What was done" required htmlFor="ex-o" error={m.error} hint="Saved as evidence on the exit record.">
          <Textarea id="ex-o" rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={placeholders[item.key]} invalid={!!m.error} />
        </Field>
        {m.error && /pending/i.test(m.error) && (
          <p className="hr-small t-muted">
            <TriangleAlert size={13} aria-hidden /> Nothing was changed.
          </p>
        )}
      </div>
    </Dialog>
  );
}
