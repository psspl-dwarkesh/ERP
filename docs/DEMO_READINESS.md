# Demo readiness — status and pending work

Working list for the client demo. Updated 4 Nov 2026.

**Live now**
- Full stack: https://threadline-jlfn.onrender.com (API + front end, one origin)
- Front end: https://erp-prakashinfotech.vercel.app (calls the Render API cross-origin)
- Both read and write the same Supabase database. Sign in by clicking any demo role; password `Threadline@2026`.

## Done

| | What |
| --- | --- |
| Data | Supabase migrated and seeded with the ABC Limited dataset (PRJ-0264, RFQ-0041, SR-0148 verified) |
| Mode | Remote/API mode is the demo default — no in-browser dummy data on the demo path (`--mode mock` is an opt-out for offline use only) |
| Deploy | Render blueprint (full stack) + Vercel front end wired to the Render API with CORS, a cross-site session cookie, and CORS on the SSE stream so live updates connect |
| Sign-in | One click on a demo role signs straight in |
| Login UI | Brand copy no longer washed out by the thread art; role list quieted; the split is contained on screens ≥1500px instead of sprawling |
| Showcase | Job-thread tour controls aligned (prev/pause/next now share a height) |
| Copy | "Demo workspace", "demonstration workspace" and "illustrative data" removed; help note no longer claims edits are browser-only; Prakash Infotech credited in the sidebar and on sign-in |

## Pending

### 1. Decide: honest disclosures on unfinished features
Two places still tell the viewer a feature is not real. They are accurate, not leftovers — removing them without building the feature would overclaim.
- **Payroll** — "Illustrative · not calculated"; PF, ESIC, professional tax and TDS are not computed, deduction totals are placeholders.
- **Reports** — four "Coming soon" entries.

Options: build the feature, reword it as a roadmap item, or hide those cards for the demo. Needs a product decision.

### 2. Role-by-role functional test
Walk every module as each of the nine demo roles and confirm permissions, blocked actions and approvals behave. Not yet done end to end against the database.

### 3. Manager demo guide
`docs/CLIENT_DEMO_SCRIPT.md` already exists and is good, but it is written for someone who knows the product. Needs a short, plain-English, step-by-step version for a manager presenting without deep domain knowledge.

### 4. Requirement coverage check
Original scope is in `source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` and `source/requirements.json`, with `docs/REQUIREMENT_COVERAGE.md`. Re-check the built product against it to catch anything basic that was missed.

### 5. Footer / company framing
Running in a separate session: research Prakash Infotech and build a real footer so the landing page reads as their case study for several prospective clients.

### 6. Load weight (optional)
Runtime is fine — the home page measures 60fps at 2560×1440 with no janky frames, so there is no scroll jank to fix. If the site still feels slow it is first paint, not animation: main bundle ≈340 kB (104 kB gzip) plus self-hosted Archivo. Trim only if first load matters on the demo network.

## Before real users (not demo blockers)

- Rotate the Supabase database password — the current one is weak and was shared in chat.
- `DEMO_ACCOUNTS=false` and replace the seeded accounts; every demo user shares one password.
- Move off the free database tier (it sleeps and has no point-in-time restore).

## Checked and clean

A sweep of all twelve modules (dashboard, insights, projects, inventory, assets, purchase, CRM, sales, people, payroll, reports, users) found **no console errors, no horizontal page overflow and no empty pages**.

Two things that look like overflow bugs in an automated check are deliberate design and must not be "fixed": the stepper's connector line (`.step::before` uses a negative `right`) and the CRM card's ⋯ button (`margin-right: -6px` optically aligns the icon to the card edge).
