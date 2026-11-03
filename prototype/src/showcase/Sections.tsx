import { ArrowRight, Check, CircleDashed, FileClock, KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { prefersReducedMotion, Reveal, useTicker } from "./motion";
import { ROLES } from "./content";

/* ---------------------------------------------------------------- Controls (dark band) */
const CHAIN = [
  { who: "Ananya Rao", role: "Maker · Project manager", act: "Raised PR-0084 from BOM shortage" },
  { who: "Nikhil Joshi", role: "Level 1 · Purchase", act: "Attached RFQ-0041 comparison" },
  { who: "Arjun Mehta", role: "Level 2 · Operations head", act: "Approved ₹2.84 L with evidence" },
  { who: "System", role: "Posted", act: "PO-0121 issued to Vector Controls" },
];

const MATRIX_ROLES = ["Operations head", "Project manager", "Stores & QC", "HR & payroll"];
const MATRIX_MODS = ["Projects", "Inventory", "Purchase", "Payroll"];
const MATRIX: string[][] = [
  ["approve", "view", "approve", "none"],
  ["edit", "view", "edit", "none"],
  ["view", "edit", "view", "none"],
  ["none", "none", "none", "edit"],
];

const AUDIT = [
  ["09:41", "Arjun Mehta", "approved", "PR-0084"],
  ["09:38", "Deepa Kulkarni", "released from QC", "ITM-0137"],
  ["09:22", "Karan Patel", "checked in on site", "SR-0148"],
  ["09:12", "Customer portal", "logged ticket", "SR-0153"],
  ["08:56", "Kavya Iyer", "exported roster (restricted)", "RPT-HR-01"],
  ["08:40", "Rahul Desai", "proposed revision D", "BOM-042"],
];

export function Controls() {
  const reduce = prefersReducedMotion();
  const tick = useTicker(1500, !reduce);
  const step = reduce ? CHAIN.length : tick % (CHAIN.length + 2);
  const auditTick = useTicker(3200, !reduce);
  const auditStart = auditTick % AUDIT.length;
  const rows = [...AUDIT.slice(auditStart), ...AUDIT.slice(0, auditStart)].slice(0, 4);
  return (
    <section className="sc-section sc-controls" id="controls">
      <div className="sc-wrap">
        <div className="sc-head sc-head-inverse">
          <h2 className="sc-h2 t-display">Controls an auditor can follow</h2>
          <p className="sc-lede">Maker-checker approvals with evidence, permissions by role, module and action, and an audit trail on every decision and export. Approved records change by revision, never by overwrite.</p>
        </div>
        <div className="sc-ctrl-grid">
          <Reveal className="sc-ctrl-card">
            <p className="sc-ctrl-title"><UserCheck size={16} aria-hidden /> Approval with evidence</p>
            <ol className="sc-approval">
              {CHAIN.map((c, i) => (
                <li key={c.who} className={i < step ? "is-done" : i === step ? "is-now" : ""}>
                  <span className="sc-approval-mark">{i < step ? <Check size={12} strokeWidth={3} /> : <CircleDashed size={12} />}</span>
                  <span className="sc-approval-text">
                    <b>{c.who}</b>
                    <small>{c.role}</small>
                    <span>{c.act}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="sc-ctrl-card" delay={100}>
            <p className="sc-ctrl-title"><KeyRound size={16} aria-hidden /> Permissions by role × module × action</p>
            <div className="sc-matrix" role="table" aria-label="Permission sample">
              <div role="row" className="sc-matrix-row sc-matrix-head">
                <span role="columnheader" />
                {MATRIX_MODS.map((m) => (
                  <span role="columnheader" key={m}>{m}</span>
                ))}
              </div>
              {MATRIX_ROLES.map((r, ri) => (
                <div role="row" className="sc-matrix-row" key={r}>
                  <span role="rowheader">{r}</span>
                  {MATRIX[ri].map((lvl, ci) => (
                    <span role="cell" key={ci} className={`sc-lvl sc-lvl-${lvl}`} style={{ animationDelay: `${(ri * 4 + ci) * 40}ms` }}>
                      {lvl === "none" ? <Lock size={11} aria-label="No access" /> : lvl}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <p className="sc-ctrl-note">Salary fields stay with the HR & payroll role, even for administrators.</p>
          </Reveal>
          <Reveal className="sc-ctrl-card" delay={200}>
            <p className="sc-ctrl-title"><FileClock size={16} aria-hidden /> Audit trail, as it happens</p>
            <ul className="sc-audit" key={auditStart}>
              {rows.map(([t, who, what, ref], i) => (
                <li key={ref + t} style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="mono sc-audit-time">{t}</span>
                  <span className="sc-audit-text">
                    <b>{who}</b> {what}
                  </span>
                  <span className="mono sc-audit-ref">{ref}</span>
                </li>
              ))}
            </ul>
            <p className="sc-ctrl-note"><ShieldCheck size={13} aria-hidden /> Who, what, when and before/after on every change.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Roles */
export function Roles() {
  const [k, setK] = useState(ROLES[0].key);
  const r = ROLES.find((x) => x.key === k)!;
  return (
    <section className="sc-section sc-roles" id="roles">
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">Each role opens on the work it owns</h2>
          <p className="sc-lede">The same records, filtered and ranked for the person looking. Pick a role and open the demo as them.</p>
        </div>
        <Reveal className="sc-role-layout">
          <div className="sc-role-tabs" role="tablist" aria-label="Roles">
            {ROLES.map((x) => (
              <button key={x.key} role="tab" aria-selected={x.key === k} className={`sc-role-tab ${x.key === k ? "is-active" : ""}`} onClick={() => setK(x.key)}>
                {x.role}
              </button>
            ))}
          </div>
          <div className="sc-role-panel" key={r.key} role="tabpanel">
            <div>
              <h3 className="sc-h3">{r.role}</h3>
              <p className="sc-role-sees">{r.sees}</p>
            </div>
            <ul className="sc-checks">
              {r.does.map((d) => (
                <li key={d}>
                  <Check size={15} aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
            <a className="btn btn-primary" href={r.to}>
              See their view <ArrowRight size={16} aria-hidden />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Delivery & honesty */
const PHASES = [
  { name: "Discovery & FRD", detail: "Workshops turn the scope's 219 requirements and 28 open decisions into a signed FRD." },
  { name: "Design", detail: "Wireframes and the design system approved screen by screen." },
  { name: "Build in waves", detail: "Internal engineering waves per module group. Nothing goes live alone." },
  { name: "Combined UAT", detail: "All twelve end-to-end flows tested together, plus migration reconciliation and security." },
  { name: "One go-live", detail: "All eleven modules in a single production release, then hypercare." },
];

export function Delivery() {
  return (
    <section className="sc-section sc-delivery" id="delivery">
      <div className="sc-wrap">
        <div className="sc-head">
          <h2 className="sc-h2 t-display">From scope to one go-live</h2>
          <p className="sc-lede">The delivery model the scope asks for: one integrated release, accepted only after combined testing.</p>
        </div>
        <Reveal as="div" className="sc-phases">
          {PHASES.map((p, i) => (
            <div key={p.name} className="sc-phase" style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="sc-phase-n mono">{String(i + 1).padStart(2, "0")}</span>
              <b>{p.name}</b>
              <p>{p.detail}</p>
            </div>
          ))}
        </Reveal>
        <div className="sc-honest">
          <Reveal className="sc-honest-card">
            <p className="sc-mini-heading">What you can try in this demo</p>
            <ul className="sc-checks">
              <li><Check size={15} aria-hidden /> All 11 modules with linked, illustrative records</li>
              <li><Check size={15} aria-hidden /> Approvals with reasons, QC holds that block issue, stage gates</li>
              <li><Check size={15} aria-hidden /> Supplier comparison, SLA clocks, payroll readiness checks</li>
              <li><Check size={15} aria-hidden /> Search everything with <span className="kbd">Ctrl</span> <span className="kbd">K</span></li>
            </ul>
          </Reveal>
          <Reveal className="sc-honest-card sc-honest-muted" delay={100}>
            <p className="sc-mini-heading">What a production rollout adds</p>
            <ul className="sc-checks sc-checks-muted">
              <li><CircleDashed size={15} aria-hidden /> Node + PostgreSQL backend, real authentication and row-level access</li>
              <li><CircleDashed size={15} aria-hidden /> Accounting, attendance-device, bank and SSO integrations, once decided</li>
              <li><CircleDashed size={15} aria-hidden /> Statutory payroll rules after legal review</li>
              <li><CircleDashed size={15} aria-hidden /> Data migration, load testing for 200+ users, backup and restore</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
