import type { ModuleKey, Role, Tone } from "../../api/types";

export type Level = NonNullable<Role["permissions"][ModuleKey]>;

export const LEVELS: { key: Level; label: string; tone: Tone; short: string; explain: string }[] = [
  { key: "none", label: "None", tone: "neutral", short: "—", explain: "No access. The module is hidden from navigation and search." },
  { key: "view", label: "View", tone: "info", short: "View", explain: "Read records and run reports in scope. Can't create, change or export restricted data." },
  { key: "edit", label: "Edit", tone: "accent", short: "Edit", explain: "Create and change records in scope. Can't approve anything, including their own work." },
  { key: "approve", label: "Approve", tone: "violet", short: "Approve", explain: "Everything in Edit, plus decide approvals routed to this role. Never on records they raised." },
  { key: "admin", label: "Admin", tone: "warn", short: "Admin", explain: "Configure the module: masters, policies and field restrictions. Logged with before/after values." },
];
export const levelInfo = (l: Level) => LEVELS.find((x) => x.key === l)!;

export const MATRIX_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "projects", label: "Projects" },
  { key: "inventory", label: "Inventory" },
  { key: "assets", label: "Assets" },
  { key: "purchase", label: "Purchase" },
  { key: "crm", label: "CRM" },
  { key: "sales", label: "Sales" },
  { key: "hr", label: "People" },
  { key: "payroll", label: "Payroll" },
  { key: "reports", label: "Reports" },
  { key: "users", label: "Users" },
];

export const PRIVILEGED = ["ROLE-01", "ROLE-06", "ROLE-07", "ROLE-08"];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  roleId: string;
  mfa: "On" | "Not enrolled" | "Not required";
  lastActive?: string;
  status: "Active" | "Invited" | "Deactivated";
  note?: string;
}

