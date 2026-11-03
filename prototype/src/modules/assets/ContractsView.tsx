import { ArrowRight, CalendarRange, FileSignature } from "lucide-react";
import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { ServiceContract, ServiceTicket } from "../../api/types";
import { SlaClock } from "../../app/patterns";
import { href } from "../../app/router";
import { Button, ButtonLink, Callout, Drawer, EmptyState, KeyValues, LoadingRows, Meter, RecordLink, Status, Tag, cx } from "../../ds/components";
import { Prio, contractWindow, isOpen } from "./shared";

export function ContractsView({ contracts, tickets, loading, activeId }: { contracts: ServiceContract[]; tickets: ServiceTicket[]; loading: boolean; activeId?: string }) {
  const renewals = contracts.filter((c) => contractWindow(c).renewal);

  if (loading) return <LoadingRows rows={3} columns={4} />;
  if (!contracts.length) return <EmptyState icon={FileSignature} title="No service contracts yet">Contracts are created when a sales order for AMC or O&M is confirmed.</EmptyState>;

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {renewals.map((c) => {
        const w = contractWindow(c);
        return (
          <Callout
            key={c.id}
            tone="warn"
            title={`${c.id} · ${c.customer} expires ${date(c.end, true)}, in ${w.left} days`}
            action={<ButtonLink to={href.module("crm")} size="sm" variant="primary" iconRight={ArrowRight}>Open renewal in CRM</ButtonLink>}
          >
            {c.visitsUsed} of {c.visitsIncluded} included visits used at {inr(c.annualValue)} a year. Price the renewal on this year's actual usage before the customer's budget closes.
          </Callout>
        );
      })}

      <div className="ast-contracts">
        {contracts.map((c) => {
          const w = contractWindow(c);
          const open = tickets.filter((t) => t.contractId === c.id && isOpen(t));
          const usedPct = c.visitsUsed / Math.max(1, c.visitsIncluded);
          return (
            <article key={c.id} className={cx("ast-contract", activeId === c.id && "is-active")}>
              <div className="ast-contract-top">
                <Tag tone={c.type === "AMC" ? "accent" : "violet"}>{c.type}</Tag>
                <a href={`#/app/assets/${c.id}?tab=contracts`} className="mono ast-contract-id">
                  {c.id}
                </a>
                <span className="ast-contract-status">
                  <Status>{c.status}</Status>
                </span>
              </div>
              <h3 className="ast-contract-name">{c.customer}</h3>
              <div className="ast-visits">
                <div className="row row-between">
                  <span className="ast-footnote">Included visits</span>
                  <span className={cx("t-num t-strong", usedPct >= 0.75 && "ast-warn-text")}>
                    {c.visitsUsed} / {c.visitsIncluded}
                  </span>
                </div>
                <Meter segments={[{ value: c.visitsUsed, tone: usedPct >= 0.75 ? "warn" : "accent", label: "Used" }]} total={c.visitsIncluded} />
              </div>
              <KeyValues
                columns={2}
                items={[
                  { label: "Response SLA", value: `${c.responseHours} h` },
                  { label: "Annual value", value: <span className="t-num">{inr(c.annualValue)}</span> },
                  { label: "Valid", value: <span className="t-num">{date(c.start, true)} – {date(c.end, true)} {c.end.slice(0, 4)}</span> },
                  { label: "Days left", value: <span className={cx("t-num", w.renewal && "ast-warn-text")}>{w.left < 0 ? "Expired" : w.left}</span> },
                ]}
              />
              <div className="ast-contract-foot">
                <span className="ast-contract-assets">
                  {c.assets.map((a) => (
                    <RecordLink key={a} id={a} />
                  ))}
                </span>
                <span className="ast-footnote">{open.length ? `${open.length} open ticket${open.length > 1 ? "s" : ""}` : "No open tickets"}</span>
              </div>
            </article>
          );
        })}
      </div>
      <p className="ast-footnote">Exclusions and coverage windows are captured from the signed contract; the demo shows the entitlements the service desk resolves on every ticket.</p>
    </div>
  );
}

