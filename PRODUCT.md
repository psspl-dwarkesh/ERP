# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

ABC Limited staff working across engineering projects, procurement, stock, panel assembly, installed assets, field service, sales, HR, payroll and administration. The audience for this prototype also includes client reviewers who need to judge whether the proposed portal reflects the supplied scope.

## Product Purpose

Coordinate a single legal entity's work across eleven ERP modules and seven business verticals. A user should be able to move from an enquiry or order to project execution, material demand, purchasing, assembly, delivery, installed assets and service while retaining the relationship between records.

## Operating Context

The supplied draft SoW describes turnkey automation, electrical panels, instrumentation trading, calibration, AMC, O&M and CSV/manufacturing IT. It calls for project, asset, inventory, payroll, HR, user management, purchase, sales, CRM, dashboard and report modules. The design comparison uses illustrative PRJ-0264, BOM-042, PR-0084, RFQ-0041, WO-0187, AST-0042 and SR-0148 records.

## Capabilities and Constraints

- The original SoW is a discovery draft, not an approved FRD. Preserve confirmed, validate and decision-required distinctions in `docs/REQUIREMENT_COVERAGE.md`.
- The final product requires frontend, backend, relational persistence, security, APIs and a combined release of all eleven modules. This local UI is a synthetic-data prototype, not that implementation.
- External finance and invoice ownership, statutory depth, payroll policy, integrations and several other decisions remain open. Do not imply those are implemented or approved.
- No customer or vendor external portal, native offline app, IoT/SCADA or AI/OCR capability is established as baseline scope.
- Current code uses React, TypeScript and Vite. Production stack selection remains a proposal in `docs/PROJECT_BRIEF.md`.

## Evidence on Hand

- Original source: `source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` (copy of the user-provided attachment).
- Extracted source and requirement map: `source/scope-extracted.txt`, `source/requirements.json`, `docs/REQUIREMENT_COVERAGE.md`.
- Research and source boundaries: `docs/RESEARCH.md`.
- Current local prototype: `prototype/`; all records are illustrative and there are no approved brand assets or real client data.

## Product Principles

1. Show linked work and exceptions before decorative metrics.
2. Make record ownership, state and next action clear.
3. Keep the prototype's claims separate from the future production system.
4. Preserve engineering and service vocabulary from the supplied scope.
