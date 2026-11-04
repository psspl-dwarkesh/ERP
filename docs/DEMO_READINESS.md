# Demo readiness — status and pending work

Working list for the client demo. Updated 4 Nov 2026.

**Live now**
- Full stack: https://threadline-jlfn.onrender.com (API + front end on one origin)
- Front end: https://erp-prakashinfotech.vercel.app (calls the Render API cross-origin)
- Both read and write the same Supabase database. Open the live demo → pick a role → you are in. Password `Threadline@2026`.

---

## Done

| Area | What |
| --- | --- |
| Database | Supabase migrated and seeded with the ABC Limited dataset (PRJ-0264, RFQ-0041, SR-0148 verified present) |
| No dummy data | Remote/API mode is the default, so every read and write on the demo path goes to the database. `--mode mock` survives only as an offline fallback |
| Deployment | Render blueprint (full stack) and a Vercel front end wired to the Render API: CORS, a cross-site session cookie, and CORS on the SSE stream so live updates connect |
| Sign-in | One click on a role signs straight in |
| Entry flow | The showcase CTA opened the workspace or the sign-in screen depending on whether a 12-hour session was still live. It now always opens the role picker |
| Sign-in panel | The thread art ran through the copy. A scrim now sits above the art and below the text, so the strands stay as texture and the words stay readable |
| Sign-in layout | Contained to a centred panel on screens ≥1500px instead of sprawling across a wide monitor |
| Role list | Nine bordered cards quieted to a calm hover list |
| Showcase tour | Prev / Pause / Next were 36px against 30px with no cross-axis alignment. Matched and centred |
| Wording | "demo", "demonstration workspace" and "illustrative data" removed from everything a client reads. The guide is a walkthrough, accounts are roles, the workspace is "Engineering & field service" |
| Accuracy | The help panel claimed edits are "saved only in this browser" — untrue on a shared database. Now mode-aware |
| Company | Footer, case study, sidebar and sign-in all credit **Prakash Software Solutions Pvt. Ltd.** (prakashinfotech.com), with LinkedIn, GitHub, offices and certifications |
| Reports | Header now states how many reports are ready and that the rest are planned, with each card saying what it will show |

---

## Pending

### 1. Build or re-frame the unfinished features
Two places still tell the viewer a feature is not real. They are **accurate** — deleting the text without building the feature would overclaim to a client.
- **Reports** — four entries are catalogue-only. Either build the report output or leave them labelled as planned.
- **Payroll** — PF, ESIC, professional tax and TDS are not computed; deduction totals are placeholders.

**Decision needed:** build, re-frame as roadmap, or hide for the demo.

### 2. Role-by-role functional test
Sign in as each of the nine roles and walk every module against the live database: permissions, locked modules, blocked actions, approvals, maker ≠ checker. **Not yet done end to end.** This is the biggest remaining risk before showing a client.

### 3. Manager walkthrough guide
`docs/CLIENT_DEMO_SCRIPT.md` exists and is good, but it is written for someone who knows the product. Needs a short, plain-English, step-by-step version for a manager with little domain knowledge: which pages to open, in what order, what to say, what to click.

### 4. Requirement coverage review
Original scope is in `source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` and `source/requirements.json`, with `docs/REQUIREMENT_COVERAGE.md`. Re-check the built product against it to catch anything basic that was missed. **Not yet done.**

### 5. Make Insights feel fast
Insights makes **24 API calls** and takes **3.1 seconds** to first content (Projects takes 1.3s), showing loading skeletons meanwhile, because the browser fetches every module and computes the findings locally. One server-side endpoint returning the computed findings would cut 24 round-trips to one. This is the single highest-value performance change left, and it is the most likely reason the app "feels laggy".

### 6. Walkthrough guide for the manager
`docs/CLIENT_DEMO_SCRIPT.md` is written for someone who already knows the product. A manager presenting it needs a plain-English version: which page to open, in what order, what to say, what to click. The in-app walkthrough now covers the clicking; this covers the talking.

### 7. Requirement coverage review
Original scope is in `source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` and `source/requirements.json`, with `docs/REQUIREMENT_COVERAGE.md`. Re-check the built product against it to catch anything basic that was missed. **Not yet done.**

### 8. Finish the role-by-role test
Two roles have been walked end to end (operations head, IT administrator) and permissions held up — refusals come back as 403 from the API. The remaining seven seeded roles have not been walked. Worth finishing before a client sits in front of it.

## Done since this list was written

