# Overview video, script and record plan

A fresh, ~2.5 to 3 minute overview of the Pinnacle Engineering demo, recorded
against the live database. This replaces the current `prototype/public/walkthrough.mp4`.

## Fix the two problems from the last cut
1. **White / blank frames.** The last recording captured pages mid-load. The
   recorder must **wait for each screen to finish loading before it starts
   capturing that segment** (wait for the network to go idle and for the key
   element to be visible, not a fixed timer). Hold ~1s on a settled screen before
   moving on.
2. **Low quality.** Record at **1920x1080, 30fps**, with a high bitrate (the last
   cut looked soft). Scale the app to a comfortable zoom so text is crisp.

## How to record (recommended)
- Use Playwright's built-in video recording (no ffmpeg needed) or a headless
  Chromium screen capture, driven by a script, against the **live site**
  (`https://erp-prakashinfotech.vercel.app`) signed in as **Arjun Mehta
  (Operations head)**; switch roles on screen where the script calls for it.
- Sign in first, let the dashboard settle, then run the segments in order.
- On-screen captions carry the narration (keep them short; no audio is required).
  If you add a voice track, match the caption text below.
- Re-record any single segment on its own and splice, so one bad take does not
  mean redoing the whole thing.

## Segments (scene, caption, capture note)

**1. Open (0:00-0:12)**
- Scene: the sign-in page, then one-click **Sign in as a role to Arjun Mehta**.
- Caption: "Pinnacle Engineering runs on one connected ERP: 11 modules, 7 business
  verticals, 12 end-to-end flows."
- Capture: wait for the role list to render before clicking; wait for the
  dashboard to fully load before the next segment.

**2. Dashboard, what needs you now (0:12-0:30)**
- Scene: the dashboard, the three decision cards (P1 ticket SR-0148, approval
  PR-0084, QC hold ITM-0137) and the approvals queue.
- Caption: "The day opens on what needs a decision: a P1 breakdown on its SLA
  clock, a purchase waiting on approval, and stock held at QC."
- Capture: wait until the three cards and the approvals list have data.

**3. Follow one job, the record chain (0:30-0:52)**
- Scene: open **PRJ-0264**. Show the linked-records thread (sales order, BOM,
  requisition, work order, installed asset, service ticket) and the milestone gates.
- Caption: "Every job is one thread, from the customer order to the installed
  asset and its service contract, with cost, people and approvals on one record."
- Capture: wait for the project detail and the linked cards to render.

**4. Approve and buy, controls that bite (0:52-1:18)**
- Scene: Dashboard, PR-0084, **Review and decide**: show the evidence, try
  **Return** with no reason (it is refused), then **Approve**. Then **RFQ-0041**:
  the three-supplier comparison, award the fit-and-delivery supplier, raise the PO.
- Caption: "Nothing is ordered before it is approved. A return needs a reason, and
  the supplier is chosen on fit and delivery, not price alone, with the rationale
  kept on the audit trail."
- Capture: let each dialog animate open; hold on the supplier comparison.

**5. Stock and QC hold (1:18-1:34)**
- Scene: **ITM-0137**, the six transmitters on QC hold; the Record QC decision control.
- Caption: "Held stock cannot be issued until QC clears it, and a dispatch gate
  blocks a panel while its stages are open."
- Capture: wait for the item detail to load.

**6. Assets and service (1:34-1:50)**
- Scene: **SR-0148**, the P1 ticket with its SLA clock and the AMC-0031 entitlement.
- Caption: "A breakdown resolves its entitlement and response clock straight from
  the contract, and dispatches the nearest qualified engineer."
- Capture: let the SLA clock be visible and ticking.

**7. Insights (1:50-2:06)**
- Scene: the **Insights** page, now in tabs (Briefing, Findings, Forecasts,
  Project risk, Checks). Open Briefing, then Findings.
- Caption: "Insights reads the records and surfaces what is slipping, by rule, with
  the evidence behind every finding."
- Capture: wait for each tab's content.

**8. Roles and permissions (2:06-2:30)**  *(expanded)*
- Scene: as Arjun, show Payroll and Users and Access locked in the sidebar; open
  **Payroll** and show the server 403. Then account menu, **Switch role to IT
  Administrator**, open **Users and Access**, show the roles matrix and the audit log.
- Caption: "Permissions are enforced by the server, not hidden in the menu. Every
  role sees only its own work, and every change lands in the audit trail."
- Capture: wait for the 403 screen, then for the audit log rows.

**9. Repeatable and ready (2:30-2:45)**  *(new)*
- Scene: as the administrator, the **Switch role** panel (showing the role
  shortcuts), and the **Reset workspace data** control.
- Caption: "Switch into any role to see the workspace as they do, and reset the
  demo to its starting point in one click."
- Capture: show the Switch role list, then the reset control (do not trigger it
  on camera).

**10. Close (2:45-end)**
- Scene: back to the landing page; end on the headline and the Pinnacle
  Engineering footer.
- Caption: "Pinnacle Engineering ERP. One connected system for engineering, panel
  and field-service firms."

## What is new vs the last cut
Added the server-enforced permission 403, the role switch, the audit log, and the
one-click reset, and led with the breadth (11 modules, 7 verticals, 12 flows). The
rest mirrors the segments the previous video covered, re-shot with load-waits so no
frame is blank and at full 1080p.
