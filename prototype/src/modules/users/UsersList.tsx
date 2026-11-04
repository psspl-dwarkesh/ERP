import { KeyRound, ShieldAlert, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ago } from "../../api/format";
import { getSessionUser } from "../../api/session";
import type { Role, UserAccount } from "../../api/types";
import { useMutation } from "../../api/hooks";
import { Button, Callout, DataTable, Dialog, FilterChips, Person, RecordLink, SearchField, Status, Tag, Toolbar, useToast, type Column } from "../../ds/components";
import { deactivateUser } from "./commands";
import { PRIVILEGED } from "./data";

type Filter = "all" | "privileged" | UserAccount["status"];

export function UsersList({ users, roles, onOpenRole }: { users: UserAccount[]; roles: Role[]; onOpenRole: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [deactivating, setDeactivating] = useState<UserAccount | null>(null);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const selfId = getSessionUser()?.id;

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users.filter((u) => (filter === "all" ? true : filter === "privileged" ? PRIVILEGED.includes(u.roleId) : u.status === filter) && (!t || `${u.name} ${u.email} ${roleName(u.roleId)}`.toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, users, roles]);

  const mfaGap = users.filter((u) => PRIVILEGED.includes(u.roleId) && u.mfa !== "On" && u.status !== "Deactivated");

  const columns: Column<UserAccount>[] = [
    {
      key: "name",
      header: "User",
      sort: (u) => u.name,
      cell: (u) => <Person name={u.name} detail={u.email} />,
    },
    { key: "emp", header: "Employee", priority: 3, cell: (u) => (u.employeeId ? <RecordLink id={u.employeeId} /> : <span className="t-muted usr-small">Not linked</span>) },
    {
      key: "role",
      header: "Role",
      sort: (u) => roleName(u.roleId),
      cell: (u) => (
        <div className="cell-primary">
          <button className="usr-role-link" onClick={(e) => { e.stopPropagation(); onOpenRole(u.roleId); }}>
            {roleName(u.roleId)}
          </button>
          {u.note && <span className="cell-sub">{u.note}</span>}
        </div>
      ),
    },
    {
      key: "mfa",
      header: "MFA",
      sort: (u) => u.mfa,
      cell: (u) =>
        PRIVILEGED.includes(u.roleId) ? (
          u.mfa === "On" ? <Tag tone="ok" icon={KeyRound}>MFA on</Tag> : <Tag tone="risk" icon={ShieldAlert}>MFA required</Tag>
        ) : (
          <span className="t-muted usr-small">Not required</span>
        ),
    },
    { key: "last", header: "Last active", priority: 2, sort: (u) => u.lastActive ?? "", cell: (u) => <span className="usr-small usr-nowrap">{u.lastActive ? ago(u.lastActive) : "Never signed in"}</span> },
    { key: "status", header: "Status", sort: (u) => u.status, cell: (u) => <Status tone={u.status === "Deactivated" ? "neutral" : u.status === "Invited" ? "info" : undefined}>{u.status}</Status> },
    {
      key: "act",
      header: "",
      cell: (u) =>
        u.status !== "Deactivated" && u.id !== selfId ? (
          <Button size="sm" variant="ghost" icon={UserX} onClick={(e) => { e.stopPropagation(); setDeactivating(u); }}>
            Deactivate
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="stack">
      {mfaGap.length > 0 && (
        <Callout tone="warn" title={`Privileged-account review: ${mfaGap.length} before the November review closes`}>
          {mfaGap.map((u) => `${u.name} (${roleName(u.roleId)}) has not enrolled MFA`).join("; ")}.
        </Callout>
      )}
      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search name, email, role" width={260} />}>
        <FilterChips
          label="Users"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: users.length },
            { value: "privileged", label: "Privileged", count: users.filter((u) => PRIVILEGED.includes(u.roleId)).length },
            { value: "Invited", label: "Invited", count: users.filter((u) => u.status === "Invited").length },
            { value: "Deactivated", label: "Deactivated", count: users.filter((u) => u.status === "Deactivated").length },
          ]}
        />
      </Toolbar>
      <DataTable rows={visible} columns={columns} caption="Users" />
      <DeactivateDialog user={deactivating} onOpenChange={(o) => !o && setDeactivating(null)} />
    </div>
  );
}

/** USR — deactivate an account. The command refuses the last admin and your own account. */
function DeactivateDialog({ user, onOpenChange }: { user: UserAccount | null; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(deactivateUser);
  useEffect(() => {
    if (user) m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async () => {
    if (!user) return;
    const r = await m.run(user.id);
    if (!r) return;
    onOpenChange(false);
    toast({ title: `${user.name} deactivated`, body: "The account can no longer sign in. The change is in the audit log.", tone: "ok" });
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={onOpenChange}
      size="sm"
      icon={UserX}
      tone="warn"
      title="Deactivate account"
      description={user ? `${user.name} (${user.email}) will lose access immediately. Their records and audit history stay.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Deactivate
          </Button>
        </>
      }
    >
      {m.error && (
        <Callout tone="risk" title="The account wasn't deactivated">
          {m.error}
        </Callout>
      )}
    </Dialog>
  );
}
