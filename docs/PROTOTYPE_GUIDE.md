# Threadline prototype guide

Version 1.0, 4 November 2026. Threadline is a working ERP for the anonymised Pinnacle Engineering workspace, populated with illustrative records. By default the front end runs in API mode against a Node server and a PostgreSQL database (Supabase in the live demo), with role sign-in and server sessions. It is a demonstration, not a finished production system: there is no payroll calculation and no live accounting integration. An administrator can restore the starting data from the account menu (**Reset workspace data**).

## Run

The app is live at [erp-prakashinfotech.vercel.app](https://erp-prakashinfotech.vercel.app): pick a role to sign in, password `Threadline@2026`. To run it locally with the API and database, follow [DEPLOYMENT.md](DEPLOYMENT.md). A browser-only build (`--mode mock`) runs the whole front end on in-browser fixtures with no server, for offline use.

Open `http://127.0.0.1:5173/`. `#/` is the product showcase; `#/app/dashboard` is the workspace.

## What is built

| Module | Views | Interactive behaviour |
| --- | --- | --- |
| Showcase | Hero with live console, 9-stop job thread, module map, 7 verticals, 12 flow diagrams, controls, roles, delivery | Auto-playing thread with pause, previous and next; every stop deep-links into the demo |
| Dashboard | Decisions due now, KPIs, PRJ-0264 record chain, delivery chart, portfolio, approvals, field service, activity | Approve or return with a required reason; CSV export; period select |
| Projects | Portfolio, milestone timeline, resources, project record (overview, materials, documents, billing, activity) | Change request with validation; BOM coverage; budget vs committed vs incurred vs billed |
| Inventory & Assembly | Stock, movements, requirements (MRP), assembly, counts | Issue stock (refused while held at QC); QC release or reject; work-order stages with a BOM-shortage block and a QC dispatch gate; cycle count with variance approval |
| Assets & Service | Service desk board, asset register, contracts, calibration | Ticket worksheet: SLA clock, entitlement from contract, engineer assignment with leave warning, status steps, checklist, spares, resolution |
| Purchase | Requisitions, RFQs, orders, vendors; RFQ-0041 comparison | New requisition; supplier comparison weighing need-by date and technical fit; award with required rationale; raise PO; record receipt |
| CRM | Pipeline board, list, renewals | Move between stages; new opportunity with duplicate check; renewal opportunities from expiring contracts |
| Sales | Orders, quotations, billing advice | Milestone billing state; billing mismatch exception; discount authority gate |
| People | Directory, 4-week deployment roster, leave, claims | Approve or reject leave; claim approval; certificate expiry warnings; roster conflicts |
| Payroll | November run readiness, history | Blocked run with reasons; amounts masked until shown; maker ≠ checker |
| Reports | Catalogue and report drawer | Six live previews from demo data; audited CSV export; restricted reports refuse export |
| Users & Access | Role matrix, users, approval rules, audit | Role × module permission levels; MFA flags; audit log with export |

Shared: `Ctrl` + `K` searches every record type; notifications; every record ID links to its record; drawers keep the list in place.

## Five-minute walkthrough

1. Showcase: play the job thread, then click **Open PRJ-0264 in the demo**.
2. Project PRJ-0264: the blocked loop test, BOM shortage and linked chain. Open **PR-0084**.
3. Dashboard: **Review & decide** PR-0084. Try returning it without a reason (refused), then approve.
4. Purchase RFQ-0041: compare the three quotes, award Vector Controls with a rationale, raise the PO.
5. Inventory: try to issue the held transmitters (blocked), release them through QC, then go to **Assembly** and complete wiring (assembly blocked until stock arrives).
6. Assets: open SR-0148, check the AMC entitlement, mark en route, on site, resolved.
7. Payroll: show why November can't move to review, then Users & Access → Audit to see every action you just took.

## Backend

The backend is built: a Node API with a PostgreSQL database (Supabase in the live demo). `src/api/` holds the transport that talks to it. In API mode each `api.*` function maps to a REST endpoint (`api.projects()` → `GET /api/projects`, `api.decideApproval()` → `POST /api/commands/approvals.decide`); the `--mode mock` build runs the same calls against in-browser fixtures. See [ARCHITECTURE.md](ARCHITECTURE.md) for the command flow and [DEPLOYMENT.md](DEPLOYMENT.md) to run it.
