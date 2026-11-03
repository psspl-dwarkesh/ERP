/**
 * Screenshots of the current build, captured from the browser demo at 1440x900 (2x for sharp
 * Retina rendering) and stored in public/case-study/. Captions describe only what the image shows.
 */
export interface Shot {
  key: string;
  short: string;
  title: string;
  caption: string;
  alt: string;
  route: string;
  src: string;
  w: number;
  h: number;
}

const s = (key: string, short: string, title: string, caption: string, alt: string, route: string, w = 1440, h = 900): Shot => ({
  key,
  short,
  title,
  caption,
  alt,
  route,
  src: `/case-study/${key}.webp`,
  w,
  h,
});

export const SHOTS = {
  dashboard: s(
    "dashboard",
    "Dashboard",
    "Operations dashboard",
    "Opens on the three things that need a decision now: a P1 ticket, a waiting approval and a QC hold, each with its evidence and next action. The approval queue and today's service tickets follow.",
    "Threadline dashboard: decision cards for SR-0148, PR-0084 and ITM-0137 above the approvals queue and the service tickets due today",
    "#/app/dashboard",
  ),
  project: s(
    "project",
    "Project",
    "Project PRJ-0264",
    "The blocked loop test and the plan to clear it come first, then the linked chain from sales order to service ticket, then milestones and gates.",
    "Project PRJ-0264: a blocked loop-test alert, seven linked record cards and the milestone track",
    "#/app/projects/PRJ-0264",
  ),
  rfq: s(
    "rfq",
    "Supplier comparison",
    "Supplier comparison RFQ-0041",
    "Three quotes on the same lines, with lead time measured against the need-by date. The recommendation explains why the cheapest quote is not the pick.",
    "RFQ-0041 comparison of three supplier quotes side by side",
    "#/app/purchase/RFQ-0041",
  ),
  service: s(
    "service",
    "Service ticket",
    "Service ticket SR-0148",
    "A P1 breakdown with its response clock, the entitlement resolved from AMC-0031 and the engineer assignment, opened in a drawer over the service desk.",
    "Service ticket SR-0148 worksheet with SLA clock and contract entitlement",
    "#/app/assets/SR-0148",
  ),
  assembly: s(
    "assembly",
    "Panel assembly",
    "Panel work order WO-0187",
    "WO-0187 at the wiring stage. Its dispatch gate is blocked and lists exactly what is still open: assembly, testing and production QC.",
    "Work order WO-0187 with six stages and a blocked dispatch gate",
    "#/app/inventory?tab=assembly",
  ),
  crm: s(
    "crm",
    "CRM pipeline",
    "CRM pipeline",
    "Opportunities by stage with total and weighted value, the vertical that will deliver each one and the next follow-up.",
    "CRM pipeline board with opportunity cards in stage columns",
    "#/app/crm",
  ),
  mobile: s(
    "mobile",
    "Phone",
    "Dashboard on a phone",
    "The same dashboard at 390 px: decisions first, single column, navigation in a drawer.",
    "Threadline dashboard on a 390 pixel wide phone screen",
    "#/app/dashboard",
    390,
    844,
  ),
} satisfies Record<string, Shot>;
