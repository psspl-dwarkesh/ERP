import { ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { href } from "../../app/router";
import { ButtonLink, Callout, Drawer, EmptyState, KeyValues, LoadingRows, Person, RecordLink, SoonButton, Status, Tag, Timeline } from "../../ds/components";
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
            <>
              <SoonButton what="Draft the next revision; this one stays on record as superseded once it is sent.">New revision</SoonButton>
              <SoonButton what="Turn the accepted revision into a sales order at the quoted price.">Record acceptance</SoonButton>
            </>
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
