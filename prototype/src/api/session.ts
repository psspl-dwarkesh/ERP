/**
 * Who is signed in. In remote mode this is the API session (cookie-backed);
 * in mock mode a fixed demo user with access to every module, so the static
 * demo is fully explorable.
 */
import { useSyncExternalStore } from "react";
import { http, whenSignedOut } from "./http";
import { API_MODE } from "./store";
import type { ModuleKey } from "./types";

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

const ALL: ModuleKey[] = ["dashboard", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll", "users", "reports"];

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

type State = { status: "loading" | "signed-in" | "signed-out"; user: SessionUser | null };
let state: State = API_MODE === "remote" ? { status: "loading", user: null } : { status: "signed-in", user: MOCK_USER };
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
