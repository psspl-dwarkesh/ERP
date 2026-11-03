# ERP visual prototype and comparison guide

Version 0.3, 3 November 2026. This is an independent local design for comparison with Figma Make, using synthetic records. It is not an implemented production ERP.

## Current direction

The forest-green and cool-gray/cobalt concepts were rejected as too generic. The current version uses an engineering route-sheet identity: ink-dark navigation, warm drawing-paper canvas, off-white records, copper actions, condensed operational headlines and compact identifiers. The entry opens at the bare URL and lets a visitor inspect one linked job before entering a module. The dashboard leads with three real demo decisions and follows with compact operational totals. Module screens keep direct task labels and useful list interactions.

Implemented libraries: React, TypeScript and Vite; Radix Dialog, Dropdown Menu and Tabs; TanStack Table v8; cmdk; Lucide; Recharts. Custom CSS controls the visual system. Radix supplies dialog focus trapping and menu/tab keyboard behavior; TanStack manages table state; cmdk supplies command filtering and keyboard navigation. Installing these packages does not establish full accessibility or production readiness.

## Open and run

From `F:\dwarkesh\erp\prototype`:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the printed Local URL, normally `http://127.0.0.1:5173/`. The bare URL and `/#welcome` show the entry page; module hashes include `/#dashboard`, `/#inventory`, `/#projects` and `/#assets` and open directly. Subtabs and approval/stock simulations are session state. Browser-local draft records use localStorage and can be discarded from their record drawer. This is neither encrypted business storage nor multi-user persistence. Stop the development server with Ctrl+C when finished.

Use `npm.cmd run build` for TypeScript validation and static output in `prototype/dist`. Production bundling currently emits a large-chunk advisory; route/library splitting is future development work, not a verified performance claim.

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

1. Open the entry page, select a handoff in the five-stop job route, and enter its module or the dashboard. Show that this is an engineering ERP with specific connected records.
2. Open Dashboard → PRJ-0264. Review milestone risk and the released BOM/material shortage. Open Inventory → Requirements, then the associated purchase list.
3. Open Purchase → Supplier comparison. Compare technical fit and delivery time, then record a browser-local selection rationale. Do not imply the lowest price automatically wins.
4. Open Inventory → Movements. Attempt to issue the held transmitter and see the block; simulate an eligible issue separately. Open Panel assembly and complete the demo assembly stage; QC review remains required before dispatch.
5. Open Assets → Service desk → SR-0148. Review existing customer asset AST-0042/AMC-0031, inspect the worksheet and start the demo visit. Return to Dashboard → My approvals to demonstrate a reasoned rejection or approval.

The sample upgrade project references an existing installed asset at the customer site; it does not imply that the unfinished upgrade has already been commissioned. BOM revision C is released; the approval example concerns proposed revision D. Other fixture rows are independent examples and do not all belong to PRJ-0264.

## Comparison with Figma

Use the same source, proposed assumptions, sample project and five tasks. The full planning scope remains all 11 modules, 219 module entries, 12 E2E scenarios, shared platform controls and the original unresolved decisions. A representative prototype should be compared for visual and interaction direction; it must not be scored as full requirement implementation.

Score each design 1–5 for visual identity, information hierarchy, operational clarity, connected navigation, component consistency, mobile use, accessibility and implementation simplicity. Weight operational clarity and connected navigation twice. Keep selected component choices and a single token system when combining results.

## Verification boundaries

TypeScript/build and source-coverage checks are local engineering checks. Browser checks and screenshots demonstrate only the tested synthetic interactions and viewport layouts. They do not prove database correctness, payroll/tax compliance, 200-user capacity, real permissions, finance integration, data migration, backup/restore, real devices or client acceptance.

See `VALIDATION.md` for the actual checks performed and remaining limits. No deployment, public publication, real user data, external Figma upload or financial operation is included.