export function ContractDrawer({ id, contracts, tickets, loading, onClose }: { id: string; contracts: ServiceContract[]; tickets: ServiceTicket[]; loading: boolean; onClose: () => void }) {
  const c = contracts.find((x) => x.id === id);
  const assets = useQuery(api.assets);
  const orders = useQuery(api.salesOrders);
  const under = tickets.filter((t) => t.contractId === id).sort((a, b) => b.opened.localeCompare(a.opened));
  const so = orders.data?.find((o) => o.title.includes(id));

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width={560}
      id={id}
      status={c ? <Status>{c.status}</Status> : undefined}
      title={c ? `${c.type} · ${c.customer}` : loading ? "Loading contract" : "Contract not found"}
      subtitle={c ? `${date(c.start)} – ${date(c.end)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {c && contractWindow(c).renewal && <ButtonLink to={href.module("crm")} variant="primary" iconRight={ArrowRight}>Renewal in CRM</ButtonLink>}
        </>
      }
    >
      {!c ? (
        loading ? <LoadingRows rows={4} columns={2} /> : <EmptyState title={`${id} isn't a contract in this workspace`} />
      ) : (
        <>
          <section className="stack-sm stack">
            <h3 className="ast-h">Entitlements</h3>
            <KeyValues
              columns={3}
              items={[
                { label: "Response", value: `${c.responseHours} h` },
                { label: "Included visits", value: `${c.visitsIncluded} a year` },
                { label: "Annual value", value: inr(c.annualValue) },
              ]}
            />
            <div className="ast-visits">
              <div className="row row-between">
                <span className="ast-footnote">Visits used</span>
                <span className="t-num t-strong">
                  {c.visitsUsed} of {c.visitsIncluded} · {c.visitsIncluded - c.visitsUsed} left
                </span>
              </div>
              <Meter segments={[{ value: c.visitsUsed, tone: c.visitsUsed / c.visitsIncluded >= 0.75 ? "warn" : "accent", label: "Used" }]} total={c.visitsIncluded} />
            </div>
            <p className="ast-footnote row" style={{ gap: 6 }}>
              <CalendarRange size={13} aria-hidden /> Billing: {so ? <RecordLink id={so.id}>{so.title}</RecordLink> : "recurring billing advice raised from Sales"}. Charges for excluded work route to billing review per ticket.
            </p>
          </section>

          <section className="stack-sm stack">
            <h3 className="ast-h">Covered assets</h3>
            <ul className="divider-list">
              {c.assets.map((aid) => {
                const a = assets.data?.find((x) => x.id === aid);
                return (
                  <li key={aid} className="list-row">
                    <div className="list-row-main">
                      <RecordLink id={aid}>{a?.name}</RecordLink>
                      <div className="list-row-sub">{a ? `${a.site} · serial ${a.serial}` : ""}</div>
                    </div>
                    {a && <Status>{a.status}</Status>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="stack-sm stack">
            <h3 className="ast-h">Tickets under this contract</h3>
            {under.length === 0 ? (
              <p className="ast-footnote">No tickets raised against this contract yet.</p>
            ) : (
              <ul className="divider-list">
                {under.map((t) => (
                  <li key={t.id}>
                    <a href={`#/app/assets/${t.id}?tab=tickets`} className="list-row ast-row-link">
                      <Prio p={t.priority} />
                      <div className="list-row-main">
                        <div className="list-row-title ast-clip">{t.title}</div>
                        <div className="list-row-sub">
                          <span className="mono">{t.id}</span> · {t.status} · {t.chargeable ? "chargeable" : "included"}
                        </div>
                      </div>
                      <SlaClock due={t.slaDue} done={!isOpen(t)} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}
