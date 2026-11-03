"""Regenerate a traceable design register from the preserved source text."""
from pathlib import Path
import collections
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
text = (ROOT / 'source/scope-extracted.txt').read_text(encoding='utf-8')
rows = []
for line in text.splitlines():
    m = re.match(r'^((?:PM|AST|INV|PAY|HR|USR|PUR|SAL|CRM|DASH|RPT)-\d{3}) \| (.*?) \| ([CVD])$', line)
    if m:
        rows.append({'id': m[1], 'requirement': m[2], 'status': m[3]})

# Each index maps an original requirement number to its principal screen family.
# Shared approval/document/identity behavior is listed separately below.
mapping = {
 'PM': ['PM-UI-01','PM-UI-01','PM-UI-02','PM-UI-02','PM-UI-03','PM-UI-02','PM-UI-04','PM-UI-04','PM-UI-03','PM-UI-05','PM-UI-05','PM-UI-05','PM-UI-04','PM-UI-05','PM-UI-05','PM-UI-03','PM-UI-05','PM-UI-05','PM-UI-05','PM-UI-04'],
 'AST':['AST-UI-01','AST-UI-01','AST-UI-01','AST-UI-01','AST-UI-02','AST-UI-06','AST-UI-06','AST-UI-06','AST-UI-03','AST-UI-03','AST-UI-04','AST-UI-04','AST-UI-05','AST-UI-05','AST-UI-05','AST-UI-05 / INV-UI-04','AST-UI-03 / SAL-UI-03','AST-UI-01','AST-UI-02','AST-UI-01','AST-UI-01','AST-UI-06 / AST-UI-04'],
 'INV':['INV-UI-01','INV-UI-01','INV-UI-03','INV-UI-02','INV-UI-02','INV-UI-04','INV-UI-04','INV-UI-03','INV-UI-04','INV-UI-04','INV-UI-05','INV-UI-03','INV-UI-06','INV-UI-06','INV-UI-07','INV-UI-07 / PUR-UI-01','INV-UI-08','INV-UI-08','INV-UI-08','INV-UI-09','INV-UI-09','INV-UI-08','INV-UI-09 / SAL-UI-02','INV-UI-10','INV-UI-01','INV-UI-04','INV-UI-01 / INV-UI-03','INV-UI-03 / INV-UI-04','INV-UI-09','INV-UI-09'],
 'PAY':['PAY-UI-01','PAY-UI-01','PAY-UI-01','PAY-UI-01 / HR-UI-02','PAY-UI-01','PAY-UI-02','PAY-UI-02','PAY-UI-01','PAY-UI-03','PAY-UI-01 / PAY-UI-03','PAY-UI-02','PAY-UI-02','PAY-UI-02 / HR-UI-04','PAY-UI-03','PAY-UI-03 / SYS-06','PAY-UI-02','PAY-UI-03','PAY-UI-01'],
 'HR':['HR-UI-01','HR-UI-01','HR-UI-01','HR-UI-01','HR-UI-02','HR-UI-02','HR-UI-02','HR-UI-03','HR-UI-03','HR-UI-04','HR-UI-04','HR-UI-04','HR-UI-03','HR-UI-03','HR-UI-03','HR-UI-01 / AST-UI-02 / USR-UI-01','HR-UI-04 / HR-UI-02','HR-UI-03 / HR-UI-02','HR-UI-01','HR-UI-02 / PAY-UI-01','HR-UI-01','HR-UI-02'],
 'USR':['USR-UI-01','USR-UI-01','USR-UI-02','USR-UI-02','USR-UI-02 / SYS-02','USR-UI-02','USR-UI-01 / SYS-01','USR-UI-01 / SYS-01','SYS-01','USR-UI-03 / SYS-04','SYS-03 / USR-UI-03','USR-UI-02','USR-UI-01','USR-UI-02 / SYS-02','SYS-04','USR-UI-03 / SYS-05','USR-UI-02','USR-UI-01'],
 'PUR':['PUR-UI-01','PUR-UI-01','PUR-UI-01 / SYS-02','PUR-UI-02','PUR-UI-02','PUR-UI-02','PUR-UI-03','PUR-UI-03','PUR-UI-03','PUR-UI-04 / INV-UI-02','PUR-UI-04 / INV-UI-02','PUR-UI-04','PUR-UI-03','PUR-UI-04','PUR-UI-04','PUR-UI-04 / SYS-06','PUR-UI-03 / PM-UI-03','PUR-UI-04 / INV-UI-05','PUR-UI-03 / RPT-UI-02','PUR-UI-03 / SYS-04'],
 'SAL':['SAL-UI-01','SAL-UI-01','SAL-UI-01','SAL-UI-02','SAL-UI-02','SAL-UI-02','SAL-UI-02 / INV-UI-04','SAL-UI-02','SAL-UI-02','SAL-UI-03','SAL-UI-03','SAL-UI-03','SAL-UI-03 / SYS-06','SAL-UI-03','SAL-UI-03','SAL-UI-02 / SAL-UI-03','SAL-UI-02','SAL-UI-01','SAL-UI-01','SAL-UI-03 / RPT-UI-02'],
 'CRM':['CRM-UI-01','CRM-UI-01','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-02','CRM-UI-01','CRM-UI-01','CRM-UI-02','CRM-UI-01','CRM-UI-02','CRM-UI-02','CRM-UI-02 / SYS-06','CRM-UI-02 / SAL-UI-02'],
 'DASH':['DASH-01','DASH-01','DASH-02','DASH-02','DASH-02','DASH-02','DASH-03','DASH-03','DASH-03','DASH-01','DASH-01','DASH-01','DASH-01'],
 'RPT':['RPT-UI-01','RPT-UI-01','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-02','RPT-UI-03','RPT-UI-02','RPT-UI-01','RPT-UI-03','RPT-UI-02','RPT-UI-03','RPT-UI-01'],
}
assert len(rows) == 219 and len({r['id'] for r in rows}) == 219
counts = collections.Counter(r['status'] for r in rows)
assert counts == {'C':52, 'V':152, 'D':15}
plan = (ROOT / 'docs/SCREEN_AND_WORKFLOW_PLAN.md').read_text(encoding='utf-8')
manifest = json.loads((ROOT / 'source/source-manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256((ROOT/'source/ABC_Limited_ERP_Detailed_Scope_of_Work_v2.docx').read_bytes()).hexdigest() == manifest['sha256']
lines = ['# Requirements to screen coverage register', '',
 'Prepared 3 November 2026. All 219 source module entries are reproduced below with their original C/V/D mark and a proposed principal screen mapping. This is **planning coverage**, not completed implementation, customer acceptance or evidence that the prototype fully designs every requirement.', '',
 'C = confirmed category, V = validate, D = decision. Totals: **52 C / 152 V / 15 D**. Original text comes from `source/scope-extracted.txt`; original DOCX is preserved separately. Proposed UI families are defined in `SCREEN_AND_WORKFLOW_PLAN.md`.', '',
 'Every row remains Pending FRD validation or Decision required for production. The comparison prototype is a representative subset. Its generic records and navigation do not count as full screen-level coverage. See `PROTOTYPE_GUIDE.md` for actual implemented surfaces.', '',
 '| Source ID | Original requirement | Source status | Proposed screen families | Production baseline |',
 '| --- | --- | --- | --- | --- |']
for r in rows:
    prefix, number = r['id'].split('-')
    screens = mapping[prefix][int(number)-1]
    for screen in screens.split(' / '):
        assert screen in plan, screen
    baseline = 'Decision required' if r['status']=='D' else 'Pending detailed FRD validation'
    lines.append(f"| {r['id']} | {r['requirement'].replace('|','/')} | {r['status']} | {screens} | {baseline} |")
lines += ['', '## Coverage beyond module rows', '',
 '| Source area | Design response / remaining gate |', '| --- | --- |',
 '| Business context and seven verticals | PROJECT_BRIEF; entry-page selector and shared records; actual operating rules need process-owner validation |',
 '| Full frontend/backend/database/API responsibility | PROJECT_BRIEF static-vs-production and stack; SCREEN_AND_WORKFLOW_PLAN logical model; production not built |',
 '| Canonical linkages and shared controls | Navigation/shared behavior; SYS families; twelve E2E journey mappings |',
 '| E2E-01 through E2E-12 | All twelve named journeys mapped in SCREEN_AND_WORKFLOW_PLAN; full UAT still required |',
 '| Master governance and migration | SYS-05, logical model and source section 8; source inventory, volumes and reconciliation scope undecided |',
 '| Role/approvals/audit | USR-UI-01/02/03 and SYS-02/04; signed action/data/field matrix and direct API deny tests required |',
 '| INT-01 through INT-09 | SYS-06 and original interface register; accounting, attendance, bank, SSO, gateways, legacy, BI and OT remain conditional; no live connections |',
 '| NFR categories | Capacity, performance, availability/support, resilience, security, privacy, audit, UX, observability, release engineering, compliance, interoperability and data accuracy retained as production work; numeric targets undecided |',
 '| Reporting/KPI governance | RPT families with owner/source/formula/period/cutoff/freshness/access/sample; not an approved numbered report pack |',
 '| Verification and acceptance | Scope-to-FRD-to-test traceability, signed baseline, migration reconciliation, security/load/restore and combined UAT per source; prototype build is not acceptance |',
 '| Deliverables and one-release model | Internal workstream sequence retained in PROJECT_BRIEF; all eleven modules accepted in one production release |',
 '| Exclusions and change control | No additional modules, full GL, statutory filing, OT, native offline, specialist QMS/LIMS, AI/OCR/RPA or portals implied; conditional additions need decision/change record |',
 '| OD-01 through OD-28 | Original decision register preserved in source; open decisions are not silently resolved by design defaults |',
 '| Appendices and sign-off | Original FRD template, glossary, anonymization and sign-off checklist preserved; this register does not replace those artifacts |', '',
 'Regenerate with `source/build_coverage.py` after intentional source changes. The script verifies count, status totals, unique IDs, screen-family existence and original-copy hash. Original source must never be changed merely to make this check pass.', '']
(ROOT/'docs/REQUIREMENT_COVERAGE.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'requirements':len(rows),'status_counts':dict(counts),'source_sha256_verified':True,'screen_mappings_verified':True},indent=2))
