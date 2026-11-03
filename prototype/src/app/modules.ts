import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  FileSpreadsheet,
  Handshake,
  LayoutDashboard,
  ReceiptIndianRupee,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ModuleKey } from "../api/types";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  group: "Workspace" | "Operations" | "Commercial" | "People" | "Administration";
  description: string;
  page: LazyExoticComponent<ComponentType>;
}

/* Each module is its own chunk, so the showcase never loads ERP screens it doesn't show. */
export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Workspace", description: "What needs you today across every module.", page: lazy(() => import("../modules/dashboard/DashboardPage")) },
  { key: "projects", label: "Projects", icon: BriefcaseBusiness, group: "Operations", description: "Plan milestones, coordinate resources and follow delivery.", page: lazy(() => import("../modules/projects/ProjectsPage")) },
  { key: "inventory", label: "Inventory & Assembly", icon: Boxes, group: "Operations", description: "Stock, reservations, BOMs, MRP and panel work orders.", page: lazy(() => import("../modules/inventory/InventoryPage")) },
  { key: "assets", label: "Assets & Service", icon: Wrench, group: "Operations", description: "Installed base, AMC/O&M contracts, tickets and calibration.", page: lazy(() => import("../modules/assets/AssetsPage")) },
  { key: "purchase", label: "Purchase", icon: ShoppingCart, group: "Operations", description: "Requisitions, RFQs, supplier comparison, orders and receipts.", page: lazy(() => import("../modules/purchase/PurchasePage")) },
  { key: "crm", label: "CRM", icon: Handshake, group: "Commercial", description: "Leads, opportunities, tenders and renewals.", page: lazy(() => import("../modules/crm/CrmPage")) },
  { key: "sales", label: "Sales", icon: ReceiptIndianRupee, group: "Commercial", description: "Quotations, orders, deliveries and billing advice.", page: lazy(() => import("../modules/sales/SalesPage")) },
  { key: "hr", label: "People", icon: Users, group: "People", description: "Employees, deployment, attendance, leave and claims.", page: lazy(() => import("../modules/hr/HrPage")) },
  { key: "payroll", label: "Payroll", icon: FileSpreadsheet, group: "People", description: "Pay periods, input checks, approvals and payslips.", page: lazy(() => import("../modules/payroll/PayrollPage")) },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Administration", description: "Operational and management reports with export control.", page: lazy(() => import("../modules/reports/ReportsPage")) },
  { key: "users", label: "Users & Access", icon: ShieldCheck, group: "Administration", description: "Users, roles, approval authority and audit.", page: lazy(() => import("../modules/users/UsersPage")) },
];

export const moduleDef = (key: ModuleKey) => MODULES.find((m) => m.key === key) ?? MODULES[0];
