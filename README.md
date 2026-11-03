# ABC Limited ERP design workspace

This workspace turns the supplied ERP discovery scope into a design brief, a complete requirements-to-screen register, a Figma Make prompt pack and an independent local visual prototype. Prepared 3 November 2026. The current v0.3 concept uses an engineering job traveller entry, ink-dark portal navigation, mineral paper, copper actions, and Radix, TanStack Table and cmdk interactions. The latest pass made that identity measurable rather than declared: the display face actually loads, nothing renders below 11px, supporting text clears 4.5:1, leftover colors from the rejected concept are gone, and browser surfaces such as selection, scrollbars, focus rings and the favicon follow the palette. See [the design revision](docs/DESIGN_REVISION.md), [what was verified](docs/VALIDATION.md) and [the design system](DESIGN.md).

Start with [the project brief](docs/PROJECT_BRIEF.md), then [the screen and workflow plan](docs/SCREEN_AND_WORKFLOW_PLAN.md). [The twelve end-to-end journeys](docs/E2E_JOURNEYS.md) write each cross-module chain step by step, with the record IDs, the gate, the invariant, the exception states and what the prototype can actually click today. Use [the Figma guide and prompts](docs/FIGMA_PROMPTS.md) to create the comparison design. [The coverage register](docs/REQUIREMENT_COVERAGE.md) preserves all 219 module requirement IDs and their original C/V/D status. [Research notes](docs/RESEARCH.md) explain the reference choices and their limits.

The supplied file is a **draft discovery SoW**, not a signed FRD. Its 11 modules are confirmed categories; proposed screen fields and detailed workflows still need validation. This workspace does not turn proposed or undecided capabilities into contractual commitments.

## Local visual prototype

Open a PowerShell terminal in `F:\dwarkesh\erp\ERP\prototype` and run:

```powershell
npm.cmd install
npm.cmd run dev
```

Visit the Local URL printed by Vite, normally `http://127.0.0.1:5173`. Use `npm.cmd run build` for TypeScript checking and the production static build.

The prototype contains illustrative records, navigation for all 11 modules, representative detail screens and browser-local interactions. No account, database, real payroll, real financial posting or external connection is configured. It is a design comparison artifact, not the full ERP. [Prototype boundaries and demo walkthrough](docs/PROTOTYPE_GUIDE.md).

## Files to attach to Figma

1. The original `ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx`.
2. `docs/PROJECT_BRIEF.md`.
3. `docs/SCREEN_AND_WORKFLOW_PLAN.md`.
4. `docs/REQUIREMENT_COVERAGE.md`.
5. `docs/ENTRY_DESIGN_BRIEF.md`.
6. `docs/E2E_JOURNEYS.md`.

Keep `docs/FIGMA_PROMPTS.md` open and paste the prompts in sequence. A screenshot of our prototype is optional visual context, depending on whether you want an independent alternative or a close visual match.

## Source preservation

`source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx` is an unchanged copy of the supplied file. `source/source-manifest.json` records its SHA-256. `scope-extracted.txt` is an OOXML text extraction in source order; table cells use a separator and visual formatting is not preserved. `requirements.json` contains the 219 parsed module entries. The source contains no embedded business diagrams or tracked insertions/deletions. Its original layout was not evaluated as a design reference.

All research, proposed design decisions and illustrative data are separate from the original source. No public publication or Figma upload was performed.