/** Illustrative identities. Employee ids link to People where the person exists in the demo directory. */
export const USERS: AppUser[] = [
  { id: "U-01", name: "Arjun Mehta", email: "arjun.mehta@abc.example", employeeId: "EMP-0012", roleId: "ROLE-01", mfa: "On", lastActive: "2026-11-03T09:38:00+05:30", status: "Active" },
  { id: "U-02", name: "Ananya Rao", email: "ananya.rao@abc.example", employeeId: "EMP-0034", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-11-03T07:41:00+05:30", status: "Active" },
  { id: "U-03", name: "Rahul Desai", email: "rahul.desai@abc.example", employeeId: "EMP-0027", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-11-03T05:31:00+05:30", status: "Active" },
  { id: "U-04", name: "Vikram Shah", email: "vikram.shah@abc.example", employeeId: "EMP-0056", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-11-02T19:05:00+05:30", status: "Active" },
  { id: "U-05", name: "Nikhil Joshi", email: "nikhil.joshi@abc.example", employeeId: "EMP-0063", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-11-02T11:06:00+05:30", status: "Active", note: "Stopgap: no Purchase role exists yet" },
  { id: "U-06", name: "Imran Sheikh", email: "imran.sheikh@abc.example", employeeId: "EMP-0104", roleId: "ROLE-03", mfa: "Not required", lastActive: "2026-11-02T16:21:00+05:30", status: "Active" },
  { id: "U-07", name: "Deepa Kulkarni", email: "deepa.kulkarni@abc.example", employeeId: "EMP-0117", roleId: "ROLE-03", mfa: "Not required", lastActive: "2026-11-03T08:55:00+05:30", status: "Active" },
  { id: "U-08", name: "Karan Patel", email: "karan.patel@abc.example", employeeId: "EMP-0072", roleId: "ROLE-04", mfa: "Not required", lastActive: "2026-11-03T08:24:00+05:30", status: "Active" },
  { id: "U-09", name: "Priya Menon", email: "priya.menon@abc.example", employeeId: "EMP-0091", roleId: "ROLE-04", mfa: "Not required", lastActive: "2026-11-01T17:40:00+05:30", status: "Active" },
  { id: "U-10", name: "Sana Kapoor", email: "sana.kapoor@abc.example", employeeId: "EMP-0081", roleId: "ROLE-05", mfa: "Not required", lastActive: "2026-11-03T09:02:00+05:30", status: "Active" },
  { id: "U-11", name: "Kavya Iyer", email: "kavya.iyer@abc.example", employeeId: "EMP-0135", roleId: "ROLE-06", mfa: "On", lastActive: "2026-11-03T09:15:00+05:30", status: "Active" },
  { id: "U-12", name: "Ritu Bansal", email: "ritu.bansal@abc.example", roleId: "ROLE-07", mfa: "Not enrolled", status: "Invited", note: "Invite sent 30 Oct; MFA must be enrolled at first sign-in" },
  { id: "U-13", name: "Dev Malhotra", email: "it.admin@abc.example", roleId: "ROLE-08", mfa: "On", lastActive: "2026-11-02T18:10:00+05:30", status: "Active" },
  { id: "U-14", name: "Suresh Pillai", email: "suresh.pillai@abc.example", roleId: "ROLE-02", mfa: "Not required", lastActive: "2026-10-30T18:00:00+05:30", status: "Deactivated", note: "Exit 31 Oct · access revoked by HR trigger; approvals delegated to Ananya Rao" },
];

export interface ApprovalRule {
  id: string;
  document: string;
  when: string;
  approver: string;
  levels: string;
  sod: string;
  escalation: string;
  approvalType?: string;
}

export const RULES: ApprovalRule[] = [
  { id: "R-01", document: "Purchase requisition", when: "Up to ₹2 L", approver: "Project manager's head", levels: "1 level", sod: "Requester can't approve", escalation: "24 h → Operations head", approvalType: "Purchase requisition" },
  { id: "R-02", document: "Purchase requisition", when: "Above ₹2 L", approver: "Operations head", levels: "2 levels", sod: "Requester can't approve", escalation: "24 h → Managing director" },
  { id: "R-03", document: "BOM release / revision", when: "Any released BOM", approver: "Engineering head", levels: "1 level", sod: "Designer ≠ approver", escalation: "48 h → Operations head", approvalType: "BOM release" },
  { id: "R-04", document: "Quotation discount", when: "Above owner's 5% authority", approver: "Operations head", levels: "1 level", sod: "Quote owner can't approve", escalation: "24 h" },
  { id: "R-05", document: "Billing advice", when: "Every advice", approver: "Finance owner", levels: "1 level", sod: "Raiser ≠ approver", escalation: "48 h → Operations head", approvalType: "Billing advice" },
  { id: "R-06", document: "Employee claim", when: "Every claim", approver: "Reporting manager", levels: "1 level", sod: "Traveller can't approve own claim", escalation: "72 h → HR", approvalType: "Employee claim" },
  { id: "R-07", document: "Leave request", when: "Every request", approver: "Reporting manager", levels: "1 level", sod: "Self-approval blocked", escalation: "48 h → HR" },
  { id: "R-08", document: "Stock adjustment", when: "Any count variance", approver: "Stores lead", levels: "1 level", sod: "Counter can't approve own adjustment", escalation: "24 h → Operations head" },
  { id: "R-09", document: "Payroll run", when: "Every period", approver: "Finance owner", levels: "Review → approve → lock", sod: "Maker ≠ checker; preparer can't approve", escalation: "None — lock is explicit" },
];

export const DELEGATIONS = [
  { from: "Suresh Pillai", to: "Ananya Rao", scope: "Project approvals · PRJ-0244", fromDate: "2026-10-31", toDate: "Until reassigned", reason: "Exit (E2E-12)" },
  { from: "Arjun Mehta", to: "Sana Kapoor", scope: "Quotation discounts ≤ 8%", fromDate: "2026-11-10", toDate: "2026-11-14", reason: "Leave" },
];
