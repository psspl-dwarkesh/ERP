import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Siren, Wrench, FolderKanban } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "../../api/client";
import { ago, date } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { canAccess, useSession } from "../../api/session";
import type { Approval, ModuleKey } from "../../api/types";
import { ModuleFrame } from "../../app/Shell";
import { ApprovalDialog, FLAGSHIP_THREAD, RecordThread, SlaClock } from "../../app/patterns";
import { href } from "../../app/router";
import { Avatar, Button, ButtonLink, Card, CardHeader, EmptyState, LoadingRows, PageHeader, RecordLink, Status } from "../../ds/components";
import { attention } from "../projects/util";
import "./dashboard.css";

const none = async () => [] as never[];

/** Context for the flagship records, so a decision card reads as a sentence, not a code. */
const WHY: Record<string, string> = {
  "PR-0084": "Shortage on BOM-042 rev C is holding WO-0187 at wiring. Best quote ships in 7 days.",
  "ITM-0137": "GRN-0073 failed the incoming check. PRJ-0264 needs them for the loop test on 10 Nov.",
};

export default function DashboardPage() {
  const me = api.currentUser();
  // Only ask for what this role may see; everything else simply doesn't appear.
  const user = useSession().user;
  const can = (m: ModuleKey) => canAccess(user, m);
  // Business approvals only reach roles that can actually approve something; a users-only admin sees none.
  const canApprove = (["projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll"] as ModuleKey[]).some((m) => canAccess(user, m, "approve"));
  const approvals = useQuery(api.approvals);
  const tickets = useQuery(can("assets") ? api.tickets : none);
  const items = useQuery(can("inventory") ? api.items : none);
  const projects = useQuery(can("projects") ? api.projects : none);
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);

  const pending = (approvals.data ?? []).filter((a) => a.status === "Pending");
  const decided = (approvals.data ?? []).filter((a) => a.status !== "Pending");
  const openTickets = (tickets.data ?? []).filter((t) => t.status !== "Resolved" && t.status !== "Closed").sort((a, b) => a.slaDue.localeCompare(b.slaDue));
  const p1 = openTickets.find((t) => t.priority === "P1" && (t.status === "New" || t.status === "Assigned"));
  const lead = canApprove ? (pending.find((a) => a.reference === "PR-0084") ?? pending[0]) : undefined;
  const held = (items.data ?? []).filter((i) => i.quarantined > 0);
  const flagged = (projects.data ?? []).map((p) => ({ p, a: attention(p) })).filter((x) => x.a);

  const loading = approvals.loading || tickets.loading || items.loading;
  const focusCount = (p1 ? 1 : 0) + (lead ? 1 : 0) + (held.length ? 1 : 0);
  const first = me.name.split(" ")[0];

  return (
    <ModuleFrame>
      <PageHeader
        title={`Good morning, ${first}`}
        description={loading ? "Checking what needs you…" : focusCount ? `${focusCount} ${focusCount === 1 ? "thing needs" : "things need"} you today.` : "Nothing needs a decision from you right now."}
        meta={
          <span className="row" style={{ gap: 6 }}>
            <CalendarDays size={14} aria-hidden /> Tuesday, 03 Nov 2026 · 09:40 IST
          </span>
        }
      />

      {/* ---- Needs you now ---- */}
      {loading ? (
        <LoadingRows rows={2} columns={3} />
      ) : focusCount > 0 ? (
        <section className="focus-grid" aria-label="Needs you now">
          {p1 && (
            <FocusCard
              tone="risk"
              icon={Siren}
              refId={p1.id}
              kicker={<SlaClock due={p1.slaDue} />}
              title={`P1 breakdown at ${p1.customer}`}
              body={`${p1.title}. ${p1.contractId ? `Covered by ${p1.contractId}, no charge.` : "No contract: chargeable visit."}`}
              foot={p1.assignee ? <><Avatar name={p1.assignee} size="xs" /> {p1.assignee} · {p1.status.toLowerCase()}</> : "Unassigned"}
              action={<ButtonLink to={href.record(p1.id)} variant="primary" size="sm" iconRight={ArrowRight}>Open ticket</ButtonLink>}
            />
          )}
          {lead && (
            <FocusCard
              tone="accent"
              icon={ClipboardCheck}
              refId={lead.reference}
              kicker={<span className="focus-kicker-text">Your approval · {ago(lead.submitted)}</span>}
              title={`${lead.title} · ${lead.value}`}
              body={WHY[lead.reference] ?? lead.evidence.join(" · ")}
              foot={<><Avatar name={lead.maker} size="xs" /> {lead.maker} · {lead.level.split(" · ")[0]}</>}
              action={<Button variant="primary" size="sm" onClick={() => setOpenApproval(lead)}>Review & decide</Button>}
            />
          )}
          {held.length > 0 && (
            <FocusCard
              tone="warn"
              icon={AlertTriangle}
              refId={held[0].id}
              kicker={<span className="focus-kicker-text">On QC hold</span>}
              title={`${held[0].quarantined} ${held[0].name.split(" ·")[0].toLowerCase()}s can't be issued`}
              body={WHY[held[0].id] ?? `${held[0].warehouse} · bin ${held[0].bin}. Held stock never counts as free.`}
              foot={`${held[0].warehouse} · bin ${held[0].bin}`}
              action={<ButtonLink to={href.record(held[0].id)} size="sm" iconRight={ArrowRight}>Record QC decision</ButtonLink>}
            />
          )}
        </section>
      ) : (
        <Card>
          <EmptyState icon={CheckCircle2} title="You're clear">Approvals, urgent tickets and held stock for your role will show here as they arrive.</EmptyState>
        </Card>
      )}

      {(canApprove || can("assets") || can("projects")) && (
      <div className="grid grid-main-aside dash-grid">
        {/* ---- Approvals ---- */}
        {canApprove && (
        <Card padded={false}>
          <div className="card-padded dash-card-head">
            <CardHeader title="Approvals" description={pending.length ? `${pending.length} waiting${decided.length ? ` · ${decided.length} decided` : ""}` : "Nothing waiting"} />
          </div>
          {approvals.loading ? (
            <LoadingRows rows={4} columns={3} />
          ) : pending.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No approvals waiting">Requests routed to you appear here with their evidence.</EmptyState>
          ) : (
            <ul className="divider-list dash-list">
              {pending.map((a) => (
                <li key={a.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">{a.title}</div>
                    <div className="list-row-sub">
                      <RecordLink id={a.reference} quiet /> · {a.type} · {a.maker} · {ago(a.submitted)}
                    </div>
                  </div>
                  <span className="cell-num dash-value">{a.value}</span>
                  <Button size="sm" onClick={() => setOpenApproval(a)}>
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}

        <div className="stack" style={{ gap: "var(--space-5)" }}>
          {/* ---- Service by deadline ---- */}
          {can("assets") && (
            <Card padded={false}>
              <div className="card-padded dash-card-head">
                <CardHeader icon={Wrench} title="Service today" description={`${openTickets.length} open, by response deadline`} actions={<ButtonLink to={href.module("assets", "tickets")} variant="ghost" size="sm">Service desk</ButtonLink>} />
              </div>
              {tickets.loading ? (
                <LoadingRows rows={3} columns={2} />
              ) : openTickets.length === 0 ? (
                <EmptyState icon={Wrench} title="No open tickets" />
              ) : (
                <ul className="divider-list dash-list">
                  {openTickets.slice(0, 4).map((t) => (
                    <li key={t.id}>
                      <a href={href.record(t.id)} className="list-row field-row">
                        <span className={`prio prio-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <div className="list-row-main">
                          <div className="list-row-title truncate">{t.title}</div>
                          <div className="list-row-sub truncate">
                            {t.customer} · {t.assignee ?? "Unassigned"}
                          </div>
                        </div>
                        <SlaClock due={t.slaDue} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* ---- Projects off plan ---- */}
          {can("projects") && (
            <Card padded={false}>
              <div className="card-padded dash-card-head">
                <CardHeader icon={FolderKanban} title="Projects off plan" description={flagged.length ? `${flagged.length} of ${projects.data?.length ?? 0} live projects` : "All projects on plan"} actions={<ButtonLink to={href.module("projects")} variant="ghost" size="sm">All projects</ButtonLink>} />
              </div>
              {projects.loading ? (
                <LoadingRows rows={2} columns={2} />
              ) : flagged.length === 0 ? null : (
                <ul className="divider-list dash-list">
                  {flagged.map(({ p, a }) => (
                    <li key={p.id}>
                      <a href={href.record(p.id)} className="list-row field-row">
                        <div className="list-row-main">
                          <div className="list-row-title truncate">{a!.title}</div>
                          <div className="list-row-sub truncate">
                            <span className="mono">{p.id}</span> · {p.customer} · due {date(p.due, true)}
                          </div>
                        </div>
                        <Status size="sm">{p.status}</Status>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
      )}

      {/* ---- The flagship job, end to end ---- */}
      {can("projects") && (
        <Card>
          <CardHeader title="PRJ-0264 · one job, every handoff" description="From the customer order to this morning's service ticket. Each card opens its record." actions={<ButtonLink to={href.record("PRJ-0264")} variant="ghost" size="sm" iconRight={ArrowRight}>Open project</ButtonLink>} />
          <RecordThread nodes={FLAGSHIP_THREAD.map((n) => (n.id === "PR-0084" && approvals.data ? { ...n, status: approvals.data.find((a) => a.reference === "PR-0084")?.status === "Approved" ? "Approved" : n.status } : n))} />
        </Card>
      )}

      <ApprovalDialog approval={openApproval} open={!!openApproval} onOpenChange={(o) => !o && setOpenApproval(null)} />
    </ModuleFrame>
  );
}

function FocusCard({ tone, icon: Icon, kicker, title, body, refId, action, foot }: { tone: "risk" | "accent" | "warn"; icon: typeof Siren; kicker: ReactNode; title: string; body: string; refId: string; action: ReactNode; foot: ReactNode }) {
  return (
    <article className={`focus-card tone-${tone}`}>
      <div className="focus-top">
        <span className="focus-icon">
          <Icon size={18} aria-hidden />
        </span>
        <RecordLink id={refId} />
        <span className="focus-kicker">{kicker}</span>
      </div>
      <h3 className="focus-title">{title}</h3>
      <p className="focus-body">{body}</p>
      <div className="focus-foot">
        <span className="focus-who row">{foot}</span>
        {action}
      </div>
    </article>
  );
}
