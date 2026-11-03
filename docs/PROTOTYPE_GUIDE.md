# ERP visual prototype and comparison guide

Version 0.3, 3 November 2026. This is an independent local design for comparison with Figma Make, using synthetic records. It is not an implemented production ERP.

## Current direction

The forest-green and cool-gray/cobalt concepts were rejected as too generic. The current version uses an engineering route-sheet identity: ink-dark navigation, warm drawing-paper canvas, off-white records, copper actions, condensed operational headlines and compact identifiers. The entry opens at the bare URL and lets a visitor inspect one linked job before entering a module. The dashboard leads with three real demo decisions and follows with compact operational totals. Module screens keep direct task labels and useful list interactions. Two rules now hold the identity together across every surface: nothing renders below an 11 px floor and no supporting text falls under 4.5:1 against its actual background, with browser surfaces such as selection, scrollbars, caret, focus rings, the tab color and the favicon drawn from the same palette. Headings stand alone without decorative eyebrow labels or repeated numbering.

Implemented libraries: React, TypeScript and Vite; Radix Dialog, Dropdown Menu and Tabs; TanStack Table v8; cmdk; Lucide; Recharts. Custom CSS controls the visual system. Radix supplies dialog focus trapping and menu/tab keyboard behavior; TanStack manages table state; cmdk supplies command filtering and keyboard navigation. Installing these packages does not establish full accessibility or production readiness.

## Open and run

From `F:\dwarkesh\erp\ERP\prototype`:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the printed Local URL, normally `http://127.0.0.1:5173/`. The bare URL and `/#welcome` show the entry page; module hashes include `/#dashboard`, `/#inventory`, `/#projects` and `/#assets` and open directly. Subtabs and approval/stock simulations are session state. Browser-local draft records use localStorage and can be discarded from their record drawer. This is neither encrypted business storage nor multi-user persistence. Stop the development server with Ctrl+C when finished.

Use `npm.cmd run build` for TypeScript validation and static output in `prototype/dist`. Vendor chunking splits the build into a 279 kB entry, a 373 kB charts chunk, a 119 kB overlay chunk, 50 kB for the grid, 11 kB for icons and 11 kB for the operations desk, and the large-chunk advisory is gone. The operations desk is the only surface that draws charts, so it loads behind a lazy boundary and the charts chunk is no longer referenced by the entry document at all: a visitor reading the intro never downloads the chart runtime. On a slow connection the dashboard shows a ruled placeholder in the dispatch panel's geometry while that module arrives; it is a designed state, not a spinner, and its sweep animation respects reduced motion. Treat these as bundle measurements, not verified production performance.

## Re-running the layout and contrast audit

`prototype/public/_audit/desktop.html` is a measurement page, not part of the product; the build copies it to `dist/_audit/desktop.html`. After `npm.cmd run build && npm.cmd run preview -- --port 5181 --strictPort`, open `http://127.0.0.1:5181/_audit/desktop.html` and call `window.audit(route, width, height)` from the console for any of `welcome, dashboard, projects, inventory, assets, purchase, sales, crm, hr, payroll, user-management, reports`. It loads that route in a same-origin iframe at the requested size, so media queries resolve against the iframe width, and returns document overflow, unintended element overflow, minimum rendered text size, contrast failures measured against each element's composited background, residual off-palette colors, the count of rounded chrome elements (a mark of 8 px or less is a legend or status dot and may be round; anything larger is chrome and must be square), the number of rendered classes that no longer match any rule in the built stylesheet, how many identifier lines sit above headings, whether Barlow Condensed actually loaded, and the rendered heading. Use it when the browser window itself cannot reach desktop widths. Start a fresh preview port after every rebuild, because a preview server started earlier keeps serving stale HTML and CSS and reports clean results that no longer exist.

`prototype/scripts/dead-css.mjs` is the stylesheet counterpart. `node scripts/dead-css.mjs` reports rule blocks whose class selectors no string literal in `src` can produce, along with comma groups that mix live and dead selectors; `--apply` deletes the dead blocks and any `@keyframes` they alone used, `--prune-apply` rewrites the mixed selectors to their live terms, and a clean report run should show zero of each. The rendered-class count in the audit page is the check that goes with it: deleting a rule that was in use would show up there as a new unstyled class, which is how the guard earns its keep. `tsconfig.json` enables `noUnusedLocals` and `noUnusedParameters` for the same reason on the TypeScript side.

