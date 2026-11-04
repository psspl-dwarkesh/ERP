# Threadline — Client Demo Script

A practical, verified walkthrough for showing the Threadline ERP demo to a client.
Every screen and control below was checked on the live site against the real
database. Three flows, ~15–20 minutes total.

- **Live demo:** https://erp-prakashinfotech.vercel.app
- **In-app Walkthrough:** the button bottom-right of the portal mirrors these
  flows and ticks steps off as you go (overview video + the three tracks below).

---

## Before you start

1. Open the live demo and click **Open the live demo** → on the sign-in page use
   the **"Sign in as a role"** panel and start as **Arjun Mehta · Operations head**.
2. The demo opens on the dashboard: three things that need a decision now
   (a P1 ticket, a waiting approval, a QC hold), then the approval queue and
   today's service tickets.

> ♻️ **Resetting between demos.** The action steps below (approve, award, raise
> PO, release, complete wiring…) change real records. To restore the pristine
> starting state, **switch to IT Administrator** (account menu, top-right →
> Switch role) and use **Reset workspace data** — either from the account menu
> or the **Restart demo** button in the Walkthrough panel. It re-seeds every
> record for everyone and keeps you signed in. Only the administrator can do it.

---

## Flow A — "Approve and buy" · ~4 min
**The commercial control slice: nothing gets ordered before it's approved, and
the supplier is chosen on fit and delivery, not price alone.**

1. **Dashboard → PR-0084 card → Review & decide.**
   Show the attached evidence (BOM-042 shortage list, the 3-quote RFQ comparison,
   project budget headroom). **Select "Return" and try to confirm with no reason —
   it's refused** (a reason is required to send it back). Then **Approve**; the
   maker is notified and the next step unblocks.
2. **Purchase → RFQ-0041.**
   The three-supplier comparison: the cheapest quote (Orbit) carries a technical
   deviation; the recommended supplier (Vector) is the earliest *compliant*
   delivery. Enter a selection rationale (≥ 12 characters) → **Award**.
3. **Same page → Raise the purchase order** (only enabled once awarded **and** the
   requisition is approved — the PO waits on the approval).
4. **Inventory → ITM-0137 → Record QC decision.**
   The six transmitters are on QC hold after a failed incoming check — **issuing
   is refused until QC is recorded.**

---

## Flow B — "Follow one job, end to end" · ~10 min
**One record, PRJ-0264, from enquiry to installed asset to service — with every
control that bites along the way.**

1. **Projects → PRJ-0264.** "At risk": the 10 Nov loop test is blocked by late
   material. Show the **linked-records thread** (Sales order → BOM → Requisition →
   Work order → Installed asset → Service ticket, all cross-linked) and the
   milestone gates (design freeze, FAT, delivery, loop test, SAT).
2–5. **Approve → Award → Raise PO → Release** — the four steps from Flow A
   (this is the material that unblocks the loop test).
6. **Inventory → Assembly → WO-0187 → Complete wiring** (62 of 96 terminations;
   assembly stays blocked by shortages — the gate holds).
7. **Assets → SR-0148.** The P1 breakdown at Northstar Pharma: SLA clock running,
   entitlement from AMC-0031, no charge. Dispatch the engineer.
8. **Inventory → Subcontract → SI-0044.** Reconcile material at the partner shop —
   every unit issued, consumed, returned, damaged or outstanding; it stays company
   stock until reconciled.
9. **Sales → Reconciliation → BA-0060 → Correct.** A wrong bill is **never
   re-sent** — it's superseded by a corrected advice under a new key, and closes
   only when accounting acknowledges an equal figure.
10. **People → Exits → EXT-0003.** Close a leaver's checklist line — recovering a
    company instrument records the condition it came back in.
11. **Switch role → IT Administrator → Users & Access → Audit log.** Every step
    above, by actor and time.

> ⚠️ **Step 11 needs a role switch.** The Operations head **cannot** see Users &
> Access (that's correct separation of duties). Use the account menu (top-right) →
> **Switch role → IT Administrator** before opening the audit log. The in-app
> walkthrough doesn't prompt this yet — do it manually (or ask me to add the
> instruction to the track).

---

## Flow C — "How roles change the workspace" · ~3 min
**Same data, a different job. Permissions are refused by the server, not just
hidden in the menu.**

1. As **Operations head**, the sidebar shows **Payroll** and **Users & Access**
   with a lock.
2. Open **Payroll** anyway → the server answers **403**. The rule lives on the
   server, not the menu.
3. Account menu → **Switch role → Ritu Agarwal (Finance owner)** → Payroll opens;
   other things close.
4. **Switch role → IT Administrator → Users & Access → Audit log** to show the
   full trail.

---

## Lines worth landing ("controls that bite")

- Approvals need a **reason to return**; maker ≠ checker (separation of duties).
- Supplier awarded on **fit + delivery**, not price; the rationale is saved to the
  audit trail with the approver's name.
- **QC hold blocks issuing**; the dispatch gate blocks while stages are open.
- Billing corrections are **superseded under a new key**, never silently re-sent.
- Role permissions are **enforced server-side** (a real 403), backed by a complete
  audit trail.

---

## Known caveats (for you, not the client)

1. **Resetting between demos** — see the box at the top. Switch to IT Administrator
   and use **Reset workspace data** (account menu) or **Restart demo** (Walkthrough
   panel) to re-seed every record back to its starting state.
2. **Audit step needs the admin role** — the "Follow one job" track doesn't tell
   you to switch roles for step 11. I can add that instruction to the track.
3. **Minor polish:** the IT Administrator dashboard still shows a "Your approval"
   card even though the admin has no business rights — cosmetic, easy to clean up.

*Verified against the live site on 4 Nov 2026. All screens load on real data; the
approval reason-gate and the approve/write path were confirmed working.*
