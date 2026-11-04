# End-to-end journey designs

Twelve journeys, written step by step. [The screen and workflow plan](SCREEN_AND_WORKFLOW_PLAN.md) names them in one line each and lists the screen families they cross; this document is where the chain becomes navigable design: who acts, which record carries the identity from one module to the next, what each screen must make visible at that moment, what must never be possible, and which exception state the layout has to survive.

Use it three ways. A designer uses it to check that a workflow can actually be walked without inventing a screen. A reviewer uses the coverage table at the end to see what the prototype proves and what remains a drawing. Later, the same steps become UAT scripts, with acceptance criteria written by the client, not by us.

Two rules keep this honest. Record IDs that already exist in the prototype's fixture set are used as-is, so a step can be clicked today; where a journey needs a record the prototype does not carry, the ID is new, clearly illustrative, and the gap is named in that journey's coverage line. And no step here implies an integration, a posting, a legal payroll result or a real approval: those are the source's own open decisions, referenced by topic rather than resolved by design default.

Conventions: **Chain** is the identity thread the design must preserve. **Gate** is a decision a different person must make. **Invariant** is what must hold on every screen in the chain. **States** are the non-happy paths the layout must show. Steps are ordered as a user would perform them, not as a database would write them.

---

### E2E-01 · Enquiry to accepted order

Business question: how does one customer need become a project without anyone re-typing it?

Cast: sales owner (Sana Kapoor), estimator, project manager (Ananya Rao).

Chain: OPP-0076 → QUO-0237 (Summit Engineering · ₹12.40 L · AMC proposal) for the live case, and SO-0196 → PRJ-0264 (Northstar Pharma · Pune plant) for the accepted side.

1. CRM-UI-02 · The pipeline shows OPP-0081 in Qualification and OPP-0076 in Proposal with stage, value, expected date and the vertical that owns delivery. RFQ and technical attachments belong to the opportunity record, not to an inbox side-channel, and bid/no-bid carries a reason.
2. SAL-UI-01 · Converting OPP-0076 creates QUO-0237 with material, service and AMC lines separated, because the three bill differently and only one of them becomes a project. Both records carry ₹12.40 L and the same date, which is the identity the design must preserve.
3. SAL-UI-01 · A revision must be visibly a revision: what changed, who changed it, which version was sent. QUO-0237 is In review today; the design needs the approved and superseded states beside it.
4. SAL-UI-01 · A discount beyond the owner's authority raises a gate instead of letting the number through. The quotation shows the pending status on its own face and a stale-approval badge in the list.
5. SAL-UI-02 · Acceptance creates SO-0196 pinned to QUO-0221 rev B, with the customer PO reference and delivery commitment. The order never re-enters a price by hand.
6. PM-UI-01 · Creating PRJ-0264 from the order pre-fills customer, site, vertical, owner and value. The project screen states which of those came from the order and which the project manager may still change.
7. DASH-01 · The new project appears in the portfolio count and the open project book the same day, with the source order one click away.

Invariants: one customer identity across CRM, Sales and Projects; the quote revision used for the order is immutable after acceptance; the order value and project value are the same number or the difference is explained on both screens.

States: lost opportunity with reason; quote expired; amendment to an accepted order; partial award (customer keeps two of three lines); no-permission view of the commercial terms for delivery staff.

Prototype coverage: partial. The entry page walks SO-0196 → PRJ-0264 and both module lists carry the fixtures. Two gaps this journey exposes: the fixture set has no Northstar opportunity, so the enquiry-to-order thread breaks in the middle and must be drawn rather than clicked; and conversion, revision comparison and the authority gate are not interactive anywhere yet.

---

### E2E-02 · Released BOM to dispatchable panel

Business question: does the panel that ships match the drawing that was approved?

Cast: engineering (Rahul Desai), stores, assembly supervisor, QC, purchase (Nikhil Joshi).

Chain: BOM-042 rev C → PR-0084 / RFQ-0041 → purchase order → receipt and GRN → WO-0187 → QC → finished goods.

