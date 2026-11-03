import { ArrowRight, FileText, MoreHorizontal, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { ago, date, daysFrom, inr, relativeDay, time } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Tone } from "../../api/types";
import { href } from "../../app/router";
import {
  Button,
  ButtonLink,
  SoonButton,
  Callout,
  Drawer,
  EmptyState,
  Field,
  KeyValues,
  LoadingRows,
  Menu,
  Person,
  RecordLink,
  Status,
  Stepper,
  Tag,
  Textarea,
  Timeline,
  useToast,
} from "../../ds/components";
import { logOpportunityNote } from "./commands";
import { NextAction, OPEN_STAGES, isOpen, moveItems, weighted } from "./shared";

/** Illustrative presales history that predates the demo's audit log. */
const HISTORY: Record<string, { at: string; title: string; tone: Tone }[]> = {
  "OPP-0076": [
    { at: "2026-10-30T16:10:00+05:30", title: "Customer asked for 6 preventive visits instead of 4 — revision needed on QUO-0237", tone: "warn" },
    { at: "2026-10-27T11:00:00+05:30", title: "QUO-0237 rev A sent to Summit Engineering", tone: "accent" },
    { at: "2026-10-21T15:30:00+05:30", title: "Bid decision: Bid — existing installed base, low delivery risk", tone: "ok" },
    { at: "2026-10-18T10:05:00+05:30", title: "Renewal enquiry logged from contract expiry reminder", tone: "neutral" },
  ],
  "OPP-0081": [
    { at: "2026-10-29T12:20:00+05:30", title: "Estimator Rahul Desai added; site survey requested", tone: "accent" },
    { at: "2026-10-22T09:45:00+05:30", title: "Qualified: budget ₹60–70 L approved for FY27, decision by Dec", tone: "ok" },
    { at: "2026-10-12T14:00:00+05:30", title: "Enquiry from plant head during PRJ-0278 kick-off", tone: "neutral" },
  ],
  "OPP-0072": [
    { at: "2026-11-02T17:30:00+05:30", title: "Customer wants 60-day payment terms; we offered 45", tone: "warn" },
    { at: "2026-10-26T11:15:00+05:30", title: "QUO-0240 rev C sent — enclosure spec changed to IP65", tone: "accent" },
    { at: "2026-10-09T10:00:00+05:30", title: "Technical clarification meeting held at Nashik", tone: "neutral" },
  ],
  "OPP-0079": [
    { at: "2026-10-31T13:00:00+05:30", title: "Tender documents downloaded; submission due 8 Nov", tone: "warn" },
    { at: "2026-10-24T10:30:00+05:30", title: "Bid decision: Bid — CSV team capacity confirmed by Meera Nair", tone: "ok" },
  ],
  "OPP-0066": [{ at: "2026-09-18T18:00:00+05:30", title: "Lost on price — competitor 11% lower; technical score was higher", tone: "risk" }],
  "OPP-0069": [{ at: "2026-08-05T10:00:00+05:30", title: "Won — handed to Projects as PRJ-0244 without re-entry", tone: "ok" }],
};

