import { ArrowRight, CheckCircle2, FilePlus2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Quotation } from "../../api/types";
import { TODAY } from "../../api/fixtures";
import { href, navigate } from "../../app/router";
import { Button, ButtonLink, Callout, Dialog, Drawer, EmptyState, Field, Input, KeyValues, LoadingRows, Person, RecordLink, Status, Tag, Textarea, Timeline, useToast } from "../../ds/components";
import { addDays } from "../projects/util";
import { recordAcceptance, reviseQuotation, sendQuotation } from "./commands";
import { LineEditor, blankLine, draftFrom, toLines, type DraftLine } from "./LineEditor";
import { QUOTE_VALIDITY_DAYS } from "./rules";
import { QUOTE_DETAIL, validity } from "./shared";

export function QuotationDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const quotes = useQuery(api.quotations);
  const orders = useQuery(api.salesOrders);
  const q = quotes.data?.find((x) => x.id === id);
  const order = orders.data?.find((o) => o.quotationId === id);
  const d = q ? QUOTE_DETAIL[q.id] : undefined;
  const v = q ? validity(q) : undefined;
  const letters = q ? Array.from({ length: q.revision.charCodeAt(0) - 64 }, (_, i) => String.fromCharCode(65 + i)).reverse() : [];

  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      width={580}
      id={id}
      status={q ? <Status>{q.status}</Status> : undefined}
      title={q ? `${q.title} · Rev ${q.revision}` : quotes.loading ? "Loading quotation…" : "Quotation not found"}
      subtitle={q ? `${q.customer} · valid until ${date(q.validUntil)}` : undefined}
      footer={
        q ? (
          order ? (
            <ButtonLink to={href.record(order.id)} variant="primary" iconRight={ArrowRight}>
              Open {order.id}
            </ButtonLink>
          ) : (
            <QuoteActions q={q} />
          )
        ) : undefined
      }
    >
      {!q ? (
        quotes.loading ? <LoadingRows rows={6} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
      ) : (
        <>
          {d && d.discount > d.authority && q.status !== "Accepted" && (
            <Callout tone="warn" title={`Discount of ${d.discount}% needs Operations head approval`}>
              The owner's authority is {d.authority}%. Rev {q.revision} stays In review and cannot be sent until the discount is approved or reduced (SAL-019).
            </Callout>
          )}
          {v && v.tone !== "neutral" && (
            <Callout tone={v.tone} title={v.tone === "risk" ? "Validity lapsed" : `Validity ends ${date(q.validUntil)}`}>
              {v.tone === "risk" ? "Issue a new revision with refreshed prices before the customer can accept." : `${v.label}. Extend through a new revision so the original stays on record.`}
            </Callout>
          )}
          <KeyValues
            columns={2}
            items={[
              { label: "Customer", value: q.customer },
              { label: "Owner", value: <Person name={q.owner} size="xs" /> },
              { label: "Value (before tax)", value: <span className="t-num">{inr(q.value)}</span> },
              { label: "Opportunity", value: q.opportunityId ? <RecordLink id={q.opportunityId} /> : "—" },
              { label: "Discount", value: d ? `${d.discount}% (authority ${d.authority}%)` : "—" },
              { label: "Order", value: order ? <RecordLink id={order.id}>{order.status}</RecordLink> : "Not yet accepted" },
            ]}
          />
          {d?.lines && (
            <section className="stack-sm stack">
              <h3 className="sal-h">Lines by billing type</h3>
              <p className="sal-small t-muted">Material, service and AMC bill differently, so they stay separate; only project lines create a project.</p>
              <ul className="divider-list">
                {d.lines.map((l) => (
                  <li key={l.text} className="list-row">
                    <Tag tone={l.kind === "AMC" ? "accent" : l.kind === "Service" ? "info" : "neutral"}>{l.kind}</Tag>
                    <div className="list-row-main">{l.text}</div>
                    <span className="cell-num">{inr(l.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="stack-sm stack">
            <h3 className="sal-h">Revisions</h3>
            <Timeline
              items={letters.map((l, i) => ({
                id: l,
                tone: i === 0 ? (q.status === "Accepted" ? "ok" : "accent") : "neutral",
                title: (
                  <span className="row" style={{ gap: 8 }}>
                    <strong>Rev {l}</strong>
                    <Status size="sm">{i === 0 ? q.status : "Superseded"}</Status>
                  </span>
                ),
                meta: d?.changes[l] ?? "Revision on file",
              }))}
            />
          </section>
        </>
      )}
    </Drawer>
  );
}

type QuoteAction = "send" | "revise" | "accept";

/** The actions a quotation can take, gated by its status. Each opens a small dialog. */
function QuoteActions({ q }: { q: Quotation }) {
  const [action, setAction] = useState<QuoteAction | null>(null);
  const close = (o: boolean) => !o && setAction(null);
  const canSend = q.status === "Draft" || q.status === "In review";
  const canAccept = q.status === "Sent";
  const canRevise = q.status !== "Accepted";
  return (
    <>
      {canSend && (
        <Button variant="primary" icon={Send} onClick={() => setAction("send")}>
          Send to customer
        </Button>
      )}
      {canAccept && (
        <Button variant="primary" icon={CheckCircle2} onClick={() => setAction("accept")}>
          Record acceptance
        </Button>
      )}
      {canRevise && (
        <Button variant="secondary" icon={FilePlus2} onClick={() => setAction("revise")}>
          New revision
        </Button>
      )}
      <SendDialog q={q} open={action === "send"} onOpenChange={close} />
      <AcceptDialog q={q} open={action === "accept"} onOpenChange={close} />
      <ReviseDialog q={q} open={action === "revise"} onOpenChange={close} />
    </>
  );
}

/** SAL — record that the revision went to the customer. Nothing is e-mailed. */
function SendDialog({ q, open, onOpenChange }: { q: Quotation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(sendQuotation);
  useEffect(() => {
    if (open) m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const r = await m.run(q.id);
    if (!r) return;
    onOpenChange(false);
    toast({ title: `${q.id} rev ${q.revision} sent`, body: `Recorded as sent to ${q.customer}. Follow up is set on the opportunity; nothing was e-mailed.`, tone: "ok" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      icon={Send}
      title="Send to customer"
      description={`Mark ${q.id} rev ${q.revision} as sent to ${q.customer}. The revision becomes fixed until the customer accepts or you issue a new one.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Mark as sent
          </Button>
        </>
      }
    >
      {m.error && (
        <Callout tone="risk" title="The quotation wasn't sent">
          {m.error}
        </Callout>
      )}
    </Dialog>
  );
}

/** SAL-004/005 — the customer's acceptance becomes a sales order at the quoted value. */
function AcceptDialog({ q, open, onOpenChange }: { q: Quotation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(recordAcceptance);
  const [po, setPo] = useState("");
  const [on, setOn] = useState(TODAY);
  useEffect(() => {
    if (open) {
      setPo("");
      setOn(TODAY);
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const r = await m.run(q.id, po, on);
    if (!r) return;
    onOpenChange(false);
    toast({
      title: `${r.order.id} booked`,
      body: `${q.customer} accepted rev ${q.revision}. Sales order created at ${inr(r.order.value)}; the opportunity is won.`,
      action: { label: `Open ${r.order.id}`, onClick: () => navigate(href.record(r.order.id)) },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={CheckCircle2}
      title="Record acceptance"
      description={`Turn ${q.id} rev ${q.revision} into a confirmed sales order for ${q.customer} at ${inr(q.value)} before tax.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Create sales order
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Customer PO or contract reference" htmlFor="acc-po">
          <Input id="acc-po" value={po} placeholder="e.g. NSP/PO/26/1187" onChange={(e) => { setPo(e.target.value); m.reset(); }} invalid={m.error?.includes("PO") || undefined} />
        </Field>
        <Field label="Accepted on" htmlFor="acc-on">
          <Input id="acc-on" type="date" max={TODAY} value={on} onChange={(e) => { setOn(e.target.value); m.reset(); }} />
        </Field>
        {m.error && (
          <Callout tone="risk" title="Acceptance wasn't recorded">
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}

/** SAL-003/019 — a new revision (A → B …). The previous one stays as superseded. */
function ReviseDialog({ q, open, onOpenChange }: { q: Quotation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(reviseQuotation);
  const [rows, setRows] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState("");
  const [validUntil, setValidUntil] = useState("");
  useEffect(() => {
    if (open) {
      setRows(q.lines?.length ? q.lines.map(draftFrom) : [blankLine()]);
      setReason("");
      setValidUntil(addDays(TODAY, QUOTE_VALIDITY_DAYS));
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q.id]);

  const submit = async () => {
    const r = await m.run(q.id, { lines: toLines(rows), validUntil }, reason);
    if (!r) return;
    onOpenChange(false);
    toast({
      title: `${q.id} rev ${r.quotation.revision} drafted`,
      body: r.approvalId
        ? `Rev ${r.quotation.revision} is below the owner's discount authority, so it waits In review for the Operations head.`
        : `Rev ${r.quotation.revision} is a draft. Send it to ${q.customer} when it's ready.`,
      tone: "ok",
    });
  };

  const reasonError = m.error?.startsWith("Say what");
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      icon={FilePlus2}
      title="New revision"
      description={`Issue the next revision of ${q.id}. Rev ${q.revision} is kept on record as superseded once this one is sent.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Draft revision
          </Button>
        </>
      }
    >
      <div className="stack">
        <LineEditor idPrefix="rev" rows={rows} onChange={(r) => { setRows(r); m.reset(); }} error={m.error} />
        <Field label="Valid until" htmlFor="rev-valid">
          <Input id="rev-valid" type="date" min={TODAY} value={validUntil} onChange={(e) => { setValidUntil(e.target.value); m.reset(); }} />
        </Field>
        <Field label="Why this revision" htmlFor="rev-reason" hint="At least 10 characters. It stays on the revision for the approver and the record.">
          <Textarea id="rev-reason" rows={2} value={reason} placeholder="e.g. Updated panel scope and refreshed instrument prices" invalid={reasonError || undefined} onChange={(e) => { setReason(e.target.value); m.reset(); }} />
        </Field>
        {m.error && !reasonError && (
          <Callout tone="risk" title="The revision wasn't created">
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}