1. INV-UI-06 · BOM-042 revision C is released and frozen. The editor shows effective dates and the approval, and revision D sits beside it as a proposal, never as the working document.
2. INV-UI-07 · A requirements run against revision C produces shortages with required dates, and the run timestamp is printed on the result so a later run cannot silently overwrite the earlier demand.
3. PUR-UI-01 · The shortage raises PR-0084 (₹2.84 L) for approval; the requisition states the project and BOM that generated it.
4. PUR-UI-02 · RFQ-0041 compares three suppliers with price, tax, lead time, technical compliance and delivery terms as separate columns. The selection carries a written reason; the cheapest row is not pre-selected.
5. PUR-UI-03 → INV-UI-02 · A receipt reconciles expected, received, rejected and outstanding on one line: PO-0118 is the fixture that already reads "Part received", and GRN-0073 is the fixture that shows a receipt landing in the QC bay. Neither is the purchase order raised from PR-0084, which is the gap this step exists to name. A receipt cannot exceed what the line can absorb without an explicit excess decision.
6. INV-UI-08 · WO-0187 kits from what is actually available, then runs kitting → fabrication → wiring → assembly → testing → packing. Each stage shows planned against consumed, with waste and substitution visible rather than absorbed.
7. INV-UI-09 · QC holds the work order. The dispatch action is present and blocked, and the block explains itself: complete the assembly stage and QC still must approve.
8. DASH-02 · The bottleneck appears on the supply-chain view as a stage/QC exception, linked back to WO-0187.

Invariants: the work order pins one BOM revision for its whole life; reserved quantity cannot be issued twice; quarantined stock never appears in available; a reversal is a compensating movement, not an edited row.

States: shortage caused by a superseded revision; partial supply; rework and scrap quantities; substitution needing approval; cancelled line; QC reject with disposition.

Prototype coverage: partial. Inventory Requirements, Panel assembly stages, the QC block and the PR-0084 comparison are interactive; the receipt reconciliation and revision-difference view are drawn as states, not run. No purchase order in the fixture set belongs to PR-0084, so the requisition-to-order half has to be designed before it can be demonstrated.

---

### E2E-03 · Project need to site stock that is really there

Business question: can a site count on the number it sees?

Cast: project manager, stores, site engineer, transfer approver.

Chain: PRJ-0258 → reservation ITM-0214 → transfer → site acknowledgement.

1. PM-UI-04 · The project's material plan lists what it needs and when, and links the shortage to the requisition that covers it.
2. INV-UI-01 · The stock register separates on-hand, reserved, quarantine and available. ITM-0214 (16 available, 8 reserved) is the easy case; ITM-0137 is the one that matters, because 6 units are quarantined and available reads zero.
3. INV-UI-04 · Reserving against PRJ-0258 succeeds only when unreserved stock exists. The screen shows which project holds the rest, so the rejection is actionable rather than mysterious.
4. INV-UI-04 · A warehouse-to-site transfer needs an acknowledgement before the site may consume it. Until then the material is in transit on both screens, not available twice.
5. INV-UI-03 · The ledger shows every movement with its source reference and from/to, and the opening balance reconciles to the current figure.

Invariants: blocked or QC-held stock never appears as available anywhere in the product; a reservation is atomic; transit quantity belongs to neither location until acknowledged; valuation method is stated wherever a value is printed, and remains an open decision.

States: insufficient stock; partially reserved; blocked QC; transfer refused; stale balance after a concurrent issue (a concurrency rule the source has not yet set).

Prototype coverage: partial. Stock, reservations and the blocked-issue simulation are interactive; transfer acknowledgement and the ledger are drawn screens.

---

### E2E-04 · Subcontract issue to reconciled variance

Business question: when material leaves for a partner's shop, who answers for what does not come back?

Cast: purchase, subcontract custodian, stores, approving manager.

Chain: PO-0118 (subcontract line) → SI-0044 → work acceptance → variance approval. *(SI-0044 and the second package SI-0039 are illustrative issues; their material lines, quantities and unit values are built on the real stock fixtures ITM-0042, ITM-0089 and ITM-0214 and on the real PO-0118 supplier relationship with Vector Controls.)*

