# ERP domain and interface research

Reviewed 3 November 2026. Primary vendor sources informed the proposal. These are vendor descriptions and case studies, not independent outcome audits or evidence about Pinnacle Engineering's internal processes. The anonymized SoW deliberately withholds the client's website; no attempt was made to identify the client.

## Relevant evidence and resulting design choices

### Engineering manufacture and project procurement

[Frappe's Pogliano Busbar story](https://frappe.io/stories/Pogliano%20Busbar%20FZC) describes difficulty connecting material consumption, project progress, purchasing and serial/warranty tracking. It reports connecting those functions with workforce operations. The useful lesson for this design is to show project demand, stock availability and procurement references together, with navigable serial and warranty history. Its UAE accounting treatment is not applicable evidence for Pinnacle Engineering's unresolved Indian finance scope.

### Electronics assembly and material traceability

[Frappe's Micron EMS Tech story](https://frappe.io/stories/Micron%20EMS%20Tech%20Pvt.%20Ltd.) reports disconnected production, customer-owned inventory, duplicate items and email approvals. It describes unifying orders, material movements and finished goods. We infer that ownership markers, item master quality, approval evidence and receipt-to-consumption lineage deserve visible UI, rather than being hidden behind stock totals. No vendor benefit percentages are used as Pinnacle Engineering claims.

### Manufacturing workflow references

[Odoo Manufacturing features](https://www.odoo.com/app/manufacturing-features) presents BOMs, work orders, stages, quality and traceability. The design adopts linked BOM/work-order/QC views because those also match the SoW. Do not import Odoo's separate module taxonomy or broader forecasting/capacity features into Pinnacle Engineering's scope. Search-indexed official page content was available; direct page fetches timed out, so no hands-on Odoo demo verification is claimed.

### Field service workflow references

[Odoo Field Service features](https://www.odoo.com/app/field-service-features) describes assignment views, worksheets, time and service reports. We infer that a coordinator queue and a simplified technician work card should share one underlying service record. GPS, native apps, customer portals and mobile signatures appearing in another product are not requirements for Pinnacle Engineering. This source was reviewed through indexed official content; no authenticated or live Odoo application was tested.

### Enterprise page organization

[SAP Fiori Elements guidance](https://www.sap.com/design-system/fiori-design-web/v1-108/discover/frameworks/sap-fiori-elements) distinguishes worklists/list reports, record/object pages, analytical pages and role-specific overview pages. We inspected its public browser page and use that separation to plan consistent ERP screens. This is a pattern reference, not a proposal to adopt SAP UI5 or reproduce SAP branding. We also opened the public SAP Fiori Development Portal list-report sample and inspected its filter bar, ID/status columns, row navigation and contextual actions. This was a public sample review, not an authenticated SAP deployment or an audit of business functionality. [Public sample](https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/topic/floorplanListReport/simpleListReport).

### Figma workflow

[Figma's attachment guide](https://help.figma.com/hc/en-us/articles/31304529835671-Attach-files-to-a-prompt-in-the-Figma-agent-and-Figma-Make) currently lists DOCX and Markdown support. [Its Make creation guide](https://help.figma.com/hc/en-us/articles/31304485164695-Create-a-Figma-Make-file) recommends specific prompts and incremental construction, and distinguishes a functional prototype from design layers. [Plan mode](https://help.figma.com/hc/en-us/articles/40830441709719-Use-plan-mode-in-Figma-Make) can create a reviewable plan before generation on supported paid plans. The prompt pack therefore begins with planning and then builds focused screen groups. Features, credits and seats can change; use the options visible in your account.

## What users likely value

These are design inferences from the SoW and the above sources, not a completed Pinnacle Engineering user-research study.

| User | Important question | Interface response |
| --- | --- | --- |
| Operations leader | What threatens delivery today? | Ranked exceptions, dates, owners and direct actions |
| Project manager | Which demand or approval blocks my milestone? | One project detail with materials, purchases, workforce and cost context |
| Storekeeper | Can this quantity be issued, and who has it? | Available/reserved/quarantined distinction, site and subcontract custody ledger |
| Production/QC | Which revision and stage are authorized? | Released BOM identity, work-order stage evidence and separate QC outcome |
| Purchasing | Why this supplier and this amount? | Comparable quotation columns, lead time and technical compliance, approval history |
| Service coordinator | What must be assigned before an SLA is missed? | Contract entitlement, due target, engineer availability and visit outcome |
| Field engineer | What do I need to do at this site? | Mobile-friendly task, equipment history, checklist, spares and evidence |
| HR/payroll | Which inputs are unresolved and who can see pay? | Input exceptions, effective dates, restricted records and run lock |
| Finance liaison | What has already been posted externally? | Source-of-truth references, duplicate-safe handoff and mismatch queue |

## Design implications and limits

Favor exception-to-action flows, linked records, dependable tables and restrained visual hierarchy. Use motion to indicate a state transition or establish page structure. The revised entry page uses a functioning record route and direct module links instead of decorative illustration; operating views avoid visual clutter.

## Visual-reference review for the revised concept

The user shared [Impeccable](https://impeccable.style/#why) and its [official repository](https://github.com/pbakaus/impeccable). We installed it at project scope and used its rendered-page detector to find small type and contrast problems. Its tool is a quality check, not a substitute for a brand concept.

The shared [Graphify onboarding URL](https://app.graphify.com/onboarding) redirected to [Graphify's public login screen](https://app.graphify.com/login?returnTo=%2Fonboarding), so we did not inspect the authenticated onboarding flow. The visible login used strong brand/task separation, high-contrast lettering and a specific product proposition. That prompted a separate Pinnacle Engineering concept built around a linked engineering job route; no Graphify assets, copy, logo, layout or palette were copied.

The additional skill repositories the user shared were reviewed as options. For this revision, the project-scoped Impeccable detector and direct browser review gave concrete feedback on the observed design defects. No global collection of overlapping skills was installed.

No client interviews, paid demo accounts, authenticated ERP installations, usability sessions or independent market sizing were performed. The source does not establish customer buying preferences beyond its requirements. The next decisive validation is a process-owner walkthrough using actual sample forms and representative scenarios, followed by approved screen/field rules.

## Technical reference checks

[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [database functions](https://supabase.com/docs/guides/database/functions) support the proposed permission and server-operation direction, with explicit policy and privilege testing. [TanStack Table documentation](https://tanstack.com/table/latest/docs/framework/react) supports configurable table logic with custom markup. These references verify candidate capabilities; they do not prove capacity, implementation completeness or suitability for Pinnacle Engineering's unmeasured workload.
