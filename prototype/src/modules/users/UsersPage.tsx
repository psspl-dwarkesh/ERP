import { ClipboardCheck, History, KeySquare, UserPlus, Users } from "lucide-react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { PageHeader, SoonButton, Tabs } from "../../ds/components";
import { ApprovalRules } from "./ApprovalRules";
import { AuditLog } from "./AuditLog";
import { RoleDrawer } from "./RoleDrawer";
import { RolesMatrix } from "./RolesMatrix";
import { USERS, RULES } from "./data";
import { UsersList } from "./UsersList";
import "./users.css";

const TABS = ["roles", "users", "approvals", "audit"] as const;

export default function UsersPage() {
  const route = useRoute();
  const roles = useQuery(api.roles);
  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : "roles";
  const recordId = route.recordId;
  const openRole = (id: string) => navigate(`/app/users/${id}?tab=${tab}`);
  const close = () => navigate(`/app/users?tab=${tab}`);

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Administration" }, { label: "Users & Access" }]}
        title="Users & Access"
        description="Who can see, change and approve what, and the audit trail behind it."
        actions={<SoonButton icon={UserPlus} what="Create an account, assign a role and send a sign-in link. Every change is audited.">Invite user</SoonButton>}
        meta={
          <>
            <span>{USERS.filter((u) => u.status === "Active").length} active users · {roles.data?.length ?? "–"} roles</span>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => (recordId ? navigate(`/app/users?tab=${v}`) : setTab(v))}
        items={[
          { value: "roles", label: "Roles & permissions", icon: KeySquare, count: roles.data?.length },
          { value: "users", label: "Users", icon: Users, count: USERS.length },
          { value: "approvals", label: "Approval rules", icon: ClipboardCheck, count: RULES.length },
          { value: "audit", label: "Audit log", icon: History },
        ]}
      />
      {tab === "roles" && <RolesMatrix roles={roles.data ?? []} loading={roles.loading} onOpen={openRole} activeId={recordId} />}
      {tab === "users" && <UsersList roles={roles.data ?? []} onOpenRole={openRole} />}
      {tab === "approvals" && <ApprovalRules />}
      {tab === "audit" && <AuditLog />}
      <RoleDrawer id={recordId} roles={roles.data ?? []} loading={roles.loading} onClose={close} />
    </ModuleFrame>
  );
}
