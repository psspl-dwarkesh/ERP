# ERP screen and workflow plan

This is the full design inventory, not a claim that every screen is implemented in the comparison prototype. Screen IDs group related list, detail, create/edit and exception variants. All proposed fields and actions require FRD validation. The [coverage register](REQUIREMENT_COVERAGE.md) maps every source module requirement to these families.

## Navigation and shared behavior

Use exactly 11 top-level business destinations: Dashboard, Projects, Inventory, Assets, Purchase, Sales, CRM, HR, Payroll, User Management and Reports. Organize the sidebar visually into Overview, Operations, Commercial, People and Administration without changing module ownership. Within Inventory, use tabs/subnavigation for Stock, Movements, BOMs, Requirements and Panel assembly. Within Assets, use Register, Contracts, Service, Visits and Calibration. Shared inboxes and utilities may appear in the shell without becoming extra named business modules.

Desktop: persistent sidebar and top bar with search, active operational scope, notifications and profile. Record pages use breadcrumbs and retain filter context on return. Tablet: collapsible sidebar. Mobile: drawer navigation, single-column cards, focused forms, scrollable tables within their own container, sticky action footer for field tasks. Do not hide important columns without a detail route. Dates include timezone context where needed. Store timestamps in UTC and render Asia/Kolkata for the proposed default.

Every list specifies title, search, filters, sort, result count, pagination, export permission and one primary action. Every record specifies ID, status, owner, site/customer/project links, relevant line items, documents, approvals and audit activity. Every form specifies field labels, required markers, inline errors, unsaved-changes warning, save draft/submit and submission failure. No action can imply a real integration when it is simulated.

## Entry and platform screen families

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| ENT-01 | Portal entry | Hero, original workflow visual, seven-vertical selector, linked lifecycle, role preview, open-demo action; proposal, not a public-portal commitment |
| SYS-01 | Sign in and recovery | Enterprise branding, sign-in, reset, expired link, lockout, MFA challenge and SSO states; provider undecided; demo access clearly separate |
| SYS-02 | Approval inbox | Module/value/site filters, authority/delegation, maker, requested change, evidence, approve/reject/reason, stale-record and self-approval prevention |
| SYS-03 | Search and notifications | Search entities by ID/name, grouped results, access filtering, read/unread, actionable notifications, no-result/unavailable states |
| SYS-04 | Documents and activity | Version/reference, classification, preview, upload validation, scanning/pending/rejected state, authorized download, audit old/new or revision context |
| SYS-05 | Masters and data import | Customers, vendors, items/UOM, locations, departments, number series, cost categories; template, preview, row errors, duplicate check, mapping and reconciliation |
| SYS-06 | Integration monitor | Provider not connected, mapping, source of truth, queued/sent/failed/mismatch, retry with idempotency, restricted payload preview, last success; no invented finance vendor |
| SYS-07 | System/error states | Access denied, not found, session expired, maintenance, stale data, request failure, retry, connection loss and update conflict |

## Dashboard

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| DASH-01 | Operations overview | Role summary, date/vertical/site/project/customer filters, definitions, refresh time, portfolio risk, approvals and order book |
| DASH-02 | Delivery and supply-chain view | Milestone/budget exceptions, shortage, PR/PO/GRN delay, stock ageing and reserved exposure, stage/QC/dispatch bottlenecks |
| DASH-03 | Service and workforce view | SLA exceptions, preventive visit/calibration/warranty/renewal due, technician load, deployment/attendance/claim exceptions; no leadership salary disclosure |

