import { BadgeCheck, Lock, Mail, Phone } from "lucide-react";
import { api } from "../../api/client";
import { date, daysFrom, relativeDay } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { Callout, Drawer, EmptyState, KeyValues, LoadingRows, Person, Progress, RecordLink, Status, Tag, cx } from "../../ds/components";
import { certState, utilTone } from "./shared";

export function PersonDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const people = useQuery(api.people);
  const leave = useQuery(api.leaveRequests);
  const list = people.data ?? [];
  const p = list.find((x) => x.id === id);

  const chain: { id: string; name?: string; role?: string }[] = [];
  let cur = p?.reportsTo;
  while (cur && chain.length < 4) {
    const m = list.find((x) => x.id === cur);
    chain.push({ id: cur, name: m?.name, role: m?.role });
    cur = m?.reportsTo;
  }
  const reports = list.filter((x) => x.reportsTo === id);
  const myLeave = (leave.data ?? []).filter((l) => l.personId === id && l.status !== "Rejected");

  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      width={580}
      status={p ? <Status>{p.status}</Status> : undefined}
      title={p?.name ?? (people.loading ? "Loading person…" : "Person not found")}
      subtitle={p ? `${p.role} · ${p.department} · ${p.location}` : undefined}
    >
      {!p ? (
        people.loading ? <LoadingRows rows={6} columns={2} /> : <EmptyState title={`${id} isn't in the demo directory`}>Former employees keep their id; search by name to find their exit record.</EmptyState>
      ) : (
        <>
          <div className="hr-contact">
            <a href={`mailto:${p.email}`}>
              <Mail size={14} aria-hidden /> {p.email}
            </a>
            <span>
              <Phone size={14} aria-hidden /> <span className="t-num">{p.phone}</span>
            </span>
          </div>

          {p.assignment ? (
            <section className="hr-deploy">
              <span className="hr-label">Current deployment</span>
              <div className="row row-between">
                <RecordLink id={p.assignment} />
                <span className="hr-small">
                  until {p.assignmentUntil ? `${date(p.assignmentUntil)} · ${relativeDay(p.assignmentUntil).toLowerCase()}` : "open-ended"}
                </span>
              </div>
            </section>
          ) : (
            <section className="hr-deploy is-free">
              <span className="hr-label">Current deployment</span>
              <span className="hr-small">{p.status === "On leave" ? "On leave — not deployable" : "Available for allocation"}</span>
            </section>
          )}

          <KeyValues
            columns={2}
            items={[
              { label: "Employment", value: <Tag tone={p.employment === "Contract" ? "violet" : p.employment === "Probation" ? "warn" : "neutral"}>{p.employment}</Tag> },
              { label: "Joined", value: date(p.joined) },
              { label: "Utilisation, November", value: <span className="hr-util"><Progress value={p.utilisation} tone={utilTone(p.utilisation)} size="sm" /> <span className="t-num">{p.utilisation}%</span></span> },
              { label: "Leave booked", value: myLeave.length ? myLeave.map((l) => `${date(l.from, true)}${l.days > 1 ? `–${date(l.to, true)}` : ""} (${l.status.toLowerCase()})`).join(", ") : "None this month" },
            ]}
          />

          <section className="stack-sm stack">
            <h3 className="hr-h">Skills</h3>
            <div className="row" style={{ gap: 6 }}>
              {p.skills.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          </section>

          <section className="stack-sm stack">
            <h3 className="hr-h">Certifications</h3>
            {p.certifications.length === 0 ? (
              <p className="hr-small t-muted">None recorded. Add site-compliance certificates so assignment checks can use them (HR-013).</p>
            ) : (
              <ul className="divider-list">
                {p.certifications.map((c) => {
                  const s = certState(c.expires);
                  return (
                    <li key={c.name} className="list-row">
                      <BadgeCheck size={16} aria-hidden className={cx("hr-cert-icon", `tone-${s.tone}`)} />
                      <div className="list-row-main">
                        <div className="list-row-title">{c.name}</div>
                        <div className="list-row-sub">Expires {date(c.expires)}</div>
                      </div>
                      {s.tone !== "neutral" ? <Tag tone={s.tone}>{s.label}</Tag> : <span className="hr-small t-muted">{daysFrom(c.expires)} days left</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {p.certifications.some((c) => daysFrom(c.expires) <= 30) && p.assignmentUntil && p.certifications.some((c) => c.expires <= p.assignmentUntil!) && (
              <Callout tone="warn" title="Certificate lapses during the current deployment">
                Renew before {date(p.certifications.find((c) => daysFrom(c.expires) <= 30)!.expires, true)} or the site may refuse entry. Reminder sent to {p.name.split(" ")[0]} and the reporting manager (HR-015).
              </Callout>
            )}
          </section>

          <section className="stack-sm stack">
            <h3 className="hr-h">Reporting line</h3>
            <ol className="hr-chain">
              {chain
                .slice()
                .reverse()
                .map((c) => (
                  <li key={c.id}>{c.name ? <><RecordLink id={c.id}>{c.name}</RecordLink> <span className="hr-small t-muted">· {c.role}</span></> : <span className="hr-small t-muted"><span className="mono">{c.id}</span> · leadership, outside this directory</span>}</li>
                ))}
              <li className="is-self">
                <Person name={p.name} detail={p.role} size="xs" />
              </li>
            </ol>
            {reports.length > 0 && (
              <p className="hr-small">
                Direct reports:{" "}
                {reports.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ", "}
                    <RecordLink id={r.id}>{r.name}</RecordLink>
                  </span>
                ))}
              </p>
            )}
          </section>

          <p className="hr-restricted">
            <Lock size={13} aria-hidden /> Salary, bank and identity documents are visible to the HR &amp; payroll role only. Projects see this person's deployment, never their pay.
          </p>
        </>
      )}
    </Drawer>
  );
}
