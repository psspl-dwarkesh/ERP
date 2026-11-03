import React, { Suspense, lazy, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DataGrid, ProductTabs, ProductCommand } from "./components/product-ui";
// The operations desk is the only surface that draws charts, so it loads with
// them on demand; the entry page never pays for the chart runtime.
const OperationsHome = lazy(() =>
  import("./components/operations-home").then((m) => ({
    default: m.OperationsHome,
  })),
);
import { EntryPage } from "./components/entry-page";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Command,
  Factory,
  FileChartColumn,
  FileText,
  GitBranch,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  assets,
  approvals,
  countLines,
  opportunities,
  people,
  projects,
  purchases,
  sales,
  stock,
  subcontractLines,
  tickets,
  type CountLine,
  type RecordRow,
  type SubcontractLine,
} from "./data";
import "./product.css";
import "./brand-refresh.css";

type Route =
  | "Dashboard"
  | "Projects"
  | "Inventory"
  | "Assets"
  | "Purchase"
  | "Sales"
  | "CRM"
  | "HR"
  | "Payroll"
  | "User Management"
  | "Reports";
type Modal = {
  kind: "record" | "approval" | "draft" | "search" | "notifications" | "help";
  title: string;
  row?: RecordRow;
  approval?: (typeof approvals)[number];
} | null;
const nav: { name: Route; icon: LucideIcon; group?: string }[] = [
  { name: "Dashboard", icon: LayoutDashboard, group: "WORKSPACE" },
  { name: "Projects", icon: BriefcaseBusiness, group: "OPERATIONS" },
  { name: "Inventory", icon: Boxes },
  { name: "Assets", icon: Wrench },
  { name: "Purchase", icon: ShoppingCart },
  { name: "CRM", icon: Target, group: "COMMERCIAL" },
  { name: "Sales", icon: TrendingUp },
  { name: "HR", icon: Users, group: "PEOPLE" },
  { name: "Payroll", icon: Wallet },
  { name: "Reports", icon: FileChartColumn, group: "ADMINISTRATION" },
  { name: "User Management", icon: ShieldCheck },
];
const descriptions: Record<Route, string> = {
  Dashboard: "Company operations",
  Projects: "Plan milestones, coordinate resources and follow delivery.",
  Inventory:
    "Stock, reservations, cycle counts, subcontract material and panel assembly.",
  Assets: "Equipment, service contracts and maintenance obligations.",
  Purchase: "Requisitions, supplier selection, orders and receipts.",
  Sales: "Quotations, orders, fulfilment and billing advice.",
  CRM: "Enquiries, opportunity stages and commercial handoffs.",
  HR: "People, deployment, attendance and employee requests.",
  Payroll: "Review approved inputs, pay periods and run controls.",
  "User Management": "Users, permissions, approval authority and audit.",
  Reports: "Operational reports, definitions and export controls.",
};
const routeFromHash = () =>
  nav.find(
    (n) =>
      `#${n.name.toLowerCase().replaceAll(" ", "-")}` === window.location.hash,
  )?.name || "Dashboard";
const isEntryHash = () =>
  window.location.hash === "" || window.location.hash === "#welcome";
/* Warning words read amber, settled states read green, and anything still in
   motion reads the neutral teal. A shortage joined the amber group with the
   count and subcontract screens: a warning badge and a review badge are not the
   same thing. */
function Badge({ status }: { status: string }) {
  const tone = /risk|Urgent|hold|Low|Overdue|Denied|Rejected|Variance|short|Damag|Loss/i.test(
    status,
  )
    ? "amber"
    : /track|Available|Approved|service|Completed|Active|Deployed|Matched|Reconciled/i.test(
        status,
      )
      ? "green"
      : /Draft|Planning|locked/i.test(status)
        ? "gray"
        : "blue";
  return (
    <span className={`badge ${tone}`}>
      <i />
      {status}
    </span>
  );
}
/* Variance has to read as money, not as a quantity difference, so the count and
   subcontract screens price their lines through one rupee formatter. Indian
   digit grouping is the local convention for this audience. */
const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;
/* One dialog serves every request type, so the review context has to come from
   the record rather than a hard-coded project line. */