## Projects

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| PM-UI-01 | Portfolio and project setup | Searchable portfolio, customer/order/site/vertical/manager, planned dates, status, source quote/order links, create/edit scope and deliverables |
| PM-UI-02 | Project workspace and WBS | Summary, milestone timeline, tasks/dependencies, engineer allocation, planned vs actual; list/timeline views; scope variations and approval outcomes |
| PM-UI-03 | Cost and resource control | Material/labour/subcontract/travel/equipment budget, committed vs incurred vs billed, estimate and cost-source definitions, timesheet and expense references |
| PM-UI-04 | Engineering and material planning | Drawing register and revisions, transmittals, released BOM, demand/reservation, shortages and PR links; scope/budget approvals |
| PM-UI-05 | Site execution and handover | Subcontract work packages/custody, risks/issues, FAT/SAT/loop test/commissioning evidence, dispatch/installation, punch list, installed-asset handover, close/hold/cancel/reopen reason |

## Inventory and embedded panel assembly

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| INV-UI-01 | Item and stock register | Item/class/spec/UOM, manufacturer alternatives if agreed, warehouses/bins/site/ownership, on-hand/reserved/quarantine/available, min levels and expiry/ageing if applicable |
| INV-UI-02 | Receipt and inspection | PO/GRN lines, expected/received/rejected quantities, serials, inspection evidence, quarantine/release/reject and supplier-return link; partial and excess receipt handling |
| INV-UI-03 | Stock ledger and traceability | Timestamped immutable movement chain, source reference, from/to, qty/value, serial/batch/lot if needed, opening balance, valuation method pending approval |
| INV-UI-04 | Reservations and movement | Project/job allocation, pick/issue/return, warehouse/site transfer and acknowledgement, supplier/customer returns, condition/disposition; insufficient-stock and blocked-QC states |
| INV-UI-05 | Subcontract reconciliation | Issued/consumed/returned/damaged/outstanding by work package and custodian, evidence and variance approval |
| INV-UI-06 | BOM editor and revision comparison | Multi-level components, qty/UOM, drawing, alternatives, version/effective dates, approval, released/frozen state; impact on existing work orders is undecided |
| INV-UI-07 | Material requirements run | Approved demand/BOM, available/reserved/on-order, shortage/required date, run timestamp, proposed requisition, existing PR/PO drilldown and partial supply |
| INV-UI-08 | Panel assembly board and work order | Order/project/BOM revision, kitting/fabrication/wiring/assembly/testing/packing/dispatch, planned vs consumed/waste/substitution, hold/rework/partial complete/cancel |
| INV-UI-09 | Production QC and finished goods | Checkpoints/results/defects, approve/reject/rework, serial/tag, completed quantity, FG receipt, dispatch readiness and customer/site return/replacement |
| INV-UI-10 | Counts and adjustment | Count session, expected vs counted, reason, review/approval, reversal and ledger reconciliation; negative-stock policy unresolved |

## Assets and embedded service

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| AST-UI-01 | Asset register and record | Explicit internal/customer ownership, serial/model/category, customer/site/custodian, acquisition/commission date, warranty, documents, history and project origin |
| AST-UI-02 | Custody and lifecycle | Employee/site transfer with acknowledgement, tools/instruments assignment, replacement/swap, lost/damaged/retired/disposal, history; depreciation is an open finance decision |
| AST-UI-03 | AMC/O&M contract | Covered assets/sites, period, entitlements, included visits, exclusions, coverage window, SLA policy, renewal and Sales billing links |
| AST-UI-04 | Service queue and ticket | Asset/customer/contract, problem/priority, entitlement, assigned engineer, target time, status, escalation, paused clock with reason, chargeable decision and revisit |
| AST-UI-05 | Visit planner and field worksheet | Engineer/date allocation, visit checklist, observations, time, spares consumption/return, attachments and acknowledgement; online responsive web, no assumed GPS/offline |
| AST-UI-06 | Maintenance and calibration | Preventive plan, due calendar, master/reference instrument, result/evidence, certificate attachment, review and next due; certificate generation/compliance depth undecided |

