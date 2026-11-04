# Threadline: engineering ERP

Threadline is a connected ERP for firms that run engineering projects, build electrical panels, trade instruments and deliver calibration, AMC and O&M services. This repository holds the discovery analysis of the client scope (anonymised as **Pinnacle Engineering**), the design system, the front end for all 11 modules, and the API server behind it.

> The supplied scope is a **draft discovery SoW**, not a signed FRD. Demo data is illustrative. There is no payroll calculation, statutory filing or live accounting integration; those depend on decisions still open in the scope.

## Run it

It is already deployed, or you can run it locally.

| | Where | What you get |
| --- | --- | --- |
| **Live demo** | [erp-prakashinfotech.vercel.app](https://erp-prakashinfotech.vercel.app) | The full ERP against the shared Supabase database. Pick a role to sign in. The front end on Vercel calls the API on Render |
| **Live full stack** | [threadline-jlfn.onrender.com](https://threadline-jlfn.onrender.com) | The same app and API on one origin (Render), reading and writing the same Supabase database |
| **Local** | `cd server` → `npm install` → `npm run dev`, then in a second terminal `cd prototype` → `npm install` → `npm run dev:api` | Sign-in, role permissions and a PostgreSQL database. Without `DATABASE_URL` the server uses an embedded PGlite file, so nothing to install |

The front end defaults to API mode, talking to the server and its PostgreSQL database. A browser-only build with in-memory fixtures still exists for offline use; it is built explicitly with `--mode mock`.

Open `http://127.0.0.1:5173` and sign in with any demo account; the password is `Threadline@2026`, one account per role. An administrator can re-seed the workspace from the account menu (**Reset workspace data**).

- `#/` is the product showcase: animated hero, interactive job thread, module map, verticals, the 12 end-to-end flows, controls, roles and delivery approach.
- `#/app/dashboard` is the workspace. Every record has a URL, for example `#/app/projects/PRJ-0264`, `#/app/purchase/RFQ-0041` and `#/app/assets/SR-0148`.
- Press `Ctrl` + `K` anywhere in the workspace to search records.

Deployment (Vercel front end, Render API, Supabase database): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Structure

| Path | What it holds |
| --- | --- |
| `prototype/src/ds/` | Design system: tokens, base styles and the component library (custom controls, Radix behaviour) |
| `prototype/src/api/` | Domain types, fixtures, the in-browser mock, the HTTP transport, session and data hooks |
| `prototype/src/app/` | Shell, sign-in, router, module registry and shared domain patterns |
| `prototype/src/modules/<module>/` | One folder per ERP module, lazy-loaded. `commands.ts` holds each business action once, with its in-browser body and its server command name |
| `prototype/src/showcase/` | The product showcase page |
| `server/src/db/` | PostgreSQL schema (Drizzle), migrations in `server/drizzle/`, seed and connection |
| `server/src/commands/` | Business commands: validated, permission-checked, transactional and audited |
| `server/src/read.ts`, `app.ts`, `auth.ts` | Read models, HTTP routes, sign-in and sessions |
| `server/test/` | API tests against a throwaway database (`npm test`) |

The front end and server share one set of record types (`prototype/src/api/types.ts`), so a record looks the same in the mock build and from the API.

## Documents

- [Architecture](docs/ARCHITECTURE.md): run modes, command flow, security model, data model
- [Client demo script](docs/CLIENT_DEMO_SCRIPT.md): a 20-minute walkthrough, role switching and the two-user live demo
- [Deployment](docs/DEPLOYMENT.md): Vercel front end, Render API, Supabase database, environment variables
- [Open questions](docs/OPEN_QUESTIONS.md): what needs the owner
- [Design system](DESIGN.md): colour, type, motion, the no-browser-defaults rule
- [Project brief](docs/PROJECT_BRIEF.md) and [screen & workflow plan](docs/SCREEN_AND_WORKFLOW_PLAN.md)
- [Requirement coverage](docs/REQUIREMENT_COVERAGE.md): all 219 scope requirement IDs with their C/V/D status
- [End-to-end journeys](docs/E2E_JOURNEYS.md): the 12 cross-module scenarios
- [Research notes](docs/RESEARCH.md), [Figma prompts](docs/FIGMA_PROMPTS.md)

## Source preservation

`source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` is an unchanged copy of the supplied scope; its SHA-256 is recorded in `source/source-manifest.json`. `source/build_coverage.py` regenerates the coverage register and verifies the hash.
