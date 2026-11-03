import { Activity, ArrowLeft, ArrowRight, Boxes, Download, FilePen, FileText, FolderX, LayoutDashboard, ReceiptIndianRupee } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date, inr, relativeDay } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Project, PurchaseRequest } from "../../api/types";
import { FLAGSHIP_THREAD, HealthDots, RecordThread, type ThreadNode } from "../../app/patterns";
import { href, setTab } from "../../app/router";
import { Button, ButtonLink, Callout, Card, CardHeader, EmptyState, LoadingRows, PageHeader, Person, Stat, Status, Tabs, downloadCsv, useToast } from "../../ds/components";
import { ChangeRequestDialog } from "./ChangeRequestDialog";
import { MaterialsTab } from "./MaterialsTab";
import { OverviewTab } from "./OverviewTab";
import { ActivityTab, BillingTab, DocumentsTab } from "./RecordTabs";
import { attention, margin, milestoneVariance, nextMilestone } from "./util";

export function ProjectDetail({ id, tab }: { id: string; tab: string }) {
  const project = useQuery(() => api.project(id), [id]);
  const salesOrders = useQuery(api.salesOrders);
  const prs = useQuery(api.purchaseRequests);
  const pos = useQuery(api.purchaseOrders);
  const boms = useQuery(api.boms);
  const [crOpen, setCrOpen] = useState(false);
  const toast = useToast();

  if (project.loading) {
    return (
      <div className="stack" aria-busy="true">
        <div className="prj-skeleton-head" />
        <LoadingRows rows={2} columns={6} />
        <LoadingRows rows={5} columns={4} />
      </div>
    );
  }

  if (!project.data) {
    return (
      <Card>
        <EmptyState
          icon={FolderX}
          title={`There is no project ${id}`}
          action={
            <ButtonLink to={href.module("projects")} icon={ArrowLeft} size="sm">
              Back to all projects
            </ButtonLink>
          }
        >
          The id may be mistyped, or the project belongs to a workspace you can't see. Project ids look like PRJ-0264.
        </EmptyState>
      </Card>
    );
  }

  const p = project.data;
  const mine = (prs.data ?? []).filter((r) => r.projectId === p.id);
  const pendingPr = mine.find((r) => r.status === "Awaiting approval");
  const a = attention(p);
  const m = margin(p);
  const next = nextMilestone(p);
  const done = p.milestones.filter((x) => x.status === "Done").length;
  const nextBillable = p.milestones.find((x) => x.status !== "Done" && x.billable);
  const bom = (boms.data ?? []).find((b) => b.id === p.bom || b.projectId === p.id);

  const thread = buildThread(p, {
    so: salesOrders.data?.find((s) => s.id === p.salesOrder),
    prs: mine,
    pos: (pos.data ?? []).filter((o) => o.projectId === p.id),
    bomLabel: bom ? `Rev ${bom.revision} ${bom.status.toLowerCase()} · ${bom.lines.length} lines` : undefined,
    bomStatus: bom?.status,
  });

  const exportCsv = () => {
    downloadCsv(
      `${p.id}-summary.csv`,
      ["Section", "Reference", "Description", "Date", "Status", "Value (INR)"],
      [
        ["Project", p.id, `${p.name} · ${p.customer} · ${p.site}`, p.due, p.status, p.contractValue],
        ...p.milestones.map((x) => ["Milestone", x.id, `${x.name}${x.gate ? ` (${x.gate})` : ""}`, x.done ?? x.due, x.status, x.billable ?? 0]),
        ["Budget", "Contract value", "Agreed with customer", "", "", p.contractValue],
        ["Budget", "Budget", "Approved cost budget", "", "", p.budget],
        ["Budget", "Committed", "Approved POs and requisitions", "", "", p.committed],
        ["Budget", "Incurred", "Receipts, approved timesheets and claims", "", "", p.incurred],
        ["Budget", "Billed", "Posted billing advice", "", "", p.billed],
        ...p.risks.map((r) => ["Risk", r.id, `${r.title} — ${r.mitigation}`, "", r.impact, ""]),
      ],
    );
    toast({ title: `${p.id} exported`, body: `${p.id}-summary.csv · milestones, budget and risks` });
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Projects", to: href.module("projects") }, { label: p.id }]}
        id={p.id}
        title={p.name}
        description={`${p.customer} · ${p.site}`}
        meta={
          <>
            <Status>{p.status}</Status>
            <HealthDots health={p.health} />
            <Person name={p.manager} size="xs" detail="Project manager" />
            <span>{p.vertical}</span>
            <span className="t-num">
              {date(p.start, true)} → {date(p.due)} · {relativeDay(p.due).toLowerCase()}
            </span>
          </>
        }
        actions={
          <>
            <Button icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="primary" icon={FilePen} onClick={() => setCrOpen(true)} disabled={p.status === "Closed"}>
              Raise change request
            </Button>
          </>
        }
      />

      {a && (
        <Callout
          tone={p.status === "On hold" ? "warn" : "risk"}
          title={a.title}
          action={
            pendingPr ? (
              <ButtonLink to={href.record(pendingPr.id)} size="sm" iconRight={ArrowRight}>
                Open {pendingPr.id}
              </ButtonLink>
            ) : undefined
          }
        >
          {a.body} {a.mitigation && <>Plan: {a.mitigation}</>}
          {pendingPr && (
            <>
              {" "}
              {pendingPr.id} ({inr(pendingPr.value)}) is waiting for approval.
            </>
          )}
        </Callout>
      )}

      <div className="stat-strip">
        <Stat label="Progress" value={`${p.progress}%`} foot={`${done} of ${p.milestones.length} milestones done`} />
        <Stat
          label="Next milestone"
          value={<span className="prj-stat-text">{next ? (next.gate ?? next.name) : "All done"}</span>}
          tone={next && milestoneVariance(next).tone === "risk" ? "risk" : undefined}
          foot={next ? `${date(next.due, true)} · ${next.status} · ${milestoneVariance(next).text.toLowerCase()}` : "Ready for closure"}
        />
        <Stat label="Estimated margin" value={`${m.pct.toFixed(1)}%`} tone={m.pct < 10 ? "warn" : undefined} foot={`${inr(m.value)} on ${inr(p.contractValue)} contract`} />
        <Stat
          label="Billed"
          value={inr(p.billed)}
          foot={nextBillable ? `${Math.round((p.billed / p.contractValue) * 100)}% · next ${inr(nextBillable.billable!)} at ${nextBillable.gate ?? nextBillable.name}` : `${Math.round((p.billed / p.contractValue) * 100)}% of contract`}
        />
      </div>

      <Card>
        <CardHeader
          title="Linked records"
          description={p.id === "PRJ-0264" ? "Customer order to installed asset and this morning's service ticket. Each card opens its record." : "Every record this project created or depends on. Each card opens its record."}
        />
        {thread.length > 1 ? (
          <RecordThread nodes={thread} />
        ) : (
          <p className="prj-thread-empty">
            No order, BOM or purchase is linked yet. {p.vertical === "CSV / Manufacturing IT" ? "Validation engagements are often booked against a framework agreement rather than a single sales order." : "Links appear as soon as the sales order or first requisition references this project."}
          </p>
        )}
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview", icon: LayoutDashboard },
          { value: "materials", label: "Materials", icon: Boxes, count: bom ? bom.lines.length : undefined },
          { value: "documents", label: "Documents", icon: FileText, count: p.documents.length },
          { value: "billing", label: "Billing", icon: ReceiptIndianRupee, count: p.milestones.filter((x) => x.billable).length },
          { value: "activity", label: "Activity", icon: Activity },
        ]}
      />

      {tab === "materials" ? (
        <MaterialsTab p={p} />
      ) : tab === "documents" ? (
        <DocumentsTab p={p} />
      ) : tab === "billing" ? (
        <BillingTab p={p} />
      ) : tab === "activity" ? (
        <ActivityTab p={p} />
      ) : (
        <OverviewTab p={p} onRaiseChange={() => setCrOpen(true)} />
      )}

      <ChangeRequestDialog project={p} open={crOpen} onOpenChange={setCrOpen} />
    </>
  );
}

