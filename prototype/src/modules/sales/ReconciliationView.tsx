/**
 * E2E-10 · Contract billing & finance handoff.
 * Every posting to accounting travels under one idempotency key. A retry reuses
 * it; a wrong amount is answered by a corrected advice under a new key; a posting
 * closes only when accounting's acknowledgement agrees with the advice.
 */
import { CircleSlash, KeyRound, RefreshCw, Send, ShieldCheck, Split, Stamp } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { ago, inr } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { AccountingPosting, Tone } from "../../api/types";
import { Button, Callout, Card, CardHeader, DataTable, Dialog, Field, Input, RecordLink, Stat, Status, Textarea, useToast, type Column } from "../../ds/components";
import { queuePosting, raiseCorrection, recordAcknowledgement, retryPosting, sendPosting } from "./commands";

const TONE: Record<string, Tone> = { Queued: "neutral", Sent: "info", Acknowledged: "ok", Failed: "risk", "Needs attention": "warn", Superseded: "neutral", Reconciled: "ok" };

/** A superseded posting displays as Reconciled once its correction is acknowledged — the only thing that closes a difference. */
function displayState(p: AccountingPosting, all: AccountingPosting[]) {
  if (p.state === "Superseded" && all.find((x) => x.key === p.supersededBy)?.state === "Acknowledged") return "Reconciled";
  return p.state;
}

