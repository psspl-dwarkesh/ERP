# Overview video, script and record plan (v2)

A professional, guided product tour of the Pinnacle Engineering demo, recorded
against the live site. It starts on the landing page, signs in, walks the portal
**top to bottom in sidebar order** (not random), explains each page in domain
terms with a few deeper click-throughs, and closes on a Prakash Software Solutions
thank-you card. Target length ~4.5-6 minutes. Replaces `prototype/public/walkthrough.mp4`.

## Must-fix from the earlier cut
1. **No blank/white frames.** Before holding on any screen, wait for the network
   to be idle AND the key element to be visible (not a fixed timer). Hold ~1.2s on
   a settled screen; ~2-3s on pages being explained.
2. **1920x1080, 30fps, high bitrate**, H.264 MP4. Text must be crisp.
3. **Pre-req: the demo must be re-seeded first** so every label reads "Pinnacle
   Engineering" and emails read `@pinnacle.example` (the asset `make` and emails are
   seeded). Record only after the admin has run Reset workspace data on the live site.

## How to record
- Playwright (records WebM), convert to MP4 with the `ffmpeg-static` binary (as
  before). Viewport and recordVideo size 1920x1080. Sign in as **Arjun Mehta
  (Operations head)**; switch roles on screen where noted.
- On-screen captions carry the narration (short, no em-dashes). Keep a calm pace:
  land on a page, let the caption read, scroll gently to show the rest.
- View-only: never click a destructive/mutating control (no Approve, Award, Record
  QC, Complete, Deactivate, Reset, etc.). Opening dialogs to show them is fine; the
  one allowed write-free interaction is the PR-0084 "Return with no reason" validation.

---

## Part 1 - Landing (0:00-0:25)
- Scene: `/#/` (the showcase). Hold on the hero, then scroll slowly through the
  sections (product preview, follow-one-job, modules, industries, controls).
- Caption: "Pinnacle Engineering runs on one connected ERP from Prakash Software
  Solutions: 11 modules, 7 business verticals, 12 end-to-end flows."
- Then click **Open the live demo**.

## Part 2 - Sign in (0:25-0:40)
- Scene: the full-screen login. Show the role picker, then click **Arjun Mehta
  (Operations head)**.
- Caption: "Sign in as any role. Each person sees only what their permissions allow."
- Wait for the dashboard to load.

## Part 2b - Switch to the organization (Full access) profile
- Scene: as Arjun, open the account menu, **Switch role**, pick **Full access** (the
  organization-wide profile). Wait for the dashboard. This lets the tour show every
  module without hitting a role's limits; Part 4 then shows how a single role is restricted.
- Caption: "For the tour we switch to the organization-wide Full access profile, so
  every module is open."

## Part 3 - The portal, top to bottom
Walk the sidebar in order. For each page: land, let the caption read, scroll to show
the page; open one record on the pages marked **(deeper)**.

**Dashboard (0:40-1:00)** `/#/app/dashboard`
- Explain: the day starts on what needs a decision now, by role. Point to the three
  cards (P1 ticket on its SLA clock, a purchase waiting on approval, stock held at QC)
  and the approvals queue.
- Caption: "The dashboard opens on exceptions: an SLA breach, an approval, a QC hold."

**Insights (1:00-1:18)** `/#/app/insights`  **(deeper)**
- Explain: reads every record and surfaces what is slipping, by rule, with the
  evidence behind each finding. Click across the tabs (Briefing, Findings, Project risk).
- Caption: "Insights flags slippage and risk from the records, with the evidence."

**Projects (1:18-1:45)** `/#/app/projects` then open **PRJ-0264**  **(deeper)**
- Explain: every job is one record from order to handover. Show the linked-records
  thread (order, BOM, requisition, work order, asset, ticket), milestone gates, and
  budget vs committed vs incurred.
- Caption: "A project carries the whole job: scope, cost, gates, and every linked record."

**Inventory & Assembly (1:45-2:08)** `/#/app/inventory` then **ITM-0137** + the Assembly tab  **(deeper)**
- Explain: multi-store stock, versioned BOMs and MRP, and panel work orders with a QC
  gate. Show ITM-0137 held at QC (cannot be issued) and WO-0187 moving through stages.
