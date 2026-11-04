import { ApiError, mutate, defineCommand } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { getSessionUser, refreshMockUser } from "../../api/session";
import type { ModuleKey, Role, UserAccount } from "../../api/types";
import { requireLevel } from "../payroll/commands";
import type { Level } from "./data";

/** USR-010/016: exports are audit events too. */
function logExportLocal(what: string, reference: string, module: ModuleKey = "users") {
  return mutate(() => null, { action: `exported ${what} —`, reference, module }, 120);
}

const PRIVILEGED = ["ROLE-01", "ROLE-06", "ROLE-07", "ROLE-08"];
const actorName = () => getSessionUser()?.name ?? "Arjun Mehta";

export interface InviteResult {
  user: UserAccount;
  /** `#/activate?token=…` — returned once by the API; never stored in plain text. Null in the browser demo. */
  activationPath: string | null;
  expiresAt: string | null;
}

/* ---------------- Users & Access (ROLE-08 'users: admin'). Same rules as server/src/commands/admin-flow.ts ---------------- */
function inviteLocal(name: string, email: string, roleId: string) {
  const n = name.trim().replace(/\s+/g, " ");
  const e = email.trim().toLowerCase();
  return mutate(
    (db): InviteResult & { roleName: string } => {
      requireLevel("users", "admin");
      if (n.length < 2) throw new ApiError("Enter the person's full name.", "VALIDATION");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ApiError("Enter a valid work email.", "VALIDATION");
      const role = db.roles.find((r) => r.id === roleId);
      if (!role) throw new ApiError(`Role ${roleId} not found`, "NOT_FOUND");
      const taken = db.users.find((u) => u.email.toLowerCase() === e);
      if (taken) throw new ApiError(`${e} already has an account (${taken.id}, ${taken.status.toLowerCase()}).`, "BLOCKED");
      const next = Math.max(0, ...db.users.map((u) => Number(u.id.split("-")[1]) || 0)) + 1;
      const person = db.people.find((p) => p.email.toLowerCase() === e);
      const user: UserAccount = {
        id: `USR-${String(next).padStart(4, "0")}`,
        name: n,
        email: e,
        employeeId: person?.id,
        roleId,
        mfa: PRIVILEGED.includes(roleId) ? "Not enrolled" : "Not required",
        status: "Invited",
        note: `Invited ${TODAY} by ${actorName()}`,
      };
      db.users.push(user);
      return { user, activationPath: null, expiresAt: null, roleName: role.name };
    },
    (r) => ({ action: `invited ${n} as ${r.roleName} —`, reference: r.user.id, module: "users" }),
  );
}

function setPermissionLocal(roleId: string, module: ModuleKey, level: Level) {
  return mutate(
    (db): { role: Role; before: Level } => {
      requireLevel("users", "admin");
      const role = db.roles.find((r) => r.id === roleId);
      if (!role) throw new ApiError(`Role ${roleId} not found`, "NOT_FOUND");
      const before = role.permissions[module] ?? "none";
      if (before === level) throw new ApiError(`${role.name} already has ${level} on ${module}.`, "BLOCKED");
      if (module === "users" && before === "admin") {
        const others = db.users.filter((u) => u.status === "Active" && u.roleId !== roleId && db.roles.find((r) => r.id === u.roleId)?.permissions.users === "admin");
        if (!others.length) throw new ApiError(`${role.name} holds the last Users & Access admin right. Give another active role admin first, or nobody could manage access.`, "BLOCKED");
      }
      role.permissions[module] = level;
      return { role, before };
    },
    (r) => ({ action: `changed ${module} access ${r.before} → ${level} on`, reference: roleId, module: "users" }),
  ).then(({ role }) => {
    refreshMockUser(); // someone viewing as this role sees the change at once
    return role;
  });
}

function deactivateLocal(userId: string) {
  return mutate(
    (db) => {
      requireLevel("users", "admin");
      if (getSessionUser()?.id === userId) throw new ApiError("You can't deactivate your own account. Another administrator has to do it.", "FORBIDDEN");
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new ApiError(`User ${userId} not found`, "NOT_FOUND");
      if (u.status === "Deactivated") throw new ApiError(`${u.name} is already deactivated.`, "BLOCKED");
      u.status = "Deactivated";
      u.note = `Deactivated ${TODAY} by ${actorName()}`;
      return { user: u, sessionsEnded: 0 };
    },
    { action: "deactivated", reference: userId, module: "users" },
  );
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
const logExportCmd = defineCommand("users.logExport", (what: string, reference: string, module: ModuleKey) => ({ what, reference, module }), logExportLocal);
export const logExport = (what: string, reference: string, module: ModuleKey = "users") => logExportCmd(what, reference, module);
export const inviteUser = defineCommand("users.invite", (name: string, email: string, roleId: string) => ({ name, email, roleId }), inviteLocal);
export const setPermission = defineCommand("users.setPermission", (roleId: string, module: ModuleKey, level: Level) => ({ roleId, module, level }), setPermissionLocal);
export const deactivateUser = defineCommand("users.deactivate", (userId: string) => ({ userId }), deactivateLocal);
