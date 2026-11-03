import { KeyRound, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { ago } from "../../api/format";
import type { Role } from "../../api/types";
import { Callout, DataTable, FilterChips, Person, RecordLink, SearchField, Status, Tag, Toolbar, type Column } from "../../ds/components";
import { PRIVILEGED, USERS, type AppUser } from "./data";

type Filter = "all" | "privileged" | AppUser["status"];

export function UsersList({ roles, onOpenRole }: { roles: Role[]; onOpenRole: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return USERS.filter((u) => (filter === "all" ? true : filter === "privileged" ? PRIVILEGED.includes(u.roleId) : u.status === filter) && (!t || `${u.name} ${u.email} ${roleName(u.roleId)}`.toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, roles]);

  const mfaGap = USERS.filter((u) => PRIVILEGED.includes(u.roleId) && u.mfa !== "On" && u.status !== "Deactivated");
  const stopgap = USERS.filter((u) => u.note?.startsWith("Stopgap"));

  const columns: Column<AppUser>[] = [
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
  ];

  return (
    <div className="stack">
      {(mfaGap.length > 0 || stopgap.length > 0) && (
        <Callout tone="warn" title="Privileged-account review: 2 items before the November review closes">
          {mfaGap.map((u) => `${u.name} (${u.roleId === "ROLE-07" ? "Finance owner" : u.roleId}) has not enrolled MFA`).join("; ")}
          {stopgap.length ? `; ${stopgap[0].name} works on a stopgap Project manager role because no Purchase role exists.` : "."}
        </Callout>
      )}
      <Toolbar end={<SearchField value={q} onChange={setQ} placeholder="Search name, email, role" width={260} />}>
        <FilterChips
          label="Users"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: USERS.length },
            { value: "privileged", label: "Privileged", count: USERS.filter((u) => PRIVILEGED.includes(u.roleId)).length },
            { value: "Invited", label: "Invited", count: USERS.filter((u) => u.status === "Invited").length },
            { value: "Deactivated", label: "Deactivated", count: USERS.filter((u) => u.status === "Deactivated").length },
          ]}
        />
      </Toolbar>
      <DataTable rows={visible} columns={columns} caption="Users" />
    </div>
  );
}
