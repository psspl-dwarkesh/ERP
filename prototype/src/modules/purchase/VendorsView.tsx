import { Building2, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { PurchaseOrder, Vendor } from "../../api/types";
import { Button, Callout, ComingSoon, Card, DataTable, Drawer, EmptyState, KeyValues, LoadingRows, Progress, RecordLink, SearchField, Select, Status, Toolbar, type Column } from "../../ds/components";
import { Stars } from "./Stars";
import { openRecord } from "./util";

const ON_TIME_FLOOR = 85;
const openPOs = (v: Vendor, pos: PurchaseOrder[]) => pos.filter((p) => p.vendor === v.name && (p.status === "Issued" || p.status === "Part received")).length;

export function VendorsView({ vendors, pos, loading }: { vendors: Vendor[]; pos: PurchaseOrder[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const cats = [...new Set(vendors.map((v) => v.category))].sort();
  const rows = vendors
    .filter((v) => cat === "all" || v.category === cat)
    .filter((v) => !q.trim() || `${v.id} ${v.name} ${v.city} ${v.category}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.rating - a.rating);
  const weak = vendors.filter((v) => v.onTimeRate < ON_TIME_FLOOR);

  const columns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Vendor",
      sort: (v) => v.name,
      cell: (v) => (
        <div className="cell-primary">
          <span className="cell-title">{v.name}</span>
          <span className="cell-sub mono">{v.id}</span>
        </div>
      ),
    },
    { key: "cat", header: "Category", sort: (v) => v.category, priority: 2, cell: (v) => <span className="pur-muted-cell">{v.category}</span> },
    { key: "city", header: "City", sort: (v) => v.city, priority: 3, cell: (v) => v.city },
    { key: "rating", header: "Rating", sort: (v) => v.rating, cell: (v) => <Stars rating={v.rating} /> },
    {
      key: "ontime",
      header: "On-time delivery",
      sort: (v) => v.onTimeRate,
      width: 190,
      cell: (v) => (
        <div className="pur-ontime">
          <Progress value={v.onTimeRate} size="sm" tone={v.onTimeRate < ON_TIME_FLOOR ? "warn" : "ok"} label={`${v.name} on-time rate`} />
          <span className="cell-num">{v.onTimeRate}%</span>
        </div>
      ),
    },
    { key: "open", header: "Open POs", align: "right", sort: (v) => openPOs(v, pos), cell: (v) => <span className="cell-num">{openPOs(v, pos)}</span> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {!loading && weak.length > 0 && (
        <Callout tone="warn" title={`${weak.length} vendor${weak.length === 1 ? "" : "s"} below ${ON_TIME_FLOOR}% on-time delivery`}>
          {weak.map((v) => `${v.name} (${v.onTimeRate}%)`).join(", ")}. Their quotes are still compared, but lead times should be read with that record in mind.
        </Callout>
      )}
      <Card padded={false}>
        <div className="pur-table-head">
          <Toolbar
            end={<Select label="Category" size="sm" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...cats.map((c) => ({ value: c, label: c }))]} />}
          >
            <SearchField value={q} onChange={setQ} placeholder="Search vendor, city or category" label="Search vendors" width={300} />
          </Toolbar>
        </div>
        <div className="pur-flush">
          <DataTable
            caption="Vendors"
            loading={loading}
            rows={rows}
            columns={columns}
            onRowClick={(v) => openRecord(v.id, "vendors")}
            empty={
              <EmptyState icon={Building2} title="No vendor matches">
                Try another name, city or category.
              </EmptyState>
            }
          />
        </div>
        <div className="pur-table-foot">
          <span>Rating and on-time rate cover the last 12 months of receipts.</span>
        </div>
      </Card>
    </div>
  );
}

export function VendorDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const vendors = useQuery(api.vendors);
  const rfqs = useQuery(api.rfqs);
  const pos = useQuery(api.purchaseOrders);
  const v = vendors.data?.find((x) => x.id === id);

  if (!vendors.loading && !v) {
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()} title="Vendor not found" id={id}>
        <EmptyState icon={Building2} title={`There is no vendor ${id}`} action={<Button size="sm" onClick={onClose}>Back to vendors</Button>}>
          Vendor ids look like VEN-0021.
        </EmptyState>
      </Drawer>
    );
  }

  const quotes = (rfqs.data ?? []).flatMap((r) => r.quotes.filter((q) => q.vendorId === id).map((q) => ({ r, q })));
  const orders = (pos.data ?? []).filter((p) => p.vendor === v?.name);

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} width={560} id={id} title={v?.name ?? "Loading vendor"} subtitle={v ? `${v.category} · ${v.city}` : undefined} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {!v ? (
        <LoadingRows rows={4} columns={2} />
      ) : (
        <>
          <KeyValues
            columns={2}
            items={[
              { label: "Rating", value: <Stars rating={v.rating} /> },
              {
                label: "On-time delivery",
                value: (
                  <div className="pur-ontime">
                    <Progress value={v.onTimeRate} size="sm" tone={v.onTimeRate < ON_TIME_FLOOR ? "warn" : "ok"} label="On-time rate" />
                    <span className="cell-num">{v.onTimeRate}%</span>
                  </div>
                ),
              },
              { label: "Category", value: v.category },
              { label: "Open orders", value: openPOs(v, pos.data ?? []) },
            ]}
          />
          <ComingSoon inline icon={ShieldQuestion} title="Tax & compliance details">GSTIN, PAN, MSME status and bank details on the vendor master.</ComingSoon>
          <section>
            <h3 className="pur-sub">Quotes</h3>
            {quotes.length === 0 ? (
              <p className="pur-cell-sub">No quotes recorded from this vendor yet.</p>
            ) : (
              <ul className="divider-list">
                {quotes.map(({ r, q }) => (
                  <li key={r.id} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">
                        <RecordLink id={r.id} /> <span className="pur-inline-title">{r.title}</span>
                      </div>
                      <div className="list-row-sub">
                        {inr(q.price)} · {q.leadDays} days · {q.technicalFit === "Full" ? "full fit" : q.technicalFit.toLowerCase()}
                      </div>
                    </div>
                    {r.status === "Awarded" ? <Status size="sm" tone={r.awardedTo === v.name ? "ok" : "neutral"}>{r.awardedTo === v.name ? "Won" : "Not selected"}</Status> : <Status size="sm">{r.status}</Status>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="pur-sub">Purchase orders</h3>
            {orders.length === 0 ? (
              <p className="pur-cell-sub">No orders placed with this vendor in this workspace.</p>
            ) : (
              <ul className="divider-list">
                {orders.map((p) => (
                  <li key={p.id} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">
                        <RecordLink id={p.id} /> <span className="pur-inline-title">{p.title}</span>
                      </div>
                      <div className="list-row-sub">
                        {inr(p.value)} · expected {date(p.expected, true)}
                      </div>
                    </div>
                    <Status size="sm">{p.status}</Status>
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
