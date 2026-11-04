import { ArrowUpRight, Lock, RefreshCw, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import type { ModuleKey, ReportDef } from "../../api/types";
import { moduleDef } from "../../app/modules";
import { ModuleFrame } from "../../app/Shell";
import { navigate, useRoute } from "../../app/router";
import { Button, EmptyState, FilterChips, LoadingRows, PageHeader, SearchField, SoonTag, Tag, Toolbar, cx } from "../../ds/components";
import { PREVIEWS } from "./previews";
import { ReportDrawer } from "./ReportDrawer";
import "./reports.css";

const ORDER: ModuleKey[] = ["projects", "inventory", "purchase", "sales", "crm", "assets", "hr", "payroll", "users"];

export default function ReportsPage() {
  const route = useRoute();
  const reports = useQuery(api.reports);
  const [mod, setMod] = useState<ModuleKey | "all">("all");
  const [q, setQ] = useState("");
  const list = reports.data ?? [];

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((r) => (mod === "all" || r.module === mod) && (!t || `${r.id} ${r.name} ${r.description} ${r.owner}`.toLowerCase().includes(t)));
  }, [list, mod, q]);
  const groups = ORDER.map((m) => ({ m, items: visible.filter((r) => r.module === m) })).filter((g) => g.items.length);

  const open = (id: string) => navigate(`/app/reports/${id}`);
  const ready = list.filter((r) => PREVIEWS[r.id] && !r.restricted).length;
  const report = list.find((r) => r.id === route.recordId);

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Administration" }, { label: "Reports" }]}
        title="Reports"
        description={reports.loading ? "Loading the catalogue…" : `${ready} of ${list.length} reports ready to view and export. The rest are planned — each card says what it will show · times in IST`}
      />

      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search reports" width={260} />}>
        <FilterChips<ModuleKey | "all">
          label="Module"
          value={mod}
          onChange={setMod}
          options={[{ value: "all", label: "All", count: list.length }, ...ORDER.filter((m) => list.some((r) => r.module === m)).map((m) => ({ value: m, label: moduleDef(m).label.split(" ")[0], count: list.filter((r) => r.module === m).length }))]}
        />
      </Toolbar>

      {reports.loading ? (
        <LoadingRows rows={6} columns={3} />
      ) : groups.length === 0 ? (
        <EmptyState title="No reports match" action={<Button variant="secondary" size="sm" onClick={() => { setQ(""); setMod("all"); }}>Clear filters</Button>}>
          Try another word, or ask the report owner to add it to the catalogue.
        </EmptyState>
      ) : (
        <div className="rpt-grid">
          {groups.flatMap((g) => g.items).map((r) => (
            <ReportCard key={r.id} r={r} active={r.id === route.recordId} onOpen={() => open(r.id)} />
          ))}
        </div>
      )}

      <ReportDrawer id={route.recordId} report={report} loading={reports.loading} onClose={() => navigate("/app/reports")} />
    </ModuleFrame>
  );
}

function ReportCard({ r, active, onOpen }: { r: ReportDef; active: boolean; onOpen: () => void }) {
  const live = !!PREVIEWS[r.id] && !r.restricted;
  return (
    <button className={cx("rpt-card", active && "is-active")} onClick={onOpen}>
      <span className="rpt-card-top">
        <span className="rpt-card-mod">
          {moduleDef(r.module).label} · <span className="mono">{r.id}</span>
        </span>
        {r.restricted ? (
          <Tag tone="violet" icon={Lock}>Restricted</Tag>
        ) : live ? (
          <Tag tone="accent" icon={Table2}>Live preview</Tag>
        ) : (
          <SoonTag />
        )}
        <ArrowUpRight size={16} aria-hidden className="rpt-card-go" />
      </span>
      <span className="rpt-card-name">{r.name}</span>
      <span className="rpt-card-desc">{r.description}</span>
      <span className="rpt-card-foot">
        <span>{r.owner}</span>
        <span className="rpt-card-refresh">
          <RefreshCw size={12} aria-hidden /> {r.refresh}
        </span>
      </span>
    </button>
  );
}
