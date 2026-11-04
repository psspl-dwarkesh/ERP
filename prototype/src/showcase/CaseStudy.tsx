import { ArrowRight, Check, CircleDashed } from "lucide-react";
import { useEffect, useState } from "react";
import { ThreadArt } from "./ThreadArt";
import { SHOTS, type Shot } from "./shots";
import "./casestudy.css";

/* Every number on this page comes from the supplied scope, the repository docs or the test suite. */

const SECTIONS = [
  { id: "cs-brief", label: "The brief" },
  { id: "cs-approach", label: "Approach" },
  { id: "cs-decisions", label: "Design decisions" },
  { id: "cs-built", label: "What's built" },
  { id: "cs-engineering", label: "Engineering" },
  { id: "cs-next", label: "What's next" },
];

const SCOPE = [
  { n: "11", l: "modules in one release" },
  { n: "7", l: "business verticals" },
  { n: "219", l: "requirement entries" },
  { n: "12", l: "end-to-end journeys" },
  { n: "28", l: "open decisions" },
  { n: "200+", l: "named users" },
];

/** C / V / D split of the 219 entries. Ordinal teal steps: settled is darkest, undecided lightest. */
const CVD = [
  { key: "C", label: "Confirmed", n: 52, color: "#074047", note: "A requested capability category. It confirms the need, not every field or calculation." },
  { key: "V", label: "Validate", n: 152, color: "#0b7a85", note: "Proposed detail to confirm with process owners in FRD workshops." },
  { key: "D", label: "Decision", n: 15, color: "#5fb4bb", note: "A choice ABC Limited still has to make before it can be built." },
];
const CVD_TOTAL = CVD.reduce((a, b) => a + b.n, 0);

const STEPS = [
  { t: "Discovery", d: "Read the draft scope end to end. The original document is kept unchanged with its SHA-256 recorded, and every requirement and open decision was extracted from it.", a: "source/scope-extracted.txt" },
  { t: "Requirement register", d: "All 219 entries mapped to proposed screen families, each keeping its original C, V or D mark. This is planning coverage, not acceptance.", a: "docs/REQUIREMENT_COVERAGE.md" },
  { t: "Journeys", d: "The twelve cross-module scenarios written step by step: who acts, which record carries the identity, what must never be possible, and the exception states each screen has to survive.", a: "docs/E2E_JOURNEYS.md" },
  { t: "Design system", d: "Slate, mist and white with one petrol-teal accent, Archivo with IBM Plex Mono for record IDs, and custom controls on Radix behaviour so nothing falls back to a browser default.", a: "DESIGN.md" },
  { t: "Interactive front end", d: "All eleven modules on linked, illustrative records. Approvals, QC holds, stage gates and refusals behave the way the journeys describe them.", a: "prototype/" },
  { t: "API with permissions and audit", d: "A server where every business action is validated, permission-checked, transactional and audited, with sign-in and one demo account per role.", a: "server/" },
];

const DECISIONS = [
  { t: "One record chain, not eleven apps", d: "A job is a thread of linked records: enquiry, quotation, order, project, BOM, purchase, work order, installed asset and service ticket. Every record ID is a link, so the chain can be walked either way." },
  { t: "The decision first, then the list", d: "A dashboard opens on the few things that need someone now, with the evidence and the next action beside each. Totals and lists come after, never a wall of interchangeable KPI cards." },
  { t: "Controls that refuse, visibly", d: "Rules are shown by refusing: the counter can't approve their own variance, held stock can't be issued, dispatch waits for QC. Each refusal says why and what would unblock it." },
  { t: "Corrections are revisions", d: "Approved records change by revision or a compensating entry, never by overwrite. A failed posting retries under the same key, so the same billing advice can't post twice." },
  { t: "Honest about what is simulated", d: "Demo data is labelled, unfinished features say what they will do, and nothing claims a live integration, a statutory payroll result or an approval that didn't happen." },
  { t: "An identity that reads as engineering", d: "Petrol teal on deep slate suggests instrumentation and process plants and stays clear of every status colour. Status colour is kept for meaning only." },
];

const BUILT: Shot[] = [SHOTS.dashboard, SHOTS.project, SHOTS.rfq, SHOTS.assembly, SHOTS.service];

const NEXT = [
  "Close the ten P0 decisions with ABC Limited: accounting platform and invoice ownership, user load, payroll policy, project and manufacturing depth, inventory valuation, calibration scope, migration sources, billing treatment and deployment architecture.",
  "Validate the 152 V entries with process owners and sign the FRD before fixing implementation scope.",
  "Replace the demo accounts with real identity (SSO and MFA, once chosen) and data scopes by project, site and department.",
  "Build the integrations the client selects: accounting, attendance devices, bank and notifications. None is connected today.",
  "Data migration with reconciliation, load testing for 200+ named users, backup and restore.",
  "An accessibility audit and real-device, cross-browser testing. Checks so far ran in Edge and Chromium only.",
  "Combined UAT of all twelve journeys, then one go-live for all eleven modules, as the scope requires.",
];

