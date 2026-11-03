import { MoreHorizontal, Trophy } from "lucide-react";
import { inr } from "../../api/format";
import type { Opportunity, OpportunityStage } from "../../api/types";
import { Avatar, Menu, Tag, Tooltip, cx, useToast } from "../../ds/components";
import { NextAction, OPEN_STAGES, VERTICAL_SHORT, moveItems, weighted } from "./shared";

type Column = { key: string; label: string; stages: OpportunityStage[]; hint: string };

const COLUMNS: Column[] = [
  ...OPEN_STAGES.map((s) => ({
    key: s,
    label: s,
    stages: [s],
    hint:
      s === "Lead"
        ? "Enquiry captured, not yet qualified (10–20%)"
        : s === "Qualified"
          ? "Budget, scope and decision date confirmed (30–40%)"
          : s === "Proposal"
            ? "Technical and commercial offer sent (50–60%)"
            : "Terms under negotiation (70–80%)",
  })),
  { key: "closed", label: "Won / Lost", stages: ["Won", "Lost"], hint: "Closed this year. Won deals hand over to Sales." },
];

export function PipelineBoard({ rows, onOpen, activeId }: { rows: Opportunity[]; onOpen: (id: string) => void; activeId?: string }) {
  const toast = useToast();
  return (
    <div className="crm-board-scroll">
      <div className="crm-board" role="list" aria-label="Pipeline by stage">
        {COLUMNS.map((col) => {
          const cards = rows.filter((o) => col.stages.includes(o.stage)).sort((a, b) => b.value - a.value);
          const total = cards.reduce((a, o) => a + (o.stage === "Lost" ? 0 : o.value), 0);
          const w = cards.reduce((a, o) => a + weighted(o), 0);
          const closed = col.key === "closed";
          return (
            <section key={col.key} className={cx("crm-col", closed && "is-closed")} role="listitem" aria-label={`${col.label}: ${cards.length} opportunities`}>
              <header className="crm-col-head">
                <div className="crm-col-title">
                  <Tooltip content={col.hint}>
                    <h3 tabIndex={0}>{col.label}</h3>
                  </Tooltip>
                  <span className="crm-col-count t-num">{cards.length}</span>
                </div>
                <div className="crm-col-sums t-num">
                  <span>
                    <b>{inr(total)}</b> {closed ? "won" : "total"}
                  </span>
                  {!closed && <span>{inr(w)} weighted</span>}
                </div>
              </header>
              <div className="crm-col-body">
                {cards.length === 0 && <p className="crm-col-empty">No opportunities at this stage</p>}
                {cards.map((o) => (
                  <article
                    key={o.id}
                    className={cx("crm-card", `stage-${o.stage.toLowerCase()}`, activeId === o.id && "is-active")}
                    tabIndex={0}
                    onClick={() => onOpen(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target === e.currentTarget) onOpen(o.id);
                    }}
                    aria-label={`${o.id} ${o.name}`}
                  >
                    <div className="crm-card-top">
                      <span className="mono crm-card-id">{o.id}</span>
                      {o.stage === "Won" && <Tag tone="ok" icon={Trophy}>Won</Tag>}
                      {o.stage === "Lost" && <Tag tone="risk">Lost</Tag>}
                      {/* Portal events bubble through React; keep menu clicks from opening the card. */}
                      <span className="crm-card-menu-wrap" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Menu
                          trigger={
                            <button className="icon-btn icon-btn-ghost icon-btn-sm crm-card-menu" aria-label={`Move ${o.id} to another stage`}>
                              <MoreHorizontal size={15} aria-hidden />
                            </button>
                          }
                          items={moveItems(o, toast)}
                        />
                      </span>
                    </div>
                    <h4 className="crm-card-name">{o.name}</h4>
                    <p className="crm-card-account">{o.account}</p>
                    <div className="crm-card-figures">
                      <span className="crm-card-value t-num">{inr(o.value)}</span>
                      <Tooltip content={`Probability ${o.probability}% · weighted ${inr(weighted(o))}`}>
                        <span className="crm-prob t-num" tabIndex={0}>
                          <span className="crm-prob-bar" aria-hidden>
                            <span style={{ width: `${o.probability}%` }} />
                          </span>
                          {o.probability}%
                        </span>
                      </Tooltip>
                    </div>
                    <div className="crm-card-meta">
                      <Tag tone="neutral">{VERTICAL_SHORT[o.vertical]}</Tag>
                      <Tooltip content={`Owner: ${o.owner}`}>
                        <span tabIndex={0} className="crm-owner">
                          <Avatar name={o.owner} size="xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <NextAction o={o} compact />
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
