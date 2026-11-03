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
  CalendarClock,
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
  LogIn,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RotateCw,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Target,
  TrendingUp,
  TriangleAlert,
  UserMinus,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  adviceDeliveries,
  assets,
  approvals,
  countLines,
  correctionAck,
  exitLines,
  opportunities,
  people,
  projects,
  purchases,
  raisedPostings,
  sales,
  stock,
  subcontractLines,
  tickets,
  unbilledMilestones,
  type AdviceDelivery,
  type CountLine,
  type DeliveryState,
  type ExitLine,
  type RecordRow,
  type SubcontractLine,
  type UnbilledMilestone,
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
/* One recorded event per posting key. Written as a whole envelope so a row
   cannot show a fixture value that the session has already replaced. */
type ReconEvent = {
  state: DeliveryState;
  attempts: number;
  posted: number | null;
  contact: string;
  external: string;
};
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
  Sales: "Quotations, orders, fulfilment, billing advice and reconciliation.",
  CRM: "Enquiries, opportunity stages and commercial handoffs.",
  HR: "People, deployment, attendance, employee requests and exit handover.",
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
   same thing. The exit screen added the settled tier's other half — returned,
   settled, delegated, checked — because a handover item that has ended has to
   look different from one someone merely promised to do. The reconciliation
   screen added its own three: a posting the provider answered is settled, a
   posting another posting replaced is a dead record rather than a warning, and
   an unbilled amount is money the company is owed, which is a warning. */
