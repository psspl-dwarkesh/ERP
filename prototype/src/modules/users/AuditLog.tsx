import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { date, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { ActivityEvent, ModuleKey } from "../../api/types";
import { moduleDef } from "../../app/modules";
import { Button, DataTable, Person, RecordLink, SearchField, Select, Tag, Toolbar, downloadCsv, useToast, type Column } from "../../ds/components";
import { logExport } from "./commands";

export function AuditLog() {
  const toast = useToast();
  const activity = useQuery(api.activity);
  const [mod, setMod] = useState<ModuleKey | "all">("all");
  const [q, setQ] = useState("");
  const [exporting, setExporting] = useState(false);
  const rows = activity.data ?? [];
  const modules = [...new Set(rows.map((e) => e.module))];

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((e) => (mod === "all" || e.module === mod) && (!t || `${e.actor} ${e.action} ${e.reference}`.toLowerCase().includes(t)));
  }, [rows, mod, q]);

  const columns: Column<ActivityEvent>[] = [
    {
      key: "at",
      header: "Time (IST)",
      sort: (e) => e.at,
      width: 140,
      cell: (e) => (
        <div className="cell-primary">
          <span className="cell-num">{time(e.at)}</span>
          <span className="cell-sub">{date(e.at, true)}</span>
        </div>
      ),
    },
    { key: "actor", header: "Actor", sort: (e) => e.actor, cell: (e) => (e.actor === "Customer portal" ? <Tag>System · portal</Tag> : <Person name={e.actor} size="xs" />) },
    { key: "action", header: "Action", cell: (e) => <span className="usr-small">{e.action.replace(/[:—]\s*$/, "")}</span> },
    { key: "ref", header: "Reference", sort: (e) => e.reference, cell: (e) => <RecordLink id={e.reference} /> },
    { key: "module", header: "Module", sort: (e) => e.module, priority: 2, cell: (e) => <Tag>{moduleDef(e.module).label}</Tag> },
  ];

  const exportCsv = async () => {
    setExporting(true);
    downloadCsv(
      "threadline-audit-log.csv",
      ["Time", "Actor", "Action", "Reference", "Module"],
      visible.map((e) => [e.at, e.actor, e.action, e.reference, e.module]),
    );
    await logExport(`audit log (${visible.length} events)`, "RPT-USR-01");
    setExporting(false);
    toast({ title: "Audit log exported", body: `threadline-audit-log.csv · ${visible.length} events. The export itself is now in the log.` });
  };

  return (
    <div className="stack">
      <Toolbar
        end={
          <>
            <SearchField value={q} onChange={setQ} placeholder="Search actor, action, record" width={260} />
            <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!visible.length}>
              Export
            </Button>
          </>
        }
      >
        <Select<ModuleKey | "all">
          label="Module"
          value={mod}
          onChange={setMod}
          options={[{ value: "all", label: "All modules" }, ...modules.map((m) => ({ value: m, label: moduleDef(m).label }))]}
        />
        <span className="usr-small t-muted">{visible.length} events · newest first</span>
      </Toolbar>
      <DataTable rows={visible} columns={columns} loading={activity.loading} dense caption="Audit log" />
      <p className="usr-small t-muted">Field-level before/after values and session events are captured by the backend (USR-010); the demo shows the action trail only.</p>
    </div>
  );
}
