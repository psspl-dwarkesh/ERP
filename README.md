# Threadline — engineering ERP design and prototype

Threadline is a connected ERP for firms that run engineering projects, build electrical panels, trade instruments and deliver calibration, AMC and O&M services. This repository holds the discovery analysis of the client scope (anonymised as **ABC Limited**), the design system, and an interactive front-end prototype covering all 11 modules.

> The prototype runs entirely in the browser on illustrative data. Approvals, stock issues and edits are simulated and saved to `localStorage`. There is no backend, real authentication, payroll calculation or accounting integration yet. The supplied scope is a **draft discovery SoW**, not a signed FRD.

## Run it

```powershell
cd "D:\5. GitUploaded\ERP\prototype"
npm.cmd install
npm.cmd run dev        # http://127.0.0.1:5173
npm.cmd run build      # type-check + production build into prototype/dist
```

- `#/` is the product showcase: animated hero, interactive job thread, module map, verticals, the 12 end-to-end flows, controls, roles and delivery approach.
- `#/app/dashboard` is the ERP workspace. Every record has a URL, for example `#/app/projects/PRJ-0264`, `#/app/purchase/RFQ-0041` and `#/app/assets/SR-0148`.
- Press `Ctrl` + `K` anywhere in the workspace to search records. To restore the starting data, open the account menu and choose **Reset demo data**.

## Prototype structure

| Path | What it holds |
| --- | --- |
| `prototype/src/ds/` | Design system: tokens, base styles and the component library (custom controls, Radix behaviour) |
| `prototype/src/api/` | Domain types, fixtures, the async mock API (`client.ts`), `useQuery` / `useMutation` hooks and formatters |
| `prototype/src/app/` | Shell (sidebar, top bar, command palette), hash router, module registry, shared domain patterns |
| `prototype/src/modules/<module>/` | One folder per ERP module; each is lazy-loaded |
| `prototype/src/showcase/` | The product showcase page |

The mock API is the contract for the backend phase: money as integer rupees, ISO dates, stable record IDs and linked IDs. Replacing the bodies in `api/client.ts` with `fetch` calls to a Node + PostgreSQL service leaves the screens unchanged.

## Documents

- [Design system](DESIGN.md): colour, type, motion, the no-browser-defaults rule
- [Project brief](docs/PROJECT_BRIEF.md) and [screen & workflow plan](docs/SCREEN_AND_WORKFLOW_PLAN.md)
- [Requirement coverage](docs/REQUIREMENT_COVERAGE.md): all 219 scope requirement IDs with their C/V/D status
- [End-to-end journeys](docs/E2E_JOURNEYS.md): the 12 cross-module scenarios
- [Research notes](docs/RESEARCH.md), [Figma prompts](docs/FIGMA_PROMPTS.md)

## Source preservation

`source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` is an unchanged copy of the supplied scope; its SHA-256 is recorded in `source/source-manifest.json`. `source/build_coverage.py` regenerates the coverage register and verifies the hash.