1. PUR-UI-03 · The subcontract line is distinct from goods and services lines, because it issues company material and receives labour.
2. INV-UI-05 · Issue to the custodian records what left, against which work package, and who holds it.
3. PUR-UI-04 · Work acceptance ties the returned assembly to the accepted quantity, and consumption posts against the issued material.
4. INV-UI-05 · The reconciliation shows issued, consumed, returned, damaged and outstanding by work package and custodian. Damage and loss are decisions with evidence, not rounding.
5. SYS-02 · A variance approval names the maker, the value at stake and the evidence, and refuses self-approval.

Invariants: nothing reduces outstanding without a movement; material at a subcontractor is still company stock and is reported as such; the variance cannot close while issued and consumed/returned/oustanding fail to add up.

States: part-consumed with material held over; damaged; lost; custodian changed mid-package; rejected variance; overdue reconciliation.

Prototype coverage: partial. Inventory → Subcontract holds the register, the custody line and the reconciliation table (issued 20 = consumed 13 + returned 3 + damaged 1 + outstanding 3), and the gate refuses to zero an outstanding figure, to raise a damage variance without the partner report, and to let the maker approve his own APR-0121. What stays drawn: work acceptance tying a returned assembly to an accepted quantity, the PO-line link inside Purchase, and every actual movement posting.

---

### E2E-05 · Commissioning to an asset the customer owns

Business question: at what exact moment does our equipment become the customer's asset, and what stays separate?

Cast: commissioning engineer, project manager, service owner.

Chain: PRJ-0258 (MCC panel installation · Meridian Foods · Nashik) → commissioning evidence → AST-0134 → AMC-0044.

1. PM-UI-05 · FAT, SAT, loop test and commissioning evidence are recorded as holds that gate handover, each with its document.
2. PM-UI-05 · Handover creates the installed-asset link: customer, site, serial, model, commissioning date and the project that produced it.
3. AST-UI-01 · The asset record states ownership in its first line. AST-0134 is customer-owned at Meridian Foods; AST-0086 is company-owned at the Pinnacle Engineering lab. The two never share a register view without that distinction visible.
4. AST-UI-03 · The AMC contract attaches to the asset and the coverage window, with entitlements and exclusions separated from the SLA policy.
5. DASH-03 · The new asset appears in service load and renewal horizon.

Invariants: commissioning does not create a company asset for customer equipment; warranty dates come from the handover evidence, not from a guess; the upgrade project and the existing installed asset remain two records that reference each other, which is exactly what the entry page's AST-0042 example demonstrates.

States: handover refused for missing evidence; partial handover (some panels live, some not); asset retired before warranty ends; contract not yet signed while the asset is installed.

Prototype coverage: partial. AST-0134/AMC-0044 exist in the register with ownership stated, and the entry page proves the existing-asset relationship; the commissioning holds and handover action are drawn, not executed.

---

### E2E-06 · Breakdown call to a charged visit

Business question: does the entitlement answer before the engineer arrives, and does the clock stop honestly?

Cast: service coordinator, engineer (Karan Patel), customer approver, billing owner.

Chain: SR-0148 → AST-0042 → AMC-0031 → visit worksheet → charge decision.

1. AST-UI-04 · The ticket carries asset, customer, contract, priority and the target (14:00 IST today). Entitlement is resolved on the ticket, so the chargeable answer is not invented at the doorstep.
2. AST-UI-04 · Assignment checks the engineer's availability against deployment; a second SR-0148-sized commitment to the same person warns rather than silently double-books.
3. AST-UI-05 · The field worksheet holds observations, checklist items, time, and the spares consumed or returned, with attachments. Spares consumption maps to a stock movement, so a visit cannot consume inventory that never left the shelf.
4. AST-UI-04 · A pause needs a reason and stops the SLA clock; the elapsed/paused split is visible, not reconstructed afterwards.
5. AST-UI-04 · The charge decision routes included visits to the contract and chargeable work toward billing, with the customer acknowledgement as part of the record.
6. SYS-03 · Escalation appears as an actionable notification to the service owner before the target passes, not after.