export function OpportunityDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const toast = useToast();
  const opps = useQuery(api.opportunities);
  const quotes = useQuery(api.quotations);
  const customers = useQuery(api.customers);
  const activity = useQuery(api.activity);
  const [note, setNote] = useState("");
  const m = useMutation(logOpportunityNote);

  useEffect(() => {
    setNote("");
    m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const o = opps.data?.find((x) => x.id === id);
  const linked = (quotes.data ?? []).filter((q) => q.opportunityId === id);
  const customer = customers.data?.find((c) => c.name === o?.account);

  const saveNote = async () => {
    if (!o) return;
    const r = await m.run(o.id, note);
    if (r) {
      setNote("");
      toast({ title: "Note added", body: `Saved to ${o.id}'s history with your name and time.` });
    }
  };

  const events = o
    ? [
        ...(activity.data ?? [])
          .filter((e) => e.reference === o.id)
          .map((e) => ({ id: e.id, at: e.at, title: `${e.actor} ${e.action.replace(/:$/, "")}`, tone: (e.action.includes("Lost") ? "risk" : e.action.includes("noted") ? "neutral" : "accent") as Tone })),
        ...(HISTORY[o.id] ?? [{ at: "2026-10-15T10:00:00+05:30", title: `Created from ${o.source.toLowerCase()} enquiry`, tone: "neutral" as Tone }]).map((h, i) => ({ id: `h-${i}`, ...h })),
      ].sort((a, b) => b.at.localeCompare(a.at))
    : [];

  return (
    <Drawer
      open={!!id}
      onOpenChange={(open) => !open && onClose()}
      width={600}
      id={id}
      status={o ? <Status>{o.stage}</Status> : undefined}
      title={o?.name ?? (opps.loading ? "Loading opportunity…" : "Opportunity not found")}
      subtitle={o ? `${o.account} · ${o.vertical}` : undefined}
      footer={
        o ? (
          <>
            <Menu
              align="start"
              trigger={
                <Button icon={MoreHorizontal} variant="secondary">
                  Move to stage
                </Button>
              }
              items={moveItems(o, toast)}
            />
            {linked[0] ? (
              <ButtonLink to={href.record(linked[0].id)} variant="primary" iconRight={ArrowRight}>
                Open {linked[0].id}
              </ButtonLink>
            ) : (
              <SoonButton icon={FileText} what="Start a quotation in Sales with this account, vertical and value filled in.">Start quotation</SoonButton>
            )}
          </>
        ) : undefined
      }
    >
      {!o ? (
        opps.loading ? (
          <LoadingRows rows={6} columns={2} />
        ) : (
          <EmptyState title={`${id} isn't in this workspace`}>It may have been merged into another record. Search the pipeline by account instead.</EmptyState>
        )
      ) : (
        <>
          {o.stage !== "Lost" && (
            <Stepper
              steps={[...OPEN_STAGES, "Won" as const].map((s, i, arr) => {
                const at = arr.indexOf(o.stage as (typeof arr)[number]);
                return { key: s, label: s, status: i < at ? "Done" : i === at ? (o.stage === "Won" ? "Done" : "Active") : "Waiting" };
              })}
            />
          )}
          {o.stage === "Lost" && (
            <Callout tone="risk" title={`Lost · ${o.nextAction}`}>
              The loss reason is kept for win/loss reporting (CRM-010). Reopen only through a new opportunity so history stays intact.
            </Callout>
          )}

          <section className="crm-drawer-next">
            <p className="crm-drawer-label">Next action</p>
            <NextAction o={o} />
            {isOpen(o) && daysFrom(o.nextActionDue) <= 1 && (
              <p className="crm-drawer-hint">
                Due {relativeDay(o.nextActionDue).toLowerCase()} · {date(o.nextActionDue)}. Close date {date(o.closeDate)} is {relativeDay(o.closeDate).toLowerCase()}.
              </p>
            )}
          </section>

          <KeyValues
            columns={2}
            items={[
              { label: "Account", value: customer ? <RecordLink id={customer.id}>{customer.name}</RecordLink> : o.account },
              { label: "Owner", value: <Person name={o.owner} size="xs" /> },
              { label: "Expected value", value: <span className="t-num">{inr(o.value)}</span> },
              { label: "Probability · weighted", value: <span className="t-num">{o.probability}% · {inr(weighted(o))}</span> },
              { label: "Expected close", value: `${date(o.closeDate)} (${relativeDay(o.closeDate)})` },
              { label: "Source", value: <Tag tone={o.source === "Tender" ? "violet" : o.source === "Renewal" ? "accent" : "neutral"}>{o.source}</Tag> },
              { label: "Vertical", value: o.vertical },
              { label: "Stage approval", value: o.value >= 5000000 ? "Bid/no-bid sign-off by Operations head" : "Owner's authority" },
            ]}
          />

          <section className="stack-sm stack">
            <div className="row row-between">
              <h3 className="crm-drawer-h">Linked quotations</h3>
              <span className="t-muted crm-small">{linked.length ? `${linked.length} revision chain${linked.length > 1 ? "s" : ""}` : "None yet"}</span>
            </div>
            {quotes.loading ? (
              <LoadingRows rows={2} columns={3} />
            ) : linked.length === 0 ? (
              <p className="crm-drawer-hint">No quotation yet. Starting one pre-fills account, vertical and value from this opportunity, so nothing is re-typed (CRM-007, CRM-018).</p>
            ) : (
              <ul className="divider-list crm-linked">
                {linked.map((q) => (
                  <li key={q.id} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">
                        <RecordLink id={q.id} /> <span className="crm-rev">Rev {q.revision}</span>
                      </div>
                      <div className="list-row-sub">
                        {inr(q.value)} · valid until {date(q.validUntil)} {daysFrom(q.validUntil) >= 0 && daysFrom(q.validUntil) <= 21 && q.status !== "Accepted" ? `(${relativeDay(q.validUntil).toLowerCase()})` : ""}
                      </div>
                    </div>
                    <Status>{q.status}</Status>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="stack">
            <h3 className="crm-drawer-h">Activity</h3>
            <Field label="Add a note" htmlFor="opp-note" error={m.error} hint="Calls, meetings and decisions. Saved to the audit trail.">
              <Textarea id="opp-note" rows={2} value={note} invalid={!!m.error} placeholder="e.g. Customer confirmed 6 visits; revise QUO-0237" onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: -8 }}>
              <Button size="sm" icon={NotebookPen} loading={m.pending} disabled={!note.trim()} onClick={saveNote}>
                Save note
              </Button>
            </div>
            <Timeline
              items={events.map((e) => ({
                id: e.id,
                tone: e.tone,
                title: e.title,
                meta: `${ago(e.at)} · ${date(e.at, true)} ${time(e.at)}`,
              }))}
            />
          </section>
        </>
      )}
    </Drawer>
  );
}
