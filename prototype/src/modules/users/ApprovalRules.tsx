import { ArrowRightLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { ago, date } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Card, CardHeader, DataTable, Person, RecordLink, Status, Tag, type Column } from "../../ds/components";
import { DELEGATIONS, RULES, type ApprovalRule } from "./data";

export function ApprovalRules() {
  const approvals = useQuery(api.approvals);
  const [open, setOpen] = useState<Approval | null>(null);
  const pending = (approvals.data ?? []).filter((a) => a.status === "Pending");

  const columns: Column<ApprovalRule>[] = [
    {
      key: "doc",
      header: "Document",
      sort: (r) => r.document,
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-title">{r.document}</span>
          <span className="cell-sub">{r.when}</span>
        </div>
      ),
    },
    { key: "approver", header: "Approver", sort: (r) => r.approver, cell: (r) => <span className="t-strong usr-small">{r.approver}</span> },
    { key: "levels", header: "Levels", priority: 3, cell: (r) => <span className="usr-small">{r.levels}</span> },
    { key: "sod", header: "Maker ≠ checker", cell: (r) => <Tag tone="ok" icon={ShieldCheck}>{r.sod}</Tag> },
    { key: "esc", header: "Escalates", priority: 2, cell: (r) => <span className="usr-small t-muted">{r.escalation}</span> },
    {
      key: "live",
      header: "Waiting now",
      align: "right",
      cell: (r) => {
        const n = r.approvalType ? pending.filter((a) => a.type === r.approvalType && (r.id !== "R-01" || !a.level.includes("Operations head"))).length : 0;
        const n2 = r.id === "R-02" ? pending.filter((a) => a.type === "Purchase requisition" && a.level.includes("Operations head")).length : n;
        return n2 ? <span className="usr-count t-num">{n2}</span> : <span className="t-muted">—</span>;
      },
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <DataTable rows={RULES} columns={columns} loading={approvals.loading} caption="Approval rules" />
      <p className="usr-small t-muted">Thresholds are illustrative until confirmed.</p>

      <div className="grid grid-2">
        <Card>
          <CardHeader title="Waiting for a decision" description="Routed by the rules above" icon={ShieldCheck} />
          <ul className="divider-list">
            {pending.length === 0 && <li className="list-row t-muted usr-small">Nothing pending.</li>}
            {pending.map((a) => (
              <li key={a.id} className="list-row">
                <div className="list-row-main">
                  <div className="list-row-title">{a.title}</div>
                  <div className="list-row-sub">
                    <RecordLink id={a.reference} quiet /> · {a.level} · {ago(a.submitted)}
                  </div>
                </div>
                <Button size="sm" onClick={() => setOpen(a)}>
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Delegations" description="Approvals never sit in an absent person's inbox" icon={ArrowRightLeft} />
          <ul className="divider-list">
            {DELEGATIONS.map((d) => (
              <li key={d.from + d.scope} className="list-row usr-deleg">
                <Person name={d.from} detail={d.reason} size="xs" />
                <ArrowRightLeft size={14} aria-hidden className="t-muted" />
                <div className="list-row-main">
                  <div className="list-row-title">{d.to}</div>
                  <div className="list-row-sub">
                    {d.scope} · from {date(d.fromDate, true)} {d.toDate.startsWith("2026") ? `to ${date(d.toDate, true)}` : `· ${d.toDate.toLowerCase()}`}
                  </div>
                </div>
                <Status tone={d.fromDate <= "2026-11-03" ? "accent" : "neutral"}>{d.fromDate <= "2026-11-03" ? "Active" : "Scheduled"}</Status>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <ApprovalDialog approval={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