Invariants: the SLA clock is contract-specific; an excluded item is chargeable even inside a live AMC; a revisit keeps the original ticket lineage; a paused clock never counts waiting time against the engineer.

States: no entitlement found; contract expired mid-incident; parts unavailable; visit incomplete and revisited; customer refuses acknowledgement; escalation triggered.

Prototype coverage: demonstrated. Assets → Service desk → SR-0148 opens the ticket, the asset and contract context, the worksheet and a simulated visit start. The pause clock, escalation and charge routing are designed states inside that surface.

---

### E2E-07 · Calibration due to accepted certificate

Business question: when is an instrument too uncertain to use, and who decides it is usable again?

Cast: quality engineer (Priya Menon), lab supervisor, asset owner.

Chain: AST-0086 → CAL-0096 → results → certificate → next due.

1. AST-UI-06 · The due list surfaces AST-0086 (digital pressure calibrator, calibration due 05 Nov 2026) as a scheduled obligation, not a note.
2. AST-UI-06 · Scheduling allocates the master/reference instrument alongside the engineer, because a result is only as good as the standard it was taken against.
3. AST-UI-06 · The worksheet records as-found and as-left readings, tolerance and environment. Any out-of-tolerance result is a state change, not a comment.
4. AST-UI-06 · The certificate is attached and reviewed. Whether the system generates the certificate document or only stores an external one is an open decision about compliance depth; the design shows both as the same review action.
5. AST-UI-01 → DASH-03 · Acceptance sets the next due date and clears the obligation; rejection keeps the instrument unavailable until dispositioned.

Invariants: an overdue instrument cannot be issued to a service job that requires a calibrated standard; the certificate keeps its source and approver; readings are immutable once reviewed, corrected by a new event.

States: overdue; out-of-tolerance; referred standard suspect; certificate pending review; rejected; instrument under calibration when a job needs it.

Prototype coverage: partial. Calibration appears as a route with CAL-0096 due and the AST-0086 record; the worksheet, tolerance logic and review chain are drawn screens.

---

### E2E-08 · Approved input to a locked pay run

Business question: can a payroll run be reviewed, corrected and locked without anyone editing a salary by hand?

Cast: payroll (restricted role), HR input owner, checker, finance handoff owner.

Chain: HR approvals → pay period → run inputs → RUN-2026-11 → payslips. *(RUN-2026-11 is illustrative; the prototype deliberately holds no salary data.)*

1. HR-UI-02 · Attendance corrections and leave requests reach payroll only as approved inputs, each traceable to the person who approved it.
2. PAY-UI-01 · Each employee's component structure is effective-dated, so a revision changes the future and leaves the past payslip intact. Restricted bank data is never visible in a non-payroll view.
3. PAY-UI-02 · Prechecks list missing inputs, new joiners, leavers and arrears before the run computes anything. An exception is a row with a link, not a count that hides its detail.
4. PAY-UI-02 · Preview shows gross, deductions and net per employee with the inputs that produced them. Statutory applicability is presented as a decision the client has not made, and the design does not pretend a formula ran.
5. SYS-02 · Maker-checker: the person who prepared the run cannot approve it, and lock is explicit. Reversal after lock needs a reason and an authorized role.
6. PAY-UI-03 · Payslips, register and the payment file are separate authorized outputs, and the accounting handoff is shown as pending ownership rather than as a completed posting.

Invariants: no one edits a computed payslip directly; locking and reversal are events with actors; a system administrator has no automatic payroll right; decimals and currency are explicit in every figure.

States: input missing after cut-off; employee joined mid-period; leave without balance; run blocked; reversal approved; restricted-field denial on direct access.

Prototype coverage: partial by design. Payroll explains the restricted workspace, shows input checks and a blocked run readiness, and holds no salary figures; nothing here computes pay, and the guide says so.

---

### E2E-09 · Site deployment to project cost without exposing the person

Business question: how does a project see its labour cost without the project manager reading anyone's salary?

