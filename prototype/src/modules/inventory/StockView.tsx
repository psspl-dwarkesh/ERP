import { ArrowUpFromLine, Boxes, CheckCircle2, MapPin, PackageSearch, ScanBarcode, ShieldAlert, Warehouse, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { date, inr, num, relativeDay, time } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Item, StockMovement } from "../../api/types";
import { StockMeter } from "../../app/patterns";
import {
  Button,
  Callout,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  FilterChips,
  Input,
  KeyValues,
  LoadingRows,
  RadioCards,
  RecordLink,
  SearchField,
  Select,
  Status,
  Tag,
  Textarea,
  Timeline,
  Toolbar,
  useToast,
  type Column,
} from "../../ds/components";
import { decideQc } from "./commands";
import { MOVEMENT_ICON, RefText, freeQty, openInventoryRecord, signedQty } from "./shared";

type StockFilter = "all" | "reorder" | Item["status"];

export function StockView({ items, loading }: { items: Item[]; loading: boolean }) {
  const [warehouse, setWarehouse] = useState("all");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [q, setQ] = useState("");

  const below = items.filter((i) => freeQty(i) < i.reorderLevel);
  const held = items.filter((i) => i.quarantined > 0);
  const heldUnits = held.reduce((a, i) => a + i.quarantined, 0);
  const warehouses = [...new Set(items.map((i) => i.warehouse))];

  const rows = items.filter((i) => {
    if (warehouse !== "all" && i.warehouse !== warehouse) return false;
    if (filter === "reorder" && !(freeQty(i) < i.reorderLevel)) return false;
    if (filter !== "all" && filter !== "reorder" && i.status !== filter) return false;
    const t = q.trim().toLowerCase();
    return !t || `${i.id} ${i.name} ${i.make} ${i.category} ${i.bin}`.toLowerCase().includes(t);
  });

  const firstHeld = held[0];

  const columns: Column<Item>[] = [
    {
      key: "item",
      header: "Item",
      sort: (i) => i.name,
      cell: (i) => (
        <div className="cell-primary">
          <span className="cell-title">{i.name}</span>
          <span className="cell-sub">
            <span className="mono">{i.id}</span> · {i.make} · {i.category}
          </span>
        </div>
      ),
    },
    {
      key: "loc",
      header: "Location",
      sort: (i) => i.warehouse,
      priority: 2,
      cell: (i) => (
        <div className="cell-primary">
          <span className="inv-loc">{i.warehouse}</span>
          <span className="cell-sub">Bin {i.bin}</span>
        </div>
      ),
    },
    { key: "stock", header: "Free · reserved · hold · on order", width: 260, sort: (i) => freeQty(i), cell: (i) => <StockMeter item={i} /> },
    {
      key: "status",
      header: "Status",
      sort: (i) => i.status,
      cell: (i) => (
        <div className="cell-primary" style={{ alignItems: "flex-start" }}>
          <Status>{i.status}</Status>
          {freeQty(i) < i.reorderLevel && i.status !== "QC hold" && <span className="cell-sub">Below reorder {i.reorderLevel}</span>}
        </div>
      ),
    },
    {
      key: "value",
      header: "Value at cost",
      align: "right",
      priority: 2,
      sort: (i) => i.onHand * i.unitCost,
      cell: (i) => (
        <div className="cell-primary" style={{ alignItems: "flex-end" }}>
          <span className="cell-num">{inr(i.onHand * i.unitCost)}</span>
          <span className="cell-sub t-num">
            {inr(i.unitCost, { compact: false })} / {i.uom}
          </span>
        </div>
      ),
    },
    { key: "last", header: "Last movement", sort: (i) => i.lastMovement, priority: 3, cell: (i) => <span className="t-muted">{relativeDay(i.lastMovement)}</span> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {firstHeld && (
        <Callout
          tone="warn"
          icon={ShieldAlert}
          title={`${heldUnits} ${firstHeld.name.split(" ·")[0].toLowerCase()}s held at incoming QC`}
          action={
            <Button size="sm" variant="primary" onClick={() => openInventoryRecord(firstHeld.id, "stock")}>
              Record QC decision
            </Button>
          }
        >
          <RefText text="GRN-0073 from Orbit Process Solutions (PO-0109). PRJ-0264 needs them for the loop test on 10 Nov. Held stock can't be issued or kitted." />
        </Callout>
      )}


      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Toolbar
          end={
            <Select
              label="Warehouse"
              icon={Warehouse}
              value={warehouse}
              onChange={setWarehouse}
              options={[{ value: "all", label: "All locations" }, ...warehouses.map((w) => ({ value: w, label: w, detail: `${items.filter((i) => i.warehouse === w).length} items` }))]}
            />
          }
        >
          <SearchField value={q} onChange={setQ} placeholder="Search item, make, bin" label="Search stock" />
          <FilterChips
            label="Stock status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: items.length },
              { value: "reorder", label: "Below reorder", count: below.length },
              ...(held.length ? [{ value: "QC hold" as StockFilter, label: "QC hold", count: held.length }] : []),
              ...(items.some((i) => i.status === "Out of stock") ? [{ value: "Out of stock" as StockFilter, label: "Out of stock", count: items.filter((i) => i.status === "Out of stock").length }] : []),
            ]}
          />
        </Toolbar>
        <DataTable
          caption="Stock register"
          loading={loading}
          rows={rows}
          columns={columns}
          onRowClick={(i) => openInventoryRecord(i.id, "stock")}
          empty={
            <EmptyState
              icon={PackageSearch}
              title="No stock matches these filters"
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setWarehouse("all");
                    setQ("");
                  }}
                >
                  Clear filters
                </Button>
              }
            >
              {warehouse !== "all" ? `Nothing in ${warehouse} fits.` : "Try a different search term."}
            </EmptyState>
          }
        />
      </div>
    </div>
  );
}