- **Narrated overview video** — 2½ minutes, recorded against the live database, segment by segment so any line can be re-shot alone. Covers the dashboard, the project record chain, purchasing controls, stock states and QC hold, Insights, and permissions. It ships in `prototype/public/` and plays inside the walkthrough panel on both deployments.
- **Walkthrough rebuilt** — opens on a menu (watch the overview, or three guided tracks: the whole job, the commercial slice, how roles change the workspace) instead of one 11-step list. Every step keeps its live completion check.
- **Page-by-page review** — all twelve modules inventoried against the live database as two roles. See below.

---

## Before real users (not demo blockers)

- **Rotate the Supabase database password.** The current one is weak and was shared in chat.
- Set `DEMO_ACCOUNTS=false` and replace the seeded accounts — every seeded user shares one password.
- Move off the free database tier; it sleeps and has no point-in-time restore.
- Decide whether both deployments should stay. The Vercel front end depends on a cross-site cookie, which a browser with third-party cookies disabled will block. The Render URL has no such dependency.

---

## Page-by-page review (done 4 Nov, against the live database)

Every module was signed into and inventoried as **Operations head** and as **IT administrator**, on the deployed site reading Supabase.

**Works, with real data and no console errors**

| Module | What it gives you |
| --- | --- |
| Dashboard | "3 things need you today" — approval to decide, breakdown against its clock, stock held at QC |
| Insights | 28 findings over 23 checks: briefing, findings, forecasts, project risk. Permission-aware ("1 of 23 checks are outside your role") and honest ("rule-based · no AI in the findings") |
| Projects | Portfolio / milestone timeline / resources; 6 engagements, health, progress, contract value |
| Inventory & Assembly | Stock, movements, requirements, assembly, subcontract, counts. Free vs reserved vs held is explicit |
| Assets & Service | Service desk with response clocks, assets, contracts, calibration |
| Purchase | Requisitions, RFQs, purchase orders, vendors — with the approval gate |
| CRM | Pipeline, opportunities, renewals |
| Sales | Orders, quotations, billing advice, reconciliation |
| People | Directory, deployment, leave, claims, exits |
| Reports | 6 of 13 ready; the rest labelled as planned |
| Users & Access | Accounts and role permissions |

**Permissions are genuinely enforced, not just hidden.** As Operations head, Payroll and Users & Access are locked. As IT administrator, every operational module is refused. The refusals come back as HTTP 403 from the API, so the rule is on the server, not only in the interface. This is worth showing a client.

**Found: Insights is the slow page.** It makes **24 API calls** and takes **3.1 seconds** to first content, against 1.3 seconds for Projects, showing loading skeletons meanwhile. It is not broken, but on a cold free-tier instance it can look like it is. The fix is one server-side endpoint that returns the computed findings instead of the browser fetching every module and computing locally. This is the single best performance change available and is likely what makes the app "feel laggy".

## Branches — read before merging anything

`git branch -a` shows two besides `main`. Both were checked:

- **`origin/redesign/threadline`** — nothing on it that `main` does not already have. Safe to ignore or delete.
- **`wip/receipt-three-way-match`** — **do not merge this.** It carries one commit ("Build the receipt and three-way match E2E-02 was only describing") but it is based on the monolithic prototype from before the refactor: the branch contains **0 files under `server/` and 0 under `prototype/src/modules/`**, where `main` has 44 and 106. `main` has moved 35 commits past its base. Merging it would delete the API, the database layer and every module, taking the Supabase integration with them.

  The work it describes — goods receipt and a three-way match (ordered = received = accepted = payable), with the debit-note and substitution refusals — is **not in `main`** and is a genuine gap against E2E-02. It would have to be rebuilt against the current architecture, not merged. The branch is kept so the logic can be read from it.

## Deployment check (4 Nov)

Both deployments current and serving the same database.

| | Render | Vercel |
| --- | --- | --- |
| Health | 200 · `engine: postgresql` | 200 |
| Smoke test | **23 / 23 passed** | **23 / 23 passed** |

Covered: landing renders and credits the company; the CTA always opens the role picker; one-click role sign-in reaches the workspace; the sidebar reports a shared workspace rather than browser storage; no "demo" wording anywhere on screen; dashboard, projects, inventory, purchase and insights all load real data with no horizontal overflow; payroll is refused for the operations head; the walkthrough menu opens with three tracks, no stray scrollbar, and the overview video present. The only console message is the expected 401 from the pre-sign-in session check.

## Checked and clean

All twelve modules (dashboard, insights, projects, inventory, assets, purchase, CRM, sales, people, payroll, reports, users): **no console errors, no horizontal page overflow, no empty pages.**

Two things look like overflow bugs to an automated check but are **deliberate design — do not "fix" them**:
- the stepper's connector line (`.step::before` uses a negative `right` to reach the next marker);
- the CRM card's ⋯ button (`margin-right: -6px` optically aligns the icon with the card edge).
