# Design prototype validation

Checked locally on 3 November 2026. These checks support the design handoff; they do not establish production ERP acceptance.

| Check | Result and evidence limit |
| --- | --- |
| Source preservation | Original-copy SHA-256 matches `source/source-manifest.json`: `2e9443390d3622ee3926ed969fbc2e1b25e05de7b43b516807946189ea4eba84` |
| Module requirement extraction | 219 unique IDs; 52 C, 152 V, 15 D. Every proposed principal screen family exists in the plan. `source/build_coverage.py` passed |
| TypeScript and static build | `npm.cmd run build` passed after the v0.2 revision and component-library integration |
| Build size | Main minified JS about 842 kB, about 253 kB gzip; Vite emits a large-chunk advisory. Library/route splitting and production performance measurements remain future work |
| Local HTTP preview | Root and transformed entry returned HTTP 200. One stale browser tab lost its socket after a dev-server restart; a fresh tab connected successfully |
| Browser diagnostics | No new warning/error entries during the final isolated reload. Earlier hot-reload duplicate-root warnings were addressed by separating App from the main bootstrap; chart initial sizing was specified |
| Module navigation | CRM, Sales, HR, Payroll, User Management and Reports rendered their expected headings without body overflow at the desktop viewport; Projects, Inventory, Purchase, Assets and Dashboard were exercised through representative flows |
| Command palette | Search for Inventory and Enter navigated to Inventory. Radix handles the modal; cmdk handles filtering and keyboard selection |
| Table behavior | Row selection showed the selected count/export action; Store column could be hidden; compact rows removed secondary detail; name sorting and no-match search/clear states worked. Numeric/date sorting is defined in the grid; comprehensive sorting test cases were not run |
| Record inspection | Inventory record opened in a Radix side drawer with its ID, owner, availability and reference context |
| Draft persistence | A synthetic purchase draft with source reference and notes appeared in the list, survived reload, and showed saved notes in the drawer. The verification draft was discarded through its UI afterward |
| Approval validation | Reject without a reason displayed an inline error. With a reason, the demo outcome became Rejected. No backend audit or business approval occurred |
| Stock/QC examples | Attempt to issue held stock showed a block. Eligible issue recorded a local simulation. Completing the demo assembly stage required QC review and kept dispatch blocked |
| Responsive behavior | Reviewed desktop layouts at 1440 px and 1280 px and mobile at 390 px. Tested dashboard and inventory had no body overflow. Mobile table content scrolls within its own container; mobile navigation opened and selected Inventory |
| Remaining module views | Report catalogue, role matrix and restricted-payroll design states rendered; they are illustrative surfaces, not complete business implementations |
| Visual previews | Saved current entry, dashboard, inventory and mobile screenshots under `docs/previews`. Screenshots illustrate synthetic data and selected states |

CSV export code is implemented for fixture data, including selected records. Export controls were inspected; downloaded CSV contents and browser-specific download behavior were not independently audited. Reduced-motion styles, focus outlines, labeled controls and library interaction primitives are included; a full accessibility audit and real-device testing were not performed.

No real authentication, data scopes, database transactions, payroll calculation, finance posting, service SLA engine, certificate generation, file scanning, external gateway, migration, backup/restore or 200-user load testing has been completed. No public deployment or external Figma upload was performed. The all-module screen plan and requirements register define future design/development coverage, not completed prototype functionality.