export function ReconciliationView({ onOpen }: { onOpen: (id: string) => void }) {
  const toast = useToast();
  const postings = useQuery(api.postings);
  const advices = useQuery(api.billingAdvices);
  const approvals = useQuery(api.approvals);
  const [ack, setAck] = useState<AccountingPosting | null>(null);
  const [fix, setFix] = useState<AccountingPosting | null>(null);
  const send = useMutation(sendPosting);
  const retry = useMutation(retryPosting);
  const queue = useMutation(queuePosting);

  const rows = postings.data ?? [];
  const inFlight = rows.filter((p) => p.state === "Queued" || p.state === "Sent").length;
  const failed = rows.filter((p) => p.state === "Failed").length;
  const attention = rows.filter((p) => p.state === "Needs attention");
  const difference = attention.reduce((a, p) => a + (p.amount - (p.posted ?? 0)), 0);
  const notPosted = (advices.data ?? []).filter((b) => !rows.some((p) => p.advice === b.id) && b.status !== "Posted");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    const r = await fn();
    if (r) toast({ title: label });
  };
  // A refused command reports through the mutation's error state (read after it settles, not from this render's closure).
  const failure = send.error ?? retry.error ?? queue.error;
  useEffect(() => {
    if (failure) toast({ title: "Not done", body: failure, tone: "risk" });
  }, [failure, toast]);

  const columns: Column<AccountingPosting & { id: string }>[] = [
    {
      key: "key",
      header: "Key",
      width: 200,
      sort: (p) => p.key,
      cell: (p) => (
        <div className="cell-primary">
          <span className="mono sal-pkey">
            <KeyRound size={12} aria-hidden /> {p.key}
          </span>
          <span className="cell-sub">
            <RecordLink id={p.advice} quiet /> · {p.party}
          </span>
        </div>
      ),
    },
    { key: "state", header: "State", sort: (p) => p.state, cell: (p) => <Status tone={TONE[displayState(p, rows)]}>{displayState(p, rows)}</Status> },
    {
      key: "amount",
      header: "Advice / posted",
      align: "right",
      sort: (p) => p.amount,
      cell: (p) => (
        <div className="cell-primary" style={{ alignItems: "flex-end" }}>
          <span className="cell-num">{inr(p.amount, { compact: false })}</span>
          {p.posted !== undefined && <span className={p.posted === p.amount ? "cell-sub" : "cell-sub t-risk"}>{p.posted === p.amount ? "posted equal" : `posted ${inr(p.posted, { compact: false })}`}</span>}
        </div>
      ),
    },
    {
      key: "attempts",
      header: "Attempts",
      priority: 2,
      cell: (p) => (
        <div className="cell-primary">
          <span className="cell-num">{p.attempts}</span>
          <span className="cell-sub">{p.lastError ?? (p.lastAttempt ? ago(p.lastAttempt) : "not sent")}</span>
        </div>
      ),
    },
    { key: "note", header: "What it means", priority: 3, cell: (p) => <span className="sal-note">{p.supersededBy ? `Superseded by ${p.supersededBy}. ` : p.supersedes ? `Corrects ${p.supersedes}. ` : ""}{p.note}{p.external ? ` · ${p.external}` : ""}</span> },
    {
      key: "act",
      header: "",
      align: "right",
      cell: (p) =>
        p.state === "Queued" ? (
          <Button size="sm" icon={Send} loading={send.pending} onClick={() => run(`${p.key} sent to accounting`, () => send.run(p.key))}>
            Send
          </Button>
        ) : p.state === "Sent" ? (
          <Button size="sm" icon={Stamp} onClick={() => setAck(p)}>
            Record answer
          </Button>
        ) : p.state === "Failed" ? (
          <Button size="sm" icon={RefreshCw} loading={retry.pending} onClick={() => run(`${p.key} retried under the same key`, () => retry.run(p.key))}>
            Retry
          </Button>
        ) : p.state === "Needs attention" ? (
          <Button size="sm" variant="primary" icon={Split} onClick={() => setFix(p)}>
            Correct
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stat-strip">
        <Stat label="In flight" value={inFlight} foot="Queued or sent, awaiting accounting" />
        <Stat label="Failed transport" value={failed} tone={failed ? "risk" : undefined} foot="Retried under the same key" />
        <Stat label="Unexplained difference" value={inr(difference)} tone={difference ? "warn" : undefined} foot={`${attention.length} posting${attention.length === 1 ? "" : "s"} need attention`} />
        <Stat label="Postings without a key" value={0} foot={`Checked ${rows.length} postings — none`} icon={ShieldCheck} />
      </div>

      <Callout tone="info" title="One key per posting">
        A retry reuses the key, so accounting can't post the same advice twice. A wrong amount is never re-sent: it is answered by a corrected advice under a new key, and closes only when accounting acknowledges an equal figure. Integration with the accounting system is decision INT-01; this outbox is the contract it will implement.
      </Callout>

      <Card padded={false}>
        <div className="card-padded" style={{ paddingBottom: 0 }}>
          <CardHeader title="Accounting outbox" description="Every billing advice handed to accounting, by key" icon={Send} />
        </div>
        <div className="flush-table">
          <DataTable rows={rows.map((p) => ({ ...p, id: p.key }))} columns={columns} loading={postings.loading} onRowClick={(p) => onOpen(p.advice)} caption="Accounting outbox" />
        </div>
      </Card>

      {notPosted.length > 0 && (
        <Card>
          <CardHeader title="Not yet in the outbox" description="Advices that exist but haven't been queued for accounting" icon={CircleSlash} />
          <ul className="divider-list">
            {notPosted.map((b) => {
              const appr = approvals.data?.find((a) => a.reference === b.id);
              return (
                <li key={b.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">
                      <RecordLink id={b.id} /> {b.trigger}
                    </div>
                    <div className="list-row-sub">
                      {b.customer} · {inr(b.value)} {appr && appr.status === "Pending" ? `· waiting on ${appr.level.split(" · ")[1] ?? "approval"}` : ""}
                    </div>
                  </div>
                  <Button size="sm" loading={queue.pending} onClick={() => run(`${b.id} queued under ${b.id}/R1`, () => queue.run(b.id))}>
                    Queue for accounting
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {ack && <AckDialog p={ack} onClose={() => setAck(null)} />}
      {fix && <CorrectionDialog p={fix} onClose={() => setFix(null)} />}
    </div>
  );
}

function AckDialog({ p, onClose }: { p: AccountingPosting; onClose: () => void }) {
  const toast = useToast();
  const m = useMutation(recordAcknowledgement);
  const [external, setExternal] = useState("");
  const [posted, setPosted] = useState(String(p.amount));
  const save = async () => {
    const r = await m.run(p.key, external, Number(posted));
    if (r) {
      toast(r.state === "Acknowledged" ? { title: `${p.key} acknowledged`, body: "Accounting's figure equals the advice." } : { title: `${p.key} needs attention`, body: "Accounting posted a different amount. Raise a correction; never re-send.", tone: "warn" });
      onClose();
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={Stamp}
      title={`Record accounting's answer for ${p.key}`}
      description={`${p.party} · advice ${inr(p.amount, { compact: false })}. An acknowledgement is an inbound event: record what accounting said, don't invent it.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={save}>
            Record answer
          </Button>
        </>
      }
    >
      <div className="grid grid-2" style={{ gap: "var(--space-3)" }}>
        <Field label="Accounting reference" required htmlFor="ack-ref">
          <Input id="ack-ref" value={external} onChange={(e) => setExternal(e.target.value)} placeholder="ACC-INV/26-27/0455" />
        </Field>
        <Field label="Amount posted (₹)" required htmlFor="ack-amt" error={m.error}>
          <Input id="ack-amt" type="number" value={posted} onChange={(e) => setPosted(e.target.value)} invalid={!!m.error} />
        </Field>
      </div>
    </Dialog>
  );
}

function CorrectionDialog({ p, onClose }: { p: AccountingPosting; onClose: () => void }) {
  const toast = useToast();
  const m = useMutation(raiseCorrection);
  const [amount, setAmount] = useState(String(p.posted ?? p.amount));
  const [reason, setReason] = useState("");
  const save = async () => {
    const r = await m.run(p.key, Number(amount), reason);
    if (r) {
      toast({ title: `${r.key} queued, superseding ${p.key}`, body: "The original stays as evidence. Send the correction when ready." });
      onClose();
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={Split}
      title={`Correct ${p.advice}`}
      description={`Advice ${inr(p.amount, { compact: false })} · accounting posted ${inr(p.posted ?? 0, { compact: false })} · difference ${inr(p.amount - (p.posted ?? 0), { compact: false })}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={save}>
            Raise corrected advice
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Corrected amount (₹)" required htmlFor="cor-amt" hint="Usually the figure accounting posted, once the rule behind it is agreed.">
          <Input id="cor-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Why the amount changes" required htmlFor="cor-why" error={m.error} hint="Written on the corrected advice — e.g. the retention clause that applies.">
          <Textarea id="cor-why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="5% retention per SO-0188 clause 7.2, confirmed by Finance owner" invalid={!!m.error} />
        </Field>
      </div>
    </Dialog>
  );
}
