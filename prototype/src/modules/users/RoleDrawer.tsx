import { Lock } from "lucide-react";
import type { Role } from "../../api/types";
import { Callout, Drawer, EmptyState, KeyValues, LoadingRows, Person, Tag } from "../../ds/components";
import { MATRIX_MODULES, PRIVILEGED, RULES, USERS, levelInfo, type Level } from "./data";
import { LevelBadge } from "./RolesMatrix";

export function RoleDrawer({ id, roles, loading, onClose }: { id?: string; roles: Role[]; loading: boolean; onClose: () => void }) {
  const r = roles.find((x) => x.id === id);
  const members = USERS.filter((u) => u.roleId === id);
  const rules = r ? RULES.filter((x) => r.name.toLowerCase().includes(x.approver.toLowerCase()) || x.approver.toLowerCase().includes(r.name.toLowerCase())) : [];
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      width={560}
      status={r && PRIVILEGED.includes(r.id) ? <Tag tone="warn" icon={Lock}>Privileged · MFA required</Tag> : undefined}
      title={r?.name ?? (loading ? "Loading role…" : "Role not found")}
      subtitle={r?.description}
    >
      {!r ? (
        loading ? <LoadingRows rows={6} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`} />
      ) : (
        <>
          <KeyValues
            columns={2}
            items={[
              { label: "Users", value: `${r.users} (${members.length} shown in demo)` },
              { label: "Effective", value: "From 01 Apr 2026 · no end date" },
              { label: "Data scope", value: r.id === "ROLE-02" ? "Own projects and their sites" : r.id === "ROLE-03" ? "Assigned warehouses" : "Company-wide" },
              { label: "Restricted fields", value: r.id === "ROLE-06" ? "Salary, bank, identity — visible" : "Salary, bank, identity — hidden" },
            ]}
          />
          {r.id === "ROLE-08" && (
            <Callout tone="info" title="Administrators don't get business rights">
              This role manages users, roles and integrations. It has no approvals and cannot see salary data, even though it can change who can.
            </Callout>
          )}
          <section className="stack-sm stack">
            <h3 className="usr-h">Permissions</h3>
            <ul className="divider-list">
              {MATRIX_MODULES.map((m) => {
                const level = (r.permissions[m.key] ?? "none") as Level;
                return (
                  <li key={m.key} className="list-row">
                    <span className="usr-perm-mod">{m.label}</span>
                    <div className="list-row-main list-row-sub">{levelInfo(level).explain}</div>
                    <LevelBadge level={level} />
                  </li>
                );
              })}
            </ul>
          </section>
          {rules.length > 0 && (
            <section className="stack-sm stack">
              <h3 className="usr-h">Approval authority</h3>
              <ul className="divider-list">
                {rules.map((x) => (
                  <li key={x.id} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">{x.document}</div>
                      <div className="list-row-sub">
                        {x.when} · {x.sod}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {members.length > 0 && (
            <section className="stack-sm stack">
              <h3 className="usr-h">People with this role</h3>
              <div className="usr-members">
                {members.map((u) => (
                  <Person key={u.id} name={u.name} detail={u.status === "Active" ? u.email : u.status} size="xs" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Drawer>
  );
}
