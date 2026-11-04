/**
 * Who is signed in. In remote mode this is the API session (cookie-backed);
 * in mock mode a fixed demo user with access to every module, so the static
 * demo is fully explorable.
 */
import { useSyncExternalStore } from "react";
import { http, whenSignedOut } from "./http";
import * as fx from "./fixtures";
import { API_MODE } from "./store";
import type { ModuleKey, Role } from "./types";

export type Level = "none" | "view" | "edit" | "approve" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  title: string;
  initials: string;
  personId: string | null;
  permissions: Record<ModuleKey, Level>;
}

export interface DemoAccount {
  email: string;
  name: string;
  role: string;
  roleId: string;
}

const ALL: ModuleKey[] = ["dashboard", "insights", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll", "users", "reports"];

const MOCK_USER: SessionUser = {
  id: "USR-0001",
  name: "Arjun Mehta",
  email: "arjun.mehta@abc.example",
  role: "Operations head",
  roleId: "ROLE-01",
  title: "Operations Head",
  initials: "AM",
  personId: "EMP-0012",
  permissions: Object.fromEntries(ALL.map((m) => [m, "admin"])) as Record<ModuleKey, Level>,
};

/**
 * Demo people for "View as" in the browser demo — the same accounts the API seeds,
 * so a role looks identical in both modes.
 */
export const DEMO_PEOPLE: { id: string; name: string; email: string; roleId: string; personId: string | null }[] = [
  { id: "USR-0001", name: "Arjun Mehta", email: "arjun.mehta@abc.example", roleId: "ROLE-01", personId: "EMP-0012" },
  { id: "USR-0002", name: "Ananya Rao", email: "ananya.rao@abc.example", roleId: "ROLE-02", personId: "EMP-0034" },
  { id: "USR-0003", name: "Imran Sheikh", email: "imran.sheikh@abc.example", roleId: "ROLE-03", personId: "EMP-0104" },
  { id: "USR-0004", name: "Karan Patel", email: "karan.patel@abc.example", roleId: "ROLE-04", personId: "EMP-0072" },
  { id: "USR-0005", name: "Sana Kapoor", email: "sana.kapoor@abc.example", roleId: "ROLE-05", personId: "EMP-0081" },
  { id: "USR-0006", name: "Kavya Iyer", email: "kavya.iyer@abc.example", roleId: "ROLE-06", personId: "EMP-0135" },
  { id: "USR-0007", name: "Ritu Agarwal", email: "ritu.agarwal@abc.example", roleId: "ROLE-07", personId: null },
  { id: "USR-0008", name: "IT Administrator", email: "it.admin@abc.example", roleId: "ROLE-08", personId: null },
];

const VIEW_AS_KEY = "threadline-view-as";

/** Browser demo: role permissions come from the in-browser database once it loads, so an edit in Users & Access takes effect. */
let mockRoles: () => Role[] = () => fx.roles;
let viewAsId: string | null = null;

function mockUserFor(id: string | null): SessionUser {
  const p = DEMO_PEOPLE.find((x) => x.id === id);
  const role = p && mockRoles().find((r) => r.id === p.roleId);
  if (!p || !role) return MOCK_USER;
  const person = p.personId ? fx.people.find((x) => x.id === p.personId) : undefined;
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: role.name,
    roleId: role.id,
    title: person?.role ?? role.name,
    initials: person?.initials ?? p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""),
    personId: p.personId,
    permissions: Object.fromEntries(ALL.map((m) => [m, (role.permissions[m] ?? "none") as Level])) as Record<ModuleKey, Level>,
  };
}

function initialMockUser() {
  try {
    viewAsId = localStorage.getItem(VIEW_AS_KEY);
    return mockUserFor(viewAsId);
  } catch {
    return MOCK_USER;
  }
}

type State = { status: "loading" | "signed-in" | "signed-out"; user: SessionUser | null };
let state: State = API_MODE === "remote" ? { status: "loading", user: null } : { status: "signed-in", user: initialMockUser() };

/** Browser demo: see the workspace exactly as another role does. `null` = full demo access. */
export function viewAs(userId: string | null) {
  try {
    if (userId) localStorage.setItem(VIEW_AS_KEY, userId);
    else localStorage.removeItem(VIEW_AS_KEY);
  } catch {
    /* storage blocked: the switch still applies for this tab */
  }
  viewAsId = userId;
  set({ status: "signed-in", user: mockUserFor(userId) });
}

/** Browser demo: read role permissions from this source (the mock database) and re-derive the viewer's access. */
export function setMockRoleSource(source: () => Role[]) {
  mockRoles = source;
  refreshMockUser();
}

/** Browser demo: a role's permissions changed — the person viewing as that role sees the change at once. */
export function refreshMockUser() {
  if (API_MODE === "remote" || state.status !== "signed-in") return;
  set({ status: "signed-in", user: mockUserFor(viewAsId) });
}

/** The full-access demo user ("Demo · all modules") is the mock default. */
export const isFullDemoUser = (u: SessionUser | null) => !!u && u.id === MOCK_USER.id && u.role === MOCK_USER.role && Object.values(u.permissions).every((l) => l === "admin");

/** API mode: jump straight into another demo account (signs out, then in). */
export async function switchAccount(email: string, password: string) {
  await http.post("/auth/logout", {}).catch(() => undefined);
  return signIn(email, password);
}
const subs = new Set<() => void>();
const set = (s: State) => {
  state = s;
  subs.forEach((f) => f());
};

export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
}

export const getSessionUser = () => state.user;

const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2, approve: 3, admin: 4 };
export function canAccess(user: SessionUser | null, module: ModuleKey, level: Level = "view") {
  return !!user && RANK[user.permissions[module] ?? "none"] >= RANK[level];
}

/** Resolve an existing session on boot (remote mode). */
export async function restoreSession() {
  if (API_MODE !== "remote") return;
  try {
    const { user } = await http.get<{ user: SessionUser }>("/auth/me");
    set({ status: "signed-in", user });
  } catch {
    set({ status: "signed-out", user: null });
  }
}

export async function signIn(email: string, password: string) {
  const { user } = await http.post<{ user: SessionUser }>("/auth/login", { email, password });
  set({ status: "signed-in", user });
  return user;
}

export async function signOut() {
  if (API_MODE === "remote") await http.post("/auth/logout", {}).catch(() => undefined);
  set({ status: "signed-out", user: null });
}

export const demoAccounts = () => http.get<DemoAccount[]>("/auth/demo-accounts");

// An expired or revoked session anywhere sends the user back to sign-in.
whenSignedOut(() => {
  if (state.status === "signed-in") set({ status: "signed-out", user: null });
});