const approvalContext: Record<string, string> = {
  "Purchase requisition": "Raised from BOM-042 revision C on PRJ-0264.",
  "BOM release": "Proposed revision D against the released revision C.",
  "Employee claim": "Site travel recorded against SR-0148 attendance.",
  "Count variance": "Cycle count CNT-0031 · serialized stock in Rack A-04.",
  "Subcontract variance": "SI-0044 at Vector Controls · PRJ-0258 work package.",
};
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? "small" : ""}`}>
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <span className="monogram">
        <i /><i /><i />
      </span>
      <div>
        <strong>
          ABC Limited<span className="brand-dot">.</span>
        </strong>
        <small>ENGINEERING OPERATIONS</small>
      </div>
    </div>
  );
}
// Placeholder for the operations desk while its chart runtime downloads.
// It mirrors the dispatch panel's ruled geometry rather than showing a spinner.
function DeskLoading() {
  return (
    <section className="desk-loading" aria-busy="true" aria-label="Loading the operations desk">
      <div className="desk-loading-head">
        <span className="desk-loading-title" />
        <span className="desk-loading-chip" />
      </div>
      <div className="desk-loading-rows">
        {[0, 1, 2].map((row) => (
          <div className="desk-loading-row" key={row}>
            <span className="desk-loading-symbol" />
            <span className="desk-loading-line" />
            <span className="desk-loading-line short" />
            <span className="desk-loading-action" />
          </div>
        ))}
      </div>
    </section>
  );
}
function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [landing, setLanding] = useState(isEntryHash);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [role, setRole] = useState("Operations lead");
  const [period, setPeriod] = useState("November 2026");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [approvalError, setApprovalError] = useState("");
  useEffect(() => setApprovalError(""), [modal?.approval?.id]);
  const [drafts, setDrafts] = useState<(RecordRow & { module: Route })[]>(
    () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("abc-demo-drafts") || "[]",
        );
        return Array.isArray(stored) ? stored : [];
      } catch {
        return [];
      }
    },
  );
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [assemblyStep, setAssemblyStep] = useState(3);
  const [issueDone, setIssueDone] = useState(false);
  const [countStage, setCountStage] = useState(0);
  const [subStage, setSubStage] = useState(0);
  const [ticketStatus, setTicketStatus] = useState("Assigned");

  const notify = (message: string) => {
    setToast(message);
  };
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    localStorage.setItem("abc-demo-drafts", JSON.stringify(drafts));
  }, [drafts]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [route, landing]);
  useEffect(() => {
    const handle = () => {
      const next = routeFromHash();
      const welcome = isEntryHash();
      if (next !== route || welcome !== landing) {
        setLanding(welcome);
        setRoute(next);
        setTab("Overview");
        setFilter("All statuses");
        setSelected(null);
        setQuery("");
      }
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [route, landing]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setMobileNav(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setModal({ kind: "search", title: "Find your next step" });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const go = (to: Route, sub = "Overview") => {
    setRoute(to);
    setTab(sub);
    setQuery("");
    setFilter("All statuses");
    setSelected(null);
    setMobileNav(false);
    setLanding(false);
    window.location.hash = to.toLowerCase().replaceAll(" ", "-");
  };
  const openRecord = (row: RecordRow) => {
    setSelected(row);
    if (route === "Projects") setTab("Project detail");
    else setModal({ kind: "record", title: row.name, row });
  };
  const dataset: Partial<Record<Route, RecordRow[]>> = {
    Projects: projects,
    Inventory: stock,
    Assets: tab === "Service desk" ? tickets : assets,
    Purchase: purchases,
    Sales: sales,
    CRM: opportunities,
    HR: people,
  };
  const rows = [
    ...(dataset[route] || []),
    ...drafts.filter((d) => d.module === route),
  ].filter(
    (r) =>
      (r.name + " " + r.id + " " + r.subtitle + " " + r.owner)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All statuses" || r.status === filter),
  );
  const exportRows = (data: RecordRow[], name: string) => {
    const fields = [
      "id",
      "name",
      "subtitle",
      "owner",
      "status",
      "value",
      "date",
    ] as const;
    const csv = [
      fields.join(","),
      ...data.map((r) =>
        fields
          .map((k) => '"' + String(r[k]).replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `abc-demo-${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Illustrative CSV exported. No live business data.");
  };
  const detailLink = (to: Route, label: string, sub?: string) => (
    <button className="text-button" onClick={() => go(to, sub)}>
      {label}
      <ArrowUpRight size={14} />
    </button>
  );
  function table(
    data: RecordRow[],
    columns = {
      main: "Record",
      owner: "Owner",
      value: "Value / reference",
      date: "Target date",
    },
  ) {
    return (
      <DataGrid
        data={data}
        labels={columns}
        onOpen={openRecord}
        onExport={(data) => exportRows(data, route.toLowerCase())}
        onClear={() => {
          setQuery("");
          setFilter("All statuses");
        }}
        badge={(status) => <Badge status={status} />}
        notify={notify}
      />
    );
  }
  function dashboard() {
    return (
      <Suspense fallback={<DeskLoading />}>
        <OperationsHome
          role={role}
          period={period}
          onPeriod={setPeriod}
          decisions={decisions}
          go={(to, sub) => go(to as Route, sub)}
          onApproval={(a) =>
            setModal({ kind: "approval", title: a.title, approval: a })
          }
          onProject={(p) => {
            go("Projects", "Project detail");
            setSelected(p);
          }}
          onExport={() => exportRows(projects, "portfolio")}
        />
      </Suspense>
    );
  }
  function projectDetail() {
    const p = selected || projects[0];
    if (p.id !== "PRJ-0264")
      return (
        <section className="card padded">
          <button className="back-link" onClick={() => setTab("Overview")}>
            <ArrowLeft size={14} />
            Projects
          </button>
          <span className="record-code">{p.id}</span>
          <h2>{p.name}</h2>
          <p>{p.subtitle}</p>
          <Badge status={p.status} />
          <p className="muted">
            {p.notes || `Owner: ${p.owner} · Target: ${p.date}.`} Detailed
            connected workflows are illustrated on PRJ-0264 in this prototype.
          </p>
          <button className="button" onClick={() => setSelected(projects[0])}>
            Open PRJ-0264 workflow
            <ArrowUpRight size={14} />
          </button>
        </section>
      );
    return (
      <>
        <button
          className="back-link"
          onClick={() => {
            setTab("Overview");
            setSelected(null);
          }}
        >
          <ArrowLeft size={15} />
          Back to projects
        </button>
        <div className="record-hero">
          <div>
            <span className="eyebrow">{p.id}</span>
            <h1>{p.name}</h1>
            <p>{p.subtitle} · Order SO-0196</p>
          </div>
          <Badge status={p.status} />
        </div>
        <div className="project-metrics">
          <div>
            <small>Project manager</small>
            <strong>
              <Avatar name={p.owner} small />
              {p.owner}
            </strong>
          </div>
          <div>
            <small>Contract value · illustrative</small>
            <strong>{p.value}</strong>
          </div>
          <div>
            <small>Target handover</small>
            <strong>{p.date}</strong>
          </div>
          <div>
            <small>Overall progress</small>
            <strong>
              {p.progress}%{" "}
              <span className="mini-progress">
                <i style={{ width: `${p.progress}%` }} />
              </span>
            </strong>
          </div>
        </div>
        <ProductTabs
          items={[
            "Summary",
            "WBS & milestones",
            "Materials",
            "Documents",
            "Costs & people",
          ].map((t) => ({ label: t, value: t }))}
          value={filter === "All statuses" ? "Summary" : filter}
          onChange={setFilter}
        />
        {filter === "All statuses" ||
        filter === "Summary" ||
        filter === "WBS & milestones" ? (
          <div className="detail-grid">
            <section className="card padded">
              <div className="card-heading">
                <div>
                  <h2>Project milestones</h2>
                </div>
                <span className="subtle-tag">5 milestones</span>
              </div>
              <div className="timeline">
                {[
                  "Engineering design approved",
                  "BOM revision C released",
                  "Panel assembly & factory test",
                  "Site installation & SAT",
                  "Commissioning & handover",
                ].map((t, i) => (
                  <div
                    className={`timeline-item ${i < 2 ? "done" : ""}`}
                    key={t}
                  >
                    <span>{i < 2 ? <Check size={15} /> : i + 1}</span>
                    <div>
                      <strong>{t}</strong>
                      <p>
                        {
                          [
                            "Approved · 21 Oct",
                            "Approved · 28 Oct",
                            "In progress · 10 Nov target",
                            "Upcoming · 15 Nov",
                            "Upcoming · 18 Nov",
                          ][i]
                        }
                      </p>
                    </div>
                    <Badge
                      status={
                        i < 2 ? "Completed" : i === 2 ? "At risk" : "Planning"
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
            <div className="detail-side">
              <section className="card padded warm">
                <TriangleAlert size={21} />
                <h3>One material shortage</h3>
                <p>
                  PLC components are holding up the assembly milestone. Review
                  the demand and its purchasing status.
                </p>
                {detailLink(
                  "Inventory",
                  "Review material requirements",
                  "Requirements",
                )}
              </section>
              <section className="card padded">
                <span className="eyebrow">LINKED RECORDS</span>
                {detailLink("Sales", "SO-0196 · Customer order")}
                {detailLink(
                  "Inventory",
                  "WO-0187 · Panel assembly",
                  "Panel assembly",
                )}
                {detailLink("Assets", "AST-0042 · Installed equipment")}
                {detailLink("Purchase", "PR-0084 · Material requisition")}
              </section>
            </div>
          </div>
        ) : filter === "Materials" ? (
          <>
            <div className="attention-bar">
              <Boxes size={20} />
              <div>
                <strong>BOM-042 · Revision C</strong>
                <span>
                  Released BOM · 1 shortage group · PR-0084 awaiting approval
                </span>
              </div>
              <button onClick={() => go("Inventory", "Requirements")}>
                Review requirements
                <ArrowRight size={16} />
              </button>
            </div>
            {table(stock, {
              main: "Component",
              owner: "Store",
              value: "Availability",
              date: "Allocation",
            })}
          </>
        ) : filter === "Documents" ? (
          <section className="card padded">
            <h2>Controlled engineering documents</h2>
            {[
              "Drawing E-0264-001 · Rev C · Approved",
              "FAT protocol · Draft · Review required",
              "Commissioning certificate · Planned",
            ].map((d, i) => (
              <button
                className="document-line"
                key={d}
                onClick={() =>
                  notify(
                    i === 0
                      ? "Drawing reference selected. No actual file is attached in this demo."
                      : "Document workflow is planned; no actual file is attached.",
                  )
                }
              >
                <FileText size={21} />
                <span>{d}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            <p className="muted">
              Document versions and sign-offs are design examples. No
              certification claim.
            </p>
          </section>
        ) : (
          <section className="card padded">
            <h2>Cost & resource references</h2>
            <p className="muted">
              Illustrative commitments only. Accounting source and cost policy
              require confirmation.
            </p>
            <div className="three-cards">
              <div>
                <small>Materials committed</small>
                <h2>₹2.84 L</h2>
                <span>PR-0084 · not yet approved</span>
              </div>
              <div>
                <small>Assigned engineers</small>
                <h2>2</h2>
                <span>Deployment and time references</span>
              </div>
              <div>
                <small>Cost definition</small>
                <h2>Pending</h2>
                <span>No invented profitability formula</span>
              </div>
            </div>
            {detailLink("HR", "Review engineer deployment")}
            {detailLink("Purchase", "Review procurement commitments")}
          </section>
        )}
      </>
    );
  }
  function assembly() {
    const steps = [
      "Kitting",
      "Fabrication",
      "Wiring",
      "Assembly",
      "Testing",
      "Packing",
    ];
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <Factory size={28} />
          </span>
          <div>
            <h2>Panel assembly work order</h2>
            <p>
              WO-0187 · Process control panel · PRJ-0264 · BOM-042 revision C
            </p>
          </div>
          <Badge status={assemblyStep >= 4 ? "In review" : "In progress"} />
        </div>
        <div className="assembly-grid">
          {steps.map((s, i) => (
            <button
              className={`assembly-stage ${i < assemblyStep ? "complete" : i === assemblyStep ? "current" : ""}`}
              key={s}
              onClick={() =>
                notify(
                  `${s}: ${i < assemblyStep ? "Completed in this demo" : i === assemblyStep ? "Current stage. Review the work order below." : "Waiting for the previous stage"}`,
                )
              }
            >
              <span>
                {i < assemblyStep ? (
                  <Check size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <h3>{s}</h3>
              <small>
                {i < assemblyStep
                  ? "Complete"
                  : i === assemblyStep
                    ? "In progress"
                    : "Upcoming"}
              </small>
              <div className="stage-line" />
            </button>
          ))}
        </div>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <span className="eyebrow">WORK ORDER WO-0187</span>
                <h2>
                  {assemblyStep >= 4
                    ? "Quality review required"
                    : "Assembly stage checklist"}
                </h2>
              </div>
              <span className="subtle-tag">BOM rev C · frozen</span>
            </div>
            {(assemblyStep >= 4
              ? [
                  "Inspection plan and evidence review",
                  "Electrical test result attachment",
                  "Authorized QC release required",
                ]
              : [
                  "Components matched to released BOM",
                  "Wiring labels and terminal checks",
                  "Assembly evidence recorded",
                ]
            ).map((s, i) => (
              <div className="checklist-line" key={s}>
                <span className={i < 2 ? "checked-box" : "unchecked-box"}>
                  {i < 2 && <Check size={14} />}
                </span>
                <span>{s}</span>
                <small>{i < 2 ? "Recorded" : "Pending"}</small>
              </div>
            ))}
            <div className="form-footer">
              <p className="muted">
                Local simulation · no stock or FG posting.
              </p>
              <button
                className="button primary"
                disabled={assemblyStep >= 4}
                onClick={() => {
                  setAssemblyStep(4);
                  notify(
                    "Demo assembly stage completed. Quality review is now required; dispatch remains blocked.",
                  );
                }}
              >
                <CheckCheck size={16} />
                {assemblyStep >= 4
                  ? "Awaiting QC review"
                  : "Complete demo assembly stage"}
              </button>
            </div>
          </section>
          <section className="card padded">
            <h3>Dispatch release controls</h3>
            <p className="muted">
              A stage change is not a finished-goods release. Test evidence and
              authorized QC approval are needed before dispatch.
            </p>
            {detailLink("Projects", "PRJ-0264 · Project context")}
            {detailLink("Inventory", "Review component stock", "Stock")}
            <div className="note-box">
              <LockKeyhole size={16} />
              Dispatch blocked pending QC release
            </div>
          </section>
        </div>
      </>
    );
  }
  function requirementView() {
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <GitBranch size={28} />
          </span>
          <div>
            <span className="eyebrow">BOM-042 · REV C</span>
            <h2>Material requirements</h2>
            <p>
              PRJ-0264 · Approved demand · Illustrative requirements snapshot
            </p>
          </div>
        </div>
        <section className="card">
          <div className="card-heading">
            <h2>Demand & availability</h2>
            <button className="button primary" onClick={() => go("Purchase")}>
              <ShoppingCart size={15} />
              Open PR-0084
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Component",
                    "Required",
                    "Available",
                    "Reserved",
                    "Shortage",
                    "Action",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["PLC CPU · S7-1200", 12, 4, 0, 8],
                  ["24V power supply", 8, 38, 10, 0],
                  ["Pressure transmitter", 6, 0, 0, 6],
                ].map((r, i) => (
                  <tr key={String(r[0])}>
                    <td>
                      <strong>{r[0]}</strong>
                      <small>
                        {i === 2
                          ? "QC-held material excluded from available stock"
                          : "Released BOM · each"}
                      </small>
                    </td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td>
                      <Badge
                        status={Number(r[4]) ? `${r[4]} shortage` : "Available"}
                      />
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          i === 1
                            ? notify(
                                "This line has sufficient available stock. Reservation is illustrated in Stock movements.",
                              )
                            : go(
                                i === 2 ? "Inventory" : "Purchase",
                                i === 2 ? "Stock" : "Overview",
                              )
                        }
                      >
                        {i === 2
                          ? "Review QC hold"
                          : i === 1
                            ? "View allocation"
                            : "Review PR"}
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="note-box">
          <CircleHelp size={17} />
          Requirement calculations and allocation rules are illustrative; final
          MRP policy needs FRD approval.
        </div>
      </>
    );
  }
  const countVariance = (line: CountLine) => line.counted - line.expected;
  function countsView() {
    const cpu = countLines.find((l) => l.item === "ITM-0042")!;
    const cpuGap = Math.abs(countVariance(cpu));
    const adjustmentValue = countLines
      .filter((l) => l.route === "adjustment")
      .reduce((sum, l) => sum + Math.abs(countVariance(l)) * l.unitValue, 0);
    const transferValue = countLines
      .filter((l) => l.route === "transfer")
      .reduce((sum, l) => sum + Math.abs(countVariance(l)) * l.unitValue, 0);
    const posted = countStage >= 2;
    const bannerStatus = [
      "Variance open",
      "Variance in review",
      "Adjustment posted",
      "Reversal posted",
    ][countStage];
    const trail = [
      { what: "CNT-0031 count sheet recorded", state: "Recorded", done: true },
      {
        what: "APR-0127 variance approved outside the count team",
        state: countStage >= 2 ? "Approved" : countStage === 1 ? "In review" : "Pending",
        done: countStage >= 2,
      },
      {
        what: "ADJ-0018 adjustment movement posted",
        state: posted ? "Posted" : "Pending",
        done: posted,
      },
      {
        what: "ADJ-0019 compensating entry",
        state: countStage >= 3 ? "Posted" : "Not required",
        done: countStage >= 3,
      },
    ];
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <ClipboardCheck size={28} />
          </span>
          <div>
            <span className="eyebrow">CNT-0031 · CYCLE COUNT</span>
            <h2>Count, variance and correction</h2>
            <p>
              Central warehouse · 03 Nov 2026 · four lines counted against the
              book balance
            </p>
          </div>
          <Badge status={bannerStatus} />
        </div>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Count sheet</h2>
              <p className="muted">
                Expected is the book balance when the count opened. The reason
                belongs to the count and is written while the shelf is still
                open, not reconstructed afterwards.
              </p>
            </div>
            <span className="subtle-tag">2 of 4 lines differ</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Item / position",
                    "Expected",
                    "Counted",
                    "Result",
                    "Value at stake",
                    "Reason and correction route",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countLines.map((l) => {
                  const gap = countVariance(l);
                  return (
                    <tr key={l.item}>
                      <td>
                        <strong>{l.material}</strong>
                        <small>{l.item}</small>
                      </td>
                      <td>{l.expected}</td>
                      <td>{l.counted}</td>
                      <td>
                        <Badge
                          status={gap === 0 ? "Matched" : `${Math.abs(gap)} short`}
                        />
                      </td>
                      <td>
                        {gap === 0
                          ? "—"
                          : inr(Math.abs(gap) * l.unitValue)}
                      </td>
                      <td>
                        {l.reason}
                        <small>
                          {gap === 0
                            ? l.route === "transfer"
                              ? "Position recorded only. No value movement."
                              : "No movement. The line closes without approval."
                            : l.route === "transfer"
                              ? "Corrected by a custody transfer against SI-0044, not by a count adjustment."
                              : `Adjustment ADJ-0018 after variance approval · ${inr(l.unitValue)} per unit`}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="inventory-summary">
          <div>
            <h2>What the correction does to ITM-0042</h2>
            <p>
              Available is on hand minus reserved. The count corrects on hand, so
              the whole difference lands on availability.
            </p>
          </div>
          <div className="stock-metric">
            <strong>
              {posted ? 16 - cpuGap : 16}
              <span>units</span>
            </strong>
            <small>On hand</small>
            <i />
          </div>
          <div className="stock-metric">
            <strong>
              12<span>units</span>
            </strong>
            <small>Reserved</small>
            <i />
          </div>
          <div className="stock-metric warning">
            <strong>
              {posted ? 4 - cpuGap : 4}
              <span>units</span>
            </strong>
            <small>Available</small>
            <i />
          </div>
        </div>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <h2>Variance gate</h2>
                <p className="muted">
                  The approver sees money, not a quantity difference, and cannot
                  be one of the counters.
                </p>
              </div>
              <span className="subtle-tag">Maker-checker</span>
            </div>
            <div className="three-cards">
              <div>
                <small>Value at stake</small>
                <h3>{inr(adjustmentValue)}</h3>
                <p>
                  {cpuGap} serialized CPUs at {inr(cpu.unitValue)}. Unit values
                  are illustrative; valuation policy is an open decision.
                </p>
              </div>
              <div>
                <small>Raised by</small>
                <h3>Ravi Kulkarni · stores</h3>
                <p>
                  Waiting in the approvals desk as APR-0127 with the count sheet
                  attached as evidence.
                </p>
              </div>
              <div>
                <small>Corrected by transfer</small>
                <h3>{inr(transferValue)}</h3>
                <p>
                  One enclosure counted twice. Custody moves it, a count does not
                  write it off.
                </p>
              </div>
            </div>
            <div className="form-footer">
              <p className="muted">
                {countStage >= 2
                  ? "Posted movements stay as they are. Session state only."
                  : "No ledger is written. The sequence is the design."}
              </p>
              <div className="header-actions">
                {countStage >= 1 && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "Self-approval refused: Ravi Kulkarni counted this line, so the count team cannot approve its own variance.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Try approving as the counter
                  </button>
                )}
                {countStage === 0 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setCountStage(1);
                      notify(
                        `APR-0127 raised: ${inr(adjustmentValue)} at stake, evidence is the count sheet, approver is outside the count team.`,
                      );
                    }}
                  >
                    <ArrowUpRight size={15} />
                    Request variance approval
                  </button>
                )}
                {countStage === 1 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setCountStage(2);
                      notify(
                        `ADJ-0018 posted: on hand 16 → ${16 - cpuGap}, available 4 → ${4 - cpuGap}, value −${inr(adjustmentValue)}.`,
                      );
                    }}
                  >
                    <CheckCheck size={16} />
                    Approve as store manager
                  </button>
                )}
                {countStage === 2 && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "A posted movement cannot be edited or deleted. Correcting an adjustment means posting an opposite event.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Edit ADJ-0018
                  </button>
                )}
                {countStage === 2 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setCountStage(3);
                      notify(
                        "ADJ-0019 posted as a compensating movement. ADJ-0018 stays on the ledger exactly as approved.",
                      );
                    }}
                  >
                    <ArrowLeftRight size={15} />
                    ADJ-0018 was wrong · reverse it
                  </button>
                )}
                {countStage >= 3 && (
                  <button className="button primary" disabled>
                    <CheckCircle2 size={16} />
                    Reversed by ADJ-0019
                  </button>
                )}
              </div>
            </div>
          </section>
          <section className="card padded">
            <h2>Movement trail</h2>
            {trail.map((t) => (
              <div className="checklist-line" key={t.what}>
                <span className={t.done ? "checked-box" : "unchecked-box"}>
                  {t.done && <Check size={14} />}
                </span>
                <span>{t.what}</span>
                <small>{t.state}</small>
              </div>
            ))}
            <div className="note-box">
              <TriangleAlert size={16} />
              A counted quantity below zero stays blocked while the
              negative-stock policy is undecided.
            </div>
            <div className="detail-side">
              {detailLink(
                "Inventory",
                "See the enclosure that caused the variance",
                "Subcontract",
              )}
              {detailLink("Inventory", "Review the posted issue", "Movements")}
              {detailLink("Dashboard", "Open APR-0127 in the approvals desk")}
            </div>
          </section>
        </div>
      </>
    );
  }
  const outstandingAt = (line: SubcontractLine) =>
    line.issued - line.consumed - line.returned - line.damaged;
  function subcontractView() {
    const writtenOff = subStage >= 3;
    const totals = subcontractLines.reduce(
      (t, l) => ({
        issued: t.issued + l.issued,
        consumed: t.consumed + l.consumed,
        returned: t.returned + l.returned,
        damaged: t.damaged + l.damaged,
        outstanding: t.outstanding + outstandingAt(l),
      }),
      { issued: 0, consumed: 0, returned: 0, damaged: 0, outstanding: 0 },
    );
    const partnerValue = subcontractLines.reduce(
      (sum, l) => sum + outstandingAt(l) * l.unitValue,
      0,
    );
    const damageValue = subcontractLines.reduce(
      (sum, l) => sum + l.damaged * l.unitValue,
      0,
    );
    const bannerStatus = [
      "Evidence pending",
      "Variance open",
      "Variance in review",
      "Write-off posted",
    ][subStage];
    const issues = [...new Set(subcontractLines.map((l) => l.issue))];
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <Warehouse size={28} />
          </span>
          <div>
            <span className="eyebrow">SI-0044 · SI-0039 · PARTNER BENCHES</span>
            <h2>Subcontract issue and reconciliation</h2>
            <p>
              Vector Controls and Axis Industrial · company material issued
              against PO-0118 work packages
            </p>
          </div>
          <Badge status={bannerStatus} />
        </div>
        <div className="inventory-summary">
          <div>
            <h2>Still company stock</h2>
            <p>
              Issued {totals.issued} = consumed {totals.consumed} + returned{" "}
              {totals.returned} + damaged {totals.damaged} + outstanding{" "}
              {totals.outstanding}. If the four buckets do not add up to issued,
              the package cannot close.
            </p>
          </div>
          <div className="stock-metric">
            <strong>
              {totals.outstanding}
              <span>units</span>
            </strong>
            <small>Outstanding</small>
            <i />
          </div>
          <div className="stock-metric">
            <strong>{inr(partnerValue)}</strong>
            <small>Value at partners</small>
            <i />
          </div>
          <div className="stock-metric warning">
            <strong>
              1<span>package</span>
            </strong>
            <small>Reconciliation overdue</small>
            <i />
          </div>
        </div>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Reconciliation by work package</h2>
              <p className="muted">
                Every bucket is a posted movement. Damage and loss are decisions
                with evidence, not rounding.
              </p>
            </div>
            <span className="subtle-tag">{issues.length} issues · 4 lines</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Material",
                    "Issue · work package · custodian",
                    "Issued",
                    "Consumed",
                    "Returned",
                    "Damaged",
                    "Outstanding",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subcontractLines.map((l) => {
                  const open = outstandingAt(l);
                  const damagedLine = l.damaged > 0;
                  return (
                    <tr key={`${l.issue}-${l.material}`}>
                      <td>
                        <strong>{l.material}</strong>
                        <small>{l.note}</small>
                      </td>
                      <td>
                        <strong>{l.issue}</strong>
                        <small>{l.package}</small>
                        <small>{l.custodian}</small>
                        <small>
                          <Badge status={l.review} />
                        </small>
                      </td>
                      <td>{l.issued}</td>
                      <td>{l.consumed}</td>
                      <td>{l.returned}</td>
                      <td>
                        {l.damaged}
                        {damagedLine && (
                          <small>
                            {writtenOff
                              ? "OW-0007 write-off posted"
                              : "Report not recorded yet"}
                          </small>
                        )}
                      </td>
                      <td>
                        {open > 0 ? (
                          <>
                            <strong>{open}</strong>
                            <small>{inr(open * l.unitValue)}</small>
                          </>
                        ) : (
                          <Badge status="Reconciled" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <h2>Damage decision gate</h2>
                <p className="muted">
                  One 24V supply burnt on the partner's bench. It stays company
                  property until an approved write-off moves it.
                </p>
              </div>
              <span className="subtle-tag">Evidence first</span>
            </div>
            <div className="three-cards">
              <div>
                <small>Value pending decision</small>
                <h3>{inr(damageValue)}</h3>
                <p>Charged to PRJ-0258 once the write-off is approved.</p>
              </div>
              <div>
                <small>Custody</small>
                <h3>Salim Khot</h3>
                <p>
                  Changed hands on 04 Nov. The package keeps both custodians in
                  the trail.
                </p>
              </div>
              <div>
                <small>Acceptance</small>
                <h3>Not yet tied</h3>
                <p>
                  Returned assemblies link to accepted quantity before
                  consumption posts.
                </p>
              </div>
            </div>
            <div className="form-footer">
              <p className="muted">
                Session state only · no issue, receipt or valuation is posted.
              </p>
              <div className="header-actions">
                {subStage >= 1 && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "Outstanding cannot be edited. Nothing reduces it except a posted movement against SI-0044.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Zero the outstanding figure
                  </button>
                )}
                {subStage === 0 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setSubStage(1);
                      notify(
                        "Partner damage report and bench-test log recorded against SI-0044. A variance can now be raised.",
                      );
                    }}
                  >
                    <FileText size={15} />
                    Record the partner report
                  </button>
                )}
                {subStage === 1 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setSubStage(2);
                      notify(
                        `APR-0121 raised: ${inr(damageValue)} at stake, maker Arjun Mehta, evidence attached. It waits in the approvals desk.`,
                      );
                    }}
                  >
                    <ArrowUpRight size={15} />
                    Raise variance for approval
                  </button>
                )}
                {subStage === 2 && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "Self-approval refused: Arjun Mehta raised APR-0121, so he cannot approve it. Hand it to an approver outside the maker's line.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Approve as the maker
                  </button>
                )}
                {subStage === 2 && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setSubStage(3);
                      notify(
                        `OW-0007 posted: 1 unit scrapped, ${inr(damageValue)} charged. Outstanding stays at ${totals.outstanding} because the write-off moved the damaged unit, not the missing ones.`,
                      );
                    }}
                  >
                    <CheckCheck size={16} />
                    Approve as operations head
                  </button>
                )}
                {writtenOff && (
                  <button className="button primary" disabled>
                    <CheckCircle2 size={16} />
                    OW-0007 posted
                  </button>
                )}
              </div>
            </div>
          </section>
          <section className="card padded">
            <h2>Custody and ownership</h2>
            <p className="muted">
              Material at a partner is reported inside the company balance until
              work acceptance. Only the address changes.
            </p>
            <div className="note-box">
              <TriangleAlert size={16} />
              SI-0039 is fully consumed but its reconciliation was due 28 Oct.
              Overdue, not closed.
            </div>
            <div className="detail-side">
              {detailLink(
                "Purchase",
                "Review the PO-0118 subcontract line",
                "Overview",
              )}
              {detailLink("Projects", "PRJ-0258 · MCC panel installation")}
              {detailLink(
                "Inventory",
                "The count that found the missing enclosure",
                "Counts",
              )}
            </div>
          </section>
        </div>
      </>
    );
  }
  function supplierComparison() {
    return (
      <>
        <div className="section-intro">
          <span className="eyebrow">RFQ-0041 · PRJ-0264</span>
          <h2>Supplier quotation comparison</h2>
          <p>
            PLC & I/O modules · 8 units · Technical fit, timing and price in one
            view.
          </p>
        </div>
        <div className="supplier-grid">
          {[
            {
              name: "Precision Instruments",
              price: "₹2,84,000",
              lead: "7 days",
              fit: "Compliant",
              note: "Recommended for technical fit",
              status: "Preferred offer",
            },
            {
              name: "Vector Controls",
              price: "₹2,68,500",
              lead: "18 days",
              fit: "Clarification needed",
              note: "Delivery exceeds required date",
              status: "In review",
            },
            {
              name: "Axis Industrial",
              price: "₹3,02,400",
              lead: "9 days",
              fit: "Compliant",
              note: "Alternate supplier",
              status: "Available",
            },
          ].map((v, i) => (
            <section
              className={`card supplier ${i === 0 ? "recommended" : ""}`}
              key={v.name}
            >
              <span className="eyebrow">
                SUPPLIER {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{v.name}</h2>
              <Badge status={v.status} />
              <strong className="supplier-price">
                {v.price}
                <small>Illustrative offer · tax basis to validate</small>
              </strong>
              <dl>
                <div>
                  <dt>Lead time</dt>
                  <dd>{v.lead}</dd>
                </div>
                <div>
                  <dt>Technical fit</dt>
                  <dd>{v.fit}</dd>
                </div>
                <div>
                  <dt>Payment terms</dt>
                  <dd>Proposed · review</dd>
                </div>
              </dl>
              <p>{v.note}</p>
              <button
                className={`button ${i === 0 ? "primary" : ""}`}
                onClick={() =>
                  setModal({
                    kind: "draft",
                    title: `Selection rationale · ${v.name}`,
                  })
                }
              >
                Record selection rationale
                <ArrowRight size={15} />
              </button>
            </section>
          ))}
        </div>
        <div className="note-box">
          <ShieldCheck size={16} />
          Selection needs a documented reason and approval. Lowest price alone
          does not authorize a purchase order.
        </div>
      </>
    );
  }
  function serviceView() {
    return (
      <>
        <div className="service-summary">
          <div>
            <h2>Service work queue</h2>
            <p>
              Contract entitlement, equipment history and the next action
              together.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              setModal({
                kind: "record",
                title: tickets[0].name,
                row: tickets[0],
              })
            }
          >
            Open priority ticket
            <ArrowRight size={16} />
          </button>
        </div>
        <section className="card">
          {table(tickets, {
            main: "Service ticket",
            owner: "Assigned engineer",
            value: "Coverage / response",
            date: "Visit date",
          })}
        </section>
        <div className="note-box">
          <Clock3 size={17} />
          SLA target shown as a sample timestamp. Contract calendars and pause
          rules are not configured.
        </div>
      </>
    );
  }
  function reportsView() {
    const cats = [
      "All reports",
      "Projects",
      "Supply chain",
      "Service",
      "People",
    ];
    return (
      <>
        <div className="report-header">
          <div>
            <h2>Report catalogue</h2>
            <p>Defined sources, clear periods and a path back to the record.</p>
          </div>
          <FileChartColumn size={64} />
        </div>
        <ProductTabs
          items={cats.map((c) => ({ label: c, value: c }))}
          value={tab === "Overview" ? "All reports" : tab}
          onChange={setTab}
        />
        <div className="report-grid">
          {[
            {
              name: "Project portfolio",
              cat: "Projects",
              icon: BriefcaseBusiness,
              desc: "Milestones, ownership and delivery risk.",
              data: projects,
            },
            {
              name: "Material availability",
              cat: "Supply chain",
              icon: Boxes,
              desc: "Available, reserved and QC-held components.",
              data: stock,
            },
            {
              name: "Procurement register",
              cat: "Supply chain",
              icon: ShoppingCart,
              desc: "Requisitions, orders and receipt status.",
              data: purchases,
            },
            {
              name: "Service & calibration",
              cat: "Service",
              icon: Wrench,
              desc: "Equipment coverage and service exceptions.",
              data: assets,
            },
            {
              name: "Engineer deployment",
              cat: "People",
              icon: Users,
              desc: "Assignments, location and availability.",
              data: people,
            },
            {
              name: "Commercial pipeline",
              cat: "Projects",
              icon: TrendingUp,
              desc: "Opportunity ownership and next milestones.",
              data: opportunities,
            },
          ]
            .filter(
              (c) =>
                tab === "Overview" || tab === "All reports" || c.cat === tab,
            )
            .map((c) => (
              <section className="card report-tile" key={c.name}>
                <div className="report-icon">
                  <c.icon size={23} />
                </div>
                <span className="eyebrow">{c.cat}</span>
                <h3>{c.name}</h3>
                <p>{c.desc}</p>
                <small>Source: synthetic fixture · IST · Updated 03 Nov</small>
                <button
                  className="text-button"
                  onClick={() =>
                    exportRows(
                      c.data,
                      c.name.toLowerCase().replaceAll(" ", "-"),
                    )
                  }
                >
                  Export demo CSV
                  <ArrowDownToLine size={15} />
                </button>
              </section>
            ))}
        </div>
        <div className="note-box">
          <LockKeyhole size={17} />
          Payroll exports require separately authorized access. Scheduled
          delivery and report formulas need confirmation.
        </div>
      </>
    );
  }
  function payrollView() {
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <LockKeyhole size={28} />
          </span>
          <div>
            <h2>Payroll run controls</h2>
            <p>
              Salary records require explicit payroll permission, independent of
              system administration.
            </p>
          </div>
        </div>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <span className="eyebrow">NOVEMBER 2026 · DRAFT RUN</span>
                <h2>Payroll review</h2>
              </div>
              <Badge status="Policy confirmation required" />
            </div>
            <div className="payroll-steps">
              {["Inputs", "Preview", "Review", "Finalize"].map((s, i) => (
                <span key={s} className={i === 0 ? "active" : ""}>
                  <i>{i + 1}</i>
                  {s}
                </span>
              ))}
            </div>
            {[
              "Attendance input approval",
              "Salary structure effective dates",
              "Statutory policy applicability",
              "Independent reviewer assignment",
            ].map((s, i) => (
              <div className="checklist-line" key={s}>
                <span className="unchecked-box" />
                <span>{s}</span>
                <Badge
                  status={i === 2 ? "Decision required" : "Pending review"}
                />
              </div>
            ))}
            <div className="form-footer">
              <span className="muted">
                No salaries or statutory calculations in this demo.
              </span>
              <button
                className="button primary"
                onClick={() =>
                  notify(
                    "Run blocked: payroll policies and approved inputs are required before calculation.",
                  )
                }
              >
                <LockKeyhole size={15} />
                Check run readiness
              </button>
            </div>
          </section>
          <section className="card padded warm">
            <ShieldCheck size={24} />
            <h3>Restricted payroll data</h3>
            <p>
              Pay inputs, payslips and bank details need restricted access,
              maker-checker review and audit history.
            </p>
            <p className="muted">
              This page illustrates that boundary. It does not enforce
              production security.
            </p>
            {detailLink("User Management", "Review role boundaries")}
          </section>
        </div>
      </>
    );
  }
  function userView() {
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <ShieldCheck size={27} />
          </span>
          <div>
            <h2>Access administration</h2>
            <p>
              Illustrative role matrix · Production policies require server-side
              enforcement and testing.
            </p>
          </div>
        </div>
        <section className="card">
          <div className="card-heading">
            <h2>Role boundaries</h2>
            <span className="subtle-tag">Proposed · validate in FRD</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Role",
                    "Projects",
                    "Stock / purchase",
                    "HR",
                    "Payroll",
                    "Administration",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Operations lead",
                    "Scoped review",
                    "Approve by authority",
                    "Summary only",
                    "Denied",
                    "Denied",
                  ],
                  [
                    "Project manager",
                    "Assigned projects",
                    "Request / view",
                    "Deployment only",
                    "Denied",
                    "Denied",
                  ],
                  [
                    "Service engineer",
                    "Assigned work",
                    "Spare requests",
                    "Self-service",
                    "Own payslip only",
                    "Denied",
                  ],
                  [
                    "Payroll operator",
                    "Cost references",
                    "Denied",
                    "Approved inputs",
                    "Prepare run",
                    "Denied",
                  ],
                  [
                    "System administrator",
                    "No default access",
                    "No default access",
                    "Identity mapping",
                    "Denied",
                    "Manage users",
                  ],
                ].map((r) => (
                  <tr key={r[0]}>
                    {r.map((s, i) => (
                      <td key={i}>
                        {i === 0 ? (
                          <strong>{s}</strong>
                        ) : s === "Denied" ? (
                          <span className="permission-denied">
                            <LockKeyhole size={12} />
                            Denied
                          </span>
                        ) : (
                          s
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="three-cards utility-cards">
          {[
            {
              icon: ClipboardCheck,
              title: "Approval authority",
              text: "Maker, checker, value threshold and delegation.",
            },
            {
              icon: FileText,
              title: "Audit & evidence",
              text: "Actor, record, timestamp and controlled changes.",
            },
            {
              icon: Settings2,
              title: "Integration status",
              text: "External accounting provider not configured.",
            },
          ].map((c) => (
            <button
              className="card padded"
              key={c.title}
              onClick={() => setModal({ kind: "help", title: c.title })}
            >
              <c.icon size={22} />
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </>
    );
  }
  function standardPage() {
    let tabs =
      route === "Inventory"
        ? [
            "Stock",
            "Requirements",
            "Panel assembly",
            "Movements",
            "Counts",
            "Subcontract",
          ]
        : route === "Assets"
          ? ["Register", "Service desk", "Calibration", "Contracts"]
          : route === "Purchase"
            ? ["Overview", "Supplier comparison"]
            : route === "Projects"
              ? ["Overview", "Project detail"]
              : route === "HR"
                ? ["People", "Deployment", "Leave & attendance"]
                : route === "CRM"
                  ? ["Pipeline", "List"]
                  : route === "Sales"
                    ? ["Orders & quotations", "Billing advice"]
                    : [];
    return (
      <>
        <div className="welcome-row">
          <div>
            <span className="eyebrow">
              ABC LIMITED /{" "}
              {route === "User Management"
                ? "ADMINISTRATION"
                : route === "HR" || route === "Payroll"
                  ? "PEOPLE"
                  : "WORKSPACE"}
            </span>
            <h1>{route}</h1>
            <p>{descriptions[route]}</p>
          </div>
          <div className="header-actions">
            {route !== "Payroll" && route !== "User Management" && (
              <button
                className="button"
                onClick={() => exportRows(rows, route.toLowerCase())}
              >
                <ArrowDownToLine size={15} />
                Export
              </button>
            )}
            {!["Reports", "Payroll", "User Management"].includes(route) && (
              <button
                className="button primary"
                onClick={() =>
                  setModal({
                    kind: "draft",
                    title: `New ${route === "Projects" ? "project" : route === "Purchase" ? "purchase request" : route === "Assets" ? "asset or service record" : route === "Inventory" ? "stock request" : route === "HR" ? "people request" : route === "CRM" ? "opportunity" : "commercial record"}`,
                  })
                }
              >
                <Plus size={16} />
                Create draft
              </button>
            )}
          </div>
        </div>
        <div className="scope-row">
          <span className="inline-items">
            <span className="demo-pill">DEMO DATA</span>Representative design
            screens · Full scope in attached plan
          </span>
          <span>One company · Seven verticals</span>
        </div>
        {tabs.length > 0 && (
          <ProductTabs
            items={tabs.map((t, i) => ({
              label: t,
              value: t,
              count:
                i === 0 && dataset[route]
                  ? dataset[route]!.length +
                    drafts.filter((d) => d.module === route).length
                  : undefined,
            }))}
            value={tab === "Overview" ? tabs[0] : tab}
            onChange={(t) => {
              setTab(t);
              setFilter("All statuses");
              setQuery("");
            }}
          />
        )}
        {route === "Reports" ? (
          reportsView()
        ) : route === "Payroll" ? (
          payrollView()
        ) : route === "User Management" ? (
          userView()
        ) : route === "Projects" && tab === "Project detail" ? (
          projectDetail()
        ) : route === "Inventory" && tab === "Panel assembly" ? (
          assembly()
        ) : route === "Inventory" && tab === "Requirements" ? (
          requirementView()
        ) : route === "Inventory" && tab === "Counts" ? (
          countsView()
        ) : route === "Inventory" && tab === "Subcontract" ? (
          subcontractView()
        ) : route === "Purchase" && tab === "Supplier comparison" ? (
          supplierComparison()
        ) : route === "Assets" && tab === "Service desk" ? (
          serviceView()
        ) : route === "Assets" && tab === "Calibration" ? (
          <>
            <div className="feature-banner">
              <CalendarDays size={30} />
              <div>
                <h2>Calibration schedule</h2>
                <p>AST-0086 · Digital pressure calibrator · Due 05 Nov 2026</p>
              </div>
              <Badge status="Calibration due" />
            </div>
            <section className="card padded">
              <h2>CAL-0096 · Planned calibration</h2>
              <p className="muted">
                Reference instrument, results, certificate attachment and next
                due date are design fields. Certificate authoring depth is
                undecided.
              </p>
              <div className="three-cards">
                <div>
                  <small>Custodian</small>
                  <h3>Priya Menon</h3>
                </div>
                <div>
                  <small>Equipment ownership</small>
                  <h3>Company-owned</h3>
                </div>
                <div>
                  <small>Evidence state</small>
                  <h3>Pending attachment</h3>
                </div>
              </div>
              <button
                className="button"
                onClick={() =>
                  notify(
                    "No certificate attached. The design uses attachment-only evidence until scope is confirmed.",
                  )
                }
              >
                <FileText size={16} />
                Review evidence state
              </button>
            </section>
          </>
        ) : route === "Assets" && tab === "Contracts" ? (
          <section className="card padded">
            <span className="eyebrow">AMC-0031 · NORTHSTAR PHARMA</span>
            <h2>Service contract coverage</h2>
            <p>
              AST-0042 · Pune plant · Illustrative contract · Valid through 28
              Nov 2026
            </p>
            <div className="three-cards">
              <div>
                <small>Coverage</small>
                <h3>Preventive & reactive</h3>
              </div>
              <div>
                <small>SLA policy</small>
                <h3>To be validated</h3>
              </div>
              <div>
                <small>Renewal</small>
                <h3>28 November</h3>
              </div>
            </div>
            {detailLink(
              "Assets",
              "Review covered service tickets",
              "Service desk",
            )}
            {detailLink(
              "Sales",
              "Review recurring billing advice",
              "Billing advice",
            )}
          </section>
        ) : route === "Inventory" && tab === "Movements" ? (
          <section className="card padded">
            <h2>Issue material with the right evidence.</h2>
            <p className="muted">
              Try the two cases below. No real stock ledger is changed.
            </p>
            <div className="three-cards">
              <div>
                <Badge status="QC hold" />
                <h3>Pressure transmitter</h3>
                <p>6 units quarantined · GRN-0073</p>
                <button
                  className="button"
                  onClick={() =>
                    notify(
                      "Issue blocked: QC-held stock is unavailable. Inspection release is required.",
                    )
                  }
                >
                  <LockKeyhole size={15} />
                  Try issuing held material
                </button>
              </div>
              <div>
                <Badge status={issueDone ? "Completed" : "Available"} />
                <h3>24V power supply</h3>
                <p>
                  {issueDone
                    ? "Demo issue recorded: 2 units to PRJ-0264."
                    : "38 available · issue 2 to PRJ-0264"}
                </p>
                <button
                  className="button primary"
                  disabled={issueDone}
                  onClick={() => {
                    setIssueDone(true);
                    notify(
                      "Demo issue recorded. Local session state only; no persistent stock posting.",
                    );
                  }}
                >
                  <PackageCheck size={15} />
                  {issueDone
                    ? "Demo issue recorded"
                    : "Simulate eligible issue"}
                </button>
              </div>
            </div>
          </section>
        ) : route === "CRM" && tab !== "List" ? (
          <div className="pipeline-grid">
            {["Qualification", "Proposal", "Negotiation"].map((stage) => (
              <section className="pipeline-column" key={stage}>
                <div className="column-heading">
                  <strong>{stage}</strong>
                  <span>1</span>
                </div>
                {opportunities
                  .filter((o) => o.status === stage)
                  .map((o) => (
                    <button
                      className="card pipeline-card"
                      key={o.id}
                      onClick={() => openRecord(o)}
                    >
                      <span className="eyebrow">{o.id}</span>
                      <h3>{o.name}</h3>
                      <p>{o.subtitle}</p>
                      <strong className="deal-value">{o.value}</strong>
                      <div>
                        <Avatar name={o.owner} small />
                        <small>{o.owner}</small>
                        <ArrowUpRight size={15} />
                      </div>
                    </button>
                  ))}
              </section>
            ))}
          </div>
        ) : route === "Sales" && tab === "Billing advice" ? (
          <>
            <div className="attention-bar">
              <FileText size={21} />
              <div>
                <strong>Billing advice, with a single invoice owner</strong>
                <span>
                  Accounting platform and invoice source of truth remain
                  undecided.
                </span>
              </div>
            </div>
            <section className="card">
              {table(
                sales.filter((s) => s.id.startsWith("BA-")),
                {
                  main: "Billing advice",
                  owner: "Owner",
                  value: "Illustrative value",
                  date: "Review date",
                },
              )}
            </section>
          </>
        ) : route === "HR" && tab === "Leave & attendance" ? (
          <section className="card padded">
            <h2>Review attendance and leave exceptions.</h2>
            <p className="muted">
              Attendance devices, leave accrual and shift policies need customer
              confirmation. This example demonstrates a correction request.
            </p>
            <div className="checklist-line">
              <Avatar name="Karan Patel" small />
              <span>Karan Patel · 02 Nov · Site visit punch correction</span>
              <Badge status="Pending review" />
            </div>
            <button
              className="button"
              onClick={() =>
                setModal({
                  kind: "draft",
                  title: "Attendance correction request",
                })
              }
            >
              Create demo correction
            </button>
          </section>
        ) : (
          <>
            {route === "Projects" && (
              <div className="project-summary-line">
                <span>
                  <i className="view-dot" />5 active projects
                </span>
                <span>
                  <i className="warning-dot" />1 delivery at risk
                </span>
                <span>
                  ₹1.42 Cr <small>illustrative contract book</small>
                </span>
                <button
                  onClick={() => {
                    setSelected(projects[0]);
                    setTab("Project detail");
                  }}
                >
                  Review PRJ-0264
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            {route === "Inventory" && (
              <div className="inventory-summary">
                <div>
                  <h2>Material availability</h2>
                  <p>Available stock excludes reservations and QC holds.</p>
                </div>
                <div className="stock-metric">
                  <strong>
                    58<span>units</span>
                  </strong>
                  <small>Available</small>
                  <i />
                </div>
                <div className="stock-metric">
                  <strong>
                    30<span>units</span>
                  </strong>
                  <small>Reserved</small>
                  <i />
                </div>
                <div className="stock-metric warning">
                  <strong>
                    6<span>units</span>
                  </strong>
                  <small>On QC hold</small>
                  <i />
                </div>
                <button
                  className="stock-action"
                  onClick={() => setTab("Requirements")}
                >
                  Review demand
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            {route === "HR" && tab === "Deployment" && (
              <div className="note-box">
                <Users size={17} />
                Engineer allocations are illustrative. Check date overlap and
                certification before confirming real deployment.
              </div>
            )}
            <section className="card">
              <div className="table-toolbar">
                <label className="table-search">
                  <Search size={16} />
                  <input
                    aria-label={`Search ${route}`}
                    placeholder={`Search ${route.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="inline-items">
                  <label className="filter-select">
                    <ListFilter size={14} />
                    <select
                      aria-label="Status filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>All statuses</option>
                      {[
                        ...new Set([
                          ...(dataset[route] || []).map((r) => r.status),
                          "Draft",
                        ]),
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="icon-button bordered"
                    aria-label="Explain data columns"
                    onClick={() =>
                      notify(
                        "Columns: record and source link, responsible owner, workflow status, value or reference, and target date.",
                      )
                    }
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                </div>
              </div>
              {table(
                rows,
                route === "Inventory"
                  ? {
                      main: "Item / location",
                      owner: "Store",
                      value: "Availability",
                      date: "Allocation",
                    }
                  : route === "HR"
                    ? {
                        main: "Employee",
                        owner: "Location",
                        value: "Assignment",
                        date: "Assignment end",
                      }
                    : route === "Assets"
                      ? {
                          main: "Asset / ownership",
                          owner: "Custodian",
                          value: "Contract / reference",
                          date: "Service or calibration due",
                        }
                      : {
                          main: route === "Projects" ? "Project" : "Record",
                          owner: "Owner",
                          value: "Value / reference",
                          date: "Target date",
                        },
              )}
            </section>
            {route === "Inventory" && (
              <div className="note-box">
                <ShieldCheck size={16} />
                Available quantity excludes reserved and QC-held stock.
                Valuation policy remains a customer decision.
              </div>
            )}
          </>
        )}
      </>
    );
  }
  return (
    <>
      {landing ? (
        <EntryPage enter={(to, sub) => go(to as Route, sub)} />
      ) : (
        <div className="app-shell">
          <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
            <Logo light />
            <div className="workspace-label">
              <span className="workspace-symbol">A</span>
              <div>
                <strong>ABC workspace</strong>
                <small>Single legal entity</small>
              </div>
              <span
                className="workspace-lock"
                title="Illustrative organization context"
              >
                <LockKeyhole size={13} />
              </span>
            </div>
            <nav aria-label="Main navigation">
              {nav.map((n) => (
                <React.Fragment key={n.name}>
                  {n.group && <span className="nav-group">{n.group}</span>}
                  <button
                    onClick={() => go(n.name)}
                    className={`nav-item ${route === n.name ? "active" : ""}`}
                  >
                    <n.icon size={18} />
                    <span>{n.name}</span>
                    {n.name === "Projects" && <small>5</small>}
                    {n.name === "Dashboard" && route === n.name && (
                      <span className="nav-active-dot" />
                    )}
                  </button>
                </React.Fragment>
              ))}
            </nav>
            <div className="sidebar-footer">
              <div className="help-card">
                <span>
                  <LifeBuoy size={18} />
                  <strong>Workspace reference</strong>
                </span>
                <p>Shortcuts, workflows and demo boundaries.</p>
                <button
                  onClick={() =>
                    setModal({
                      kind: "help",
                      title: "A workspace built around your work",
                    })
                  }
                >
                  Quick reference
                  <ArrowUpRight size={14} />
                </button>
              </div>
              <button
                className="profile-button"
                onClick={() =>
                  setModal({ kind: "help", title: "Demo profile & access" })
                }
              >
                <Avatar name="Arjun Mehta" />
                <span>
                  <strong>Arjun Mehta</strong>
                  <small>{role}</small>
                </span>
                <MoreHorizontal size={17} />
              </button>
            </div>
          </aside>
          {mobileNav && (
            <button
              className="mobile-scrim"
              aria-label="Close navigation"
              onClick={() => setMobileNav(false)}
            />
          )}
          <div className="workspace">
            <header className="topbar">
              <div className="inline-items">
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                  onClick={() => setMobileNav(!mobileNav)}
                >
                  <Menu size={20} />
                </button>
                <span className="breadcrumb">
                  Workspace <ChevronRight size={13} />
                  <strong>{route}</strong>
                </span>
              </div>
              <div className="topbar-actions">
                <button
                  className="global-search"
                  aria-label="Search workspace"
                  onClick={() =>
                    setModal({ kind: "search", title: "Find your next step" })
                  }
                >
                  <Search size={16} />
                  <span>Search anything…</span>
                  <kbd>
                    <Command size={11} /> K
                  </kbd>
                </button>
                <span className="topbar-divider" />
                <label className="role-select">
                  <span className="sr-only">Demo role preview</span>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      notify(
                        "Demo view changed. This is not a security or permission change.",
                      );
                    }}
                  >
                    <option>Operations lead</option>
                    <option>Project manager</option>
                    <option>Service coordinator</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
                <button
                  className="icon-button notification-button"
                  aria-label="Open notifications"
                  onClick={() =>
                    setModal({
                      kind: "notifications",
                      title: "Your activity inbox",
                    })
                  }
                >
                  <Bell size={19} />
                  <i />
                </button>
                <button
                  className="icon-button help-icon"
                  aria-label="Help"
                  onClick={() =>
                    setModal({ kind: "help", title: "Workspace guide" })
                  }
                >
                  <CircleHelp size={19} />
                </button>
              </div>
            </header>
            <main id="main-content" className="main-content" key={route + tab}>
              {route === "Dashboard" ? dashboard() : standardPage()}
              <footer className="workspace-footer">
                <span>
                  ABC Limited <span>·</span> Connected operations
                </span>
                <button
                  onClick={() => {
                    setLanding(true);
                    window.location.hash = "welcome";
                  }}
                >
                  View portal entry
                  <ArrowUpRight size={13} />
                </button>
                <span>
                  Design prototype <span>·</span> v0.3
                </span>
              </footer>
            </main>
          </div>
        </div>
      )}
      <Dialog.Root
        open={!!modal}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        {modal && (
          <Dialog.Portal>
            <Dialog.Overlay className="modal-backdrop" />
            <Dialog.Content
              className={`modal ${modal.kind === "search" ? "search-modal" : modal.kind === "record" ? "record-sheet" : ""}`}
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => {
                if (modal.kind === "search") {
                  e.preventDefault();
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLInputElement>("[cmdk-input]")
                      ?.focus(),
                  );
                }
              }}
            >
              <div className="modal-heading">
                <div>
                  <Dialog.Title asChild>
                    <h2>{modal.title}</h2>
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="icon-button" aria-label="Close dialog">
                    <X size={19} />
                  </button>
                </Dialog.Close>
              </div>

              {modal.kind === "search" ? (
                <SearchDialog
                  go={(r) => {
                    go(r);
                    setModal(null);
                  }}
                />
              ) : modal.kind === "draft" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const id = `DRAFT-${Date.now().toString().slice(-6)}`;
                    setDrafts([
                      ...drafts,
                      {
                        module: route,
                        id,
                        name: String(form.get("name")),
                        subtitle:
                          String(form.get("reference")) ||
                          "Browser-local draft",
                        owner: "Arjun Mehta",
                        status: "Draft",
                        value: "Not submitted",
                        date: "—",
                        notes: String(form.get("notes") || ""),
                      },
                    ]);
                    setTab("Overview");
                    setFilter("All statuses");
                    setQuery("");
                    setModal(null);
                    notify(
                      `${id} saved locally in this browser. No real transaction submitted.`,
                    );
                  }}
                >
                  <div className="note-box">
                    <FileText size={16} />
                    Draft-only demo. This form does not create an approved ERP
                    transaction.
                  </div>
                  <label className="form-field">
                    Record title <span>*</span>
                    <input
                      name="name"
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder="Enter a clear, descriptive title"
                    />
                  </label>
                  <label className="form-field">
                    Source reference
                    <input
                      name="reference"
                      placeholder="For example PRJ-0264 or RFQ-0041"
                      maxLength={120}
                    />
                  </label>
                  <label className="form-field">
                    Notes / rationale
                    <textarea
                      name="notes"
                      placeholder="Describe the need or selection rationale"
                      rows={3}
                    />
                  </label>
                  <div className="form-footer">
                    <button
                      type="button"
                      className="button"
                      onClick={() => setModal(null)}
                    >
                      Cancel
                    </button>
                    <button className="button primary" type="submit">
                      <Check size={15} />
                      Save local draft
                    </button>
                  </div>
                </form>
              ) : modal.kind === "approval" && modal.approval ? (
                <>
                  <div className="approval-detail-meta">
                    <div>
                      <small>Source record</small>
                      <strong>{modal.approval.ref}</strong>
                    </div>
                    <div>
                      <small>Requested by</small>
                      <strong>{modal.approval.maker}</strong>
                    </div>
                    <div>
                      <small>Value / scope</small>
                      <strong>{modal.approval.value}</strong>
                    </div>
                  </div>
                  <div className="note-box">
                    <ShieldCheck size={17} />
                    {modal.approval.maker === "Arjun Mehta"
                      ? "Maker-checker block: you raised this request as Arjun Mehta, so the decision is not yours to take. It stays open until an approver outside the maker's line picks it up."
                      : "Proposed maker-checker review. You are viewing a synthetic approval as Arjun Mehta."}
                  </div>
                  <h3>Review context</h3>
                  <p className="muted">
                    {approvalContext[modal.approval.type] || "Synthetic request."}{" "}
                    Check the supporting record, the approved scope and your
                    authority before a real decision.
                  </p>
                  <div className="document-line">
                    <FileText size={19} />
                    <span>
                      {modal.approval.evidence
                        ? `Evidence · ${modal.approval.evidence} · the file itself is not attached in a prototype`
                        : "Supporting evidence reference · no actual file"}
                    </span>
                  </div>
                  <label className="form-field">
                    Decision reason
                    <textarea
                      id="decision-reason"
                      rows={3}
                      placeholder="Required when rejecting this demo request"
                      aria-invalid={!!approvalError}
                      aria-describedby={
                        approvalError ? "approval-error" : undefined
                      }
                      onChange={() => setApprovalError("")}
                    />
                  </label>
                  {approvalError && (
                    <p className="form-error" id="approval-error" role="alert">
                      {approvalError}
                    </p>
                  )}
                  {decisions[modal.approval.id] ? (
                    <div className="note-box">
                      <CheckCircle2 size={17} />
                      Demo outcome: {decisions[modal.approval.id]}. Actor Arjun
                      Mehta · 03 Nov 2026. No backend audit was written.
                    </div>
                  ) : modal.approval.maker === "Arjun Mehta" ? (
                    <div className="form-footer">
                      <p className="muted">
                        The request stays open. This prototype has no second
                        approver to sign as, so it demonstrates the block rather
                        than the decision.
                      </p>
                      <div className="header-actions">
                        <button
                          className="button primary"
                          onClick={() =>
                            notify(
                              "Demo reassignment raised to the operations head. No decision is recorded against APR-0121.",
                            )
                          }
                        >
                          <ArrowUpRight size={15} />
                          Hand to another approver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="form-footer">
                      <button
                        className="button danger"
                        onClick={() => {
                          const reason = (
                            document.getElementById(
                              "decision-reason",
                            ) as HTMLTextAreaElement
                          )?.value.trim();
                          if (!reason) {
                            setApprovalError(
                              "Enter a reason before rejecting this request.",
                            );
                            return;
                          }
                          setDecisions({
                            ...decisions,
                            [modal.approval!.id]: "Rejected",
                          });
                          notify(
                            "Demo rejection recorded in this session. Correction is required.",
                          );
                        }}
                      >
                        Reject request
                      </button>
                      <button
                        className="button primary"
                        onClick={() => {
                          setDecisions({
                            ...decisions,
                            [modal.approval!.id]: "Approved",
                          });
                          notify(
                            "Demo approval recorded in this session. No purchase or stock transaction executed.",
                          );
                        }}
                      >
                        <Check size={16} />
                        Approve in demo
                      </button>
                    </div>
                  )}
                </>
              ) : modal.kind === "record" && modal.row ? (
                <>
                  <div className="record-modal-meta">
                    <span className="eyebrow">{modal.row.id}</span>
                    <Badge
                      status={
                        modal.row.id === "SR-0148"
                          ? ticketStatus
                          : modal.row.status
                      }
                    />
                  </div>
                  <p className="muted">{modal.row.subtitle}</p>
                  <div className="approval-detail-meta">
                    <div>
                      <small>Responsible owner</small>
                      <strong>{modal.row.owner}</strong>
                    </div>
                    <div>
                      <small>Reference / value</small>
                      <strong>{modal.row.value}</strong>
                    </div>
                    <div>
                      <small>Target / allocation</small>
                      <strong>{modal.row.date}</strong>
                    </div>
                  </div>
                  <h3>Record context</h3>
                  <div className="record-trail">
                    {[
                      "SR-0148",
                      "AST-0042",
                      "PR-0084",
                      "RFQ-0041",
                      "SO-0196",
                    ].includes(modal.row.id) && (
                      <>
                        <span>PRJ-0264</span>
                        <ChevronRight size={14} />
                      </>
                    )}
                    <span>{modal.row.id}</span>
                  </div>
                  <p className="muted">
                    Source reference: {modal.row.subtitle}.{" "}
                    {modal.row.notes && <>Draft notes: {modal.row.notes}</>}{" "}
                    Relationships are illustrative and do not indicate
                    production posting.
                  </p>
                  {modal.row.id === "SR-0148" ? (
                    <>
                      <div className="note-box">
                        <Clock3 size={16} />
                        AMC-0031 · Customer-owned AST-0042 · Response target 03
                        Nov, 14:00 IST · Contract policy to validate.
                      </div>
                      <h3>Visit checklist</h3>
                      {[
                        "Review equipment and service history",
                        "Record diagnostic checks and observations",
                        "Account for spares and customer acknowledgement",
                      ].map((s) => (
                        <label className="checkbox-label" key={s}>
                          <input type="checkbox" />
                          {s}
                        </label>
                      ))}
                      <div className="form-footer">
                        <button
                          className="button"
                          onClick={() => {
                            go("Assets");
                            setModal(null);
                          }}
                        >
                          View equipment
                        </button>
                        <button
                          className="button primary"
                          onClick={() => {
                            setTicketStatus("In progress");
                            notify(
                              "Demo visit started. Timer/SLA integrations are not configured.",
                            );
                          }}
                          disabled={ticketStatus === "In progress"}
                        >
                          <Wrench size={16} />
                          {ticketStatus === "In progress"
                            ? "Visit in progress"
                            : "Start demo visit"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="form-footer">
                      {modal.row.id.startsWith("DRAFT-") ? (
                        <button
                          className="button danger"
                          onClick={() => {
                            setDrafts(
                              drafts.filter((d) => d.id !== modal.row!.id),
                            );
                            setModal(null);
                            notify("Browser-local demo draft discarded.");
                          }}
                        >
                          Discard demo draft
                        </button>
                      ) : (
                        <button
                          className="button"
                          onClick={() => {
                            go("Projects", "Project detail");
                            setSelected(projects[0]);
                            setModal(null);
                          }}
                        >
                          Open demonstration project
                          <ArrowUpRight size={15} />
                        </button>
                      )}
                      <button
                        className="button primary"
                        onClick={() => {
                          setModal(null);
                          notify(
                            "Record reviewed. No production state changed.",
                          );
                        }}
                      >
                        Finish review
                        <Check size={15} />
                      </button>
                    </div>
                  )}
                </>
              ) : modal.kind === "notifications" ? (
                <div className="inbox-list">
                  {approvals.map((a) => (
                    <button
                      className="document-line"
                      key={a.id}
                      onClick={() =>
                        setModal({
                          kind: "approval",
                          title: a.title,
                          approval: a,
                        })
                      }
                    >
                      <ClipboardCheck size={20} />
                      <div>
                        <strong>{a.title}</strong>
                        <small>
                          {a.ref} · {decisions[a.id] || "Review pending"} ·
                          Local demo activity
                        </small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <div className="note-box">
                    <Bell size={16} />
                    Demo inbox only. Email, SMS and external gateways are not
                    connected.
                  </div>
                </div>
              ) : (
                <>
                  <p>
                    This design connects eleven ERP modules for engineering
                    projects, material traceability, panel assembly, assets,
                    service and people operations.
                  </p>
                  <div className="help-links">
                    {[
                      { name: "Follow a project", to: "Projects" },
                      { name: "Review material demand", to: "Inventory" },
                      { name: "Explore service work", to: "Assets" },
                      {
                        name: "Understand role boundaries",
                        to: "User Management",
                      },
                    ].map((l) => (
                      <button
                        className="document-line"
                        key={l.name}
                        onClick={() => {
                          go(l.to as Route);
                          setModal(null);
                        }}
                      >
                        <ArrowUpRight size={17} />
                        {l.name}
                      </button>
                    ))}
                  </div>
                  <div className="note-box">
                    <CircleHelp size={17} />
                    This is a visual prototype with representative screens. The
                    full scope, all 219 entries and unresolved decisions are
                    documented in the workspace Markdown files.
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </Dialog.Root>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function SearchDialog({ go }: { go: (r: Route) => void }) {
  return (
    <ProductCommand
      items={nav.map((n) => ({
        name: n.name,
        icon: n.icon,
        description: descriptions[n.name],
        keywords: n.name === "Projects" ? "PRJ-0264 process automation" : "",
      }))}
      onNavigate={(name) => go(name as Route)}
    />
  );
}

export default App;