- Caption: "Stock, BOM and work orders in one place. Held stock cannot be issued; the
  dispatch gate waits for QC."

**Assets & Service (2:08-2:30)** `/#/app/assets` then **SR-0148**  **(deeper)**
- Explain: the installed base, AMC contracts, calibration, and a service desk with SLA
  clocks. Show SR-0148: entitlement from AMC-0031, response clock, assigned engineer.
- Caption: "Service resolves entitlement and the response clock straight from the contract."

**Purchase (2:30-2:55)** `/#/app/purchase` then **RFQ-0041**  **(deeper, flow)**
- Explain: requisitions from shortages, supplier comparison, PO and GRN. Show RFQ-0041's
  three-supplier comparison (fit and delivery, not price alone). Then briefly, from the
  dashboard, open PR-0084 Review and decide and show the Return-needs-a-reason validation.
- Caption: "Nothing is ordered before it is approved, and the supplier is chosen on fit
  and delivery, with the rationale kept on the audit trail."

**CRM (2:55-3:10)** `/#/app/crm`
- Explain: leads, tenders and AMC renewals; bid/no-bid and win-loss reasons feed Sales.
- Caption: "CRM runs the pipeline: tenders, renewals, and the reasons behind each."

**Sales (3:10-3:28)** `/#/app/sales`  **(deeper: the Reconciliation tab)**
- Explain: quotations, orders and billing advice; the accounting outbox reconciles every
  advice. Show the Reconciliation tab: a wrong bill is superseded under a new key, never
  re-sent.
- Caption: "Quotes to orders to billing, with an outbox that never posts the same advice twice."

**People (3:28-3:45)** `/#/app/hr`
- Explain: deployment roster, leave and attendance, claims, and exits with asset recovery.
- Caption: "People: who is deployed where, their time, claims, and a clean exit checklist."

**Payroll** `/#/app/payroll`  (open as Full access, so it shows the run)
- Explain: input checks before a run, maker-checker approval and lock, cost by project.
- Caption: "Payroll is a controlled run: checks, maker-checker approval, then lock."

**Reports (4:02-4:15)** `/#/app/reports`
- Explain: MIS with a defined owner, source and refresh, and controlled, audited exports.
- Caption: "Reports with an owner, a source, and export control."

## Part 4 - Roles and permissions (flow)
- From Full access, open the account menu and **Switch role to Arjun Mehta (Operations
  head)** to show a restricted role: Payroll and Users & Access carry a lock in the
  sidebar; open **Payroll** and show the server 403. Then **Switch role back to Full
  access** and open **Users & Access**: the roles matrix, then the audit log. Show the
  Switch-role panel once more (it lists every role, including Full access).
- Caption: "Permissions are enforced by the server, not hidden in the menu. Each role
  sees only its own work, and every change lands in the audit trail."

## Part 5 - Thank-you / Prakash Software Solutions card (4:45-end)
- Scene: a full-screen end card (the recorder injects a styled overlay, black
  background matching the footer, Pinnacle/Threadline mark optional). Hold ~6s.
- Content:
  - Big: **Thank you**
  - Sub: **Pinnacle Engineering ERP** - one connected system for engineering, panel
    and field-service firms.
  - Divider, then: **Designed and built by Prakash Software Solutions Pvt. Ltd.**
  - Line: Custom software, AI and cloud engineering. ISO 9001 and ISO 27001 certified.
    Microsoft Solutions Partner.
  - Contact row: prakashinfotech.com  ·  info@prakashinfotech.com  ·  +91 87994 65558
  - Small: Vadodara, Gujarat, India  ·  CIN U72200GJ2001PTC039384
- Keep the type clean and generous; teal accent on the Prakash name to match the footer.

## Self-check before finishing
- Confirm 1920x1080, ~4.5-6 min, H.264.
- Extract ~10 frames across the duration; none near-blank/white; text crisp.
- No "abc" / "ABC Limited" anywhere on screen (that is why the re-seed comes first).
- Copy to `prototype/public/walkthrough.mp4`; save the sample frames for review.