## Purchase

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| PUR-UI-01 | Vendor and requisition | Vendor category/contact/approval/compliance fields, PR from shortage/project/maintenance, budget and need date, multi-level authority and requester |
| PUR-UI-02 | RFQ and quotation comparison | Comparable item rows with supplier columns; price/tax/currency/lead time/technical compliance/delivery terms; selected-vendor reason and approval, no automatic cheapest-wins |
| PUR-UI-03 | Purchase order workspace | Approved PR/quote references, goods/services/subcontract lines, revision, approval, cancellation/short closure, partial receipts, received/rejected/outstanding quantities and documents |
| PUR-UI-04 | Acceptance and finance handoff | Linked GRN/QC, shortage/damage/return/replacement, service acceptance, subcontract material links, invoice matching/reference and external posting pending ownership decision |

## Sales

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| SAL-UI-01 | Quotation workspace | Enquiry/opportunity, versions, material/service/AMC lines, scope and commercial terms, validity, price lists, discount authority and approval |
| SAL-UI-02 | Orders and fulfilment | Customer PO/contract, delivery commitments, approved quote, project/work-order demand, goods allocation, partial delivery/backorder/amendment, acceptance and closure |
| SAL-UI-03 | Billing workspace | Milestone eligibility/evidence, recurring schedule and chargeable visit, billing advice, external invoice/payment reference, unbilled/renewal views; advances/retention/taxes/credit ownership not finalized |

## CRM

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| CRM-UI-01 | Lead, account and contact | Source/vertical/owner, qualification, shared identity, duplicate review/merge, communication permissions and contact timeline |
| CRM-UI-02 | Opportunity and pipeline | Stage/value/expected date, RFQ/technical attachments, presales activities, estimator, quote revisions, bid/no-bid, tender deadlines, win/loss reason, won handoff and contract-renewal lead |

## HR

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| HR-UI-01 | Hiring and employee lifecycle | Recruitment request/opening/candidate, onboarding checklist, employee profile/reporting/department/type, effective dates, confidential documents, offboarding/asset/access handover |
| HR-UI-02 | Time, leave and shifts | Attendance inputs/corrections/approval, shifts, calendars/holidays, leave application/accrual/balance, exception list, approved payroll input; device/import undecided |
| HR-UI-03 | Deployment, skills and time | Engineer availability, site/project/contract date allocations, conflict warnings, approved timesheets, training/certification/expiry and utilization |
| HR-UI-04 | Travel, expenses and performance | Travel request/authorization/settlement, receipt/claim lines, approval/payment references, goals/reviews/feedback and self-service views; payout ownership unresolved |

## Payroll

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| PAY-UI-01 | Pay policy and employee structure | Groups/calendars/components, effective-dated salary revisions, attendance source, variables, statutory applicability decision state, restricted bank data |
| PAY-UI-02 | Pay run and review | Period/prechecks/input exceptions/preview, gross/deductions/net breakdown, joiners/leavers/arrears/settlement if approved, maker-checker, finalize/lock and authorized reversal with reason |
| PAY-UI-03 | Outputs and reconciliation | Restricted payslips/register, employer/project allocations, payment file and accounting handoff if agreed, year-end outputs pending policy; no real bank submission in prototype |

## User Management

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| USR-UI-01 | Users and identities | Employee mapping, invites/provision/activate/deactivate, join/transfer/exit, SSO/MFA decision and setup states, session/recovery/privileged review |
| USR-UI-02 | Permissions and authority | Module/action/data-scope matrix, restricted fields, effective dates, segregation of duties, approval thresholds/hierarchy/delegation/escalation; system admin has no automatic salary rights |
| USR-UI-03 | Security and audit | Sensitive event search with actor/time/record/old-new or revision, session controls, export/import logs, documents/retention, notifications and integration settings |

## Reports

