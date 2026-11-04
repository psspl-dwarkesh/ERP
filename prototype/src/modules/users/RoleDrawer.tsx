import { PenLine, Lock } from "lucide-react";
import { useState } from "react";
import { useMutation } from "../../api/hooks";
import type { Role, UserAccount } from "../../api/types";
import { Button, Callout, Dialog, Drawer, EmptyState, Field, KeyValues, LoadingRows, Person, Select, Tag, useToast } from "../../ds/components";
import { setPermission } from "./commands";
import { LEVELS, MATRIX_MODULES, PRIVILEGED, RULES, levelInfo, type Level } from "./data";
import { LevelBadge } from "./RolesMatrix";

export function RoleDrawer({ id, roles, users, loading, onClose }: { id?: string; roles: Role[]; users: UserAccount[]; loading: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const r = roles.find((x) => x.id === id);
  const members = users.filter((u) => u.roleId === id);
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
      footer={r ? <><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="secondary" icon={PenLine} onClick={() => setEditing(true)}>Edit permissions</Button></> : undefined}
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
          <EditPermissionsDialog role={r} open={editing} onOpenChange={setEditing} />
        </>
      )}
    </Drawer>
  );
}

/** USR — change a role's access per module. Each change is audited; the last Users admin can't be removed. */
function EditPermissionsDialog({ role, open, onOpenChange }: { role: Role; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const m = useMutation(setPermission);

  const change = async (module: (typeof MATRIX_MODULES)[number], level: Level) => {
    const r = await m.run(role.id, module.key, level);
    if (!r) return;
    toast({ title: `${role.name}: ${module.label} → ${levelInfo(level).label}`, body: "Access updated and recorded in the audit log.", tone: "ok" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={PenLine}
      title={`Edit permissions · ${role.name}`}
      description="Set what this role can do in each module. Changes apply immediately and are audited; the last Users & Access admin can't be removed."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="stack">
        {m.error && (
          <Callout tone="risk" title="That change wasn't made">
            {m.error}
          </Callout>
        )}
        <ul className="divider-list">
          {MATRIX_MODULES.map((mod) => {
            const level = (role.permissions[mod.key] ?? "none") as Level;
            return (
              <li key={mod.key} className="list-row">
                <Field label={mod.label} htmlFor={`perm-${mod.key}`}>
                  <Select
                    id={`perm-${mod.key}`}
                    label={`${mod.label} access`}
                    size="sm"
                    value={level}
                    onChange={(v) => change(mod, v as Level)}
                    options={LEVELS.map((l) => ({ value: l.key, label: l.label, detail: l.explain }))}
                  />
                </Field>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
