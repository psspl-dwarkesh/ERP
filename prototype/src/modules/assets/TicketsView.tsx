import { ArrowRight, Columns3, Inbox, List, UserX } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { date, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { ServiceContract, ServiceTicket } from "../../api/types";
import { SlaClock } from "../../app/patterns";
import { href } from "../../app/router";
import { Avatar, ButtonLink, Callout, DataTable, EmptyState, FilterChips, LoadingRows, Person, RecordLink, SearchField, Segmented, Status, Tag, Toolbar, type Column } from "../../ds/components";
import { BOARD, Prio, isOpen, openAssetsRecord } from "./shared";

type PrioFilter = "all" | ServiceTicket["priority"];

export function TicketsView({ tickets, contracts, loading, activeId }: { tickets: ServiceTicket[]; contracts: ServiceContract[]; loading: boolean; activeId?: string }) {
  const [view, setView] = useState<"board" | "list">("board");
  const [prio, setPrio] = useState<PrioFilter>("all");
  const [q, setQ] = useState("");
  const people = useQuery(api.people);
  const leave = useQuery(api.leaveRequests);

  const urgent = tickets.filter((t) => isOpen(t) && (t.priority === "P1" || t.priority === "P2")).sort((a, b) => a.slaDue.localeCompare(b.slaDue));
  const onLeave = tickets.filter((t) => isOpen(t) && t.assignee && people.data?.find((p) => p.name === t.assignee)?.status === "On leave");
  const contractOf = (t: ServiceTicket) => contracts.find((c) => c.id === t.contractId);

  const rows = tickets.filter((t) => {
    if (prio !== "all" && t.priority !== prio) return false;
    const s = q.trim().toLowerCase();
    return !s || `${t.id} ${t.title} ${t.customer} ${t.site} ${t.asset} ${t.assignee ?? ""}`.toLowerCase().includes(s);
  });

  const columns: Column<ServiceTicket>[] = [
    {
      key: "t",
      header: "Ticket",
      sort: (t) => t.priority,
      cell: (t) => (
        <div className="ast-tk-cell">
          <Prio p={t.priority} />
          <div className="cell-primary">
            <span className="cell-title ast-clip">{t.title}</span>
            <span className="cell-sub">
              <span className="mono">{t.id}</span> · {t.kind} · {t.channel}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "cust",
      header: "Customer · site",
      sort: (t) => t.customer,
      priority: 2,
      cell: (t) => (
        <div className="cell-primary">
          <span>{t.customer}</span>
          <span className="cell-sub">{t.site}</span>
        </div>
      ),
    },
    { key: "asset", header: "Asset", priority: 3, cell: (t) => <RecordLink id={t.assetId} /> },
    { key: "who", header: "Engineer", sort: (t) => t.assignee ?? "", cell: (t) => (t.assignee ? <Person name={t.assignee} size="xs" /> : <span className="ast-unassigned">Unassigned</span>) },
    { key: "status", header: "Status", sort: (t) => BOARD.indexOf(t.status), cell: (t) => <Status>{t.status}</Status> },
    { key: "sla", header: "Response SLA", sort: (t) => t.slaDue, cell: (t) => <SlaClock due={t.slaDue} done={!isOpen(t)} /> },
    { key: "contract", header: "Cover", priority: 3, cell: (t) => <CoverTag t={t} /> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {loading ? (
        <LoadingRows rows={2} columns={4} />
      ) : urgent.length > 0 ? (
        <section className="ast-urgent-grid" aria-label="Urgent tickets">
          {urgent.map((t) => {
            const c = contractOf(t);
            return (
              <article key={t.id} className={`ast-urgent ${t.priority === "P1" ? "tone-risk" : "tone-warn"}`}>
                <div className="ast-urgent-top">
                  <Prio p={t.priority} />
                  <RecordLink id={t.id} />
                  <span className="ast-urgent-clock">
                    <SlaClock due={t.slaDue} />
                  </span>
                </div>
                <h3 className="ast-urgent-title">{t.title}</h3>
                <p className="ast-urgent-body">
                  {t.customer} · {t.site} · <RecordLink id={t.assetId} quiet />
                </p>
                <p className="ast-urgent-ent">
                  {c ? (
                    <>
                      <RecordLink id={c.id} /> · {c.responseHours} h response · {t.chargeable ? "chargeable" : "no charge"} · target {time(t.slaDue)} {t.slaDue.slice(0, 10) === TODAY ? "today" : date(t.slaDue, true)}
                    </>
                  ) : (
                    "No contract · chargeable visit"
                  )}
                </p>
                <div className="ast-urgent-foot">
                  <span className="ast-urgent-who">
                    {t.assignee ? (
                      <>
                        <Avatar name={t.assignee} size="xs" /> {t.assignee} · {t.status.toLowerCase()}
                      </>
                    ) : (
                      <span className="ast-unassigned">Unassigned</span>
                    )}
                  </span>
                  <ButtonLink to={href.record(t.id)} size="sm" variant={t.priority === "P1" ? "primary" : "secondary"} iconRight={ArrowRight}>
                    Open worksheet
                  </ButtonLink>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <Callout tone="ok" title="No P1 or P2 tickets open">
          Everything urgent is resolved. The board below shows routine work.
        </Callout>
      )}

      {onLeave.map((t) => {
        const lv = leave.data?.find((l) => l.person === t.assignee && l.status === "Approved" && l.from <= TODAY && l.to >= TODAY);
        return (
          <Callout key={t.id} tone="warn" icon={UserX} title={`${t.id} is assigned to ${t.assignee}, who is on leave`} action={<ButtonLink to={href.record(t.id)} size="sm">Reassign</ButtonLink>}>
            {lv ? <>Leave <RecordLink id={lv.id} quiet /> runs to {date(lv.to, true)}. </> : null}
            The {t.kind.toLowerCase()} visit at {t.customer} has a response target of {date(t.slaDue, true)}, {time(t.slaDue)}. Reassign before it slips.
          </Callout>
        );
      })}

      <Toolbar
        end={
          <Segmented
            label="Layout"
            value={view}
            onChange={setView}
            options={[
              { value: "board", label: "Board", icon: Columns3 },
              { value: "list", label: "List", icon: List },
            ]}
          />
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Search ticket, customer, engineer" label="Search tickets" />
        <FilterChips
          label="Priority"
          value={prio}
          onChange={setPrio}
          options={[{ value: "all", label: "All", count: tickets.length }, ...(["P1", "P2", "P3", "P4"] as const).filter((p) => tickets.some((t) => t.priority === p)).map((p) => ({ value: p, label: p, count: tickets.filter((t) => t.priority === p).length }))]}
        />
      </Toolbar>

      {view === "list" ? (
        <DataTable caption="Service tickets" loading={loading} rows={rows} columns={columns} activeId={activeId} onRowClick={(t) => openAssetsRecord(t.id, "tickets")} />
      ) : loading ? (
        <LoadingRows rows={4} columns={5} />
      ) : (
        <div className="ast-board" role="list" aria-label="Ticket board">
          {BOARD.map((col) => {
            const inCol = rows.filter((t) => (col === "Resolved" ? t.status === "Resolved" || t.status === "Closed" : t.status === col)).sort((a, b) => a.slaDue.localeCompare(b.slaDue));
            return (
              <section key={col} className="ast-col" role="listitem" aria-label={`${col}, ${inCol.length} tickets`}>
                <header className="ast-col-head">
                  <Status size="sm">{col}</Status>
                  <span className="ast-col-count t-num">{inCol.length}</span>
                </header>
                <div className="ast-col-body">
                  {inCol.length === 0 ? (
                    <div className="ast-col-empty">
                      <Inbox size={16} aria-hidden />
                      {q || prio !== "all" ? "No match" : "Nothing here"}
                    </div>
                  ) : (
                    inCol.map((t) => <TicketCard key={t.id} t={t} active={t.id === activeId} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {!loading && view === "board" && rows.length === 0 && (
        <EmptyState title="No tickets match">Clear the search or pick another priority.</EmptyState>
      )}
    </div>
  );
}

function CoverTag({ t }: { t: ServiceTicket }) {
  if (t.contractId) return <Tag tone={t.chargeable ? "warn" : "accent"}>{`${t.contractId}${t.chargeable ? " · chargeable" : ""}`}</Tag>;
  return <Tag tone="warn">Chargeable</Tag>;
}

function TicketCard({ t, active }: { t: ServiceTicket; active: boolean }) {
  const open = isOpen(t);
  return (
    <a href={`#/app/assets/${t.id}?tab=tickets`} className={`ast-card${active ? " is-active" : ""}`}>
      <div className="ast-card-top">
        <Prio p={t.priority} />
        <span className="mono ast-card-id">{t.id}</span>
        <span className="ast-card-clock">
          <SlaClock due={t.slaDue} done={!open} />
        </span>
      </div>
      <p className="ast-card-title">{t.title}</p>
      <p className="ast-card-sub">
        {t.customer} · {t.site}
      </p>
      <div className="ast-card-foot">
        {t.assignee ? (
          <span className="ast-card-who">
            <Avatar name={t.assignee} size="xs" />
            <span className="truncate">{t.assignee}</span>
          </span>
        ) : (
          <span className="ast-unassigned">Unassigned</span>
        )}
        <CoverTag t={t} />
      </div>
    </a>
  );
}
