import { ClipboardCheck, History, KeySquare, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useMutation, useQuery } from "../../api/hooks";
import type { Role } from "../../api/types";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { Button, Callout, Dialog, Field, Input, PageHeader, Select, Tabs, useToast } from "../../ds/components";
import { ApprovalRules } from "./ApprovalRules";
import { AuditLog } from "./AuditLog";
import { inviteUser } from "./commands";
import { RoleDrawer } from "./RoleDrawer";
import { RolesMatrix } from "./RolesMatrix";
import { RULES } from "./data";
import { UsersList } from "./UsersList";
import "./users.css";

const TABS = ["roles", "users", "approvals", "audit"] as const;

export default function UsersPage() {
  const route = useRoute();
  const roles = useQuery(api.roles);
  const users = useQuery(api.users);
  const [inviting, setInviting] = useState(false);
  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : "roles";
  const recordId = route.recordId;
  const list = users.data ?? [];
  const openRole = (id: string) => navigate(`/app/users/${id}?tab=${tab}`);
  const close = () => navigate(`/app/users?tab=${tab}`);

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Administration" }, { label: "Users & Access" }]}
        title="Users & Access"
        description="Who can see, change and approve what, and the audit trail behind it."
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => setInviting(true)}>
            Invite user
          </Button>
        }
        meta={
          <>
            <span>{list.filter((u) => u.status === "Active").length} active users · {roles.data?.length ?? "–"} roles</span>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => (recordId ? navigate(`/app/users?tab=${v}`) : setTab(v))}
        items={[
          { value: "roles", label: "Roles & permissions", icon: KeySquare, count: roles.data?.length },
          { value: "users", label: "Users", icon: Users, count: list.length },
          { value: "approvals", label: "Approval rules", icon: ClipboardCheck, count: RULES.length },
          { value: "audit", label: "Audit log", icon: History },
        ]}
      />
      {tab === "roles" && <RolesMatrix roles={roles.data ?? []} loading={roles.loading} onOpen={openRole} activeId={recordId} />}
      {tab === "users" && <UsersList users={list} roles={roles.data ?? []} onOpenRole={openRole} />}
      {tab === "approvals" && <ApprovalRules />}
      {tab === "audit" && <AuditLog />}
      <RoleDrawer id={recordId} roles={roles.data ?? []} users={list} loading={roles.loading} onClose={close} />
      <InviteDialog roles={roles.data ?? []} open={inviting} onOpenChange={setInviting} />
    </ModuleFrame>
  );
}

/** USR — create an account, assign a role and record the invite. Every change is audited. */
function InviteDialog({ roles, open, onOpenChange }: { roles: Role[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(inviteUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRoleId("");
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const r = await m.run(name, email, roleId);
    if (!r) return;
    onOpenChange(false);
    const role = roles.find((x) => x.id === roleId);
    toast({ title: `${r.user.name} invited`, body: `Account created as ${role?.name ?? roleId}. They enrol MFA at first sign-in; the invite is in the audit log.`, tone: "ok" });
  };

  const err = m.error ?? "";
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={UserPlus}
      title="Invite user"
      description="Create an account and assign a role. A sign-in link would go to their work email; nothing is e-mailed in the demo."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Full name" htmlFor="inv-name">
          <Input id="inv-name" value={name} placeholder="e.g. Meera Nair" invalid={err.includes("full name") || undefined} onChange={(e) => { setName(e.target.value); m.reset(); }} />
        </Field>
        <Field label="Work email" htmlFor="inv-email">
          <Input id="inv-email" type="email" value={email} placeholder="name@abc.example" invalid={err.includes("email") || undefined} onChange={(e) => { setEmail(e.target.value); m.reset(); }} />
        </Field>
        <Field label="Role" htmlFor="inv-role">
          <Select
            id="inv-role"
            label="Role"
            value={roleId}
            placeholder="Choose a role"
            onChange={(v) => { setRoleId(v); m.reset(); }}
            options={roles.map((r) => ({ value: r.id, label: r.name, detail: r.description }))}
          />
        </Field>
        {m.error && (
          <Callout tone="risk" title="The invite wasn't sent">
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}