| ID | Screen family | Content and important variants |
| --- | --- | --- |
| RPT-UI-01 | Catalogue and definitions | Domain/owner/audience/source, KPI formula, classification, date cutoff/timezone/refresh, accepted sample layout, saved filter views if agreed |
| RPT-UI-02 | Report viewer and export | Project/milestone/cost, BOM shortage/WIP/site stock/serial/valuation, procurement/GRN, sales/order/billing, asset/calibration/service, HR/deployment/claim and restricted payroll variants |
| RPT-UI-03 | Exceptions and scheduled jobs | Data-quality/duplicate/mismatch/integration/approval exceptions, authorized execution and exports, delivery schedule/provider decision, failure/retry and audit |

## Twelve end-to-end design journeys

One line each is an inventory, not a workflow. [E2E_JOURNEYS.md](E2E_JOURNEYS.md) expands every row below into ordered steps against the screen families in this plan, with the record chain, the decision gate, the invariant that must hold on every screen, the exception states the layout has to carry, and what the prototype can demonstrate today.

| Source scenario | Clickable journey and acceptance checkpoint |
| --- | --- |
| E2E-01 | CRM enquiry → quote → order → project/WBS → delivery → closure; preserve customer/quote/order/project IDs and amendment history |
| E2E-02 | Approved BOM → requirements → PR → comparison/PO → GRN/QC → issue → panel stages → production QC → FG → dispatch; demonstrate partial/rework and revision identity |
| E2E-03 | Project need → purchasing → receipt → quarantine/release → reserve → site transfer → acknowledge; blocked stock never appears available |
| E2E-04 | Subcontract issue → work acceptance → consume/return → outstanding reconciliation; include damaged/lost variance and authority |
| E2E-05 | Project commissioning → evidence → installed customer asset → warranty → AMC; customer equipment does not become company-owned asset |
| E2E-06 | Breakdown ticket → entitlement/SLA → assignment → visit → spare issue → report/acknowledgement → charge decision; include pause, revisit and escalation |
| E2E-07 | Calibration/PM due → schedule → engineer worksheet → results/certificate attachment → review → next due; authoring depth remains a decision |
| E2E-08 | Employee → shift/site → attendance/leave → approved input → pay run → review/lock → payslip/cost/export; restricted access and input exceptions visible |
| E2E-09 | Deployment → timesheet/travel claim → approval → cost reference → project variance; keep private employee data out of project views |
| E2E-10 | Delivery/milestone/recurrence → billing advice → external accounting → status/reconciliation; show duplicate retry and mismatch handling |
| E2E-11 | Count → variance approval → correction/reversal → stock/value/cost reconciliation → audit; no deletion of posted movements |
| E2E-12 | Exit → access revoked → asset recovery → payroll/claims settlement → delegated open approvals; no orphaned allocation |

Each journey needs happy-path, invalid-input, insufficient-permission, rejection, stale-state and integration-failure variants where relevant. A complete design must not consist only of 11 unrelated dashboard pictures.

## Interaction and state specifications

Use drawers for quick review and a full page for complex transactions. Use a stepper for long forms, with clearly named steps and saved draft state. For comparison grids keep the item identity sticky. Approval buttons must describe the result; a critical step shows a confirmation with record ID, amount/quantity and consequences. Rejection and reversal require a reason where policy demands it. Do not use success toasts for an action that failed or remains queued.

Design loading/skeleton, empty with useful next step, no filter results, server error/retry, permission-denied, read-only, draft, submitted, approved/rejected, partial, cancelled, locked, stale version, expired session, integration not connected and export pending/completed/failed. Include field-level error text, attachment limits and upload failure. These are shared variants rather than independent business modules.

## Relational model for later implementation

Use one company/legal entity. Branch, department, site, warehouse and project are scoped dimensions. Master data has stable IDs, ownership, lifecycle and controlled merge; records reference those IDs instead of duplicating free text. Keep currency/decimal precision/UOM and effective dates explicit.

