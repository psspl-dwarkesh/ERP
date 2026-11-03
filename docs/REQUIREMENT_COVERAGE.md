# Requirements to screen coverage register

Prepared 3 November 2026. All 219 source module entries are reproduced below with their original C/V/D mark and a proposed principal screen mapping. This is **planning coverage**, not completed implementation, customer acceptance or evidence that the prototype fully designs every requirement.

C = confirmed category, V = validate, D = decision. Totals: **52 C / 152 V / 15 D**. Original text comes from `source/scope-extracted.txt`; original DOCX is preserved separately. Proposed UI families are defined in `SCREEN_AND_WORKFLOW_PLAN.md`.

Every row remains Pending FRD validation or Decision required for production. The comparison prototype is a representative subset. Its generic records and navigation do not count as full screen-level coverage. See `PROTOTYPE_GUIDE.md` for actual implemented surfaces.

| Source ID | Original requirement | Source status | Proposed screen families | Production baseline |
| --- | --- | --- | --- | --- |
| PM-001 | Register multiple project types, including automation/turnkey engineering, electrical panel, instrumentation, calibration, O&M, AMC and computerized system validation engagements. | C | PM-UI-01 | Pending detailed FRD validation |
| PM-002 | Create project master with customer, order/contract references, site, owning business unit, planned dates, project manager, status and document links. | V | PM-UI-01 | Pending detailed FRD validation |
| PM-003 | Capture project scope, deliverables and contractual milestones against approved sales order / work order. | V | PM-UI-02 | Pending detailed FRD validation |
| PM-004 | Structure phases, work breakdown structure, task dependencies, assigned resources and planned/actual dates. | V | PM-UI-02 | Pending detailed FRD validation |
| PM-005 | Establish project budget by material, internal labour, subcontracting, travel, equipment and other cost categories. | V | PM-UI-03 | Pending detailed FRD validation |
| PM-006 | Track planned versus actual work, milestones, deliverables, progress and deviations with status history. | V | PM-UI-02 | Pending detailed FRD validation |
| PM-007 | Link engineering drawings, technical specifications, document revisions, approvals and transmittals to projects. | V | PM-UI-04 | Pending detailed FRD validation |
| PM-008 | Associate engineering BOM, project material requirements, stock reservations, purchases and site transfers to each project. | V | PM-UI-04 | Pending detailed FRD validation |
| PM-009 | Allocate engineers/technicians and record project/site timesheets, utilization, expenses and deployment dates. | V | PM-UI-03 | Pending detailed FRD validation |
| PM-010 | Track external subcontractors and work packages with progress, material accountability and deliverable status. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-011 | Record project issues, risks, decisions, change requests and approved scope variations. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-012 | Provide technical hold points / checklists for inspection, FAT, SAT, installation, loop testing, commissioning and customer acceptance as applicable. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-013 | Support customer/site-specific quality documentation and validation deliverables by attachment and controlled revision. | V | PM-UI-04 | Pending detailed FRD validation |
| PM-014 | Record site dispatch, installation progress and completion certificates with linked inventory movements. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-015 | Associate milestones, delivery evidence and approved variations with billing triggers for Sales. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-016 | Provide project-wise contract value, committed cost, incurred cost, billed value and estimated margin using agreed financial source data. | V | PM-UI-03 | Pending detailed FRD validation |
| PM-017 | Support on-hold, cancelled and reopened projects with reason, approvals and audit trail. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-018 | Manage handover from projects into installed-base asset register, warranty, service and AMC schedules. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-019 | Manage completion, open punch list, lessons learned, documents archival and authorized project closure. | V | PM-UI-05 | Pending detailed FRD validation |
| PM-020 | Configure project-specific approval gates and notifications for budget, procurement, variations and closure. | V | PM-UI-04 | Pending detailed FRD validation |
| AST-001 | Maintain internal company-owned asset register for computers, instruments, calibration equipment, vehicles and tools. | C | AST-UI-01 | Pending detailed FRD validation |
| AST-002 | Maintain separately identifiable customer-installed equipment and equipment supported under AMC/O&M contracts. | C | AST-UI-01 | Pending detailed FRD validation |
| AST-003 | Record asset identity, category, serial/tag number, manufacturer, model, ownership, location, custodian and lifecycle state. | V | AST-UI-01 | Pending detailed FRD validation |
| AST-004 | Maintain purchase/commissioning dates, vendor, warranty coverage, supporting documents and service history. | C | AST-UI-01 | Pending detailed FRD validation |
| AST-005 | Assign or transfer tools/instruments to employee, warehouse, branch or project site with acknowledgement and accountability. | V | AST-UI-02 | Pending detailed FRD validation |
| AST-006 | Track preventive maintenance schedules for applicable internal or customer assets. | C | AST-UI-06 | Pending detailed FRD validation |
| AST-007 | Track calibration due dates and reminders for relevant instruments and calibration masters. | C | AST-UI-06 | Pending detailed FRD validation |
| AST-008 | Store calibration reference, equipment, work performed, result, certificate attachment and next-due date. | V | AST-UI-06 | Pending detailed FRD validation |
| AST-009 | Register service contracts and relate the covered installed assets, sites, customer and contract validity. | C | AST-UI-03 | Pending detailed FRD validation |
| AST-010 | Record service contract entitlements, coverage windows, response commitments, exclusions and included visits. | V | AST-UI-03 | Pending detailed FRD validation |
| AST-011 | Create support tickets by customer, asset/site, problem category, priority and channel. | C | AST-UI-04 | Pending detailed FRD validation |
| AST-012 | Monitor service-level targets and escalation stages using contract-specific SLA configuration. | C | AST-UI-04 | Pending detailed FRD validation |
| AST-013 | Schedule preventive maintenance visits and corrective/breakdown interventions. | C | AST-UI-05 | Pending detailed FRD validation |
| AST-014 | Assign technician/engineer to tickets and service visits and capture allocation, status and visit outcomes. | C | AST-UI-05 | Pending detailed FRD validation |
| AST-015 | Generate service visit records with checklists, observation, materials/spares consumed and customer acknowledgement. | C | AST-UI-05 | Pending detailed FRD validation |
| AST-016 | Link spares consumption, site issues and returns to inventory and the relevant service job. | V | AST-UI-05 / INV-UI-04 | Pending detailed FRD validation |
| AST-017 | Track claimable or chargeable service work and support recurring billing events routed to Sales/Accounting. | C | AST-UI-03 / SAL-UI-03 | Pending detailed FRD validation |
| AST-018 | Maintain warranty periods, warranty claims/service status and expiration reminders. | C | AST-UI-01 | Pending detailed FRD validation |
| AST-019 | Handle retirement, disposal, lost/damaged assets, customer asset replacement and equipment swap histories. | V | AST-UI-02 | Pending detailed FRD validation |
| AST-020 | Track maintenance cost and service activity history by equipment, installed base, contract and customer site. | V | AST-UI-01 | Pending detailed FRD validation |
| AST-021 | Allow separation of internal fixed-asset treatment from customer-owned asset records and service inventory. | V | AST-UI-01 | Pending detailed FRD validation |
| AST-022 | Provide service backlog, overdue calibration, approaching warranty expiry and SLA breach monitoring. | V | AST-UI-06 / AST-UI-04 | Pending detailed FRD validation |
| INV-001 | Maintain item master by material class, technical description/specification, UOM, storage parameters and applicable tax classification. | V | INV-UI-01 | Pending detailed FRD validation |
| INV-002 | Support multiple warehouses, bins or project-site stores and separate stock ownership / availability states. | C | INV-UI-01 | Pending detailed FRD validation |
| INV-003 | Record inventory opening balances and approved receipts/issues/transfers with full document traceability. | V | INV-UI-03 | Pending detailed FRD validation |
| INV-004 | Record GRN-driven stock receipt with purchase-order reference and inspection status. | C | INV-UI-02 | Pending detailed FRD validation |
| INV-005 | Apply material inspection results and release/reject/quarantine stock according to agreed QC gates. | C | INV-UI-02 | Pending detailed FRD validation |
| INV-006 | Support item-level stock reservation for approved projects, jobs and panel assembly requirements. | C | INV-UI-04 | Pending detailed FRD validation |
| INV-007 | Support approved warehouse-to-warehouse and warehouse-to-project-site transfers, dispatch and site acknowledgement. | C | INV-UI-04 | Pending detailed FRD validation |
| INV-008 | Track serial numbers for selected items and equipment across receipt, movement, installation and return. | C | INV-UI-03 | Pending detailed FRD validation |
| INV-009 | Support supplier returns and customer/site-to-store returns with reason, condition and disposition. | C | INV-UI-04 | Pending detailed FRD validation |
| INV-010 | Track project/site-issued stock and balance quantities by responsible site/person or subcontractor. | C | INV-UI-04 | Pending detailed FRD validation |
| INV-011 | Issue materials to subcontractors and reconcile consumed, returned, damaged and outstanding quantities. | C | INV-UI-05 | Pending detailed FRD validation |
| INV-012 | Provide stock valuation and value movement history; costing method and financial posting rules to be approved. | C | INV-UI-03 | Pending detailed FRD validation |
| INV-013 | Define and maintain multi-level engineering BOMs for electrical panel and relevant manufactured assemblies. | C | INV-UI-06 | Pending detailed FRD validation |
| INV-014 | Support controlled BOM versions / revisions with approvals and effective dates. | V | INV-UI-06 | Pending detailed FRD validation |
| INV-015 | Calculate material requirements from released BOM and assembly work orders against available/reserved/on-order stock. | C | INV-UI-07 | Pending detailed FRD validation |
| INV-016 | Generate planned procurement/requisition suggestions or shortage lists from material requirements. | V | INV-UI-07 / PUR-UI-01 | Pending detailed FRD validation |
| INV-017 | Create assembly/production work orders linked to customer order, project, panel design and approved BOM. | C | INV-UI-08 | Pending detailed FRD validation |
| INV-018 | Track configurable production stages such as kitting, fabrication, wiring, assembly, testing, packing and dispatch as validated. | C | INV-UI-08 | Pending detailed FRD validation |
| INV-019 | Issue BOM components against work orders and record planned vs actual consumption, substitution and wastage. | V | INV-UI-08 | Pending detailed FRD validation |
| INV-020 | Record production quality inspection/test checkpoints, defects and rework dispositions. | C | INV-UI-09 | Pending detailed FRD validation |
| INV-021 | Receive completed panel/assembly as finished goods with serial/tag reference and tested status. | C | INV-UI-09 | Pending detailed FRD validation |
| INV-022 | Support partial completions, hold, rework and work-order cancellation with inventory reconciliation. | V | INV-UI-08 | Pending detailed FRD validation |
| INV-023 | Link finished-goods allocation, delivery and installation back to project/sales documents. | V | INV-UI-09 / SAL-UI-02 | Pending detailed FRD validation |
| INV-024 | Run stock counts and adjustments using authorized variance approval and adjustment reason. | V | INV-UI-10 | Pending detailed FRD validation |
| INV-025 | Provide stock ageing, slow/non-moving stock and min/reorder-level alerts as configurable options. | V | INV-UI-01 | Pending detailed FRD validation |
| INV-026 | Prevent negative available stock or unapproved use of quarantined material unless an authorized exception rule is defined. | V | INV-UI-04 | Pending detailed FRD validation |
| INV-027 | Support unit conversion, batch/lot numbers and manufacturer part alternatives only for item classes that require them. | V | INV-UI-01 / INV-UI-03 | Pending detailed FRD validation |
| INV-028 | Maintain value, quantity and audit traceability for stock transferred between internal stores and project sites. | V | INV-UI-03 / INV-UI-04 | Pending detailed FRD validation |
| INV-029 | Handle rejected/returned finished goods, replacements and rework work orders. | V | INV-UI-09 | Pending detailed FRD validation |
| INV-030 | Record production completion and QC evidence prior to finished-goods dispatch or commercial acceptance. | V | INV-UI-09 | Pending detailed FRD validation |
| PAY-001 | Provide a Payroll module as one of the requested eleven ERP modules. | C | PAY-UI-01 | Pending detailed FRD validation |
| PAY-002 | Define payroll groups, processing periods, pay components and employee pay structures. | V | PAY-UI-01 | Pending detailed FRD validation |
| PAY-003 | Maintain effective-dated salary structures, allowances, deductions and salary revision history. | V | PAY-UI-01 | Pending detailed FRD validation |
| PAY-004 | Import or calculate payable attendance/leave/unpaid days based on HR policies and approved data. | V | PAY-UI-01 / HR-UI-02 | Pending detailed FRD validation |
| PAY-005 | Configure earnings/deductions for overtime, shift, site, travel and other allowances only if policies require them. | V | PAY-UI-01 | Pending detailed FRD validation |
| PAY-006 | Process payroll preview, discrepancy checks, maker-checker approval and finalization. | V | PAY-UI-02 | Pending detailed FRD validation |
| PAY-007 | Calculate gross pay, statutory and other deductions, and net pay with configurable rounding rules. | V | PAY-UI-02 | Pending detailed FRD validation |
| PAY-008 | Support applicable Indian statutory rules (for example PF, ESIC, professional tax and income-tax withholding) only after applicability and rules are agreed. | D | PAY-UI-01 | Decision required |
| PAY-009 | Generate electronic payslips and authorized salary statements. | V | PAY-UI-03 | Pending detailed FRD validation |
| PAY-010 | Capture employee bank details with controlled access and support bank payment output format where required. | V | PAY-UI-01 / PAY-UI-03 | Pending detailed FRD validation |
| PAY-011 | Process arrears, retroactive adjustments, bonuses, incentives, loans and advances where approved. | V | PAY-UI-02 | Pending detailed FRD validation |
| PAY-012 | Handle joiners, leavers, final settlement and payroll-period locking under agreed policies. | V | PAY-UI-02 | Pending detailed FRD validation |
| PAY-013 | Support employee expense/reimbursement payouts either through payroll or payable workflow as customer decides. | D | PAY-UI-02 / HR-UI-04 | Decision required |
| PAY-014 | Prepare payroll summary, employer cost allocation by project/department, and reconciliation report. | V | PAY-UI-03 | Pending detailed FRD validation |
| PAY-015 | Transfer approved payroll journal/summary to external accounting system if applicable and interface is confirmed. | D | PAY-UI-03 / SYS-06 | Decision required |
| PAY-016 | Prevent unauthorized edits to approved payroll and log reversals/recalculations. | V | PAY-UI-02 | Pending detailed FRD validation |
| PAY-017 | Provide year-end statements and statutory export outputs subject to legal review and final payroll policy. | D | PAY-UI-03 | Decision required |
| PAY-018 | Determine whether payroll for contract workers is processed internally, via vendor invoices or excluded. | D | PAY-UI-01 | Decision required |
| HR-001 | Manage recruitment requests, openings and candidate/application status. | C | HR-UI-01 | Pending detailed FRD validation |
| HR-002 | Support employee onboarding process and required onboarding document checklist. | C | HR-UI-01 | Pending detailed FRD validation |
| HR-003 | Maintain employee profile, identity/contact data, reporting line, department, employment type and current assignment. | C | HR-UI-01 | Pending detailed FRD validation |
| HR-004 | Maintain effective-dated joining, transfer, role change, separation and employee status history. | V | HR-UI-01 | Pending detailed FRD validation |
| HR-005 | Configure leave types, accruals, eligibility, applications, approvals and leave balances. | C | HR-UI-02 | Pending detailed FRD validation |
| HR-006 | Manage attendance records, corrections, holidays and attendance approval workflows. | C | HR-UI-02 | Pending detailed FRD validation |
| HR-007 | Support employee shift patterns, shift assignments and relevant attendance exceptions. | C | HR-UI-02 | Pending detailed FRD validation |
| HR-008 | Record project-site deployment including planned/actual dates, project/contract link, site and reporting manager. | C | HR-UI-03 | Pending detailed FRD validation |
| HR-009 | Track engineer/technician availability and allocation conflicts across projects and service engagements. | V | HR-UI-03 | Pending detailed FRD validation |
| HR-010 | Support travel requests, authorizations, itineraries and settlement. | C | HR-UI-04 | Pending detailed FRD validation |
| HR-011 | Support expense and reimbursement claims, evidence, approvals and payment status. | C | HR-UI-04 | Pending detailed FRD validation |
| HR-012 | Manage employee performance review cycles, goals, feedback and review outcome according to policy. | C | HR-UI-04 | Pending detailed FRD validation |
| HR-013 | Provide role/skill, certification and training records if required for site compliance and assignment. | V | HR-UI-03 | Pending detailed FRD validation |
| HR-014 | Record approved timesheets by project/task/service ticket and pass approved quantities to costing. | V | HR-UI-03 | Pending detailed FRD validation |
| HR-015 | Support document expiry reminders for specified certifications, site permits or contractual requirements. | V | HR-UI-03 | Pending detailed FRD validation |
| HR-016 | Manage offboarding checklist, asset return and handover through Assets/User Management integrations. | V | HR-UI-01 / AST-UI-02 / USR-UI-01 | Pending detailed FRD validation |
| HR-017 | Expose self-service views for profile, leave, attendance, travel and claims subject to access policy. | V | HR-UI-04 / HR-UI-02 | Pending detailed FRD validation |
| HR-018 | Provide leave calendar, deployment roster, attendance exception and utilization views. | V | HR-UI-03 / HR-UI-02 | Pending detailed FRD validation |
| HR-019 | Maintain confidential HR attachments with access restrictions and retention policies. | V | HR-UI-01 | Pending detailed FRD validation |
| HR-020 | Integrate attendance/payable days and approved components with Payroll as defined. | V | HR-UI-02 / PAY-UI-01 | Pending detailed FRD validation |
| HR-021 | Handle contractor/third-party staff records separately from payroll employees where applicable. | D | HR-UI-01 | Decision required |
| HR-022 | Provide branch/site-specific holiday and attendance policies if operationally required. | V | HR-UI-02 | Pending detailed FRD validation |
| USR-001 | Provide user management across all eleven modules. | C | USR-UI-01 | Pending detailed FRD validation |
| USR-002 | Maintain user identities, activation/deactivation, status and mapping to employees where appropriate. | V | USR-UI-01 | Pending detailed FRD validation |
| USR-003 | Implement role-based access permissions by module, function, transaction action and data scope. | V | USR-UI-02 | Pending detailed FRD validation |
| USR-004 | Define organizational scopes for company, branch, department, warehouse, project, site and customer data where required. | V | USR-UI-02 | Pending detailed FRD validation |
| USR-005 | Support configurable maker/checker and multi-level approval authority rather than permitting self-approval of sensitive transactions. | V | USR-UI-02 / SYS-02 | Pending detailed FRD validation |
| USR-006 | Support administrative role assignment and segregation of duties with effective dates. | V | USR-UI-02 | Pending detailed FRD validation |
| USR-007 | Provide secure authentication and session controls; choose SSO/identity provider during design. | D | USR-UI-01 / SYS-01 | Decision required |
| USR-008 | Support MFA for privileged roles or other approved login journeys. | V | USR-UI-01 / SYS-01 | Pending detailed FRD validation |
| USR-009 | Provide password/reset/lockout policy if the ERP directly manages credentials. | V | SYS-01 | Pending detailed FRD validation |
| USR-010 | Log significant create/update/delete/approve/reject/export actions with user, time and before/after context where warranted. | V | USR-UI-03 / SYS-04 | Pending detailed FRD validation |
| USR-011 | Provide notification inbox and configurable email/SMS channels only after gateway decisions. | V | SYS-03 / USR-UI-03 | Pending detailed FRD validation |
| USR-012 | Enforce least-privilege access to salary, HR identity, customer pricing and other restricted data. | V | USR-UI-02 | Pending detailed FRD validation |
| USR-013 | Support inactive session timeout, account recovery and privileged-account review. | V | USR-UI-01 | Pending detailed FRD validation |
| USR-014 | Provide administration of approval hierarchies, escalations and delegations with audit history. | V | USR-UI-02 / SYS-02 | Pending detailed FRD validation |
| USR-015 | Permit authorized attachment upload/view/download with scanning, limits and data permissions. | V | SYS-04 | Pending detailed FRD validation |
| USR-016 | Protect report exports and bulk data imports via permission controls and audit logs. | V | USR-UI-03 / SYS-05 | Pending detailed FRD validation |
| USR-017 | Support branch/site-based users while retaining a single legal-entity data model. | V | USR-UI-02 | Pending detailed FRD validation |
| USR-018 | Provide user provisioning/deprovisioning triggered by HR joins, transfers and exits if process agreed. | V | USR-UI-01 | Pending detailed FRD validation |
| PUR-001 | Register vendor master, category, contact and compliance/tax identifiers subject to approved data fields. | V | PUR-UI-01 | Pending detailed FRD validation |
| PUR-002 | Capture purchase requisitions from projects, BOM material shortages, general procurement and maintenance demand. | V | PUR-UI-01 | Pending detailed FRD validation |
| PUR-003 | Support multi-level purchase approvals based on configured amount, category, project and authority. | C | PUR-UI-01 / SYS-02 | Pending detailed FRD validation |
| PUR-004 | Invite/request supplier quotations and record supplier responses against a common enquiry. | V | PUR-UI-02 | Pending detailed FRD validation |
| PUR-005 | Generate vendor quotation comparison covering price, lead time, taxes, delivery terms and technical compliance. | C | PUR-UI-02 | Pending detailed FRD validation |
| PUR-006 | Record vendor selection justification, negotiation and approval history. | V | PUR-UI-02 | Pending detailed FRD validation |
| PUR-007 | Create purchase orders for materials, equipment, services and subcontracting as applicable. | V | PUR-UI-03 | Pending detailed FRD validation |
| PUR-008 | Validate PO against approved requisition/budget and applicable authority thresholds. | V | PUR-UI-03 | Pending detailed FRD validation |
| PUR-009 | Support revision, cancellation, short closure and partial receipt of PO lines with authorized controls. | V | PUR-UI-03 | Pending detailed FRD validation |
| PUR-010 | Record goods receipt notes and connect GRN to inventory receipt/quality hold. | C | PUR-UI-04 / INV-UI-02 | Pending detailed FRD validation |
| PUR-011 | Require material inspection/acceptance before saleable/issuable status when configured. | C | PUR-UI-04 / INV-UI-02 | Pending detailed FRD validation |
| PUR-012 | Handle delivery shortages, excess quantity, damages and supplier replacement or return workflows. | V | PUR-UI-04 | Pending detailed FRD validation |
| PUR-013 | Maintain ordered, received, rejected, invoiced and outstanding quantities per PO line. | V | PUR-UI-03 | Pending detailed FRD validation |
| PUR-014 | Track service acceptance or work-completion evidence for service purchase orders. | V | PUR-UI-04 | Pending detailed FRD validation |
| PUR-015 | Record supplier invoice references and match PO/receipt/acceptance subject to accounting responsibility decision. | D | PUR-UI-04 | Decision required |
| PUR-016 | Provide payable handoff to external accounting or separate finance system after interface confirmation. | D | PUR-UI-04 / SYS-06 | Decision required |
| PUR-017 | Enable project-wise committed procurement costs and pending procurement visibility. | V | PUR-UI-03 / PM-UI-03 | Pending detailed FRD validation |
| PUR-018 | Support subcontractor material issue/return reconciliation using Inventory links. | C | PUR-UI-04 / INV-UI-05 | Pending detailed FRD validation |
| PUR-019 | Provide vendor delivery performance, procurement ageing and open PO reports. | V | PUR-UI-03 / RPT-UI-02 | Pending detailed FRD validation |
| PUR-020 | Store procurement documents, terms, inspection certificates and approval logs. | V | PUR-UI-03 / SYS-04 | Pending detailed FRD validation |
| SAL-001 | Provide a Sales module supporting engineering, equipment supply, panel assembly and service engagements. | C | SAL-UI-01 | Pending detailed FRD validation |
| SAL-002 | Prepare customer quotation for material, engineering services, project scope and AMC/O&M services. | V | SAL-UI-01 | Pending detailed FRD validation |
| SAL-003 | Allow quotation versions/revisions, commercial terms, validity and authorized approval. | V | SAL-UI-01 | Pending detailed FRD validation |
| SAL-004 | Convert won/approved quotations to customer order or contract with linked CRM opportunity. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-005 | Maintain customer PO/contract references, line items, value, taxes, deliverables, validity and delivery commitments. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-006 | Create project/production demand from customer order for project and panel-delivery business. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-007 | Reserve available finished goods or traded goods for confirmed customer orders. | V | SAL-UI-02 / INV-UI-04 | Pending detailed FRD validation |
| SAL-008 | Record delivery notes, dispatch details, installation/acceptance status and customer acknowledgement. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-009 | Support partial deliveries, back-orders and customer-approved order amendments. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-010 | Track project milestone billing eligibility against approved milestones/completion certificates. | V | SAL-UI-03 | Pending detailed FRD validation |
| SAL-011 | Support recurring billing schedules for AMC/O&M contracts and chargeable service events. | C | SAL-UI-03 | Pending detailed FRD validation |
| SAL-012 | Support advance, milestone, retention or final billing patterns only after contract/payment terms are confirmed. | D | SAL-UI-03 | Decision required |
| SAL-013 | Determine whether tax invoice is generated in ERP or in external accounting; avoid duplicate invoice ownership. | D | SAL-UI-03 / SYS-06 | Decision required |
| SAL-014 | Provide invoice request/billing advice records and references to accounting invoice/payment status when integrated. | V | SAL-UI-03 | Pending detailed FRD validation |
| SAL-015 | Track credit notes, returns and warranty replacements according to accounting ownership. | D | SAL-UI-03 | Decision required |
| SAL-016 | Provide open order book, delivery backlog, unbilled milestones and contract expiry views. | V | SAL-UI-02 / SAL-UI-03 | Pending detailed FRD validation |
| SAL-017 | Capture customer acceptance documents and commercial closure checklists. | V | SAL-UI-02 | Pending detailed FRD validation |
| SAL-018 | Maintain rate cards and standard price lists where applicable. | V | SAL-UI-01 | Pending detailed FRD validation |
| SAL-019 | Protect discount/price override authorization and track sales revisions. | V | SAL-UI-01 | Pending detailed FRD validation |
| SAL-020 | Support customer-level/project-level sales performance and billing pipeline reporting. | V | SAL-UI-03 / RPT-UI-02 | Pending detailed FRD validation |
| CRM-001 | Provide CRM as a requested core ERP module. | C | CRM-UI-01 | Pending detailed FRD validation |
| CRM-002 | Create lead accounts and contacts with source, vertical, location and ownership. | V | CRM-UI-01 | Pending detailed FRD validation |
| CRM-003 | Manage lead qualification and opportunity creation with expected value, stage and probability methodology. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-004 | Capture technical requirements, RFQ documents, enquiry details and expected bid/decision dates. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-005 | Record presales activities, calls, meetings, notes, reminders and next actions. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-006 | Assign opportunity owners, engineering estimator and required commercial participants. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-007 | Link each enquiry to one or more proposals or quotation revisions. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-008 | Support bid/no-bid decisions and pipeline stage approvals where required. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-009 | Track tender opportunities, bid dates, submission tasks and supporting tender documents where needed. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-010 | Track win/loss outcome and reasons, competitor information and lost opportunity history. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-011 | Provide shared customer/contact master linked to Sales, Projects, Assets and Services. | V | CRM-UI-01 | Pending detailed FRD validation |
| CRM-012 | Prevent duplicate customer/lead records by agreed matching/merge controls. | V | CRM-UI-01 | Pending detailed FRD validation |
| CRM-013 | Create service/AMC renewal opportunities using contract expiry events. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-014 | Provide contact-level communication history and permissions subject to privacy rules. | V | CRM-UI-01 | Pending detailed FRD validation |
| CRM-015 | Monitor activity ageing, neglected opportunities and scheduled follow-ups. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-016 | Produce pipeline by vertical, owner, value, stage and forecast close period. | V | CRM-UI-02 | Pending detailed FRD validation |
| CRM-017 | Limit bulk email campaigns, telephony, marketing automation and external portals to approved integrations, not assumed baseline. | D | CRM-UI-02 / SYS-06 | Decision required |
| CRM-018 | Support handoff of won opportunities to Sales/Projects without re-entering master information. | V | CRM-UI-02 / SAL-UI-02 | Pending detailed FRD validation |
| DASH-001 | Provide a Dashboard module across ERP domains. | C | DASH-01 | Pending detailed FRD validation |
| DASH-002 | Define executive summary tiles by sales pipeline, order book, active projects, procurement and inventory exposure. | V | DASH-01 | Pending detailed FRD validation |
| DASH-003 | Show projects at risk, overdue milestones, budget exceptions and unbilled work when source data exists. | V | DASH-02 | Pending detailed FRD validation |
| DASH-004 | Show outstanding PR/PO approvals, delayed GRN and vendor delivery issues. | V | DASH-02 | Pending detailed FRD validation |
| DASH-005 | Show stock shortages, reserved value, ageing and pending work orders. | V | DASH-02 | Pending detailed FRD validation |
| DASH-006 | Show panel production WIP, stage-wise bottlenecks, QC rejects and due dispatch. | V | DASH-02 | Pending detailed FRD validation |
| DASH-007 | Show AMC ticket volumes, open SLA breaches, technician load and preventive service due dates. | V | DASH-03 | Pending detailed FRD validation |
| DASH-008 | Show upcoming calibration deadlines and warranty/contract expiries. | V | DASH-03 | Pending detailed FRD validation |
| DASH-009 | Show workforce deployment, leave/attendance exceptions and pending claims approvals. | V | DASH-03 | Pending detailed FRD validation |
| DASH-010 | Allow drill-through from approved KPI tiles to relevant transaction lists with data access enforcement. | V | DASH-01 | Pending detailed FRD validation |
| DASH-011 | Support common date, customer, project, vertical, branch and site filters where applicable. | V | DASH-01 | Pending detailed FRD validation |
| DASH-012 | Display data refresh timestamp and documented KPI definitions; real-time refresh frequency to be decided. | V | DASH-01 | Pending detailed FRD validation |
| DASH-013 | Enable role-specific layouts and personalization only to the agreed extent. | V | DASH-01 | Pending detailed FRD validation |
| RPT-001 | Provide Reports as one of the eleven requested modules. | C | RPT-UI-01 | Pending detailed FRD validation |
| RPT-002 | Define report catalogue with business owner, purpose, source, filters, grouping, column definitions and access scope. | V | RPT-UI-01 | Pending detailed FRD validation |
| RPT-003 | Deliver project portfolio, milestone ageing, commitment and budget/actual profitability reports. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-004 | Deliver BOM shortage, material allocation, site inventory and assembly work-in-progress reports. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-005 | Deliver stock ledger, valuation, ageing, receipt/issue/transfer and serial traceability reports. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-006 | Deliver procurement PR/PO pending, vendor comparison, PO ageing and GRN inspection reports. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-007 | Deliver customer enquiries, sales pipeline, order book, deliveries and billing schedules. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-008 | Deliver asset register, calibration due/overdue, maintenance, warranty and custody reports. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-009 | Deliver AMC/O&M ticket ageing, SLA attainment/breaches, visits, technician activity and renewal pipeline. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-010 | Deliver HR roster, attendance, leave, site deployment, travel claims and performance tracking summaries. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-011 | Deliver payroll register, reconciliation, payslips and authorized statutory extracts subject to rules approval. | D | RPT-UI-02 | Decision required |
| RPT-012 | Deliver audit trail and approval cycle exception reports for authorized users. | V | RPT-UI-03 | Pending detailed FRD validation |
| RPT-013 | Permit filtering, sorting, pagination and export to approved formats according to data classification. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-014 | Define report period cut-offs, timezone, ownership and data freshness assumptions per report. | V | RPT-UI-01 | Pending detailed FRD validation |
| RPT-015 | Support scheduled email delivery only where security, recipients and integration gateway are approved. | D | RPT-UI-03 | Decision required |
| RPT-016 | Protect personally identifiable and salary-related report content using field-level or report-level permissions. | V | RPT-UI-02 | Pending detailed FRD validation |
| RPT-017 | Provide exception reports for duplicate records, incomplete master data, unmatched receipts and integration failures. | V | RPT-UI-03 | Pending detailed FRD validation |
| RPT-018 | Validate at least one accepted sample output/layout per report before FRD sign-off. | V | RPT-UI-01 | Pending detailed FRD validation |