Cast: resource manager, engineer (EMP-0072 Karan Patel), project manager, approver.

Chain: deployment → TS-EMP-0072-W44 → approval → project cost → variance. *(The timesheet ID is illustrative; deployment fixtures exist.)*

1. HR-UI-03 · Allocation is date-scoped: EMP-0072 is deployed to SR-0148, EMP-0034 to PRJ-0264. Overlapping site claims warn at booking time with the conflicting record named.
2. HR-UI-03 · Timesheets submit against the allocation, and an entry for a project the engineer was not deployed to needs an approver's decision, not a silent row.
3. HR-UI-04 · Travel requests and claims (CLM-0068) authorize before the trip and settle after it, keeping receipt lines attached to the authorization.
4. PM-UI-03 · The project sees committed, incurred and billed against its budget with the cost-source definition printed beside each figure, and labour arriving as an aggregate, not as person-level pay data.
5. PM-UI-03 · Variance explains itself by source: material, labour, subcontract, travel, equipment.

Invariants: private employee data never appears in a project view; a claim cannot be approved by the traveler; an allocation cannot book a person against a closed project; timesheet approval changes cost visibility only through the defined source event.

States: overlapping deployment; timesheet for an unallocated project; claim without receipt; approved travel not settled; project closed while open claims remain; denied access to person-level detail.

Prototype coverage: partial. HR shows roster, deployment and an attendance correction example, and CLM-0068 sits in the approvals queue; timesheets and cost roll-up are drawn.

---

### E2E-10 · Milestone earned to billing advice that reconciles

Business question: what proves the work was earned before anyone asks for money?

Cast: project manager, billing owner (Arjun Mehta), finance owner (external accounting), customer.

Chain: PRJ-0249 milestone → BA-0063 → external invoice reference → reconciliation.

1. PM-UI-02 · The milestone has evidence attached. Billing eligibility reads the milestone state, not a note someone typed.
2. SAL-UI-03 · A milestone or recurring schedule becomes billing advice BA-0063 (₹5.28 L, Ready for review) with the eligibility, evidence and the calculation basis visible together.
3. SAL-UI-03 · The advice is one source of truth: an external invoice reference is attached to it, and the same milestone cannot generate a second advice without the first being voided.
4. SYS-06 · The integration monitor shows queued, sent, failed and mismatch, with retry that is idempotent by key and a payload preview restricted to the right people.
5. DASH-02 · Unbilled and mismatch appear as exceptions, and the reconciliation states what it reconciles against.

Invariants: no duplicate external posting; a mismatch stops at "needs attention" rather than being quietly re-sent; financial totals in reports equal the operational records they claim to summarize; advances, retention, tax and credit ownership remain client decisions and the design labels them as such.

States: milestone claimed without evidence; advice rejected; provider unavailable; delivery failed and retried; amount mismatch between systems; partial billing of a milestone; renewal out of window.

Prototype coverage: designed and interactive. Sales → Reconciliation holds the outbox from step 4 as a list of postings addressed by idempotency key (queued, sent, acknowledged, failed, needs attention, superseded) where a retry can only reuse BA-0051/R1, a re-key is refused, an unanswered send stays as it is, and the ₹6,000 mismatch on BA-0049 is answered by a corrected advice rather than a re-send and closes only when the provider's acknowledgement is recorded. Step 2 is the unbilled-earned table, whose eligibility comes from milestone evidence: PRJ-0258 M1 is ineligible because the only thing on it is the project manager's note, and a second advice against an already-advised milestone is refused. Step 5 is the exception plate: unbilled earned, unexplained difference, and a checked-and-empty "no posting without a key" counter. What is simulated stops at the session: no transport, no finance posting, and the outbox does not write to the advice list.

---

### E2E-11 · Count found short to a corrected ledger

Business question: when the shelf and the system disagree, what happens to the truth?

Cast: stores, count team, reviewer, controller.

Chain: CNT-0031 → variance → approval → ADJ-0018 → reversal → reconciliation. *(CNT-0031, Ravi Kulkarni and the unit values are illustrative; every counted line is a real stock fixture, including the QC-held transmitters in the QC bay.)*