/* ====================================================================== Item drawer */
const DESTINATIONS = [
  { value: "WO-0187", label: "WO-0187 · Line 03 panel assembly", detail: "Assembly cell 2 · PRJ-0264" },
  { value: "Pune site store · PRJ-0264", label: "Pune site store · PRJ-0264", detail: "Northstar Pharma, Pune plant" },
  { value: "Nashik site · PRJ-0258", label: "Nashik site · PRJ-0258", detail: "Meridian Foods utility block" },
  { value: "Vadodara site · PRJ-0249", label: "Vadodara site · PRJ-0249", detail: "Crest Chemicals, Nandesari" },
];

export function ItemDrawer({ id, items, loading, onClose }: { id: string; items: Item[]; loading: boolean; onClose: () => void }) {
  const item = items.find((i) => i.id === id);
  const movements = useQuery(api.movements);
  const boms = useQuery(api.boms);
  const workOrders = useQuery(api.workOrders);
  const [issueOpen, setIssueOpen] = useState(false);

  const history = (movements.data ?? []).filter((m) => m.itemId === id);
  const holders = useMemo(() => {
    if (!item) return [];
    const out: { id?: string; label: string; qty: number }[] = [];
    for (const b of boms.data ?? []) {
      for (const l of b.lines) {
        if (l.itemId === item.id && l.reserved > 0) {
          const wo = workOrders.data?.find((w) => w.bomId === b.id);
          out.push({ id: wo?.id ?? b.id, label: `${b.id} rev ${b.revision}`, qty: l.reserved });
        }
      }
    }
    let rest = item.reserved - out.reduce((a, h) => a + h.qty, 0);
    const site = item.warehouse.match(/PRJ-\d{4}/)?.[0];
    if (rest > 0 && site) {
      out.push({ id: site, label: "Project site store", qty: rest });
      rest = 0;
    }
    if (rest > 0) out.push({ label: "Other open jobs", qty: rest });
    return out;
  }, [item, boms.data, workOrders.data]);

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width={560}
      id={id}
      status={item ? <Status>{item.status}</Status> : undefined}
      title={item?.name ?? (loading ? "Loading item" : "Item not found")}
      subtitle={item ? `${item.make} · ${item.category} · ${item.uom}` : undefined}
      footer={
        item ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" icon={ArrowUpFromLine} onClick={() => setIssueOpen(true)}>
              Issue stock
            </Button>
          </>
        ) : undefined
      }
    >
      {loading && !item ? (
        <LoadingRows rows={4} columns={2} />
      ) : !item ? (
        <EmptyState icon={PackageSearch} title={`${id} isn't in the item master`}>
          It may have been merged or never existed in this workspace.
        </EmptyState>
      ) : (
        <>
          <section className="inv-qty" aria-label="Quantities">
            <div className="inv-qty-head">
              <div>
                <span className="inv-qty-free t-num">{num(freeQty(item))}</span>
                <span className="inv-qty-unit">{item.uom} free to issue</span>
              </div>
              <span className="t-muted t-num">{num(item.onHand)} on hand</span>
            </div>
            <StockMeter item={item} />
            <dl className="inv-qty-grid">
              <div><dt>On hand</dt><dd className="t-num">{num(item.onHand)}</dd></div>
              <div><dt><i className="inv-sw tone-info" />Reserved</dt><dd className="t-num">{num(item.reserved)}</dd></div>
              <div><dt><i className="inv-sw tone-warn" />QC hold</dt><dd className="t-num">{num(item.quarantined)}</dd></div>
              <div><dt><i className="inv-sw tone-neutral" />On order</dt><dd className="t-num">{num(item.onOrder)}</dd></div>
              <div><dt>Reorder level</dt><dd className="t-num">{num(item.reorderLevel)}</dd></div>
            </dl>
          </section>

          {item.quarantined > 0 && <QcDecision item={item} />}

          {holders.length > 0 && (
            <section className="stack-sm stack">
              <h3 className="inv-h">Reserved for</h3>
              <ul className="divider-list inv-holders">
                {holders.map((h) => (
                  <li key={h.label} className="list-row">
                    <div className="list-row-main">
                      {h.id ? <RecordLink id={h.id}>{h.label}</RecordLink> : <span className="list-row-title">{h.label}</span>}
                    </div>
                    <span className="cell-num">
                      {num(h.qty)} {item.uom}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="stack-sm stack">
            <h3 className="inv-h">Location & tracking</h3>
            <KeyValues
              columns={2}
              items={[
                { label: "Store", value: <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><MapPin size={14} aria-hidden className="t-muted" />{item.warehouse}</span> },
                { label: "Bin", value: <span className="mono">{item.bin}</span> },
                { label: "Tracking", value: item.serialized ? <Tag icon={ScanBarcode} tone="accent">Serial-tracked</Tag> : <Tag icon={Boxes}>Quantity only</Tag> },
                { label: "Unit cost", value: <span className="t-num">{inr(item.unitCost, { compact: false })} / {item.uom}</span> },
                { label: "Value on hand", value: <span className="t-num">{inr(item.onHand * item.unitCost)}</span> },
                { label: "Last movement", value: `${date(item.lastMovement)} · ${relativeDay(item.lastMovement)}` },
              ]}
            />
          </section>

          <section className="stack-sm stack">
            <h3 className="inv-h">Recent movements</h3>
            {movements.loading ? (
              <LoadingRows rows={3} columns={2} />
            ) : history.length === 0 ? (
              <p className="t-muted inv-footnote">No movements recorded for this item in this period.</p>
            ) : (
              <Timeline items={history.slice(0, 6).map((m) => movementEvent(m, item.uom))} />
            )}
          </section>

          <IssueDialog item={item} open={issueOpen} onOpenChange={setIssueOpen} />
        </>
      )}
    </Drawer>
  );
}

function movementEvent(m: StockMovement, uom: string) {
  const Icon = MOVEMENT_ICON[m.type];
  const q = signedQty(m);
  return {
    id: m.id,
    tone: m.status === "Blocked" ? ("warn" as const) : m.status === "Pending" || m.status === "In transit" ? ("info" as const) : ("accent" as const),
    title: (
      <span className="inv-tl-title">
        <Icon size={14} aria-hidden className="t-muted" />
        <strong>{m.type}</strong>
        <span className="t-num">
          {m.type === "Transfer" ? "" : q > 0 ? "+" : ""}
          {num(q)} {uom}
        </span>
        <span className="t-muted">
          {m.from} → {m.to}
        </span>
      </span>
    ),
    meta: (
      <span className="inv-tl-meta">
        <RecordLink id={m.id} quiet /> · {date(m.at, true)} {time(m.at)} · {m.by}
      </span>
    ),
    body:
      m.status !== "Posted" ? (
        <span className="row" style={{ gap: 8 }}>
          <Status size="sm">{m.status}</Status>
          <RefText text={m.reference} />
        </span>
      ) : (
        <RefText text={m.reference} />
      ),
  };
}

function QcDecision({ item }: { item: Item }) {
  const toast = useToast();
  const [decision, setDecision] = useState<"release" | "reject" | "">("");
  const [note, setNote] = useState("");
  const m = useMutation(decideQc);

  const submit = async () => {
    if (!decision) return;
    const r = await m.run(item.id, decision, note);
    if (!r) return;
    if (decision === "release") {
      toast({ title: `${r.qty} ${item.uom} released to Central warehouse`, body: `${item.id} is now free to issue. The GRN-0073 receipt is posted.`, tone: "ok" });
    } else {
      toast({ title: `${r.qty} ${item.uom} rejected at QC`, body: "Supplier return raised against PO-0109. PR-0086 is the drafted replacement.", tone: "warn" });
    }
  };

  return (
    <section className="inv-qc" aria-label="QC decision">
      <div className="inv-qc-head">
        <ShieldAlert size={18} aria-hidden />
        <div>
          <h3 className="inv-h">QC decision needed · {item.quarantined} {item.uom} on hold</h3>
          <p className="inv-footnote">
            Received on <RefText text="GRN-0073" /> and failed the incoming check. Deepa Kulkarni is re-testing against a calibrated reference.
          </p>
        </div>
      </div>
      <RadioCards
        label="QC decision"
        columns={2}
        value={decision}
        onChange={(v) => {
          setDecision(v);
          m.reset();
        }}
        options={[
          { value: "release", title: <span className="row" style={{ gap: 6 }}><CheckCircle2 size={16} color="var(--ok)" aria-hidden /> Release</span>, detail: "Move to Central warehouse as free stock" },
          { value: "reject", title: <span className="row" style={{ gap: 6 }}><XCircle size={16} color="var(--risk)" aria-hidden /> Reject</span>, detail: "Return to supplier; keep out of stock" },
        ]}
      />
      {decision && (
        <Field label={decision === "reject" ? "Reason for rejection" : "Inspection note"} required={decision === "reject"} optional={decision === "release"} error={m.error} htmlFor="qc-note" hint="Saved to the audit trail with your name and time.">
          <Textarea id="qc-note" rows={2} value={note} invalid={!!m.error} onChange={(e) => setNote(e.target.value)} placeholder={decision === "reject" ? "e.g. 2 of 6 read +0.4% at 10 bar against ±0.25%" : "e.g. Re-tested against CAL reference, all within tolerance"} />
        </Field>
      )}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant={decision === "reject" ? "danger" : "primary"} disabled={!decision} loading={m.pending} onClick={submit}>
          {decision === "reject" ? "Reject lot" : "Record decision"}
        </Button>
      </div>
    </section>
  );
}

function IssueDialog({ item, open, onOpenChange }: { item: Item; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const [qty, setQty] = useState("");
  const [to, setTo] = useState("");
  const [touched, setTouched] = useState(false);
  const m = useMutation(api.issueStock);

  useEffect(() => {
    if (open) {
      setQty("");
      setTo(item.id === "ITM-0301" ? "Pune site store · PRJ-0264" : "WO-0187");
      setTouched(false);
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  const n = Number(qty);
  const qtyError = !touched ? null : !qty ? "Enter a quantity." : !Number.isInteger(n) || n <= 0 ? `Enter a whole number of ${item.uom} above zero.` : null;
  const free = freeQty(item);

  const submit = async () => {
    setTouched(true);
    if (!qty || !Number.isInteger(n) || n <= 0 || !to) return;
    const r = await m.run(item.id, n, to);
    if (r) {
      onOpenChange(false);
      toast({ title: `Issued ${n} ${item.uom} to ${to.split(" ·")[0]}`, body: `${r.id} posted to the ledger from ${item.warehouse}.`, tone: "ok" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ArrowUpFromLine}
      title={`Issue ${item.name.split(" ·")[0]}`}
      description={`${item.id} · ${item.warehouse}, bin ${item.bin}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Post issue
          </Button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="inv-issue-avail">
          <StockMeter item={item} />
        </div>
        <div className="grid inv-issue-grid">
          <Field label="Quantity" required htmlFor="issue-qty" error={qtyError} hint={`${free} ${item.uom} free · ${item.reserved} reserved${item.quarantined ? ` · ${item.quarantined} on QC hold` : ""}`}>
            <Input
              id="issue-qty"
              type="number"
              inputMode="numeric"
              min={1}
              autoFocus
              value={qty}
              invalid={!!qtyError}
              suffix={item.uom}
              onChange={(e) => {
                setQty(e.target.value);
                m.reset();
              }}
            />
          </Field>
          <Field label="Issue to" required htmlFor="issue-to">
            <Select id="issue-to" label="Issue to" value={to} onChange={(v) => { setTo(v); m.reset(); }} options={DESTINATIONS} />
          </Field>
        </div>
        {m.error && (
          <Callout tone="risk" title="Stock wasn't issued">
            {m.error}
          </Callout>
        )}
        {item.serialized && !m.error && <p className="inv-footnote">Serial-tracked item: the store keeper scans serials at the counter; the ledger records them against this issue.</p>}
      </form>
    </Dialog>
  );
}
