import { FileQuestion, PackageCheck, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { date, inr, num, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { PurchaseOrder } from "../../api/types";
import { Button, Callout, ComingSoon, Dialog, Drawer, EmptyState, Field, Input, KeyValues, LoadingRows, Meter, RecordLink, Status, useToast } from "../../ds/components";
import { recordReceipt } from "./commands";
import { poOverdue, poTotals } from "./util";

export function NotFoundDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title="Record not found" id={id}>
      <EmptyState icon={FileQuestion} title={`${id} isn't a purchase record`} action={<Button size="sm" onClick={onClose}>Back to Purchase</Button>}>
        Purchase records are requisitions (PR-), RFQs (RFQ-), orders (PO-) and vendors (VEN-).
      </EmptyState>
    </Drawer>
  );
}

export function OrderDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const pos = useQuery(api.purchaseOrders);
  const vendors = useQuery(api.vendors);
  const items = useQuery(api.items);
  const movements = useQuery(api.movements);
  const [receiving, setReceiving] = useState(false);

  const po = pos.data?.find((p) => p.id === id);
  if (!pos.loading && !po) {
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()} title="Purchase order not found" id={id}>
        <EmptyState icon={FileQuestion} title={`There is no ${id}`} action={<Button size="sm" onClick={onClose}>Back to orders</Button>}>
          It may belong to another workspace, or the number is mistyped.
        </EmptyState>
      </Drawer>
    );
  }

  const t = po ? poTotals(po) : undefined;
  const od = po ? poOverdue(po) : 0;
  const vendor = vendors.data?.find((v) => v.name === po?.vendor);
  const grns = po ? [...new Set((movements.data ?? []).filter((m) => m.reference.includes(po.id)).map((m) => m.reference.split(" · ")[0]))] : [];
  const held = po ? po.lines.map((l) => items.data?.find((i) => i.name === l.item && i.quarantined > 0)).filter(Boolean) : [];
  const canReceive = po && (po.status === "Issued" || po.status === "Part received");

  return (
    <>
      <Drawer
        open
        onOpenChange={(o) => !o && onClose()}
        width={620}
        id={id}
        status={po ? <Status>{po.status}</Status> : undefined}
        title={po?.title ?? "Loading order"}
        subtitle={po ? `${po.vendor} · ${inr(po.value)} · issued ${date(po.issued, true)}` : undefined}
        footer={
          po && (
            <>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              {canReceive && (
                <Button variant="primary" icon={PackageCheck} onClick={() => setReceiving(true)}>
                  Record receipt
                </Button>
              )}
            </>
          )
        }
      >
        {!po || !t ? (
          <LoadingRows rows={4} columns={3} />
        ) : (
          <>
            {held.length > 0 ? (
              <Callout tone="warn" title="Received into QC hold — not issuable yet">
                {held.map((i) => `${i!.quarantined} × ${i!.name}`).join(", ")} arrived{grns.length ? ` on ${grns.join(", ")}` : ""} and are quarantined at incoming inspection. Stock counts them as on hold, not available.
              </Callout>
            ) : po.status === "Received" ? (
              <Callout tone="ok" title="Fully received">
                {t.accepted} of {t.ordered} units accepted{t.rejected ? `, ${t.rejected} rejected for return` : ""}.
              </Callout>
            ) : od > 0 ? (
              <Callout tone="risk" title={`${od} day${od === 1 ? "" : "s"} past the expected date`}>
                {t.outstanding} unit{t.outstanding === 1 ? "" : "s"} still outstanding since {date(po.expected, true)}. Chase {po.vendor}{vendor ? ` (on-time rate ${vendor.onTimeRate}%)` : ""} and update the project if the date moves.
              </Callout>
            ) : po.status === "Part received" ? (
              <Callout tone="warn" title={`Part received — ${t.outstanding} outstanding`}>
                {t.received} of {t.ordered} units in{t.rejected ? `, ${t.rejected} rejected` : ""}. Balance expected {date(po.expected, true)} ({relativeDay(po.expected).toLowerCase()}).
              </Callout>
            ) : (
              <Callout tone="info" title="Nothing received yet">
                Expected {date(po.expected)} · {relativeDay(po.expected).toLowerCase()}.
              </Callout>
            )}

            <KeyValues
              columns={2}
              items={[
                { label: "Vendor", value: vendor ? <RecordLink id={vendor.id}>{vendor.name}</RecordLink> : po.vendor },
                { label: "Project", value: po.projectId ? <RecordLink id={po.projectId} /> : <span className="t-muted">Stock / general</span> },
                { label: "Order value", value: <span className="t-num t-strong">{inr(po.value, { compact: false })}</span> },
                { label: "Expected", value: <span className={od ? "pur-t-risk" : undefined}>{date(po.expected)}</span> },
                { label: "Issued", value: date(po.issued) },
                { label: "Goods receipts", value: grns.length ? grns.join(", ") : <span className="t-muted">None yet</span> },
              ]}
            />

            <section>
              <h3 className="pur-sub">Lines · ordered, received, rejected, outstanding</h3>
              <ul className="pur-po-lines">
                {po.lines.map((l, i) => {
                  const out = Math.max(0, l.ordered - l.received);
                  return (
                    <li key={i} className="pur-po-line">
                      <div className="pur-po-line-head">
                        <span className="pur-po-item">{l.item}</span>
                        {out === 0 ? <Status size="sm" tone="ok">Complete</Status> : l.received ? <Status size="sm">Partial</Status> : <Status size="sm" tone="neutral">Open</Status>}
                      </div>
                      <Meter
                        total={l.ordered}
                        segments={[
                          { value: l.received - l.rejected, tone: "ok", label: "Accepted" },
                          { value: l.rejected, tone: "risk", label: "Rejected" },
                        ]}
                      />
                      <dl className="pur-po-nums">
                        <div><dt>Ordered</dt><dd className="t-num">{num(l.ordered)} {l.uom}</dd></div>
                        <div><dt>Received</dt><dd className="t-num">{num(l.received)}</dd></div>
                        <div><dt>Rejected</dt><dd className={`t-num ${l.rejected ? "pur-t-risk" : ""}`}>{num(l.rejected)}</dd></div>
                        <div><dt>Outstanding</dt><dd className={`t-num ${out ? "t-strong" : ""}`}>{num(out)}</dd></div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </section>

            <ComingSoon inline icon={Scale} title="Invoice matching">Match supplier invoices to these receipts line by line before payment.</ComingSoon>
          </>
        )}
      </Drawer>
      {po && <ReceiptDialog po={po} open={receiving} onOpenChange={setReceiving} />}
    </>
  );
}

function ReceiptDialog({ po, open, onOpenChange }: { po: PurchaseOrder; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(recordReceipt);
  const [qty, setQty] = useState<Record<number, { received: string; rejected: string }>>({});

  useEffect(() => {
    if (open) {
      setQty({});
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lineErr = (i: number) => {
    const l = po.lines[i];
    const r = Number(qty[i]?.received || 0);
    const j = Number(qty[i]?.rejected || 0);
    const open = l.ordered - l.received;
    if (!Number.isInteger(r) || r < 0) return "Whole units only";
    if (r > open) return `Only ${open} outstanding — excess needs a vendor decision`;
    if (!Number.isInteger(j) || j < 0) return "Whole units only";
    if (j > r) return "Can't reject more than arrived";
    return null;
  };
  const errs = po.lines.map((_, i) => lineErr(i));
  const any = po.lines.some((_, i) => Number(qty[i]?.received || 0) > 0);

  const submit = async () => {
    const r = await m.run(
      po.id,
      po.lines.map((_, i) => ({ index: i, received: Number(qty[i]?.received || 0), rejected: Number(qty[i]?.rejected || 0) })),
    );
    if (r) {
      onOpenChange(false);
      toast({ title: `${r.grn} recorded on ${po.id}`, body: `${r.po.status}. Accepted stock is posted to the ledger; rejects go back to ${po.vendor}.` });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={PackageCheck}
      title={`Record receipt · ${po.id}`}
      description={`${po.vendor} · enter what arrived today. Rejected units are counted within what arrived.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} disabled={!any || errs.some(Boolean)} onClick={submit}>
            Post receipt
          </Button>
        </>
      }
    >
      <div className="pur-form">
        {m.error && <Callout tone="risk" title="Receipt not posted">{m.error}</Callout>}
        {po.lines.map((l, i) => {
          const out = l.ordered - l.received;
          return (
            <div key={i} className="pur-receipt-line">
              <div className="pur-receipt-item">
                <span className="t-strong">{l.item}</span>
                <span className="pur-cell-sub">
                  {out ? `${out} of ${l.ordered} ${l.uom} outstanding` : "Fully received"}
                </span>
              </div>
              <Field label="Received" htmlFor={`rc-${i}`} error={errs[i] && Number(qty[i]?.received || 0) > out ? errs[i] : null}>
                <Input id={`rc-${i}`} inputMode="numeric" disabled={!out} value={qty[i]?.received ?? ""} placeholder="0" suffix={l.uom} invalid={!!errs[i]} onChange={(e) => setQty((s) => ({ ...s, [i]: { received: e.target.value, rejected: s[i]?.rejected ?? "" } }))} />
              </Field>
              <Field label="Rejected" htmlFor={`rj-${i}`} error={errs[i] && Number(qty[i]?.received || 0) <= out ? errs[i] : null}>
                <Input id={`rj-${i}`} inputMode="numeric" disabled={!out} value={qty[i]?.rejected ?? ""} placeholder="0" suffix={l.uom} onChange={(e) => setQty((s) => ({ ...s, [i]: { received: s[i]?.received ?? "", rejected: e.target.value } }))} />
              </Field>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