1. INV-UI-10 · A count session records expected against counted per item, with the reason captured while the count is fresh, not reconstructed later.
2. SYS-02 · Variance approval shows the value at stake, the count team and the maker. A large variance against ITM-0042 (4 available, low stock) is visible as a value, not a quantity difference.
3. INV-UI-03 · Approval creates an adjustment movement in the ledger; the posted movement is never edited or deleted, and a wrong adjustment is corrected by a compensating event.
4. INV-UI-01 · Stock and value both change, and the register explains the difference between on-hand, reserved and available after the correction.
5. RPT-UI-03 · The exception clears, and the reconciliation report ties the ledger to the balance.

Invariants: no deletion of posted movements; a count cannot approve its own variance; negative stock is not silently allowed while the policy is undecided; adjustments are always traceable to a session.

States: count in progress; variance rejected; recount; negative result under an undecided policy; correction of an approved adjustment; period closed.

Prototype coverage: partial. Inventory → Counts walks the count sheet with reasons captured per line, prices the ITM-0042 shortfall as ₹85,000 rather than as two units, holds the variance for an approver outside the count team, posts ADJ-0018, shows the on-hand/reserved/available consequence and then corrects it through ADJ-0019 while ADJ-0018 stays untouched. The enclosure line is deliberately routed to a transfer against SI-0044 instead of an adjustment. What stays drawn: the reconciliation report tie-out, recount, rejected variance and period-close states.

---

### E2E-12 · Resignation accepted to nothing left open

Business question: when someone leaves, how do we know the company's property and the person's dues both ended?

Cast: HR, reporting manager, IT/security, stores, payroll.

Chain: exit (EMP-0091 Priya Menon) → identity deactivated → instrument recovered → claim settled → approvals delegated. *(The person, the company-held calibrator AST-0086 and the approved order PO-0112 with a delivery date after her last day are existing fixtures; the exit record, CLM-0071 and DLG-0007 are illustrative additions.)*

1. HR-UI-01 · Offboarding starts from an effective-dated exit, and the checklist is the record itself: each item shows owner, due date and status.
2. USR-UI-01 · Identity deactivation is a visible step with its own state; a deactivated account cannot be re-animated by mistake, and the last privileged review is recorded.
3. AST-UI-02 · Every assigned asset and instrument returns through custody events. EMP-0091's calibrator example shows what a company-held instrument looks like; a leaver holding one must show recovery before closure.
4. HR-UI-04 · Outstanding travel claims and expenses are settled or rejected; full-and-final settlement is a payroll reference while the policy stays open.
5. SYS-02 · Approvals that would have routed to this person are delegated with a start date, so nothing sits unsigned in someone's inbox forever.
6. RPT-UI-03 · An exit exception report lists anything still open, because the point of the journey is that the list can be empty.

Invariants: no orphaned allocation or open approval after the last working day; access ends before or at exit, never after; recovered equipment re-enters the register with the condition it came back in; confidential records stay separated from the operational roster at every step.

States: asset not returned; revoked account used anyway; claim pending after exit; delegated approvals expired; exit date moved; checklist reopened.

Prototype coverage: partial, with every step clickable. HR → Exit & handover presents the checklist as the record itself: six lines, each naming an owner, a date and the event that closes it, with the exception count on the summary plate and a gate that refuses to close while anything is open and, when asked, names exactly what. Identity carries its own timestamp and prints it at the exit date; reopening the account to finish a return is refused, because a provisioned identity is not switched back on to satisfy a list. The calibrator clears only through a posted custody event that records the condition it came back in (the tempting "mark it returned" is a refusal, not a shortcut) and the register keeps its own fixture status, since this screen does not write to it. PO-0112 is re-owned with its 09 Nov delivery date intact and Priya Menon left on the approval history as maker. CLM-0071 is accepted and *referenced* to the full-and-final line rather than computed here, because the statutory components are still an open decision. DLG-0007 delegates with a start date and an end condition. Moving the last working day is an amendment: the deactivation timestamp and the delegation start move with it and the superseded date stays on the record, and a closed exit is not reopened by editing it. One line (project and site allocation) is checked and empty and remains on the list, because the point of an exception report is to show what it looked at, not only what it found. What stays drawn: nothing is deactivated, posted, settled or delegated for real; the checklist and the exit date are session state; the restricted-records invariant is stated on the screen rather than enforced by permissions, and the User Management surface still describes proposed role boundaries instead of running them.