function useActiveId(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let hit = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) hit = id;
      }
      setActive(hit);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [ids]);
  return active;
}

const IDS = SECTIONS.map((s) => s.id);

function jump(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
}

function SplitBar() {
  const [hot, setHot] = useState<string | null>(null);
  const pct = (n: number) => Math.round((n / CVD_TOTAL) * 100);
  return (
    <div className="cs-split">
      <div className="cs-split-bar" role="img" aria-label={`Requirement entries: ${CVD.map((c) => `${c.label} ${c.n} (${pct(c.n)}%)`).join(", ")}. Total ${CVD_TOTAL}.`}>
        {CVD.map((c) => (
          <span
            key={c.key}
            className={`cs-split-seg ${hot && hot !== c.key ? "is-dim" : ""}`}
            style={{ flexGrow: c.n, background: c.color }}
            onPointerEnter={() => setHot(c.key)}
            onPointerLeave={() => setHot(null)}
          />
        ))}
      </div>
      <ul className="cs-split-list">
        {CVD.map((c) => (
          <li key={c.key} className={hot === c.key ? "is-hot" : ""} onPointerEnter={() => setHot(c.key)} onPointerLeave={() => setHot(null)}>
            <span className="cs-swatch" style={{ background: c.color }} aria-hidden />
            <span className="cs-split-n">{c.n}</span>
            <span className="cs-split-text">
              <b>
                {c.label} ({c.key}) · {pct(c.n)}%
              </b>
              <span>{c.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Figure({ shot, wide = false }: { shot: Shot; wide?: boolean }) {
  return (
    <figure className={`cs-shot ${wide ? "is-wide" : ""}`}>
      <a className="cs-shot-img" href={shot.route} aria-label={`Open ${shot.title} in the demo`}>
        <img src={shot.src} width={shot.w} height={shot.h} alt={shot.alt} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        <b>{shot.title}</b>
        <span>{shot.caption}</span>
        <a href={shot.route}>
          Open in the demo <ArrowRight size={13} aria-hidden />
        </a>
      </figcaption>
    </figure>
  );
}

export default function CaseStudy() {
  const active = useActiveId(IDS);
  const [first, ...rest] = BUILT;
  return (
    <article className="cs">
      <header className="cs-hero">
        <ThreadArt align="xMaxYMid" />
        <div className="cs-hero-veil" aria-hidden />
        <div className="sc-wrap cs-hero-inner">
          <p className="cs-kicker">Case study · November 2026</p>
          <h1 className="cs-title t-display">From a draft scope to a working ERP prototype</h1>
          <p className="cs-lede">
            ABC Limited, an engineering firm with seven lines of business, shared a draft statement of work for an eleven-module ERP. Prakash Software Solutions turned it into a requirement register, twelve end-to-end journeys, a design system, an interactive front end for every module and an API that enforces role permissions and keeps an audit trail.
          </p>
          <dl className="cs-meta">
            <div>
              <dt>Client</dt>
              <dd>ABC Limited (anonymised)</dd>
            </div>
            <div>
              <dt>Work</dt>
              <dd>Discovery, product design, front end and API</dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd>Prakash Software Solutions</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Prototype on demo data, not a production system</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="sc-wrap cs-body">
        <nav className="cs-toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/case-study`}
                  className={active === s.id ? "is-active" : ""}
                  aria-current={active === s.id ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    jump(s.id);
                  }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="cs-main">
          <section className="cs-sec" id="cs-brief" aria-labelledby="cs-brief-h">
            <h2 className="cs-h2 t-display" id="cs-brief-h">The brief: a draft scope, not a signed FRD</h2>
            <p className="cs-p">
              The source was the client's Detailed Scope of Work v2.0, a discovery draft. It describes one ERP for a single legal entity running turnkey automation, electrical panel assembly, instrumentation trading, calibration, AMC, O&M and CSV / manufacturing IT, with all eleven modules going live together in one release.
            </p>
            <dl className="cs-kpis">
              {SCOPE.map((k) => (
                <div key={k.l}>
                  <dt>{k.l}</dt>
                  <dd>{k.n}</dd>
                </div>
              ))}
            </dl>
            <h3 className="cs-h3">Most of the scope still needs validating</h3>
            <p className="cs-p">Each of the 219 requirement entries carries a mark in the source. The prototype keeps that distinction visible instead of treating the draft as approved.</p>
            <SplitBar />
            <p className="cs-p cs-note">
              The 28 open decisions (10 marked P0, 16 P1, 2 P2) cover the accounting platform and invoice ownership, payroll policy, inventory valuation, deployment architecture and more. The design refers to them by topic; it does not resolve them by default.
            </p>
          </section>

          <section className="cs-sec" id="cs-approach" aria-labelledby="cs-approach-h">
            <h2 className="cs-h2 t-display" id="cs-approach-h">Approach</h2>
            <p className="cs-p">Six steps, each leaving an artefact in the repository that the next step builds on.</p>
            <ol className="cs-steps">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className="cs-step-n mono">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{s.t}</b>
                    <p>{s.d}</p>
                    <span className="cs-step-a mono">{s.a}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="cs-sec" id="cs-decisions" aria-labelledby="cs-decisions-h">
            <h2 className="cs-h2 t-display" id="cs-decisions-h">Design decisions</h2>
            <p className="cs-p">The choices that shaped every screen, and the reason for each.</p>
            <div className="cs-decisions">
              {DECISIONS.map((d) => (
                <div key={d.t} className="cs-decision">
                  <b>{d.t}</b>
                  <p>{d.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="cs-sec" id="cs-built" aria-labelledby="cs-built-h">
            <h2 className="cs-h2 t-display" id="cs-built-h">What's built</h2>
            <p className="cs-p">Screens from the current build, captured in the browser demo. Each one is live: open it and the records behave.</p>
            <Figure shot={first} wide />
            <div className="cs-shots">
              {rest.map((s) => (
                <Figure key={s.key} shot={s} />
              ))}
            </div>
            <div className="cs-mobile">
              <img src={SHOTS.mobile.src} width={SHOTS.mobile.w} height={SHOTS.mobile.h} alt={SHOTS.mobile.alt} loading="lazy" decoding="async" />
              <div>
                <b>{SHOTS.mobile.title}</b>
                <p>{SHOTS.mobile.caption} Every route was checked for horizontal overflow at desktop and phone widths.</p>
              </div>
            </div>
          </section>

          <section className="cs-sec" id="cs-engineering" aria-labelledby="cs-engineering-h">
            <h2 className="cs-h2 t-display" id="cs-engineering-h">Engineering</h2>
            <p className="cs-p">One front end, two ways to run it, and one set of record types shared by the browser demo and the server.</p>
            <div className="cs-modes">
              <div className="cs-mode">
                <span className="cs-mode-tag">Browser demo</span>
                <p>The whole ERP on demo data in the visitor's browser. No server; changes stay in that browser and can be reset. Deployed as a static site.</p>
              </div>
              <div className="cs-mode">
                <span className="cs-mode-tag">Full stack</span>
                <p>The same front end against the API and PostgreSQL: sign-in, one demo account per role, shared records, and permissions enforced on the server.</p>
              </div>
            </div>
            <dl className="cs-stack">
              <div>
                <dt>Front end</dt>
                <dd>React 19, TypeScript, Vite. Radix primitives for behaviour, TanStack Table, cmdk, Lucide and Recharts, styled by a token-based design system. Every module is its own lazily loaded chunk.</dd>
              </div>
              <div>
                <dt>API</dt>
                <dd>Fastify with Drizzle ORM on PostgreSQL (embedded PGlite locally, so no database install). Inputs validated with Zod, passwords hashed with bcrypt, httpOnly session cookies.</dd>
              </div>
              <div>
                <dt>Business actions</dt>
                <dd>Each action is defined once, with its in-browser behaviour and the name of the server command that validates, checks permission, runs in a transaction and writes the audit entry.</dd>
              </div>
              <div>
                <dt>Tests</dt>
                <dd>24 API tests run against a throwaway database: sign-in and lockout after five failed attempts, cross-site request refusal, permissions, maker-checker approvals, QC holds and BOM shortages, the purchase flow, subcontract custody, exit and handover, and the accounting outbox.</dd>
              </div>
            </dl>
          </section>

          <section className="cs-sec" id="cs-next" aria-labelledby="cs-next-h">
            <h2 className="cs-h2 t-display" id="cs-next-h">What's next</h2>
            <p className="cs-p">The prototype shows the design and the business rules on demo data. A production system needs the following, none of which it claims to have done.</p>
            <ul className="cs-next">
              {NEXT.map((n) => (
                <li key={n}>
                  <CircleDashed size={16} aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
            <div className="cs-proof">
              <Check size={16} aria-hidden />
              <p>No client quotes or results are shown on this page because none exist yet: the client has not run the system. The numbers above come from the scope document, the repository and its test suite.</p>
            </div>
          </section>
        </div>
      </div>

      <section className="sc-final cs-final">
        <div className="sc-wrap sc-final-inner">
          <h2 className="sc-h2 t-display">Try it yourself</h2>
          <p className="sc-lede">Open the demo and follow PRJ-0264 from the order to the service ticket.</p>
          <div className="sc-hero-ctas">
            <a className="btn btn-primary btn-lg sc-cta" href="#/app/dashboard">
              Open the live demo <ArrowRight size={18} aria-hidden />
            </a>
            <a className="btn btn-inverse btn-lg" href="#/">
              Back to the product tour
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
