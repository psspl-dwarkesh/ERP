# Demo readiness — status and pending work

Working list for the client demo. Updated 4 Nov 2026.

**Live now**
- Full stack: https://threadline-jlfn.onrender.com (API + front end on one origin)
- Front end: https://erp-prakashinfotech.vercel.app (calls the Render API cross-origin)
- Both read and write the same Supabase database. Open the live demo → pick a role → you are in. Password `Threadline@2026`.

---

## Done

| Area | What |
| --- | --- |
| Database | Supabase migrated and seeded with the ABC Limited dataset (PRJ-0264, RFQ-0041, SR-0148 verified present) |
| No dummy data | Remote/API mode is the default, so every read and write on the demo path goes to the database. `--mode mock` survives only as an offline fallback |
| Deployment | Render blueprint (full stack) and a Vercel front end wired to the Render API: CORS, a cross-site session cookie, and CORS on the SSE stream so live updates connect |
| Sign-in | One click on a role signs straight in |
| Entry flow | The showcase CTA opened the workspace or the sign-in screen depending on whether a 12-hour session was still live. It now always opens the role picker |
| Sign-in panel | The thread art ran through the copy. A scrim now sits above the art and below the text, so the strands stay as texture and the words stay readable |
| Sign-in layout | Contained to a centred panel on screens ≥1500px instead of sprawling across a wide monitor |
| Role list | Nine bordered cards quieted to a calm hover list |
| Showcase tour | Prev / Pause / Next were 36px against 30px with no cross-axis alignment. Matched and centred |
| Wording | "demo", "demonstration workspace" and "illustrative data" removed from everything a client reads. The guide is a walkthrough, accounts are roles, the workspace is "Engineering & field service" |
| Accuracy | The help panel claimed edits are "saved only in this browser" — untrue on a shared database. Now mode-aware |
| Company | Footer, case study, sidebar and sign-in all credit **Prakash Software Solutions Pvt. Ltd.** (prakashinfotech.com), with LinkedIn, GitHub, offices and certifications |
| Reports | Header now states how many reports are ready and that the rest are planned, with each card saying what it will show |

---

## Pending

### 1. Build or re-frame the unfinished features
Two places still tell the viewer a feature is not real. They are **accurate** — deleting the text without building the feature would overclaim to a client.
- **Reports** — four entries are catalogue-only. Either build the report output or leave them labelled as planned.
- **Payroll** — PF, ESIC, professional tax and TDS are not computed; deduction totals are placeholders.

**Decision needed:** build, re-frame as roadmap, or hide for the demo.

### 2. Role-by-role functional test
Sign in as each of the nine roles and walk every module against the live database: permissions, locked modules, blocked actions, approvals, maker ≠ checker. **Not yet done end to end.** This is the biggest remaining risk before showing a client.

### 3. Manager walkthrough guide
`docs/CLIENT_DEMO_SCRIPT.md` exists and is good, but it is written for someone who knows the product. Needs a short, plain-English, step-by-step version for a manager with little domain knowledge: which pages to open, in what order, what to say, what to click.

### 4. Requirement coverage review
Original scope is in `source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` and `source/requirements.json`, with `docs/REQUIREMENT_COVERAGE.md`. Re-check the built product against it to catch anything basic that was missed. **Not yet done.**

### 5. Narrated walkthrough video
Requested: a recorded walkthrough (home → workspace → a module such as Projects) with a natural TTS voice, embedded behind the walkthrough button with a short written explanation.

Feasible, but it is its own project: Playwright can record the browser session, a TTS API can generate the voice, and the two have to be muxed together (ffmpeg). Scripting, timing and re-takes are the real work.

**Important:** do not paste an API key into chat. Put it in the git-ignored `server/.env` (for example `CARTESIA_API_KEY=…`) and it can be read from there.

### 6. Page-by-page depth review
A sweep of all twelve modules found no console errors, no horizontal overflow and no empty pages. What has **not** been done is a feature-by-feature review of each page — whether every control does something useful, what should be removed, and where the information architecture could be simpler.

### 7. Load weight (optional)
Runtime is fine: the home page holds 60fps at 2560×1440 with no janky frames, so there is no scroll jank to chase. If it still feels slow it is first paint, not animation — main bundle ≈340 kB (104 kB gzip) plus self-hosted Archivo.

---

## Before real users (not demo blockers)

- **Rotate the Supabase database password.** The current one is weak and was shared in chat.
- Set `DEMO_ACCOUNTS=false` and replace the seeded accounts — every seeded user shares one password.
- Move off the free database tier; it sleeps and has no point-in-time restore.
- Decide whether both deployments should stay. The Vercel front end depends on a cross-site cookie, which a browser with third-party cookies disabled will block. The Render URL has no such dependency.

---

## Checked and clean

All twelve modules (dashboard, insights, projects, inventory, assets, purchase, CRM, sales, people, payroll, reports, users): **no console errors, no horizontal page overflow, no empty pages.**

Two things look like overflow bugs to an automated check but are **deliberate design — do not "fix" them**:
- the stepper's connector line (`.step::before` uses a negative `right` to reach the next marker);
- the CRM card's ⋯ button (`margin-right: -6px` optically aligns the icon with the card edge).