---

## Coverage against what actually exists

| Journey | Modules crossed | Prototype today | What the next design step must add |
| --- | --- | --- | --- |
| E2E-01 | CRM, Sales, Projects, Dashboard | Partial: record chain visible, conversion drawn | Quote revision comparison and the acceptance-to-project handoff as a flow |
| E2E-02 | Projects, Purchase, Inventory, Assembly | Partial: shortage, comparison, stages, QC block interactive | Receipt reconciliation against a PO line, revision-difference view |
| E2E-03 | Projects, Inventory | Partial: stock states and blocked issue interactive | Transfer acknowledgement, in-transit state, ledger detail |
| E2E-04 | Purchase, Inventory | Partial: register, custody, evidence-first damage and the self-approval block interactive | Work acceptance against accepted quantity, the subcontract line inside Purchase, real movement postings |
| E2E-05 | Projects, Assets, Service | Partial: ownership stated, existing-asset relationship proven | Commissioning holds, handover action, contract creation |
| E2E-06 | Assets, Service, Inventory | Demonstrated end to end in the prototype | Nothing for design; entitlement resolution depth is the open question |
| E2E-07 | Assets, Quality, Dashboard | Partial: due list and asset record | Worksheet with tolerance logic, review and next-due update |
| E2E-08 | HR, Payroll, Approvals | Partial by intent: restriction and prechecks only | Review/lock/reversal flow with restricted-field denial states |
| E2E-09 | HR, Projects | Partial: deployment and one claim | Timesheet approval and project cost roll-up without person-level pay |
| E2E-10 | Projects, Sales, Integrations | Partial: outbox keyed by idempotency key, retry that can only reuse it, refused re-key and refused re-send, mismatch answered by BA-0049/R2 and closed only by a recorded acknowledgement, unbilled earned gated on milestone evidence, duplicate advice refused, payload preview withheld at the role layer | A real provider hand-off and inbound acknowledgement, the tax invoice and finance posting behind the advice, and an outbox that writes to the advice list instead of sitting beside it |
| E2E-11 | Inventory, Approvals, Reports | Partial: count sheet, priced variance, ADJ-0018 and the compensating ADJ-0019 interactive | Report tie-out, recount, rejected variance and period-close states |
| E2E-12 | HR, Purchase, Users, Assets, Payroll | Partial: checklist as the record, deactivation timestamp, custody-event recovery, re-owned order, claim referenced, dated delegation, refusal to close or reopen | Real provisioning and register writes, F&F figure, privileged-review evidence, an exit exception report in Reports |

Four journeys are the ones a reviewer should look at hardest, because they are where a generic ERP design quietly fails: custody, variance, access and matching are the places the source scope explicitly refuses to let the software guess at. All four now have a screen you can click (E2E-04 and E2E-11 hold the reconciliation and the count, E2E-12 holds the exit, E2E-10 holds the matching, E2E-06 has always been demonstrated end to end), so what is left in them is depth rather than absence: a movement that only claims to post, an acceptance step that ties nothing yet, an identity that is described as deactivated but never actually turned off, an outbox that records a session instead of handing anything to a provider. With E2E-10 built, every journey in the source has a screen that demonstrates its rule rather than captioning it, and what remains is one problem stated two ways: turning each drawn control into one that writes, and the depth named in the rows above.

Open-decision topics that these journeys touch and that design does not resolve: invoice and accounting ownership plus the external provider, movement concurrency, payroll statutory policy, how deep project and assembly control go, stock valuation method, calibration certificate authoring, billing rules for advances/retention/tax/credit, migration volume and deployment model. Each is carried as a labeled assumption in the step where it first bites.
