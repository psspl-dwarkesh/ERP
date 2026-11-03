import { AlertTriangle, ArrowRight, Boxes, CalendarDays, ClipboardCheck, Download, PackageX, Siren, Wrench } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import { deliveryTrend } from "../../api/fixtures";
import { ago, date, inr, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval } from "../../api/types";
import { ModuleFrame } from "../../app/Shell";
import { canAccess, useSession } from "../../api/session";
import type { ModuleKey } from "../../api/types";
import { ApprovalDialog, FLAGSHIP_THREAD, HealthDots, RecordThread, SlaClock } from "../../app/patterns";
import { href, navigate } from "../../app/router";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  DataTable,
  PageHeader,
  Progress,
  RecordLink,
  Segmented,
  Select,
  Stat,
  Status,
  Timeline,
  downloadCsv,
  toneFor,
  useToast,
} from "../../ds/components";
import "./dashboard.css";

const none = async () => [] as never[];

export default function DashboardPage() {
  const toast = useToast();
  const me = api.currentUser();
  // Only ask for what this role may see; everything else shows as outside the role, not as an error.
  const user = useSession().user;
  const can = (m: ModuleKey) => canAccess(user, m);
  const projects = useQuery(can("projects") ? api.projects : none);
  const approvals = useQuery(api.approvals);
  const tickets = useQuery(can("assets") ? api.tickets : none);
  const items = useQuery(api.items);
  const orders = useQuery(can("sales") ? api.salesOrders : none);
  const activity = useQuery(api.activity);
  const [period, setPeriod] = useState("2026-11");
  const [chartView, setChartView] = useState<"milestones" | "billing">("milestones");
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);

  const pending = approvals.data?.filter((a) => a.status === "Pending") ?? [];
  const openTickets = tickets.data?.filter((t) => t.status !== "Resolved" && t.status !== "Closed") ?? [];
  const p1 = openTickets.find((t) => t.priority === "P1");
  const qcHold = items.data?.filter((i) => i.quarantined > 0) ?? [];
  const short = items.data?.filter((i) => i.status === "Out of stock" || i.status === "Low stock") ?? [];
  const orderBook = (orders.data ?? []).filter((o) => o.status !== "Closed").reduce((a, o) => a + o.value - o.billed, 0);
  const atRisk = projects.data?.filter((p) => p.status === "At risk").length ?? 0;
  const pr84 = pending.find((a) => a.reference === "PR-0084");

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Dashboard" }]}
        title={`Good morning, ${me.name.split(" ")[0]}`}
        description="Three things need a decision before the 14:00 service window. Everything else is on plan."
        meta={
          <>
            <span className="row" style={{ gap: 6 }}>
              <CalendarDays size={14} aria-hidden /> Tuesday, 03 Nov 2026 · 09:40 IST
            </span>
            <span>Operations head view</span>
          </>
        }
        actions={
          <>
            <Select
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "2026-11", label: "November 2026" },
                { value: "2026-10", label: "October 2026" },
                { value: "2026-q3", label: "Jul – Sep 2026" },
              ]}
            />
            <Button
              icon={Download}
              onClick={() => {
                downloadCsv(
                  "threadline-portfolio.csv",
                  ["Project", "Name", "Customer", "Status", "Progress", "Contract value", "Billed"],
                  (projects.data ?? []).map((p) => [p.id, p.name, p.customer, p.status, `${p.progress}%`, p.contractValue, p.billed]),
                );
                toast({ title: "Portfolio exported", body: "threadline-portfolio.csv · illustrative data" });
              }}
            >
              Export
            </Button>
          </>
        }
      />

      {/* ---- Needs you now ---- */}
      <section className="focus-grid" aria-label="Needs your decision">
        <FocusCard
          tone="risk"
          icon={Siren}
          kicker={p1 ? <SlaClock due={p1.slaDue} /> : null}
          title="P1 breakdown at Northstar Pharma"
          body="Intermittent PLC communication on Line 03. Covered by AMC-0031 — 6 h response, no charge."
          refId="SR-0148"
          action={<ButtonLink to={href.record("SR-0148")} variant="primary" size="sm" iconRight={ArrowRight}>Open ticket</ButtonLink>}
          foot={<span className="row" style={{ gap: 8 }}><Avatar name="Karan Patel" size="xs" /> Karan Patel assigned · leaving Pune office</span>}
        />
        <FocusCard
          tone="accent"
          icon={ClipboardCheck}
          kicker={<span className="focus-kicker-text">Waiting on you · {pr84 ? ago(pr84.submitted) : ""}</span>}
          title="Approve PLC I/O modules — ₹2.84 L"
          body="Shortage on BOM-042 rev C is holding WO-0187 at wiring. Best quote ships in 7 days."
          refId="PR-0084"
          action={
            pr84 ? (
              <Button variant="primary" size="sm" onClick={() => setOpenApproval(pr84)}>
                Review & decide
              </Button>
            ) : (
              <Status>Approved</Status>
            )
          }
          foot={<span className="row" style={{ gap: 8 }}><Avatar name="Ananya Rao" size="xs" /> Raised by Ananya Rao · Level 2 of 2</span>}
        />
        <FocusCard
          tone="warn"
          icon={AlertTriangle}
          kicker={<span className="focus-kicker-text">QC hold since yesterday</span>}
          title={`${qcHold.reduce((a, i) => a + i.quarantined, 0) || 6} transmitters can't be issued`}
          body="GRN-0073 from Orbit Process failed the incoming check. PRJ-0264 needs them for the loop test on 10 Nov."
          refId="ITM-0137"
          action={<ButtonLink to={href.module("inventory", "stock")} size="sm" iconRight={ArrowRight}>Inspect stock</ButtonLink>}
          foot={<span className="row" style={{ gap: 8 }}><Avatar name="Deepa Kulkarni" size="xs" /> Deepa Kulkarni re-testing today</span>}
        />
      </section>

      {/* ---- KPIs ---- */}
      <div className="stat-strip">
        {can("sales") ? <Stat label="Open order book" value={inr(orderBook)} foot={`Unbilled value across ${(orders.data ?? []).filter((o) => o.status !== "Closed").length} orders`} onClick={() => navigate("/app/sales")} /> : <Stat label="Open order book" value="—" foot="Not part of your role" />}
        <Stat label="Active projects" value={can("projects") ? projects.data?.filter((p) => p.status !== "Closed").length ?? "–" : "—"} foot={<span><b className="t-risk">{atRisk} at risk</b> · 1 on hold</span>} onClick={() => navigate("/app/projects")} />
        <Stat label="Material shortages" value={short.length} tone={short.length ? "warn" : undefined} foot="Items below free stock need" icon={PackageX} onClick={() => navigate("/app/inventory?tab=mrp")} />
        <Stat label="Open service tickets" value={can("assets") ? openTickets.length : "—"} foot={`${openTickets.filter((t) => t.priority === "P1" || t.priority === "P2").length} urgent · SLA 96% this month`} icon={Wrench} onClick={() => navigate("/app/assets?tab=tickets")} />
        <Stat label="Approvals waiting" value={pending.length} foot="Oldest raised 2 days ago" icon={ClipboardCheck} />
      </div>

      {/* ---- Flagship record chain ---- */}
      <Card>
        <CardHeader
          title="One job, every handoff"
          description="PRJ-0264 traced from customer order to the service ticket raised this morning. Each card opens its record."
          actions={<ButtonLink to={href.record("PRJ-0264")} variant="ghost" size="sm" iconRight={ArrowRight}>Open project</ButtonLink>}
        />
        {can("projects") ? <RecordThread nodes={FLAGSHIP_THREAD} /> : <p className="t-muted">Project records are outside your role.</p>}
      </Card>

      <div className="grid grid-main-aside">
        <div className="stack stack-lg" style={{ gap: "var(--space-5)" }}>
          {/* ---- Delivery chart ---- */}
          <Card>
            <CardHeader
              title="Delivery against plan"
              description={chartView === "milestones" ? "Milestones completed vs planned, by month" : "Billing triggered vs planned, ₹ lakh"}
              actions={
                <Segmented
                  size="sm"
                  label="Chart measure"
                  value={chartView}
                  onChange={setChartView}
                  options={[
                    { value: "milestones", label: "Milestones" },
                    { value: "billing", label: "Billing" },
                  ]}
                />
              }
            />
            <div className="chart-legend">
              <span><i className="lg-planned" /> Planned</span>
              <span><i className="lg-done" /> Delivered</span>
              <span className="chart-legend-note">November is month-to-date</span>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={240} minWidth={0} initialDimension={{ width: 640, height: 240 }}>
                <BarChart data={chartView === "milestones" ? deliveryTrend : deliveryTrend.map((d) => ({ month: d.month, planned: Math.round(d.planned * 2.6), delivered: Math.round(d.delivered * 2.4) }))} barGap={4} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--slate-100)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--slate-500)", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--slate-500)", fontSize: 12 }} />
                  <RTooltip cursor={{ fill: "var(--slate-50)" }} content={<ChartTip unit={chartView === "billing" ? "₹ L" : ""} />} />
                  <Bar dataKey="planned" fill="var(--slate-200)" radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={600} />
                  <Bar dataKey="delivered" fill="var(--teal-500)" radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ---- Portfolio ---- */}
          {can("projects") && (<Card padded={false}>
            <div className="card-padded" style={{ paddingBottom: 0 }}>
              <CardHeader title="Project portfolio" description="Health dots: schedule · cost · material" actions={<ButtonLink to={href.module("projects")} variant="ghost" size="sm" iconRight={ArrowRight}>All projects</ButtonLink>} />
            </div>
            <div className="flush-table">
              <DataTable
                loading={projects.loading}
                rows={projects.data ?? []}
                onRowClick={(p) => navigate(href.record(p.id).slice(1))}
                columns={[
                  { key: "name", header: "Project", sort: (p) => p.name, cell: (p) => <div className="cell-primary"><span className="cell-title">{p.name}</span><span className="cell-sub"><span className="mono">{p.id}</span> · {p.customer}</span></div> },
                  { key: "status", header: "Status", sort: (p) => p.status, cell: (p) => <Status>{p.status}</Status> },
                  { key: "health", header: "Health", cell: (p) => <HealthDots health={p.health} />, priority: 2 },
                  { key: "progress", header: "Progress", sort: (p) => p.progress, width: 150, cell: (p) => <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><Progress value={p.progress} tone={toneFor(p.status) === "risk" ? "risk" : "accent"} /><span className="cell-num" style={{ width: 34 }}>{p.progress}%</span></div> },
                  { key: "due", header: "Due", sort: (p) => p.due, cell: (p) => <span className="cell-num">{date(p.due, true)}</span>, priority: 3 },
                ]}
              />
            </div>
          </Card>)}
        </div>

        <div className="stack" style={{ gap: "var(--space-5)" }}>
          {/* ---- Approvals ---- */}
          <Card>
            <CardHeader title="Approvals" description={`${pending.length} waiting on you`} icon={ClipboardCheck} />
            <ul className="divider-list">
              {(approvals.data ?? []).map((a) => (
                <li key={a.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">{a.title}</div>
                    <div className="list-row-sub">
                      <span className="mono">{a.reference}</span> · {a.type} · {a.maker}
                    </div>
                  </div>
                  {a.status === "Pending" ? (
                    <Button size="sm" onClick={() => setOpenApproval(a)}>
                      Review
                    </Button>
                  ) : (
                    <Status>{a.status}</Status>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Field today ---- */}
          {can("assets") && (<Card>
            <CardHeader title="Field service today" description="Open tickets by response deadline" icon={Wrench} actions={<ButtonLink to={href.module("assets", "tickets")} variant="ghost" size="sm">Service desk</ButtonLink>} />
            <ul className="divider-list">
              {openTickets
                .slice()
                .sort((a, b) => a.slaDue.localeCompare(b.slaDue))
                .slice(0, 4)
                .map((t) => (
                  <li key={t.id}>
                    <a href={href.record(t.id)} className="list-row field-row">
                      <span className={`prio prio-${t.priority.toLowerCase()}`}>{t.priority}</span>
                      <div className="list-row-main">
                        <div className="list-row-title truncate">{t.title}</div>
                        <div className="list-row-sub truncate">
                          {t.customer} · {t.assignee ?? "Unassigned"}
                        </div>
                      </div>
                      <SlaClock due={t.slaDue} />
                    </a>
                  </li>
                ))}
            </ul>
          </Card>)}

          {/* ---- Activity ---- */}
          <Card>
            <CardHeader title="Recent activity" icon={Boxes} />
            <Timeline
              items={(activity.data ?? []).slice(0, 6).map((e) => ({
                id: e.id,
                tone: e.action.includes("approved") ? "ok" : e.action.includes("reject") || e.action.includes("QC") ? "warn" : "accent",
                title: (
                  <span>
                    <strong>{e.actor}</strong> {e.action} <RecordLink id={e.reference} />
                  </span>
                ),
                meta: `${ago(e.at)} · ${time(e.at)}`,
              }))}
            />
          </Card>
        </div>
      </div>

      <ApprovalDialog approval={openApproval} open={!!openApproval} onOpenChange={(o) => !o && setOpenApproval(null)} />
    </ModuleFrame>
  );
}

function FocusCard({
  tone,
  icon: Icon,
  kicker,
  title,
  body,
  refId,
  action,
  foot,
}: {
  tone: "risk" | "accent" | "warn";
  icon: typeof Siren;
  kicker: React.ReactNode;
  title: string;
  body: string;
  refId: string;
  action: React.ReactNode;
  foot: React.ReactNode;
}) {
  return (
    <article className={`focus-card tone-${tone}`}>
      <div className="focus-top">
        <span className="focus-icon">
          <Icon size={18} aria-hidden />
        </span>
        <RecordLink id={refId} />
        <span className="focus-kicker">{kicker}</span>
      </div>
      <h3 className="focus-title">{title}</h3>
      <p className="focus-body">{body}</p>
      <div className="focus-foot">
        <span className="focus-who">{foot}</span>
        {action}
      </div>
    </article>
  );
}

function ChartTip({ active, payload, label, unit }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  const planned = payload.find((p) => p.dataKey === "planned")?.value ?? 0;
  const delivered = payload.find((p) => p.dataKey === "delivered")?.value ?? 0;
  return (
    <div className="chart-tip">
      <p className="chart-tip-title">{label} 2026</p>
      <p><i className="lg-done" /> Delivered <b>{delivered}{unit && ` ${unit}`}</b></p>
      <p><i className="lg-planned" /> Planned <b>{planned}{unit && ` ${unit}`}</b></p>
      <p className="chart-tip-foot">{planned ? Math.round((delivered / planned) * 100) : 0}% of plan</p>
    </div>
  );
}
