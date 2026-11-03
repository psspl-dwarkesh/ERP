import { Callout, LoadingRows, Tooltip, cx } from "../../ds/components";
import type { Role } from "../../api/types";
import { LEVELS, MATRIX_MODULES, PRIVILEGED, levelInfo, type Level } from "./data";

export function LevelBadge({ level }: { level: Level }) {
  const info = levelInfo(level);
  return <span className={cx("usr-level", `tone-${info.tone}`, level === "none" && "is-none")}>{info.short}</span>;
}

export function RolesMatrix({ roles, loading, onOpen, activeId }: { roles: Role[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  return (
    <div className="stack">
      <Callout tone="ok" title="Segregation of duties holds across all 8 roles">
        No role can both raise and approve the same document. System administrators manage access but have no business approvals and no salary visibility; payroll is edited by HR &amp; payroll and approved by the Finance owner.
      </Callout>

      <div className="usr-legend" aria-label="Permission levels">
        {LEVELS.map((l) => (
          <Tooltip key={l.key} content={l.explain}>
            <span className="usr-legend-item" tabIndex={0}>
              <LevelBadge level={l.key} /> {l.label}
            </span>
          </Tooltip>
        ))}
        <span className="usr-legend-note">Hover any cell for what the level allows</span>
      </div>

      {loading ? (
        <LoadingRows rows={8} columns={6} />
      ) : (
        <div className="table-wrap">
          <table className="table usr-matrix">
            <caption className="sr-only">Permission matrix: roles by module</caption>
            <thead>
              <tr>
                <th className="usr-matrix-role">Role</th>
                {MATRIX_MODULES.map((m) => (
                  <th key={m.key} className="usr-matrix-mod">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className={cx("is-clickable", activeId === r.id && "is-active")} tabIndex={0} onClick={() => onOpen(r.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(r.id)}>
                  <td className="usr-matrix-role">
                    <div className="cell-primary">
                      <span className="cell-title">{r.name}</span>
                      <span className="cell-sub">
                        <span className="mono">{r.id}</span> · {r.users} users{PRIVILEGED.includes(r.id) ? " · privileged" : ""}
                      </span>
                    </div>
                  </td>
                  {MATRIX_MODULES.map((m) => {
                    const level = (r.permissions[m.key] ?? "none") as Level;
                    return (
                      <td key={m.key} className="usr-matrix-cell">
                        <Tooltip content={<><b>{r.name} · {m.label}: {levelInfo(level).label}</b><br />{levelInfo(level).explain}</>}>
                          <span tabIndex={-1} className="usr-cell-hit">
                            <LevelBadge level={level} />
                          </span>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
