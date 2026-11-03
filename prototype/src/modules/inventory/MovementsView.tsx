import { Download, Truck } from "lucide-react";
import { useState } from "react";
import { date, num, time } from "../../api/format";
import { useMutation } from "../../api/hooks";
import type { Item, StockMovement } from "../../api/types";
import { Button, Callout, DataTable, EmptyState, FilterChips, Person, RecordLink, SearchField, Status, Toolbar, downloadCsv, useToast, type Column } from "../../ds/components";
import { acknowledgeTransfer } from "./commands";
import { MOVEMENT_ICON, RefText, signedQty } from "./shared";

type TypeFilter = "all" | StockMovement["type"];

export function MovementsView({ movements, items, loading, highlight }: { movements: StockMovement[]; items: Item[]; loading: boolean; highlight?: string }) {
  const toast = useToast();
  const [type, setType] = useState<TypeFilter>("all");
  const [q, setQ] = useState("");
  const ack = useMutation(acknowledgeTransfer);

  const uom = (id: string) => items.find((i) => i.id === id)?.uom ?? "";
  const inTransit = movements.filter((m) => m.status === "In transit");
  const activeId = highlight?.startsWith("MOV-") ? highlight : highlight ? movements.find((m) => m.reference.includes(highlight))?.id : undefined;

  const rows = movements.filter((m) => {
    if (type !== "all" && m.type !== type) return false;
    const t = q.trim().toLowerCase();
    return !t || `${m.id} ${m.item} ${m.itemId} ${m.reference} ${m.from} ${m.to} ${m.by}`.toLowerCase().includes(t);
  });
  const types = (Object.keys(MOVEMENT_ICON) as StockMovement["type"][]).filter((t) => movements.some((m) => m.type === t));

  const columns: Column<StockMovement>[] = [
    {
      key: "type",
      header: "Movement",
      sort: (m) => m.type,
      cell: (m) => {
        const Icon = MOVEMENT_ICON[m.type];
        return (
          <div className="inv-mv-type">
            <span className={`inv-mv-icon inv-mv-${m.type.replace(" ", "-").toLowerCase()}`}>
              <Icon size={15} aria-hidden />
            </span>
            <div className="cell-primary">
              <span className="cell-title">{m.type}</span>
              <span className="cell-sub mono">{m.id}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "item",
      header: "Item",
      sort: (m) => m.item,
      cell: (m) => (
        <div className="cell-primary">
          <span className="cell-title inv-clip">{m.item}</span>
          <span className="cell-sub">
            <RecordLink id={m.itemId} quiet />
          </span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      sort: (m) => signedQty(m),
      cell: (m) => {
        const v = signedQty(m);
        return (
          <span className={`cell-num inv-qty-signed ${m.type === "Transfer" ? "" : v < 0 ? "is-out" : "is-in"}`}>
            {m.type === "Transfer" ? "" : v > 0 ? "+" : ""}
            {num(v)} <span className="t-muted">{uom(m.itemId)}</span>
          </span>
        );
      },
    },
    {
      key: "route",
      header: "From → to",
      priority: 2,
      cell: (m) => (
        <div className="cell-primary inv-route">
          <span className="cell-sub">{m.from}</span>
          <span className="inv-route-to">→ {m.to}</span>
        </div>
      ),
    },
    { key: "ref", header: "Reference", cell: (m) => <RefText text={m.reference} /> },
    { key: "by", header: "By", sort: (m) => m.by, priority: 3, cell: (m) => <Person name={m.by} size="xs" /> },
    {
      key: "at",
      header: "When",
      sort: (m) => m.at,
      priority: 2,
      cell: (m) => (
        <div className="cell-primary">
          <span className="cell-num">{date(m.at, true)}</span>
          <span className="cell-sub t-num">{time(m.at)}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", sort: (m) => m.status, cell: (m) => <Status>{m.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {inTransit.map((m) => (
        <Callout
          key={m.id}
          tone="info"
          icon={Truck}
          title={`${m.qty} ${uom(m.itemId)} ${m.item.split(" ·")[0].toLowerCase()} in transit to ${m.to}`}
          action={
            <Button
              size="sm"
              loading={ack.pending}
              onClick={async () => {
                const r = await ack.run(m.id);
                if (r) toast({ title: `${m.id} acknowledged at site`, body: `${m.qty} ${uom(m.itemId)} now count as stock at ${m.to}.`, tone: "ok" });
              }}
            >
              Acknowledge receipt
            </Button>
          }
        >
          Dispatched {date(m.at, true)} on <RefText text={m.reference} />. It counts as stock at site once acknowledged.
          {ack.error && <span className="inv-inline-error"> {ack.error}</span>}
        </Callout>
      ))}

      <Toolbar
        end={
          <Button
            icon={Download}
            size="sm"
            onClick={() => {
              downloadCsv(
                "threadline-stock-ledger.csv",
                ["Movement", "Type", "Item", "Qty", "From", "To", "Reference", "By", "At", "Status"],
                rows.map((m) => [m.id, m.type, `${m.itemId} ${m.item}`, signedQty(m), m.from, m.to, m.reference, m.by, m.at, m.status]),
              );
              toast({ title: "Ledger exported", body: `${rows.length} movements · threadline-stock-ledger.csv` });
            }}
          >
            Export ledger
          </Button>
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Search item, reference, person" label="Search movements" />
        <FilterChips
          label="Movement type"
          value={type}
          onChange={setType}
          options={[{ value: "all", label: "All", count: movements.length }, ...types.map((t) => ({ value: t, label: t, count: movements.filter((m) => m.type === t).length }))]}
        />
      </Toolbar>

      <DataTable
        caption="Stock ledger"
        loading={loading}
        rows={rows}
        columns={columns}
        activeId={activeId}
        empty={
          <EmptyState title="No movements match" action={<Button size="sm" onClick={() => { setType("all"); setQ(""); }}>Clear filters</Button>}>
            Try another type or search term.
          </EmptyState>
        }
      />
    </div>
  );
}
