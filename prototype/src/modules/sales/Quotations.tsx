import { AlarmClock, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { date, inr } from "../../api/format";
import type { Quotation } from "../../api/types";
import { DataTable, FilterChips, Person, RecordLink, SearchField, Status, Tag, Tooltip, Toolbar, type Column } from "../../ds/components";
import { QUOTE_DETAIL, validity } from "./shared";

type Filter = "live" | "expiring" | "all";

export function QuotationsView({ rows, loading, onOpen, activeId }: { rows: Quotation[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("live");
  const live = (x: Quotation) => x.status !== "Accepted" && x.status !== "Expired";
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((x) => (filter === "all" ? true : filter === "live" ? live(x) : validity(x).tone === "warn") && (!t || `${x.id} ${x.title} ${x.customer}`.toLowerCase().includes(t)));
  }, [rows, q, filter]);

  const columns: Column<Quotation>[] = [
    {
      key: "title",
      header: "Quotation",
      sort: (x) => x.title,
      cell: (x) => (
        <div className="cell-primary">
          <span className="cell-title">{x.title}</span>
          <span className="cell-sub">
            <span className="mono">{x.id}</span> · {x.customer}
          </span>
        </div>
      ),
    },
    {
      key: "rev",
      header: "Revision",
      sort: (x) => x.revision,
      cell: (x) => (
        <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
          <Tag>Rev {x.revision}</Tag>
          {x.revision > "A" && <span className="sal-small t-muted sal-nowrap">{x.revision.charCodeAt(0) - 65} superseded</span>}
        </span>
      ),
    },
    { key: "value", header: "Value", align: "right", sort: (x) => x.value, cell: (x) => <span className="cell-num sal-nowrap">{inr(x.value)}</span> },
    {
      key: "valid",
      header: "Valid until",
      sort: (x) => x.validUntil,
      cell: (x) => {
        const v = validity(x);
        return (
          <div className="cell-primary">
            <span className="cell-num sal-nowrap">{date(x.validUntil, true)}</span>
            {v.tone !== "neutral" && (
              <span className={`sal-valid tone-${v.tone}`}>
                <AlarmClock size={12} aria-hidden /> {v.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "gate",
      header: "Discount",
      priority: 2,
      cell: (x) => {
        const d = QUOTE_DETAIL[x.id];
        if (!d) return <span className="t-muted">—</span>;
        const over = d.discount > d.authority;
        return over && live(x) ? (
          <Tooltip content={`${d.discount}% discount is above the owner's ${d.authority}% authority — Operations head must approve before it is sent.`}>
            <span tabIndex={0} className="sal-gate">
              <Tag tone="warn" icon={ShieldAlert}>
                {d.discount}% · needs approval
              </Tag>
            </span>
          </Tooltip>
        ) : (
          <span className="cell-num t-muted">{d.discount}%</span>
        );
      },
    },
    { key: "opp", header: "Opportunity", cell: (x) => (x.opportunityId ? <RecordLink id={x.opportunityId} /> : "—"), priority: 3 },
    { key: "owner", header: "Owner", sort: (x) => x.owner, cell: (x) => <Person name={x.owner} size="xs" />, priority: 3 },
    { key: "status", header: "Status", sort: (x) => x.status, cell: (x) => <Status>{x.status}</Status> },
  ];

  return (
    <div className="stack">
      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search quotation or customer" width={260} />}>
        <FilterChips
          label="Quotations"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "live", label: "Live", count: rows.filter(live).length },
            { value: "expiring", label: "Expiring ≤ 21 days", count: rows.filter((x) => validity(x).tone === "warn").length },
            { value: "all", label: "All", count: rows.length },
          ]}
        />
      </Toolbar>
      <DataTable rows={visible} columns={columns} loading={loading} onRowClick={(x) => onOpen(x.id)} activeId={activeId} caption="Quotations" />
    </div>
  );
}
