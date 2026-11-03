import { Download, FileClock, Lock } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import type { ReportDef } from "../../api/types";
import { moduleDef } from "../../app/modules";
import { Button, Callout, DataTable, Drawer, EmptyState, ComingSoon, KeyValues, LoadingRows, Tag, downloadCsv, useToast, type Column } from "../../ds/components";
import { logReportExport } from "./commands";
import { PREVIEWS, PROPOSED, type PreviewRow } from "./previews";

const SOURCE: Record<string, string> = {
  projects: "Projects, milestones and cost postings",
  inventory: "Stock ledger, BOMs and reservations",
  purchase: "Purchase orders and goods receipts",
  sales: "Sales orders and billing advice",
  crm: "Opportunities and stage history",
  assets: "Service tickets and contract SLAs",
  hr: "Deployments and leave",
  payroll: "Locked pay runs",
  users: "Audit events",
};

export function ReportDrawer({ report, loading, onClose, id }: { id?: string; report?: ReportDef; loading: boolean; onClose: () => void }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const projects = useQuery(api.projects);
  const boms = useQuery(api.boms);
  const purchaseOrders = useQuery(api.purchaseOrders);
  const tickets = useQuery(api.tickets);
  const contracts = useQuery(api.contracts);
  const people = useQuery(api.people);
  const opportunities = useQuery(api.opportunities);
  const dataLoading = [projects, boms, purchaseOrders, tickets, contracts, people, opportunities].some((q) => q.loading);

  const build = report && !report.restricted ? PREVIEWS[report.id] : undefined;
  const preview =
    build && !dataLoading
      ? build({ projects: projects.data!, boms: boms.data!, purchaseOrders: purchaseOrders.data!, tickets: tickets.data!, contracts: contracts.data!, people: people.data!, opportunities: opportunities.data! })
      : undefined;

  const columns: Column<PreviewRow>[] = (preview?.cols ?? []).map((c, i) => ({
    key: String(i),
    header: c.header,
    align: c.align,
    cell: (r) => <span className={c.align ? "cell-num rpt-nowrap" : i === 0 ? "" : "rpt-cell"}>{r.cells[i]}</span>,
  }));

  const exportCsv = async () => {
    if (!report || !preview) return;
    setExporting(true);
    try {
      await logReportExport(report.id, preview.rows.length);
      downloadCsv(`${report.id.toLowerCase()}.csv`, preview.csvHeaders, preview.rows.map((r) => r.csv));
      toast({ title: `${report.name} exported`, body: `${report.id.toLowerCase()}.csv · ${preview.rows.length} rows. The export is recorded in the audit log.` });
    } catch (e) {
      toast({ title: "Export refused", body: e instanceof Error ? e.message : String(e), tone: "risk" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      width={820}
      id={id}
      status={report ? report.restricted ? <Tag tone="violet" icon={Lock}>Restricted</Tag> : <Tag>{moduleDef(report.module).label}</Tag> : undefined}
      title={report?.name ?? (loading ? "Loading report…" : "Report not found")}
      subtitle={report?.description}
      footer={
        report && preview ? (
          <Button variant="primary" icon={Download} loading={exporting} onClick={exportCsv}>
            Export CSV
          </Button>
        ) : undefined
      }
    >
      {!report ? (
        loading ? <LoadingRows rows={5} columns={3} /> : <EmptyState title={`${id} isn't in the catalogue`}>It may have been retired. Search the catalogue by name.</EmptyState>
      ) : (
        <>
          <KeyValues
            columns={3}
            items={[
              { label: "Business owner", value: report.owner },
              { label: "Source", value: SOURCE[report.module] ?? "Operational records" },
              { label: "Refresh", value: report.refresh },
              { label: "Access", value: report.restricted ? `${report.owner} only` : "Roles with View on the module" },
              { label: "Period cut-off", value: "Calendar month · IST (UTC+05:30)" },
              { label: "Export", value: report.restricted ? "Blocked for your role" : "CSV · logged" },
            ]}
          />

          {report.restricted ? (
            <Callout tone="violet" icon={Lock} title="You don't have access to this report's data">
              {report.name} is restricted to {report.owner} because it contains {report.module === "payroll" ? "salary and bank details" : report.module === "users" ? "permission changes and personal activity" : "stock valuation"}. Ask the System administrator for access.
            </Callout>
          ) : preview ? (
            <section className="stack-sm stack">
              <div className="row row-between">
                <h3 className="rpt-h">Live preview</h3>
                <span className="rpt-small t-muted">{preview.rows.length} rows · from demo records · 03 Nov 2026 09:40 IST</span>
              </div>
              <DataTable rows={preview.rows} columns={columns} dense caption={report.name} />
              {preview.total && (
                <div className="rpt-total">
                  {preview.total.map((t, i) => (t !== "" ? <span key={i} className={i === 0 ? "rpt-total-label" : "t-num"}>{i > 0 && <span className="t-muted">{preview.cols[i].header} </span>}{t}</span> : null))}
                </div>
              )}
              <p className="rpt-small t-muted">{preview.note}</p>
            </section>
          ) : build ? (
            <LoadingRows rows={5} columns={5} />
          ) : (
            <div className="stack-sm stack">
              <ComingSoon icon={FileClock} title="Report layout">Shows figures once {report.owner} accepts a sample layout.</ComingSoon>
              {PROPOSED[report.id] && (
                <div className="rpt-proposed" aria-label="Proposed columns">
                  {PROPOSED[report.id].map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
