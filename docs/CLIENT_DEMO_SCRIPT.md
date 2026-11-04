# Client demo script

A 20-minute walkthrough of Threadline for a prospective client. The live demo ([erp-prakashinfotech.vercel.app](https://erp-prakashinfotech.vercel.app)) opens on a role picker: pick a role to sign in (password `Threadline@2026`, one account per role). Everyone reads and writes the same Supabase database, so two people signed in as different roles can watch each other's changes arrive.

Before you start, reset the data to its starting state: sign in (or **Switch role**) as the **IT Administrator** and use **Reset workspace data** (account menu) or **Restart demo** (Walkthrough panel). It re-seeds every record for everyone and keeps you signed in. Running locally against your own database instead, `cd server` → stop the API → `npm run db:reset` → start it again does the same thing.

## 1. Product story (3 min): showcase `#/`

1. Let the hero settle, then scroll to **Follow one job**. Press play and narrate the nine stops: enquiry → quotation → order → project → BOM → purchase → assembly → installed asset → service.
2. **Module map:** hover Projects to show who it hands work to.
3. **Twelve flows:** open E2E-02 (panel assemble-to-deliver). Point at the control gate and the exceptions.
4. **Open the live demo.**

## 2. One job, end to end (10 min): open the **walkthrough** (bottom-right)

The guide ticks each step off from the records themselves. Follow it in order:

| Step | Where | What to say |
| --- | --- | --- |
| At-risk project | `PRJ-0264` | The loop test is blocked by material. The project page shows the whole chain, from customer order to the service ticket |
| Approve the requisition | Dashboard → Review & decide | Try **Return** with no reason first: refused. Approval needs evidence, and maker ≠ checker |
| Award the supplier | `RFQ-0041` | The cheapest quote has a technical deviation; the recommendation weighs need-by date and fit. A rationale is mandatory |
| Raise the PO | same page | Blocked until the requisition is approved |
| Release QC stock | `ITM-0137` | Issuing held stock is refused; QC releases it to the central store |
| Panel stages | Inventory → Assembly | Wiring completes, and assembly stays blocked by the BOM shortage |
| Service P1 | `SR-0148` | The contract decides the SLA and chargeability; the engineer is dispatched |
| Subcontract | Inventory → Subcontract | Issued = consumed + returned + damaged + outstanding. Damage needs the partner's report |
| Billing mismatch | Sales → Reconciliation | A wrong amount is never re-sent; a corrected advice supersedes it under a new key |
| Leaver | People → Exits | Custody, commitments, claim and delegation each closed with evidence |
| Audit | Users & Access → Audit | Every step above, by name and time |

## 3. Permissions (3 min): account menu → **Switch role**

- **Kavya Iyer (HR & payroll):** Payroll opens; Projects and Purchase show a lock.
- **Sana Kapoor (Sales):** try approving `PR-0084`. It's refused, because that approval belongs to the Operations head.
- **IT Administrator:** manages users and roles, but has no business modules.
- To present without role limits, **Switch role** to the backstage **Full access** account (hidden from the login page and the roles list).

## 4. Two people at once (2 min)

1. Open the site in two browsers, or one normal and one private window. Sign in as **Arjun Mehta** in one and **Sana Kapoor** in the other.
2. The sidebar says **2 people online**.
3. Sana moves an opportunity on the CRM board. Arjun's screen refreshes on its own and shows "Sana Kapoor moved an opportunity".

## 5. Insights (2 min): `#/app/insights`

Today's briefing is generated from the records, with cited IDs. Ask "what's blocking PRJ-0264?". The answer cites its records. With `ANTHROPIC_API_KEY` set on the server it is answered by Claude, using only data your role may see.

## Honest framing

Say this plainly: the demo data is illustrative, and accounting, bank and attendance integrations are open decisions in the client's scope. Items marked **Coming soon** are designed, not built.