| Domain | Core tables / aggregates | Important relations and invariants |
| --- | --- | --- |
| Platform | profiles, roles, permissions, role_assignments, data_scopes, approval_policies, approval_requests, approval_steps, audit_events, attachments, notifications | Auth identity maps to employee optionally; access includes action and record scope; audit written by server; private attachments require authorization |
| Masters | company, branches, departments, sites, customers, contacts, vendors, items, uoms, warehouses, bins | One shared customer/item identity; site ownership and stock owner explicit; no legal-company duplication for sites |
| Commercial | leads, opportunities, activities, quotations, quotation_versions, sales_orders, order_lines, contracts, deliveries, billing_advice, billing_schedules | Won opportunity links quote/order/project; commercial revision history; one invoice source of truth; no duplicate external posting |
| Projects | projects, wbs_tasks, dependencies, milestones, budgets, resources, timesheets, risks, variations, technical_documents, handovers | Approved budget/material/time references; project cost derived from defined source events; handover creates customer installed-asset linkage |
| Purchase | requisitions, requisition_lines, rfqs, supplier_quotes, comparisons, purchase_orders, po_lines, po_revisions, service_acceptances | Approved demand and authority, line-level partial receipts, selection rationale; received/rejected/outstanding reconcile |
| Stock | stock_movements, stock_balances, reservations, grns, inspections, serials, transfers, subcontract_issues, reconciliations, counts, adjustments | Server-owned immutable movements; atomic reserve/issue prevents double allocation; quarantine excluded; reversal via compensating event |
| Assembly | boms, bom_versions, bom_lines, requirement_runs, production_orders, operations, material_consumptions, quality_checks, fg_receipts | Released BOM revision fixed per order; stages/QC control FG; partial/waste/rework quantities reconcile |
| Assets/service | assets, custody_events, warranties, service_contracts, covered_assets, sla_policies, tickets, visits, visit_checklists, maintenance_plans, calibration_events | Internal/customer ownership separated; contract-specific SLA clock; spares map stock and job; certificate source/approver retained |
| People | employees, candidates, openings, onboarding_tasks, employment_events, shifts, attendance, leave_requests, deployments, certifications, travel_requests, claims, performance_reviews | Effective-dated employment and allocation; overlap and approval rules; confidential records separated from operational roster |
| Payroll | pay_periods, salary_versions, pay_components, run_inputs, pay_runs, employee_run_results, payslips, payroll_exports | Restricted schema/views, precise decimals, approved inputs, maker-checker and locking; statutory engine not assumed |
| Integrations/reports | integration_connections, mappings, outbox_events, delivery_attempts, reconciliations, report_definitions, export_jobs | Idempotency key, retry/dead-letter and source timestamps; financial totals reconciled; report authorization and audit |

This is a logical starting point, not migration-ready SQL. Some aggregates will require multiple tables after field and transaction design. Never model each UI page as an isolated database. Keep operational and sensitive data access separate, and test cross-site, cross-project and payroll denials through direct API calls.

## Open decision handling

Retain OD-01 through OD-28 from the source in the FRD backlog. Design can proceed with neutral labels and realistic examples. Before architecture freeze or fixed-price commitment, resolve the P0s: finance vendor/invoice ownership, concurrency, payroll policy, project depth, assembly depth, valuation, calibration depth, migration/integrations, billing rules and deployment. Do not repeatedly interrupt the visual-design stage to ask the user for every open rule; record the assumption and make the uncertain behavior visible.

## Comparing the two designs

Use the same scope, same illustrative project and the same five tasks. Score each 1–5 on visual quality, information hierarchy, operational clarity, connected workflow, component consistency, mobile usability, accessibility and ease of implementation. Weight operational clarity and connected workflow twice. Select the stronger design or combine explicit component choices; never combine inconsistent token sets or lose requirement mappings in the merge.

The final design review includes all screen families and variants above, all 219 module entries with their source status, all 12 end-to-end scenarios, shared masters/security/integrations, NFR categories and the OD register. This document does not establish approved fields, policies, legal compliance, migration volume, SLAs or production acceptance.