function buildThread(
  p: Project,
  d: { so?: { id: string; customer: string; value: number; status: string }; prs: PurchaseRequest[]; pos: { id: string; title: string; status: string; value: number }[]; bomLabel?: string; bomStatus?: string },
): ThreadNode[] {
  if (p.id === "PRJ-0264") {
    return FLAGSHIP_THREAD.map((n) => {
      if (n.id === p.id) return { ...n, status: p.status };
      const pr = d.prs.find((x) => x.id === n.id);
      return pr ? { ...n, status: pr.status } : n;
    });
  }
  const nodes: ThreadNode[] = [];
  if (p.salesOrder) nodes.push({ id: p.salesOrder, kind: "Sales order", label: d.so ? `${d.so.customer} · ${inr(d.so.value)}` : p.customer, status: d.so?.status ?? "Confirmed" });
  nodes.push({ id: p.id, kind: "Project", label: p.name, status: p.status });
  if (p.bom) nodes.push({ id: p.bom, kind: "Engineering BOM", label: d.bomLabel ?? "Engineering BOM", status: d.bomStatus ?? "Released" });
  d.prs.forEach((r) => nodes.push({ id: r.id, kind: "Requisition", label: `${r.title} · ${inr(r.value)}`, status: r.status }));
  d.pos.forEach((o) => nodes.push({ id: o.id, kind: "Purchase order", label: `${o.title} · ${inr(o.value)}`, status: o.status }));
  if (p.workOrder) nodes.push({ id: p.workOrder, kind: "Work order", label: "Panel assembly", status: "In progress" });
  if (p.installedAsset) nodes.push({ id: p.installedAsset, kind: "Installed asset", label: "Customer-owned", status: "In service" });
  return nodes;
}
