import { ArrowRight, Boxes, PackageSearch, ShoppingCart, Truck } from "lucide-react";
import { api } from "../../api/client";
import { ago, date, inr, num } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { BomLine, Item, Project } from "../../api/types";
import { href } from "../../app/router";
import { ButtonLink, Callout, Card, CardHeader, DataTable, EmptyState, LoadingRows, Meter, RecordLink, Status, type Column } from "../../ds/components";

interface Coverage {
  id: string;
  line: BomLine;
  fromReserved: number;
  fromFree: number;
  fromOrder: number;
  onHold: number;
  short: number;
}

function cover(line: BomLine, item?: Item): Coverage {
  const need = line.required;
  const fromReserved = Math.min(line.reserved, need);
  const fromFree = Math.min(line.available, need - fromReserved);
  const fromOrder = Math.min(line.onOrder, need - fromReserved - fromFree);
  const short = need - fromReserved - fromFree - fromOrder;
  const onHold = Math.min(item?.quarantined ?? 0, short);
  return { id: line.itemId, line, fromReserved, fromFree, fromOrder, onHold, short };
}

export function MaterialsTab({ p }: { p: Project }) {
  const boms = useQuery(api.boms);
  const items = useQuery(api.items);
  const prs = useQuery(api.purchaseRequests);
  const rfqs = useQuery(api.rfqs);
  const pos = useQuery(api.purchaseOrders);
  const movements = useQuery(api.movements);

  if (boms.loading || items.loading) return <LoadingRows rows={6} columns={5} />;

  const bom = (boms.data ?? []).find((b) => b.id === p.bom || b.projectId === p.id);
  const lines = bom ? bom.lines.map((l) => cover(l, items.data?.find((i) => i.id === l.itemId))) : [];
  const shortLines = lines.filter((l) => l.short > 0);
  const myPrs = (prs.data ?? []).filter((r) => r.projectId === p.id);
  const myRfqs = (rfqs.data ?? []).filter((r) => r.projectId === p.id);
  const myPos = (pos.data ?? []).filter((o) => o.projectId === p.id);
  const site = (movements.data ?? []).filter((mv) => `${mv.to} ${mv.from} ${mv.reference}`.includes(p.id));
  const covering = myPrs.find((r) => r.source.includes(bom?.id ?? "—"));
  const coveringRfq = myRfqs.find((r) => r.prId === covering?.id);
  const holdLines = shortLines.filter((l) => l.onHold > 0);

  const columns: Column<Coverage>[] = [
    {
      key: "item",
      header: "Component",
      sort: (c) => c.line.item,
      cell: (c) => (
        <div className="cell-primary">
          <span className="cell-title">{c.line.item}</span>
          <span className="cell-sub">
            <RecordLink id={c.line.itemId} quiet />
          </span>
        </div>
      ),
    },
    { key: "req", header: "Required", align: "right", sort: (c) => c.line.required, cell: (c) => <span className="cell-num">{num(c.line.required)} {c.line.uom}</span> },
    {
      key: "cover",
      header: "Coverage",
      width: 260,
      cell: (c) => (
        <div className="prj-cover">
          <Meter
            total={c.line.required}
            segments={[
              { value: c.fromReserved, tone: "info", label: "Reserved" },
              { value: c.fromFree, tone: "ok", label: "Free stock" },
              { value: c.fromOrder, tone: "neutral", label: "On order" },
              { value: c.onHold, tone: "warn", label: "On QC hold" },
              { value: c.short - c.onHold, tone: "risk", label: "Short" },
            ]}
          />
          <span className="prj-cover-legend">
            {[
              c.fromReserved > 0 && <span key="r">{c.fromReserved} reserved</span>,
              c.fromFree > 0 && <span key="f">{c.fromFree} from free stock</span>,
              c.fromOrder > 0 && <span key="o">{c.fromOrder} on order</span>,
              c.onHold > 0 && <span key="h" className="prj-t-warn">{c.onHold} on QC hold</span>,
              c.short - c.onHold > 0 && <span key="s" className="prj-t-risk">{c.short - c.onHold} short</span>,
            ]
              .filter(Boolean)
              .flatMap((el, i) => (i ? [<span key={`d${i}`}> · </span>, el] : [el]))}
          </span>
        </div>
      ),
    },
    { key: "short", header: "Short", align: "right", sort: (c) => c.short, cell: (c) => <span className={`cell-num ${c.short ? "prj-t-risk" : "t-muted"}`}>{c.short ? num(c.short) : "—"}</span> },
    {
      key: "state",
      header: "State",
      sort: (c) => c.short,
      cell: (c) => (c.onHold > 0 ? <Status tone="warn">QC hold</Status> : c.short > 0 ? <Status tone="risk">Short</Status> : c.fromOrder > 0 ? <Status tone="info">On order</Status> : <Status tone="ok">Covered</Status>),
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {bom && shortLines.length > 0 && (
        <Callout
          tone="risk"
          title={`${shortLines.length} of ${lines.length} BOM lines can't be kitted${p.workOrder ? ` — ${p.workOrder} assembly waits on them` : ""}`}
          action={
            coveringRfq ? (
              <ButtonLink to={href.record(coveringRfq.id)} size="sm" variant="primary" iconRight={ArrowRight}>
                Compare quotes
              </ButtonLink>
            ) : undefined
          }
        >
          {covering ? (
            <>
              The shortage is covered by <RecordLink id={covering.id} /> ({inr(covering.value)}, {covering.status.toLowerCase()})
              {coveringRfq && (
                <>
                  {" "}
                  with <RecordLink id={coveringRfq.id} /> {coveringRfq.status === "Awarded" ? `awarded to ${coveringRfq.awardedTo}` : `in ${coveringRfq.status.toLowerCase()} — ${coveringRfq.quotes.length} quotes received`}
                </>
              )}
              .
            </>
          ) : (
            <>No requisition covers these lines yet.</>
          )}
          {holdLines.length > 0 && <> {holdLines.map((l) => l.line.item).join(", ")} {holdLines.length === 1 ? "is" : "are"} in stock but held at incoming QC, so they count as unavailable.</>}
        </Callout>
      )}

      <Card padded={false}>
        <div className="card-padded" style={{ paddingBottom: 0 }}>
          <CardHeader
            icon={Boxes}
            title={bom ? `${bom.name}` : "Engineering BOM"}
            eyebrow={bom ? `${bom.id} · REV ${bom.revision}` : undefined}
            description={bom ? `${bom.status}${bom.releasedOn ? ` ${date(bom.releasedOn)}` : ""} · required quantity against reserved, free, on-order and held stock` : undefined}
            actions={bom ? <Status>{bom.status}</Status> : undefined}
          />
        </div>
        {bom ? (
          <div className="prj-flush">
            <DataTable caption={`${bom.id} lines`} rows={lines} columns={columns} />
            <div className="prj-table-foot">
              <span className="prj-legend">
                <span><i className="prj-sw tone-info" /> Reserved</span>
                <span><i className="prj-sw tone-ok" /> Free stock</span>
                <span><i className="prj-sw tone-neutral" /> On order</span>
                <span><i className="prj-sw tone-warn" /> QC hold</span>
                <span><i className="prj-sw tone-risk" /> Short</span>
              </span>
              <span className="prj-table-foot-note">Quarantined stock never counts as available.</span>
            </div>
          </div>
        ) : (
          <EmptyState icon={PackageSearch} title="No engineering BOM on this project">
            {p.vertical === "CSV / Manufacturing IT" || p.vertical === "O&M" || p.vertical === "Calibration" || p.vertical === "AMC"
              ? `${p.vertical} work is delivered as services, so material is bought on requisitions rather than planned from a BOM.`
              : `Engineering releases the BOM after design freeze. Until then, material for ${p.name.toLowerCase()} is raised on requisitions.`}
          </EmptyState>
        )}
      </Card>

      <div className="grid grid-2">
        <Card>
          <CardHeader icon={ShoppingCart} title="Purchasing for this project" description="Requisitions, RFQs and orders that carry this project's id." />
          {myPrs.length + myRfqs.length + myPos.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nothing bought against this project yet">
              Requisitions raised from this project's shortages or site needs will be listed here with their approval state.
            </EmptyState>
          ) : (
            <ul className="divider-list">
              {[...myPrs.map((r) => ({ id: r.id, title: r.title, sub: `Requisition · need by ${date(r.needBy, true)}`, value: r.value, status: r.status })), ...myRfqs.map((r) => ({ id: r.id, title: r.title, sub: `RFQ · ${r.quotes.length} quotes · closes ${date(r.closes, true)}`, value: Math.min(...r.quotes.map((q) => q.price)), status: r.status })), ...myPos.map((o) => ({ id: o.id, title: o.title, sub: `${o.vendor} · expected ${date(o.expected, true)}`, value: o.value, status: o.status }))].map((r) => (
                <li key={r.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">
                      <RecordLink id={r.id} /> <span className="prj-inline-title">{r.title}</span>
                    </div>
                    <div className="list-row-sub">{r.sub}</div>
                  </div>
                  <span className="cell-num">{inr(r.value)}</span>
                  <Status size="sm">{r.status}</Status>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader icon={Truck} title="Site stock & transfers" description="Movements to or from this project's site store." />
          {site.length === 0 ? (
            <EmptyState icon={Truck} title="No material has moved to site yet">
              Transfers appear here once stores dispatches against this project; the site must acknowledge before it can consume them.
            </EmptyState>
          ) : (
            <ul className="divider-list">
              {site.map((mv) => (
                <li key={mv.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">
                      {mv.type} · {num(Math.abs(mv.qty))} × {mv.item}
                    </div>
                    <div className="list-row-sub">
                      <span className="mono">{mv.reference}</span> · {mv.from} → {mv.to} · {ago(mv.at)}
                    </div>
                  </div>
                  <Status size="sm">{mv.status}</Status>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