function Badge({ status }: { status: string }) {
  const tone = /risk|Urgent|hold|Low|Overdue|Denied|Rejected|Variance|short|Damag|Loss|Fail|Attention|Unbilled/i.test(
    status,
  )
    ? "amber"
    : /track|Available|Approved|service|Completed|Active|Deployed|Matched|Reconciled|Closed|Settled|Returned|Re-owned|Delegated|Checked|Acknowledged/i.test(
        status,
      )
      ? "green"
      : /Draft|Planning|locked|Superseded/i.test(status)
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
  const [exitDone, setExitDone] = useState<string[]>([]);
  const [exitClosed, setExitClosed] = useState(false);
  const [exitDate, setExitDate] = useState("14 Nov 2026");
  const [ticketStatus, setTicketStatus] = useState("Assigned");
  /* Reconciliation state is stored per posting key, not per row, because the
     idempotency key is the subject of every rule on that screen. Each recorded
     event is the whole envelope for that posting — state, attempts, the amount
     the provider returned, when it was last touched and the reference it came
     back with — so no cell can keep a fixture value that the action replaced. */
  const [reconEvents, setReconEvents] = useState<Record<string, ReconEvent>>({});
  const [correctionRaised, setCorrectionRaised] = useState(false);
  const [adviceRaised, setAdviceRaised] = useState(false);
  const [reconRefusals, setReconRefusals] = useState(0);

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
  /* The exit is designed around the records that outlive the person: the
     company-held instrument she custodies, the approved order she owns whose
     delivery falls after her last day, and the review authority that would
     otherwise keep routing to a mailbox nobody opens. */
  function exitView() {
    const done = (key: string) => exitDone.includes(key);
    const close = (key: string, message: string) => {
      setExitDone([...exitDone, key]);
      notify(message);
    };
    const openItems = exitLines.filter(
      (l) => l.key !== "allocation" && !done(l.key),
    );
    const instrumentOut = done("custody") ? 0 : 1;
    const unsignedPaths = done("delegation") ? 0 : 1;
    const plural = (value: number, word: string) =>
      value === 1 ? word : `${word}s`;
    const short: Record<string, string> = {
      identity: "USR-0091 identity",
      custody: "AST-0086 instrument",
      commitment: "PO-0112 order",
      claim: "CLM-0071 claim",
      delegation: "DLG-0007 delegation",
    };
    const settledWord: Record<string, string> = {
      identity: "Deactivated",
      custody: "Returned",
      commitment: "Re-owned",
      claim: "Settled",
      delegation: "Delegated",
    };
    const closingEvent: Record<string, string> = {
      identity: `Deactivated ${exitDate} · 18:30, at the exit date and not after`,
      custody:
        "Received at the central lab store · bench-checked · condition serviceable",
      commitment:
        "Nikhil Joshi owns the delivery now; Priya Menon stays on the approval history as maker",
      claim:
        "Referenced to the full-and-final line. The figure itself is a payroll reference, not a number this screen computes",
      delegation:
        "Effective 15 Nov and expiring when the post is refilled, rather than continuing by default",
      allocation: "Checked against the project, site and asset registers",
    };
    const statusFor = (line: ExitLine) =>
      line.key === "allocation"
        ? "Checked empty"
        : done(line.key)
          ? settledWord[line.key]
          : "Awaiting owner action";
    const bannerStatus = exitClosed
      ? "Exit closed"
      : openItems.length === 0
        ? "Ready to close"
        : "Exit held";
    const rowAction = (line: ExitLine) => {
      if (line.key === "allocation" || done(line.key)) {
        return <small>{closingEvent[line.key]}</small>;
      }
      switch (line.key) {
        case "identity":
          return (
            <button
              className="button"
              onClick={() =>
                close(
                  "identity",
                  `USR-0091 deactivated at ${exitDate} 18:30. Her own login cannot file the instrument return: the store posts the custody event.`,
                )
              }
            >
              <UserMinus size={15} />
              Deactivate at exit
            </button>
          );
        case "custody":
          return (
            <button
              className="button"
              onClick={() =>
                close(
                  "custody",
                  "Custody event posted: AST-0086 received at the central lab store, bench-checked, condition serviceable. CAL-0096 stays due and stays on the calibration schedule.",
                )
              }
            >
              <PackageCheck size={15} />
              Post custody event
            </button>
          );
        case "commitment":
          return (
            <button
              className="button"
              onClick={() =>
                close(
                  "commitment",
                  "PO-0112 re-owned to Nikhil Joshi with the 09 Nov delivery date intact. Priya Menon remains the maker on the approval history.",
                )
              }
            >
              <ArrowLeftRight size={15} />
              Re-own the order
            </button>
          );
        case "claim":
          return (
            <button
              className="button"
              onClick={() =>
                close(
                  "claim",
                  "CLM-0071 accepted and referenced to the full-and-final line. Statutory components are an open decision, so no settlement figure is produced here.",
                )
              }
            >
              <Wallet size={15} />
              Settle the claim
            </button>
          );
        case "delegation":
          return (
            <button
              className="button"
              onClick={() =>
                close(
                  "delegation",
                  "DLG-0007 routes the calibration review queue to the reporting manager from 15 Nov, with an end condition.",
                )
              }
            >
              <Share2 size={15} />
              Delegate from 15 Nov
            </button>
          );
        default:
          return <small>{closingEvent[line.key]}</small>;
      }
    };
    const trail = [
      {
        what: "Resignation accepted · exit effective",
        state: exitDate,
        done: true,
      },
      {
        what: "USR-0091 deactivated at the exit timestamp",
        state: done("identity") ? "Deactivated" : "Pending",
        done: done("identity"),
      },
      {
        what: "AST-0086 custody event at the central lab store",
        state: done("custody") ? "Returned" : "Outstanding",
        done: done("custody"),
      },
      {
        what: "PO-0112 ownership moved before the delivery date",
        state: done("commitment") ? "Re-owned" : "Open",
        done: done("commitment"),
      },
      {
        what: "CLM-0071 referenced to full-and-final",
        state: done("claim") ? "Settled" : "Unsettled",
        done: done("claim"),
      },
      {
        what: "DLG-0007 approval delegation effective",
        state: done("delegation") ? "Delegated" : "Not delegated",
        done: done("delegation"),
      },
      {
        what: "Exit closed against an empty exception report",
        state: exitClosed ? "Closed" : "Held",
        done: exitClosed,
      },
    ];
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <BriefcaseBusiness size={28} />
          </span>
          <div>
            <span className="eyebrow">
              EMP-0091 · EXIT {exitDate.toUpperCase()}
            </span>
            <h2>Exit and handover</h2>
            <p>
              Priya Menon · Calibration Engineer · Quality · resignation
              accepted, last working day {exitDate}
            </p>
          </div>
          <Badge status={bannerStatus} />
        </div>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Handover checklist</h2>
              <p className="muted">
                The checklist is the record. Each line names an owner, a date
                and the event that closes it, and no line closes by being
                ticked.
              </p>
            </div>
            <span className="subtle-tag">
              {openItems.length} of 5 action lines open
            </span>
          </div>
          <div className="table-scroll">
            <table className="wrapped">
              <thead>
                <tr>
                  {[
                    ["Handover item", "20%"],
                    ["Owner and date", "17%"],
                    ["What has to be true", "34%"],
                    ["State and closing event", "29%"],
                  ].map(([t, w]) => (
                    <th key={t} style={{ width: w }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exitLines.map((line) => (
                  <tr key={line.key}>
                    <td>
                      <strong>{line.item}</strong>
                      <small>{line.reference}</small>
                    </td>
                    <td>
                      {line.owner}
                      <small>{line.due}</small>
                    </td>
                    <td>{line.closes}</td>
                    <td>
                      <div className="detail-side">
                        <Badge status={statusFor(line)} />
                        {rowAction(line)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="inventory-summary">
          <div>
            <h2>What has to be empty before she goes</h2>
            <p>
              The exception report is the deliverable. Three counters, and none
              of them clears by editing the number.
            </p>
          </div>
          <div className={`stock-metric${openItems.length ? " warning" : ""}`}>
            <strong>
              {openItems.length}
              <span>{plural(openItems.length, "item")}</span>
            </strong>
            <small>Still open</small>
            <i />
          </div>
          <div
            className={`stock-metric${instrumentOut ? " warning" : ""}`}
          >
            <strong>
              {instrumentOut}
              <span>{plural(instrumentOut, "unit")}</span>
            </strong>
            <small>Company property out</small>
            <i />
          </div>
          <div
            className={`stock-metric${unsignedPaths ? " warning" : ""}`}
          >
            <strong>
              {unsignedPaths}
              <span>{plural(unsignedPaths, "path")}</span>
            </strong>
            <small>Approvals without an approver</small>
            <i />
          </div>
        </div>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <h2>Exit gate</h2>
                <p className="muted">
                  Closure is an event raised against a zero exception report.
                  Until then it is a refusal that names what is still open.
                </p>
              </div>
              <span className="subtle-tag">EMP-0091 · Priya Menon</span>
            </div>
            <div className="three-cards">
              <div>
                <small>Last working day</small>
                <h3>{exitDate}</h3>
                <p>
                  Re-dating is an amendment. The superseded date stays on the
                  record and every dependent date moves with it.
                </p>
              </div>
              <div>
                <small>Exception report</small>
                <h3>
                  {openItems.length} {plural(openItems.length, "line")} open
                </h3>
                <p>
                  {openItems.length === 0
                    ? "Cleared. The exit can be closed, and only now."
                    : openItems.map((l) => short[l.key]).join(" · ")}
                </p>
              </div>
              <div>
                <small>Records not itemised</small>
                <h3>Restricted</h3>
                <p>
                  Payslip, appraisal and medical records stay with HR. A
                  handover lists company property and open commitments, not
                  personal files.
                </p>
              </div>
            </div>
            <div className="form-footer">
              <p className="muted">
                {exitClosed
                  ? "Closed record. Nothing was written to an identity, an asset register or a payroll run."
                  : "Session state. No access change, custody event or settlement is executed."}
              </p>
              <div className="header-actions">
                {!exitClosed && !done("custody") && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "Recovery is a custody event with a receiver, a condition and a time. A list item cannot clear company property, so nothing is marked returned.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Mark the instrument returned
                  </button>
                )}
                {!exitClosed && done("identity") && (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "A deactivated identity is not re-animated to satisfy a checklist. Access needed after exit is a new provisioning request with a reason, not the old account turned back on.",
                      )
                    }
                  >
                    <LogIn size={15} />
                    Reopen her account to finish
                  </button>
                )}
                {exitClosed ? (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        "A closed exit is not reopened by editing it. Anything found afterwards becomes a new exception line on a new effective-dated record.",
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Reopen the checklist
                  </button>
                ) : openItems.length > 0 ? (
                  <button
                    className="button"
                    onClick={() =>
                      notify(
                        `Exit held: ${openItems
                          .map((l) => short[l.key])
                          .join(", ")} still open. Access can end on the day; the exit cannot close while company property is out and a live order has no owner.`,
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Try closing the exit
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={() => {
                      setExitClosed(true);
                      notify(
                        "Exit closed at 18:30 against an empty exception report: five action lines closed by an event, one checked and empty, nothing left open.",
                      );
                    }}
                  >
                    <CheckCheck size={16} />
                    Close exit at 18:30
                  </button>
                )}
                {!exitClosed && (
                  <button
                    className="button"
                    onClick={() => {
                      setExitDate("20 Nov 2026");
                      notify(
                        "Exit re-dated to 20 Nov 2026. The deactivation timestamp, the custody due date and DLG-0007's start date move with it; 14 Nov remains on the record as the superseded value.",
                      );
                    }}
                  >
                    <CalendarClock size={15} />
                    Move last working day
                  </button>
                )}
              </div>
            </div>
          </section>
          <section className="card padded">
            <h2>Handover trail</h2>
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
              States this layout has to carry: instrument not returned, a
              revoked account used anyway, claim pending after exit, delegation
              expired, exit date moved, checklist reopened.
            </div>
            <div className="detail-side">
              {detailLink(
                "Assets",
                "AST-0086 on the calibration schedule",
                "Calibration",
              )}
              {detailLink("Purchase", "PO-0112 in the order list", "Overview")}
              {detailLink(
                "User Management",
                "Identity, provisioning and privileged review",
              )}
              {detailLink(
                "Payroll",
                "Where a full-and-final figure would come from",
              )}
            </div>
          </section>
        </div>
      </>
    );
  }
  /* The reconciliation half of E2E-10, which is the surface an ERP design
     normally delivers as a log table because everything it would have to say
     depends on an accounting platform the client has not chosen. So it says it
     as behavior instead: an outbox addressed by idempotency key rather than by
     advice number, a retry that may only reuse the key, an unanswered send that
     is not a failed send, a mismatch that refuses to be re-sent, a milestone
     that becomes an advice only when the evidence carries it, and a payload the
     session role is not entitled to read. */
  function reconView() {
    const event = (d: AdviceDelivery) => reconEvents[d.key];
    const stateOf = (d: AdviceDelivery): DeliveryState =>
      event(d)?.state ?? d.state;
    const attemptsOf = (d: AdviceDelivery) => event(d)?.attempts ?? d.attempts;
    const postedOf = (d: AdviceDelivery) => event(d)?.posted ?? d.posted;
    const contactOf = (d: AdviceDelivery) => event(d)?.contact ?? d.lastAttempt;
    const externalOf = (d: AdviceDelivery) => event(d)?.external ?? d.external;
    const record = (d: AdviceDelivery, next: Partial<ReconEvent>) =>
      setReconEvents((prev) => ({
        ...prev,
        [d.key]: {
          state: prev[d.key]?.state ?? d.state,
          attempts: prev[d.key]?.attempts ?? d.attempts,
          posted: prev[d.key]?.posted ?? d.posted,
          contact: prev[d.key]?.contact ?? d.lastAttempt,
          external: prev[d.key]?.external ?? d.external,
          ...next,
        },
      }));
    const postings = [
      ...adviceDeliveries,
      ...(correctionRaised ? [raisedPostings.correction] : []),
      ...(adviceRaised ? [raisedPostings.unbilled] : []),
    ];
    /* A correction posting explains a mismatched amount; it does not close it.
       Only the provider's answer to the corrected advice closes it, and that
       answer is inbound — the screen can record it, not invent it. */
    const corrected = raisedPostings.correction;
    const mismatched =
      adviceDeliveries.find((d) => d.state === "Needs attention") ??
      adviceDeliveries[0];
    const answered = (d: AdviceDelivery) =>
      postings.some(
        (p) =>
          p.advice === d.advice &&
          p.key !== d.key &&
          stateOf(p) === "Acknowledged" &&
          postedOf(p) !== null &&
          postedOf(p) === p.amount,
      );
    const displayState = (d: AdviceDelivery): DeliveryState =>
      stateOf(d) === "Superseded" && answered(d) ? "Reconciled" : stateOf(d);
    const diffOf = (d: AdviceDelivery) => {
      const returned = postedOf(d);
      return returned === null ? null : returned - d.amount;
    };
    const unexplained = postings.reduce((total, d) => {
      const difference = diffOf(d);
      if (difference === null || difference === 0 || answered(d)) return total;
      return total + Math.abs(difference);
    }, 0);
    const adviceName = (m: UnbilledMilestone) =>
      m.advice !== ""
        ? m.advice
        : m.key === "performance" && adviceRaised
          ? "BA-0064"
          : "";
    const advised = (m: UnbilledMilestone) => adviceName(m) !== "";
    const unbilledLines = unbilledMilestones.filter(
      (m) => m.eligible && !advised(m),
    );
    const unbilled = unbilledLines.reduce((total, m) => total + m.amount, 0);
    const attention = postings.filter(
      (d) => displayState(d) === "Needs attention",
    );
    const inFlight = postings.filter((d) => {
      const s = displayState(d);
      return s === "Queued" || s === "Sent" || s === "Failed";
    });
    const plural = (value: number, word: string) =>
      value === 1 ? word : `${word}s`;
    const refusal = (message: string) => {
      setReconRefusals((n) => n + 1);
      notify(message);
    };
    const hand = (d: AdviceDelivery) => {
      record(d, {
        state: "Sent",
        attempts: attemptsOf(d) + 1,
        contact: "Handed to the provider this session",
      });
      notify(
        `${d.key} handed to the provider under its own key. The advice is not editable while a posting is in flight.`,
      );
    };
    const bannerStatus = attention.length
      ? "Needs attention"
      : unbilled
        ? "Unbilled earned"
        : unexplained
          ? "Awaiting an answer"
          : inFlight.length
            ? "In flight"
            : "Reconciled";
    const rowAction = (d: AdviceDelivery) => {
      const s = displayState(d);
      if (s === "Acknowledged") {
        return (
          <small>
            Reconciled against {externalOf(d)}. The amounts are equal, there is
            nothing to do, and the line stays visible as evidence of a clean
            match.
          </small>
        );
      }
      if (s === "Reconciled") {
        return (
          <small>
            Answered by {corrected.key} at {inr(corrected.amount)} against{" "}
            {externalOf(corrected)}. The wrong posting stays on the record with
            its difference named, because a reconciliation that hides it cannot
            be audited.
          </small>
        );
      }
      if (s === "Superseded") {
        return (
          <small>
            Superseded by {corrected.key}, which is still awaiting the provider.
            The wrong posting stays on the record, because a reconciliation that
            hides it cannot be audited.
          </small>
        );
      }
      if (s === "Queued") {
        return (
          <button className="button" onClick={() => hand(d)}>
            <Share2 size={15} />
            Hand to provider
          </button>
        );
      }
      if (s === "Sent") {
        if (d.key === corrected.key) {
          return (
            <button
              className="button"
              onClick={() => {
                record(d, {
                  state: "Acknowledged",
                  posted: correctionAck.posted,
                  contact: `ACK ${correctionAck.received} recorded this session`,
                  external: correctionAck.reference,
                });
                notify(
                  `Acknowledgement recorded on ${d.key}: ${correctionAck.reference} for ${inr(correctionAck.posted)}, equal to the advice. The ${inr(Math.abs(diffOf(mismatched) ?? 0))} difference on ${mismatched.key} is now answered, and nothing else on this page closes it.`,
                );
              }}
            >
              <ArrowDownToLine size={15} />
              Record the provider's acknowledgement
            </button>
          );
        }
        return (
          <button
            className="button"
            onClick={() =>
              refusal(
                `${d.key} was sent and has not been answered. An unanswered send is not a failed send: re-sending into a timeout is how one milestone becomes two invoices. Waiting is the action.`,
              )
            }
          >
            <LockKeyhole size={15} />
            Send it again, it is late
          </button>
        );
      }
      if (s === "Failed") {
        return (
          <>
            <button
              className="button"
              onClick={() => {
                record(d, {
                  state: "Sent",
                  attempts: attemptsOf(d) + 1,
                  contact: `Retry ${attemptsOf(d) + 1} dispatched this session`,
                });
                notify(
                  `Retry dispatched on ${d.key}, attempt ${attemptsOf(d) + 1} recorded. The provider dedupes on that key, so no second invoice can come back from it.`,
                );
              }}
            >
              <RotateCw size={15} />
              Retry under the same key
            </button>
            <button
              className="button"
              onClick={() =>
                refusal(
                  `A new key is a new posting. ${d.key} has never been answered, so re-keying it is exactly how a customer ends up paying twice for one milestone.`,
                )
              }
            >
              <LockKeyhole size={15} />
              Re-key it and send again
            </button>
          </>
        );
      }
      return (
        <>
          <button
            className="button"
            onClick={() => {
              setCorrectionRaised(true);
              record(d, { state: "Superseded" });
              notify(
                `${corrected.key} raised at ${inr(corrected.amount)} with the retention rule written on the advice. ${d.key} is superseded, not deleted, and the difference reconciles against the new posting.`,
              );
            }}
          >
            <Plus size={15} />
            Raise a correction advice
          </button>
          <button
            className="button"
            onClick={() =>
              refusal(
                `A mismatch closes when the amounts agree, not when the button is pressed. ${inr(Math.abs(diffOf(d) ?? 0))} is unaccounted for against a rule ${d.advice} does not carry.`,
              )
            }
          >
            <LockKeyhole size={15} />
            Mark it reconciled
          </button>
        </>
      );
    };
    const milestoneStatus = (m: UnbilledMilestone) =>
      !m.eligible
        ? "Eligibility denied"
        : advised(m)
          ? `Advised · ${adviceName(m)}`
          : "Unbilled earned";
    const milestoneAction = (m: UnbilledMilestone) => {
      if (!m.eligible) {
        return (
          <button
            className="button"
            onClick={() =>
              refusal(
                "Eligibility reads the milestone record. A project manager's note is not an approved dossier, so there is no advice to raise and nothing enters the outbox.",
              )
            }
          >
            <LockKeyhole size={15} />
            Mark it earned anyway
          </button>
        );
      }
      if (m.key === "commissioning") {
        return (
          <button
            className="button"
            onClick={() =>
              refusal(
                "One milestone raises one advice. BA-0063 has to be voided before a second can exist, and voiding it means knowing what the provider did with the first.",
              )
            }
          >
            <LockKeyhole size={15} />
            Raise a second advice
          </button>
        );
      }
      if (adviceRaised) {
        return (
          <small>
            BA-0064 sits in the outbox as BA-0064/R1 with a key of its own.
            Raising an advice is not posting it.
          </small>
        );
      }
      return (
        <button
          className="button primary"
          onClick={() => {
            setAdviceRaised(true);
            notify(
              `BA-0064 raised for ${inr(m.amount)} against ${m.party}'s milestone evidence. It enters the outbox queued, not sent.`,
            );
          }}
        >
          <Plus size={15} />
          Raise the advice
        </button>
      );
    };
    /* The trail names its rows by key rather than by position, so it cannot end
       up following the wrong posting if the outbox is ever re-ordered. */
    const seeded = (key: string) =>
      adviceDeliveries.find((d) => d.key === key) ?? adviceDeliveries[0];
    const trail = [
      {
        what: "PRJ-0249 M2 evidence resolved to BA-0063",
        state: "Eligible",
        done: true,
      },
      {
        what: "BA-0063/R1 handed to the provider",
        state: displayState(seeded("BA-0063/R1")),
        done: displayState(seeded("BA-0063/R1")) !== "Queued",
      },
      {
        what: "BA-0051/R1 retried on its own key",
        state: `${attemptsOf(seeded("BA-0051/R1"))} attempts`,
        done: displayState(seeded("BA-0051/R1")) !== "Failed",
      },
      {
        what: "BA-0049 difference routed to a correction posting",
        state: correctionRaised
          ? displayState(corrected) === "Acknowledged"
            ? "Answered · R1 reconciled"
            : "R2 raised · awaiting an answer"
          : "Open",
        done: correctionRaised,
      },
      {
        what: "PRJ-0264 M3 unbilled amount turned into an advice",
        state: adviceRaised ? "BA-0064" : inr(unbilled),
        done: adviceRaised,
      },
      {
        what: "PRJ-0258 M1 refused for want of a dossier",
        state: "Not eligible",
        done: true,
      },
      {
        what: "Refusals raised against the rules this session",
        state: `${reconRefusals} ${plural(reconRefusals, "refusal")}`,
        done: reconRefusals > 0,
      },
    ];
    return (
      <>
        <div className="feature-banner">
          <span className="feature-icon">
            <FileChartColumn size={28} />
          </span>
          <div>
            <span className="eyebrow">E2E-10 · MILESTONE TO INVOICE</span>
            <h2>Billing reconciliation</h2>
            <p>
              BA-0063 · Crest Chemicals · PRJ-0249 — what left the building, what
              the provider answered, and what still cannot be billed.
            </p>
          </div>
          <Badge status={bannerStatus} />
        </div>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Advice outbox</h2>
              <p className="muted">
                Every row is a posting with a key, not an invoice with a number.
                The key is what a retry reuses, and what makes a second invoice
                impossible.
              </p>
            </div>
            <span className="subtle-tag">
              {postings.length} postings · {inFlight.length} awaiting an answer
            </span>
          </div>
          <div className="table-scroll">
            <table className="wrapped">
              <thead>
                <tr>
                  {[
                    ["Posting key", "16%"],
                    ["Attempts and last contact", "23%"],
                    ["Advice against provider", "19%"],
                    ["State and action", "42%"],
                  ].map(([t, w]) => (
                    <th key={t} style={{ width: w }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {postings.map((d) => {
                  const difference = diffOf(d);
                  return (
                    <tr key={d.key}>
                      <td>
                        <strong>{d.key}</strong>
                        <small>
                          {d.party} · {d.project}
                        </small>
                      </td>
                      <td>
                        {contactOf(d)}
                        <small>
                          {attemptsOf(d)} {plural(attemptsOf(d), "attempt")} ·{" "}
                          {externalOf(d)}
                        </small>
                      </td>
                      <td>
                        <strong>{inr(d.amount)}</strong>
                        <small>
                          {difference === null
                            ? "Provider has not returned an amount"
                            : difference === 0
                              ? `${inr(postedOf(d) ?? 0)} returned · matched`
                              : answered(d)
                                ? `${inr(postedOf(d) ?? 0)} returned · ${difference > 0 ? "+" : "−"}${inr(Math.abs(difference))} · answered by ${corrected.key}`
                                : `${inr(postedOf(d) ?? 0)} returned · ${difference > 0 ? "+" : "−"}${inr(Math.abs(difference))}`}
                        </small>
                      </td>
                      <td>
                        <div className="detail-side">
                          <Badge status={displayState(d)} />
                          {rowAction(d)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Unbilled earned</h2>
              <p className="muted">
                Eligibility is resolved from the milestone record before this
                table is drawn. A note in a status field cannot add a line to it.
              </p>
            </div>
            <span className="subtle-tag">{inr(unbilled)} unbilled</span>
          </div>
          <div className="table-scroll">
            <table className="wrapped">
              <thead>
                <tr>
                  {[
                    ["Milestone and party", "24%"],
                    ["Contract basis", "21%"],
                    ["What the record shows", "29%"],
                    ["Eligibility and action", "26%"],
                  ].map(([t, w]) => (
                    <th key={t} style={{ width: w }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unbilledMilestones.map((m) => (
                  <tr key={m.key}>
                    <td>
                      <strong>{m.milestone}</strong>
                      <small>{inr(m.amount)} at the contract weight</small>
                    </td>
                    <td>{m.basis}</td>
                    <td>
                      {m.evidence}
                      <small>
                        {advised(m)
                          ? `Advised as ${adviceName(m)}`
                          : m.eligible
                            ? "No advice raised yet"
                            : "No advice can be raised"}
                      </small>
                    </td>
                    <td>
                      <div className="detail-side">
                        <Badge status={milestoneStatus(m)} />
                        {milestoneAction(m)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="inventory-summary">
          <div>
            <h2>What the reconciliation has to answer for</h2>
            <p>
              Three counters. Two of them move when work is done; the third is
              the line a report that lists only its findings would have skipped.
            </p>
          </div>
          <div className={`stock-metric${unbilled ? " warning" : ""}`}>
            <strong>
              {inr(unbilled)}
              <span>
                {unbilledLines.length} {plural(unbilledLines.length, "milestone")}
              </span>
            </strong>
            <small>Unbilled against signed evidence</small>
            <i />
          </div>
          <div className={`stock-metric${attention.length ? " warning" : ""}`}>
            <strong>
              {attention.length}
              <span>{plural(attention.length, "posting")}</span>
            </strong>
            <small>Amount mismatch needing attention</small>
            <i />
          </div>
          <div className="stock-metric">
            <strong>
              0
              <span>postings</span>
            </strong>
            <small>Checked for a missing idempotency key</small>
            <i />
          </div>
        </div>
        <div className="detail-grid">
          <section className="card padded">
            <div className="card-heading">
              <div>
                <h2>Posting gate</h2>
                <p className="muted">
                  The gate is the interface. Where the rule refuses, the refusal
                  is the response on screen rather than a footnote in a manual.
                </p>
              </div>
              <span className="subtle-tag">
                {reconRefusals} {plural(reconRefusals, "refusal")} this session
              </span>
            </div>
            <div className="three-cards">
              <div>
                <small>Retry rule</small>
                <h3>Same key or stop</h3>
                <p>
                  A retry re-sends the key that failed. A new key is a new
                  posting, and two postings is a duplicate invoice.
                </p>
              </div>
              <div>
                <small>Difference unexplained</small>
                <h3>{inr(unexplained)}</h3>
                <p>
                  The page states what it compares: the advice amount, the amount
                  the provider returned, and the difference between them in
                  rupees. A correction posting explains a difference; it does not
                  close it. The line closes when the provider acknowledges the
                  advice that carries the rule.
                </p>
              </div>
              <div>
                <small>Payload preview</small>
                <h3>Restricted</h3>
                <p>
                  Amounts and the customer's tax reference are withheld from this
                  session. The key, the state and the checksum are not.
                </p>
              </div>
            </div>
            <div className="form-footer">
              <p className="muted">
                Session state. Nothing is sent to a provider, and no accounting
                system is written to — the platform and the invoice source of
                truth are still the client's decisions.
              </p>
              <div className="header-actions">
                <button
                  className="button"
                  onClick={() =>
                    notify(
                      `Envelope preview for ${seeded("BA-0063/R1").key}: state ${displayState(seeded("BA-0063/R1"))}, key unchanged, checksum 8f2a…c41. Four fields — amounts, tax reference, customer account and terms — are withheld at the role layer, not hidden by layout.`,
                    )
                  }
                >
                  <Search size={15} />
                  Preview the payload
                </button>
                {unexplained > 0 && (
                  <button
                    className="button"
                    onClick={() =>
                      refusal(
                        `Nothing re-sends ${mismatched.key}. It posts again only as a corrected advice carrying the rule${
                          correctionRaised
                            ? `, and ${corrected.key} is already awaiting the provider's answer`
                            : ""
                        }. Until the amount matches it stops here as an exception with a name and a figure.`,
                      )
                    }
                  >
                    <LockKeyhole size={15} />
                    Re-send the mismatched posting
                  </button>
                )}
              </div>
            </div>
          </section>
          <section className="card padded">
            <h2>Posting trail</h2>
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
              States this layout has to carry: provider unavailable, sent and
              never answered, amount mismatch, duplicate refused, unbilled
              milestone, partial billing of a milestone, payload opened by someone
              not entitled to it.
            </div>
            <div className="detail-side">
              {detailLink(
                "Sales",
                "BA-0063 in the billing advice list",
                "Billing advice",
              )}
              {detailLink("Projects", "PRJ-0249 milestone evidence", "Project detail")}
              {detailLink("Reports", "Unbilled and mismatch as reported exceptions")}
              {detailLink("Dashboard", "The same exceptions as tiles")}
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
                ? [
                    "People",
                    "Deployment",
                    "Leave & attendance",
                    "Exit & handover",
                  ]
                : route === "CRM"
                  ? ["Pipeline", "List"]
                  : route === "Sales"
                    ? ["Orders & quotations", "Billing advice", "Reconciliation"]
                    : [];
    /* Landing state is the literal "Overview" even on routes whose first tab
       carries a different label, so the tab the visitor actually sees is the
       first label whenever the state does not name one of them. */
    const activeTab = tabs.includes(tab) ? tab : tabs[0];
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
            value={activeTab}
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
        ) : route === "HR" && tab === "Exit & handover" ? (
          exitView()
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
            <section className="card padded">
              <div className="note-box">
                <FileText size={16} />
                The advice list is where a billing record is created and owned.
                What happened to it after that — whether it reached the provider,
                whether the amount came back the same, whether the milestone that
                justified it had evidence — is a different screen.
              </div>
              <div className="detail-side">
                {detailLink(
                  "Sales",
                  "Open the reconciliation of advices already sent",
                  "Reconciliation",
                )}
              </div>
            </section>
          </>
        ) : route === "Sales" && tab === "Reconciliation" ? (
          reconView()
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
            {route === "HR" && activeTab === "People" && (
              <div className="note-box">
                <Users size={17} />
                EMP-0091 Priya Menon has a last working day of 14 Nov 2026. The
                roster keeps her as a person; her instrument, her open order and
                the approvals that route to her are cleared on Exit &amp;
                handover, because a roster row is not a handover.
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
