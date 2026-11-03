import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Factory,
  GitBranch,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { approvals, chartData, projects, type RecordRow } from "../data";
import { ProductTabs } from "./product-ui";

type Props = {
  role: string;
  period: string;
  onPeriod: (value: string) => void;
  decisions: Record<string, string>;
  go: (route: string, tab?: string) => void;
  onApproval: (approval: (typeof approvals)[number]) => void;
  onProject: (project: RecordRow) => void;
  onExport: () => void;
};
export function OperationsHome({
  role,
  period,
  onPeriod,
  decisions,
  go,
  onApproval,
  onProject,
  onExport,
}: Props) {
  const [view, setView] = useState("overview");
  const pending = approvals.filter((a) => !decisions[a.id]);
  return (
    <div className="operations-home">
      <div className="product-page-title">
        <div>
          <div className="page-context">
            <span className="context-square">
              <BriefcaseBusiness size={14} />
            </span>
            ABC Limited<span>/</span>
            {role === "Service coordinator"
              ? "Service operations"
              : "Company operations"}
          </div>
          <h1>
            {role === "Project manager"
              ? "Delivery overview"
              : role === "Service coordinator"
                ? "Service overview"
                : "Operations"}
          </h1>
          <p>Delivery, materials and commitments across your business.</p>
        </div>
        <div className="header-actions">
          <label className="select-control">
            <CalendarDays size={14} />
            <select
              aria-label="Dashboard period"
              value={period}
              onChange={(e) => onPeriod(e.target.value)}
            >
              <option>November 2026</option>
              <option>October 2026</option>
            </select>
          </label>
          <button className="button" onClick={onExport}>
            <ArrowDownToLine size={14} />
            Export
          </button>
        </div>
      </div>
      <ProductTabs
        value={view}
        onChange={setView}
        items={[
          { label: "Overview", value: "overview" },
          { label: "My approvals", value: "approvals", count: pending.length },
          { label: "Activity", value: "activity" },
        ]}
      />
      <div className="snapshot-line">
        <span>
          <i className="demo-indicator" />
          Demonstration workspace
        </span>
        <span>
          03 Nov 2026<span className="snapshot-divider">·</span>09:41 IST
          <span className="snapshot-divider">·</span>Illustrative data
        </span>
      </div>
      {view === "overview" ? (
        <>
          <section className="dispatch-board" aria-label="Immediate operating decisions">
            <div className="dispatch-lead">
              <h2>Three handoffs need attention.</h2>
              <p>PRJ-0264 is waiting on material and procurement. An installed asset has a service response due today.</p>
              <button onClick={() => onProject(projects[0])}>Inspect the linked project <ArrowUpRight size={15} /></button>
            </div>
            <div className="dispatch-list">
              <button onClick={() => go("Inventory", "Stock")}><span className="dispatch-num">01</span><span><small>QC HOLD / INVENTORY</small><strong>6 transmitters need inspection release</strong><em>Available quantity stays at zero until released.</em></span><ArrowUpRight size={17}/></button>
              <button onClick={() => go("Purchase", "Supplier comparison")}><span className="dispatch-num">02</span><span><small>DECISION / PURCHASE</small><strong>Compare 3 offers for PR-0084</strong><em>Technical fit and lead time sit beside price.</em></span><ArrowUpRight size={17}/></button>
              <button onClick={() => go("Assets", "Service desk")}><span className="dispatch-num">03</span><span><small>RESPONSE / SERVICE</small><strong>SR-0148 visit due at 14:00</strong><em>Existing equipment AST-0042 · Northstar Pharma.</em></span><ArrowUpRight size={17}/></button>
            </div>
          </section>
          <div className="desk-kpis" aria-label="Illustrative operational totals">
            <button onClick={() => go("Projects")}><span>ACTIVE PROJECTS</span><strong>5</strong><small>1 at risk</small></button>
            <button onClick={() => go("Sales")}><span>OPEN PROJECT BOOK</span><strong>₹1.42 Cr</strong><small>Illustrative value</small></button>
            <button onClick={() => go("Inventory")}><span>AVAILABLE STOCK</span><strong>58</strong><small>Across 4 items</small></button>
            <button onClick={() => go("Assets", "Service desk")}><span>OPEN SERVICE TICKETS</span><strong>3</strong><small>1 due today</small></button>
          </div>
          <div className="operations-layout">
            <section className="delivery-panel">
              <header>
                <div>
                  <h2>Delivery outlook</h2>
                  <p>Milestones completed against the planned schedule</p>
                </div>
                <div className="chart-key">
                  <span>
                    <i />
                    Delivered
                  </span>
                  <span>
                    <i />
                    Planned
                  </span>
                </div>
              </header>
              <div className="delivery-value">
                <strong>{period === "November 2026" ? "85" : "67"}</strong>
                <span>
                  milestones delivered
                  <span>
                    Jun — {period === "November 2026" ? "Nov" : "Oct"} 2026
                  </span>
                </span>
              </div>
              <div
                className="product-chart"
                role="img"
                aria-label="Illustrative milestones delivered: June 9, July 13, August 12, September 17, October 16, November 18. Planned: 12, 16, 14, 21, 18, 24."
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={185}
                  initialDimension={{ width: 600, height: 185 }}
                >
                  <AreaChart
                    data={
                      period === "November 2026"
                        ? chartData
                        : chartData.slice(0, 5)
                    }
                    margin={{ top: 16, right: 8, bottom: 4, left: -25 }}
                  >
                    <defs>
                      <linearGradient
                        id="product-blue-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#d3623b"
                          stopOpacity={0.12}
                        />
                        <stop
                          offset="100%"
                          stopColor="#d3623b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e3e0d6" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#647267" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      ticks={[0, 8, 16, 24]}
                      tick={{ fontSize: 11, fill: "#647267" }}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #d6d1c6",
                        borderRadius: 0,
                        fontSize: 12,
                        boxShadow: "0 5px 20px #1017270a",
                      }}
                    />
                    <Area
                      name="Planned"
                      type="linear"
                      dataKey="planned"
                      fill="none"
                      stroke="#91a094"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    <Area
                      name="Delivered"
                      type="monotone"
                      dataKey="delivered"
                      fill="url(#product-blue-fill)"
                      stroke="#c9542b"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <footer>
                <span>Source: illustrative milestone fixture</span>
                <button onClick={() => go("Reports")}>
                  Open report
                  <ArrowUpRight size={13} />
                </button>
              </footer>
            </section>
            <section className="review-panel">
              <header>
                <h2>
                  Needs review<span>{pending.length}</span>
                </h2>
                <ClipboardCheck size={16} />
              </header>
              <div className="review-rows">
                {approvals.slice(0, 3).map((a) => (
                  <button key={a.id} onClick={() => onApproval(a)}>
                    <span className="review-symbol">
                      {a.type === "BOM release" ? (
                        <GitBranch size={17} />
                      ) : a.type === "Employee claim" ? (
                        <Clock3 size={17} />
                      ) : a.type === "Count variance" ? (
                        <ClipboardCheck size={17} />
                      ) : a.type === "Subcontract variance" ? (
                        <Boxes size={17} />
                      ) : (
                        <ShoppingCart size={17} />
                      )}
                    </span>
                    <div>
                      <span className="review-ref">
                        {a.ref}
                        <i>·</i>
                        {a.type}
                      </span>
                      <strong>{a.title}</strong>
                      <small>
                        {a.maker}
                        <span>{a.age}</span>
                      </small>
                    </div>
                    <div className="review-amount">
                      {decisions[a.id] ? (
                        <span className="decision-tag">{decisions[a.id]}</span>
                      ) : (
                        a.value
                      )}
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
              <footer>
                <ShieldCheckIcon />
                <span>Review authority and evidence before approval.</span>
                <button onClick={() => setView("approvals")}>
                  All {approvals.length} in queue
                  <ArrowUpRight size={13} />
                </button>
              </footer>
            </section>
          </div>
          <section className="flow-ledger">
            <header>
              <h2>One project. A complete record.</h2>
              <button onClick={() => onProject(projects[0])}>
                PRJ-0264
                <ArrowUpRight size={14} />
              </button>
            </header>
            <div className="flow-records">
              {[
                {
                  icon: BriefcaseBusiness,
                  stage: "Sales order",
                  ref: "SO-0196",
                  state: "Confirmed",
                  to: "Sales",
                  tab: "Overview",
                },
                {
                  icon: GitBranch,
                  stage: "Engineering",
                  ref: "BOM-042 / C",
                  state: "Released",
                  to: "Inventory",
                  tab: "Requirements",
                },
                {
                  icon: ShoppingCart,
                  stage: "Procurement",
                  ref: "PR-0084",
                  state: "Approval pending",
                  to: "Purchase",
                  tab: "Overview",
                },
                {
                  icon: Factory,
                  stage: "Panel assembly",
                  ref: "WO-0187",
                  state: "Assembly stage",
                  to: "Inventory",
                  tab: "Panel assembly",
                },
                {
                  icon: Wrench,
                  stage: "Installed base",
                  ref: "AST-0042",
                  state: "Existing equipment",
                  to: "Assets",
                  tab: "Register",
                },
              ].map((r, i) => (
                <button
                  className={i === 2 ? "blocked" : ""}
                  key={r.ref}
                  onClick={() => go(r.to, r.tab)}
                >
                  <span className="flow-stage">
                    <r.icon size={14} />
                    {r.stage}
                  </span>
                  <strong>
                    {r.ref}
                    <ArrowUpRight size={13} />
                  </strong>
                  <span className="flow-state">
                    <i />
                    {r.state}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <div className="operations-bottom">
            <section className="delivery-projects">
              <header>
                <h2>Delivery portfolio</h2>
                <button onClick={() => go("Projects")}>
                  View all projects
                  <ArrowRight size={13} />
                </button>
              </header>
              {projects.slice(0, 3).map((p) => (
                <button
                  className="delivery-project-row"
                  key={p.id}
                  onClick={() => onProject(p)}
                >
                  <span className="record-code">{p.id}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.subtitle}</small>
                  </div>
                  <span
                    className={`project-health ${p.status === "At risk" ? "risk" : ""}`}
                  >
                    <i />
                    {p.status}
                  </span>
                  <span className="delivery-progress">
                    <i>
                      <b style={{ width: `${p.progress}%` }} />
                    </i>
                    {p.progress}%
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </section>
            <section className="commitments-panel">
              <header>
                <Wrench size={16} />
              </header>
              <h2>Due next</h2>
              <button onClick={() => go("Assets", "Service desk")}>
                <span className="commitment-time">
                  TODAY<strong>14:00</strong>
                </span>
                <span>
                  <strong>PLC communication issue</strong>
                  <small>SR-0148 · Northstar Pharma</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
              <button onClick={() => go("Assets", "Calibration")}>
                <span className="commitment-time">
                  05 NOV<strong>Due</strong>
                </span>
                <span>
                  <strong>Pressure calibrator</strong>
                  <small>CAL-0096 · Central lab</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            </section>
          </div>
        </>
      ) : view === "approvals" ? (
        <section className="approval-worklist">
          <header>
            <h2>Your review queue</h2>
            <p>
              Demonstration authority only. No real transactions are approved.
            </p>
          </header>
          {approvals.map((a) => (
            <button key={a.id} onClick={() => onApproval(a)}>
              <ClipboardCheck size={17} />
              <span className="record-code">{a.ref}</span>
              <strong>{a.title}</strong>
              <span>{a.maker}</span>
              <span>{decisions[a.id] || "Pending"}</span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </section>
      ) : (
        <section className="activity-feed">
          <header>
            <h2>Workspace activity</h2>
            <p>
              Illustrative reference events and your local session decisions.
            </p>
          </header>
          {[
            {
              title: "Engineering BOM revision C released",
              ref: "BOM-042",
              time: "28 Oct · Reference fixture",
            },
            {
              title: "Material demand sent for review",
              ref: "PR-0084",
              time: "03 Nov · Reference fixture",
            },
            ...Object.entries(decisions).map(([id, status]) => ({
              title: `${status} in demo session`,
              ref: id,
              time: "03 Nov · Local browser state",
            })),
          ].map((a) => (
            <div key={a.ref}>
              <CheckCircle2 size={16} />
              <div>
                <strong>{a.title}</strong>
                <small>
                  {a.ref} · {a.time}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
function ShieldCheckIcon() {
  return <CheckCircle2 size={13} />;
}
