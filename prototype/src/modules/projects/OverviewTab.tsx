import { CheckCircle2, Circle, CircleDot, FilePen, Flag, OctagonAlert, ShieldAlert, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval, Milestone, Project } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { href } from "../../app/router";
import { AvatarStack, Button, Card, CardHeader, EmptyState, KeyValues, Person, RecordLink, Status, Stepper, Tag, Tooltip, cx } from "../../ds/components";
import { CHANGE_REQUEST_TYPE } from "./commands";
import { impactTone, margin, milestoneTone, milestoneVariance } from "./util";

const stepStatus = (m: Milestone) => (m.status === "Done" ? "Done" : m.status === "In progress" ? "Active" : m.status === "Late" || m.status === "Blocked" ? "Blocked" : "Waiting") as "Done" | "Active" | "Blocked" | "Waiting";

export function OverviewTab({ p, onRaiseChange }: { p: Project; onRaiseChange: () => void }) {
  const people = useQuery(api.people);
  const approvals = useQuery(api.approvals);
  const assets = useQuery(api.assets);
  const [active, setActive] = useState<string | undefined>(() => p.milestones.find((m) => m.status !== "Done")?.id);
  const [review, setReview] = useState<Approval | null>(null);

  const team = (people.data ?? []).filter((x) => p.team.includes(x.id));
  const changes = (approvals.data ?? []).filter((x) => x.type === CHANGE_REQUEST_TYPE && x.reference === p.id);
  const asset = (assets.data ?? []).find((x) => x.id === p.installedAsset || x.projectId === p.id);
  const siteAsset = !asset ? (assets.data ?? []).find((x) => x.customer === p.customer && x.site === p.site) : undefined;

  return (
    <div className="grid grid-main-aside">
      <div className="stack" style={{ gap: "var(--space-5)" }}>
        <Card>
          <CardHeader icon={Flag} title="Milestones & gates" description="Contractual milestones with the technical hold point each one closes. Select a step for detail." />
          <Stepper
            active={active}
            onSelect={setActive}
            steps={p.milestones.map((m) => ({ key: m.id, label: m.gate ?? m.name.split(" ").slice(0, 2).join(" ").replace(/[&·—]$/, "").trim(), status: stepStatus(m), detail: date(m.done ?? m.due, true) }))}
          />
          <ul className="prj-ms-list" aria-label="Milestones">
            {p.milestones.map((m) => {
              const v = milestoneVariance(m);
              return (
                <li key={m.id} className={cx("prj-ms-row", active === m.id && "is-active")}>
                  <span className={cx("prj-ms-dot", `tone-${milestoneTone(m)}`)} aria-hidden />
                  <div className="prj-ms-main">
                    <div className="prj-ms-title">
                      <span className="mono t-muted">{m.id}</span> {m.name}
                      {m.gate && <Tag tone="info">{m.gate}</Tag>}
                    </div>
                    <div className="prj-ms-sub">
                      Planned {date(m.due, true)}
                      {m.done && <> · done {date(m.done, true)}</>} · <span className={`prj-t-${v.tone}`}>{v.text}</span>
                    </div>
                  </div>
                  <span className="prj-ms-value cell-num">{m.billable ? inr(m.billable) : <span className="t-muted">—</span>}</span>
                  <Status size="sm">{m.status}</Status>
                </li>
              );
            })}
          </ul>
          <p className="prj-card-note">Billable column: value invoiced when the milestone is accepted. Gates without a value release the next billable step.</p>
        </Card>

        <BudgetPanel p={p} />

        <Card>
          <CardHeader
            icon={ShieldAlert}
            title="Risks"
            description={p.risks.length ? `${p.risks.length} open · reviewed in the weekly site meeting` : "Nothing open"}
          />
          {p.risks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No open risks on this project">
              Risks raised in site reviews appear here with an owner, impact and mitigation date.
            </EmptyState>
          ) : (
            <ul className="divider-list">
              {p.risks.map((r) => (
                <li key={r.id} className="prj-risk">
                  <div className="prj-risk-head">
                    <Status tone={impactTone(r.impact)} size="sm">{`${r.impact} impact`}</Status>
                    <span className="prj-risk-title">{r.title}</span>
                  </div>
                  <p className="prj-risk-mitigation">
                    <b>Mitigation</b> {r.mitigation}
                  </p>
                  <Person name={r.owner} size="xs" detail="Owner" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={FilePen}
            title="Change requests"
            description="Scope, schedule and cost variations. Nothing changes the budget or dates until it is approved."
            actions={
              <Button size="sm" icon={FilePen} onClick={onRaiseChange} disabled={p.status === "Closed"}>
                Raise
              </Button>
            }
          />
          {changes.length === 0 ? (
            <EmptyState icon={FilePen} title="No change requests raised">
              {p.status === "At risk" ? "If the delivery slip moves SAT, raise a schedule extension so the customer sees it before 18 Nov." : "Variations raised here go to the commercial head and show in the approvals inbox."}
            </EmptyState>
          ) : (
            <ul className="divider-list">
              {changes.map((c) => (
                <li key={c.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">{c.title}</div>
                    <div className="list-row-sub">
                      <span className="mono">{c.id}</span> · {c.value} · {c.maker} · {ago(c.submitted)}
                    </div>
                  </div>
                  {c.status === "Pending" ? (
                    <Button size="sm" onClick={() => setReview(c)}>
                      Review
                    </Button>
                  ) : (
                    <Status size="sm">{c.status}</Status>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="stack" style={{ gap: "var(--space-5)" }}>
        <Card>
          <CardHeader icon={Users} title="Team" description={`${team.length || p.team.length} allocated`} actions={team.length ? <AvatarStack names={team.map((t) => t.name)} /> : undefined} />
          {team.length === 0 ? (
            <EmptyState icon={Users} title="No one allocated">
              Allocate engineers from People; their deployment dates show here.
            </EmptyState>
          ) : (
            <ul className="divider-list">
              {team.map((t) => (
                <li key={t.id}>
                  <a className="list-row prj-team-row" href={href.record(t.id)}>
                    <Person name={t.name} detail={t.role} />
                    <span className="prj-team-meta">
                      <span className={cx("cell-num", t.utilisation > 90 && "prj-t-risk")}>{t.utilisation}%</span>
                      <span className="prj-team-where">{t.assignment === p.id ? (t.assignmentUntil ? `here until ${date(t.assignmentUntil, true)}` : "deployed here") : t.assignment ? `deployed on ${t.assignment}` : t.status.toLowerCase()}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon={CheckCircle2} title="Gates & handover" description="Hold points that must pass before the customer accepts." />
          <ul className="prj-gates">
            {p.milestones
              .filter((m) => m.gate)
              .map((m) => {
                const Icon = m.status === "Done" ? CheckCircle2 : m.status === "Blocked" || m.status === "Late" ? OctagonAlert : m.status === "In progress" ? CircleDot : Circle;
                return (
                  <li key={m.id} className={cx("prj-gate", `tone-${milestoneTone(m)}`)}>
                    <Icon size={16} aria-hidden />
                    <span className="prj-gate-name">{m.gate}</span>
                    <span className="prj-gate-date cell-num">{date(m.done ?? m.due, true)}</span>
                    <Status size="sm">{m.status}</Status>
                  </li>
                );
              })}
          </ul>
          <div className="prj-handover">
            <p className="prj-handover-title">Installed base</p>
            {asset ? (
              <p>
                <RecordLink id={asset.id}>{asset.name}</RecordLink>
                <br />
                {p.installedAsset === asset.id
                  ? `This project upgrades an asset the customer already owns${asset.contractId ? `, covered by ${asset.contractId}` : ""}. It stays one asset record; the project is linked to it, not merged.`
                  : "Created from this project at handover."}
              </p>
            ) : ["CSV / Manufacturing IT", "O&M", "AMC", "Calibration"].includes(p.vertical) ? (
              <p>Service engagement — no equipment is handed over, so no installed asset is created.</p>
            ) : (
              <p>
                SAT acceptance will add this {p.vertical === "Panel assembly" ? "panel" : "system"} to {p.customer}'s installed base as a customer-owned asset{siteAsset ? <>, alongside <RecordLink id={siteAsset.id} /> at this site</> : ""}. Warranty starts from the SAT date on the handover record.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Contract & references" />
          <KeyValues
            columns={2}
            items={[
              { label: "Customer", value: <RecordLink id={p.customerId}>{p.customer}</RecordLink> },
              { label: "Site", value: p.site },
              { label: "Sales order", value: p.salesOrder ? <RecordLink id={p.salesOrder} /> : <span className="t-muted">Not linked</span> },
              { label: "Engineering BOM", value: p.bom ? <RecordLink id={p.bom} /> : <span className="t-muted">None</span> },
              { label: "Work order", value: p.workOrder ? <RecordLink id={p.workOrder} /> : <span className="t-muted">None</span> },
              { label: "Vertical", value: p.vertical },
              { label: "Start", value: date(p.start) },
              { label: "Contractual due", value: date(p.due) },
            ]}
          />
          {p.salesOrder && <p className="prj-card-note">Customer, site, vertical and value came from {p.salesOrder} and can only change through a change request.</p>}
        </Card>
      </div>

      <ApprovalDialog approval={review} open={!!review} onOpenChange={(o) => !o && setReview(null)} />
    </div>
  );
}

function BudgetPanel({ p }: { p: Project }) {
  const m = margin(p);
  const max = Math.max(p.contractValue, p.committed, p.budget);
  const rows = [
    { key: "contract", label: "Contract value", source: "Sales order value incl. approved variations", value: p.contractValue },
    { key: "budget", label: "Cost budget", source: "Approved at kick-off", value: p.budget },
    { key: "committed", label: "Committed", source: "Issued POs + approved requisitions", value: p.committed },
    { key: "incurred", label: "Incurred", source: "Goods receipts + approved timesheets + claims", value: p.incurred },
    { key: "billed", label: "Billed", source: "Posted billing advice", value: p.billed },
  ];
  const budgetAt = (p.budget / max) * 100;
  return (
    <Card>
      <CardHeader icon={Wallet} title="Budget & margin" description="Each figure states its cost source. Labour arrives as an aggregate from approved timesheets — no individual pay." />
      <div className="prj-budget">
        {rows.map((r) => (
          <div key={r.key} className="prj-budget-row">
            <div className="prj-budget-label">
              <span className="prj-budget-name">{r.label}</span>
              <span className="prj-budget-source">{r.source}</span>
            </div>
            <div className="prj-budget-track">
              <span className={`prj-budget-bar is-${r.key}`} style={{ width: `${(r.value / max) * 100}%` }} />
              {(r.key === "committed" || r.key === "incurred") && (
                <Tooltip content={`Budget ${inr(p.budget)}`}>
                  <i className="prj-budget-mark" style={{ left: `${budgetAt}%` }} tabIndex={0} aria-label={`Budget line at ${inr(p.budget)}`} />
                </Tooltip>
              )}
            </div>
            <span className="prj-budget-value cell-num">{inr(r.value)}</span>
          </div>
        ))}
      </div>
      <div className="prj-budget-summary">
        <div>
          <span className="prj-budget-k">Estimated margin</span>
          <span className={cx("prj-budget-v", m.pct < 10 && "prj-t-warn")}>
            {m.pct.toFixed(1)}% <small>{inr(m.value)}</small>
          </span>
        </div>
        <div>
          <span className="prj-budget-k">Headroom to budget</span>
          <span className={cx("prj-budget-v", m.headroom < 0 && "prj-t-risk")}>
            {inr(m.headroom)} <small>{Math.round((p.committed / p.budget) * 100)}% committed</small>
          </span>
        </div>
        <div>
          <span className="prj-budget-k">Billed vs incurred</span>
          <span className="prj-budget-v">
            {p.billed >= p.incurred ? "+" : ""}
            {inr(p.billed - p.incurred)} <small>{p.billed >= p.incurred ? "cash ahead of cost" : "cost ahead of billing"}</small>
          </span>
        </div>
      </div>
      <p className="prj-card-note">Estimated margin = contract value − the higher of budget and committed. Figures are illustrative; the cost source definitions are pending FRD sign-off.</p>
    </Card>
  );
}