## What is actually designed and interactive

| Surface | Implemented comparison behavior | Important limit |
| --- | --- | --- |
| Portal entry | Condensed cover, selectable five-stop job route, active record details, direct module links and a three-row evidence list | Original route-sheet composition and illustrative content; no public marketing or client claim |
| Dashboard | Period control, overview/approvals/activity tabs, delivery chart, review dialogs, portfolio, linked-record strip, service due actions | Aggregate fixtures; changing the period changes only the chart dataset, not every widget |
| Projects | Portfolio, filters/search, detailed PRJ-0264 with milestone/material/document/cost views and module links | Other projects use a summary and link to the representative workflow; no fabricated project-specific detail |
| Inventory | Stock list, available/reserved/QC distinctions, material requirements, assembly stages and stock-action simulations | No real ledger or computed MRP; issue simulation does not update the fixture quantities |
| Assets | Ownership-aware register, service queue, priority-ticket worksheet, calibration and contract examples | No connected calendar, SLA clock, certificate file or customer signature |
| Purchase | PR/PO/RFQ list, supplier comparison, rationale draft | Selection and approval are illustrative, not a PO commitment |
| CRM | Pipeline and list views, opportunity inspection | No actual lead conversion or CRM synchronization |
| Sales | Order/quote list and billing advice view | No tax invoice, settlement or external finance posting |
| HR | Roster/deployment and attendance-correction example | Recruitment, leave policy, expenses and performance are planned in the full screen inventory, not completely designed here |
| Payroll | Restricted-workspace explanation, input checks and blocked-run readiness | No real salaries, payroll engine, legal calculation or permission enforcement |
| User Management | Proposed role/action boundaries and utility explanations | No real user administration, auth, policy editing or backend security |
| Reports | Domain catalogue, category filters and fixture CSV export | Not every source report layout; no scheduled delivery or live reconciled data |
| Shared UI | Keyboard command search, Radix dialogs/drawers/menus/tabs, table sort/select/visibility/density/export, empty states and local drafts | No full backend, integration, file upload, migration or audit storage |

## Five-minute client walkthrough

1. Open the entry page, select a handoff in the five-stop job route and watch the record readout restate itself while the scale plate tracks the stop. Enter its module or the dashboard. Show that this is an engineering ERP with specific connected records.
2. Open Dashboard → PRJ-0264. Review milestone risk and the released BOM/material shortage. Open Inventory → Requirements, then the associated purchase list.
3. Open Purchase → Supplier comparison. Compare technical fit and delivery time, then record a browser-local selection rationale. Do not imply the lowest price automatically wins.
4. Open Inventory → Movements. Attempt to issue the held transmitter and see the block; simulate an eligible issue separately. Open Panel assembly and complete the demo assembly stage; QC review remains required before dispatch.
5. Open Assets → Service desk → SR-0148. Review existing customer asset AST-0042/AMC-0031, inspect the worksheet and start the demo visit. Return to Dashboard → My approvals to demonstrate a reasoned rejection or approval.

The sample upgrade project references an existing installed asset at the customer site; it does not imply that the unfinished upgrade has already been commissioned. BOM revision C is released; the approval example concerns proposed revision D. Other fixture rows are independent examples and do not all belong to PRJ-0264.

## Comparison with Figma

Use the same source, proposed assumptions, sample project and five tasks. The full planning scope remains all 11 modules, 219 module entries, 12 E2E scenarios ([written step by step with a coverage table for what this prototype proves](E2E_JOURNEYS.md)), shared platform controls and the original unresolved decisions. A representative prototype should be compared for visual and interaction direction; it must not be scored as full requirement implementation.

Score each design 1–5 for visual identity, information hierarchy, operational clarity, connected navigation, component consistency, mobile use, accessibility and implementation simplicity. Weight operational clarity and connected navigation twice. Keep selected component choices and a single token system when combining results.

## Verification boundaries

TypeScript/build and source-coverage checks are local engineering checks. Browser checks and screenshots demonstrate only the tested synthetic interactions and viewport layouts. They do not prove database correctness, payroll/tax compliance, 200-user capacity, real permissions, finance integration, data migration, backup/restore, real devices or client acceptance.

See `VALIDATION.md` for the actual checks performed and remaining limits. No deployment, public publication, real user data, external Figma upload or financial operation is included.