## Coverage beyond module rows

| Source area | Design response / remaining gate |
| --- | --- |
| Business context and seven verticals | PROJECT_BRIEF; entry-page selector and shared records; actual operating rules need process-owner validation |
| Full frontend/backend/database/API responsibility | PROJECT_BRIEF static-vs-production and stack; SCREEN_AND_WORKFLOW_PLAN logical model; production not built |
| Canonical linkages and shared controls | Navigation/shared behavior; SYS families; twelve E2E journeys mapped in SCREEN_AND_WORKFLOW_PLAN and written step by step in E2E_JOURNEYS |
| E2E-01 through E2E-12 | E2E_JOURNEYS.md carries all twelve as ordered steps with record chain, gate, invariant and exception states. The prototype demonstrates one end to end (E2E-06 service response), eight partially, and three not at all (E2E-04 subcontract reconciliation, E2E-11 count and correction, E2E-12 exit). Design coverage is not UAT coverage: acceptance criteria still come from the client |
| Master governance and migration | SYS-05, logical model and source section 8; source inventory, volumes and reconciliation scope undecided |
| Role/approvals/audit | USR-UI-01/02/03 and SYS-02/04; signed action/data/field matrix and direct API deny tests required |
| INT-01 through INT-09 | SYS-06 and original interface register; accounting, attendance, bank, SSO, gateways, legacy, BI and OT remain conditional; no live connections |
| NFR categories | Capacity, performance, availability/support, resilience, security, privacy, audit, UX, observability, release engineering, compliance, interoperability and data accuracy retained as production work; numeric targets undecided |
| Reporting/KPI governance | RPT families with owner/source/formula/period/cutoff/freshness/access/sample; not an approved numbered report pack |
| Verification and acceptance | Scope-to-FRD-to-test traceability, signed baseline, migration reconciliation, security/load/restore and combined UAT per source; prototype build is not acceptance |
| Deliverables and one-release model | Internal workstream sequence retained in PROJECT_BRIEF; all eleven modules accepted in one production release |
| Exclusions and change control | No additional modules, full GL, statutory filing, OT, native offline, specialist QMS/LIMS, AI/OCR/RPA or portals implied; conditional additions need decision/change record |
| OD-01 through OD-28 | Original decision register preserved in source; open decisions are not silently resolved by design defaults |
| Appendices and sign-off | Original FRD template, glossary, anonymization and sign-off checklist preserved; this register does not replace those artifacts |

Regenerate with `source/build_coverage.py` after intentional source changes. The script verifies count, status totals, unique IDs, screen-family existence and original-copy hash. Original source must never be changed merely to make this check pass.
