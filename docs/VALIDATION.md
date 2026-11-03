# Prototype validation

Checked locally on 4 November 2026 against the Threadline v1.0 redesign. These checks support a design and demo handoff; they are not production acceptance.

| Check | Result |
| --- | --- |
| Type check and production build | `npm run build` (`tsc --noEmit` with `noUnusedLocals`/`noUnusedParameters`, then `vite build`) passes. Each module and the showcase are separate lazy chunks; charts load only with the dashboard |
| Source preservation | Scope DOCX SHA-256 matches `source/source-manifest.json` (`2e94433…4eba84`) |
| Route audit | Puppeteer driving Microsoft Edge loaded 47 routes (showcase, all 11 modules, their tabs and record URLs) at 1440×900 and at a true 390×844 mobile viewport. No route produced document-level horizontal scroll, and none logged a console error or warning. Wide boards and tables (timeline, kanban, roster, supplier comparison) scroll inside their own containers |
| Click-through flows | Return without a reason is refused inline; approval of PR-0084 succeeds with a toast; work-order advance past wiring reports the BOM shortage block; RFQ-0041 award with rationale reaches the awarded state; SR-0148 moves to En route; `Ctrl` + `K` → WO-0187 opens the record; held stock shows 0 free / 6 on QC hold in the issue dialog |
| Cross-module links | Changing route from one module to a record in another (dashboard → ITM-0137, SR-0148, EMP-0072; projects → PR-0084; CRM → SO-0196) opens the record drawer every time |
| Visual review | Screenshots of every module's main views and record views reviewed at desktop width; mobile screenshots reviewed for the dashboard, showcase, payroll, RFQ comparison and sales order drawer. Current previews are in `docs/previews/` |
| Dead CSS | `node scripts/dead-css.mjs` reports no unused rules except dynamic class names built from template strings (priority chips, movement types, permission levels) and layout utilities kept for reuse |

## Not verified

- No accessibility audit beyond keyboard-reachable Radix primitives, visible focus rings and reduced-motion support.
- No real-device or cross-browser testing (Edge/Chromium only).
- Flows not clicked end to end: change request, new requisition, raise PO, record receipt, cycle count submission, leave decisions, payroll and report exports. They type-check and render, but were not exercised.
- No backend, authentication, data scopes, payroll calculation, finance posting, SLA engine, file handling, migration or load testing.
