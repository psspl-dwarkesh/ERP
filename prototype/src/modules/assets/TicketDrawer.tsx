import { AlertTriangle, CarFront, CheckCircle2, MapPin, PackagePlus, Trash2, UserCheck, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { ago, date, daysFrom, inr, minutesUntil, time } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { ServiceTicket } from "../../api/types";
import { SlaClock } from "../../app/patterns";
import {
  Button,
  Callout,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Input,
  KeyValues,
  LoadingRows,
  Meter,
  Progress,
  RecordLink,
  Select,
  Status,
  Stepper,
  Textarea,
  useToast,
} from "../../ds/components";
import { resolveTicket, type SpareUse } from "./commands";
import { FIELD_ROLES, OwnershipTag, Prio, personDetail } from "./shared";

const FLOW: ServiceTicket["status"][] = ["New", "Assigned", "En route", "On site", "Resolved"];

const CHECKLISTS: Record<ServiceTicket["kind"], string[]> = {
  Breakdown: [
    "Confirm the fault and its time with the customer contact",
    "Check service history for repeat faults on this asset",
    "Capture diagnostics: PLC buffer, HMI alarms, network status",
    "Inspect cabling, connectors and switch ports",
    "Functional test with the customer after the fix",
    "Customer acknowledgement on the visit report",
  ],
  Preventive: [
    "Visual inspection and cleaning",
    "Torque check on power terminations",
    "Thermal scan of busbars and breakers",
    "Trip test on MCCBs and protection relays",
    "Update PM log and next due date",
    "Customer acknowledgement on the visit report",
  ],
  Inspection: ["Verify loop wiring against drawings", "Record as-found readings", "Note deviations and actions", "Customer acknowledgement on the visit report"],
  Calibration: ["Allocate reference standard", "Record as-found and as-left readings", "Attach certificate", "Customer acknowledgement"],
};

type Draft = { checks: Record<string, boolean>; spares: SpareUse[]; note: string };
/** Worksheet drafts survive closing and reopening the drawer during a session. */
const drafts = new Map<string, Draft>();

export function TicketDrawer({ id, tickets, loading, onClose }: { id: string; tickets: ServiceTicket[]; loading: boolean; onClose: () => void }) {
  const toast = useToast();
  const t = tickets.find((x) => x.id === id);
  const assets = useQuery(api.assets);
  const contracts = useQuery(api.contracts);
  const people = useQuery(api.people);
  const items = useQuery(api.items);
  const projects = useQuery(api.projects);

  const [draft, setDraftState] = useState<Draft>(() => drafts.get(id) ?? { checks: {}, spares: [], note: "" });
  const setDraft = (fn: (d: Draft) => Draft) =>
    setDraftState((d) => {
      const n = fn(d);
      drafts.set(id, n);
      return n;
    });
  const [engineer, setEngineer] = useState("");
  const [spareItem, setSpareItem] = useState("");
  const [spareQty, setSpareQty] = useState("1");
  const [spareError, setSpareError] = useState<string | null>(null);
  const [noteTouched, setNoteTouched] = useState(false);

  const update = useMutation(api.updateTicket);
  const resolve = useMutation(resolveTicket);

  useEffect(() => {
    setDraftState(drafts.get(id) ?? { checks: {}, spares: [], note: "" });
    setNoteTouched(false);
    update.reset();
    resolve.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    setEngineer(t?.assignee ?? "");
  }, [t?.assignee]);

  const asset = assets.data?.find((a) => a.id === t?.assetId);
  const contract = contracts.data?.find((c) => c.id === t?.contractId);
  const upgrade = projects.data?.find((p) => p.installedAsset === asset?.id);
  const field = (people.data ?? []).filter((p) => FIELD_ROLES.includes(p.role));
  const chosen = people.data?.find((p) => p.name === engineer);
  const clash = chosen && t && chosen.name !== t.assignee ? (chosen.status === "On leave" ? `${chosen.name} is on leave today.` : chosen.status === "Deployed" && chosen.assignment && chosen.assignment !== t.id ? `${chosen.name} is deployed on ${chosen.assignment}${chosen.assignmentUntil ? ` until ${date(chosen.assignmentUntil, true)}` : ""}. Assigning would double-book.` : null) : null;
  const currentLeave = t?.assignee && people.data?.find((p) => p.name === t.assignee)?.status === "On leave";

  const checklist = t ? CHECKLISTS[t.kind] : [];
  const checked = checklist.filter((c) => draft.checks[c]).length;
  const spareOptions = useMemo(
    () =>
      (items.data ?? [])
        .filter((i) => i.quarantined === 0)
        .map((i) => ({ value: i.id, label: `${i.id} · ${i.name}`, detail: `${Math.max(0, i.onHand - i.reserved)} ${i.uom} free · ${i.warehouse}` })),
    [items.data],
  );

  if (!t) {
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()} title={loading ? "Loading ticket" : "Ticket not found"} id={id} width={640}>
        {loading ? <LoadingRows rows={5} columns={2} /> : <EmptyState title={`${id} isn't in the service desk`}>It may have been merged into another ticket.</EmptyState>}
      </Drawer>
    );
  }

  const stage = FLOW.indexOf(t.status === "Closed" ? "Resolved" : t.status);
  const open = t.status !== "Resolved" && t.status !== "Closed";
  const windowMins = (Date.parse(t.slaDue) - Date.parse(t.opened)) / 60000;
  const elapsedPct = Math.min(100, Math.max(0, ((windowMins - minutesUntil(t.slaDue)) / windowMins) * 100));
  const noteError = noteTouched && draft.note.trim().length < 12 ? "Write what was found and done (at least 12 characters)." : null;

  const step = async (status: ServiceTicket["status"], body: string) => {
    const r = await update.run(t.id, { status });
    if (r) toast({ title: `${t.id} · ${status}`, body, tone: "accent" });
  };

  const assign = async () => {
    if (!engineer) return;
    const r = await update.run(t.id, { assignee: engineer, ...(t.status === "New" ? { status: "Assigned" as const } : {}) });
    if (r) toast({ title: `${engineer} assigned to ${t.id}`, body: clash ? `Heads-up: ${clash}` : `${chosen?.role ?? "Engineer"} · ${chosen?.location ?? ""}. They get the worksheet on their phone.`, tone: clash ? "warn" : "ok" });
  };

  const addSpare = () => {
    const it = items.data?.find((i) => i.id === spareItem);
    const n = Number(spareQty);
    if (!it) return setSpareError("Pick a spare first.");
    if (!Number.isInteger(n) || n <= 0) return setSpareError("Enter a whole quantity above zero.");
    const already = draft.spares.find((s) => s.itemId === it.id)?.qty ?? 0;
    const free = Math.max(0, it.onHand - it.reserved - it.quarantined);
    if (n + already > free) return setSpareError(`Only ${free} ${it.uom} free in ${it.warehouse}.`);
    setSpareError(null);
    setDraft((d) => ({ ...d, spares: already ? d.spares.map((s) => (s.itemId === it.id ? { ...s, qty: s.qty + n } : s)) : [...d.spares, { itemId: it.id, qty: n }] }));
    setSpareItem("");
    setSpareQty("1");
  };

  const doResolve = async () => {
    setNoteTouched(true);
    if (draft.note.trim().length < 12) return;
    const r = await resolve.run(t.id, draft.note, draft.spares);
    if (r) {
      drafts.delete(t.id);
      toast({
        title: `${t.id} resolved`,
        body: `${draft.spares.length ? `${draft.spares.length} spare line${draft.spares.length > 1 ? "s" : ""} posted as stock issues. ` : ""}${t.chargeable || !contract ? "Chargeable: routed to billing review." : `Counted as an included ${contract.type} visit.`}`,
        tone: "ok",
      });
    }
  };

  const next = (() => {
    if (t.status === "New") return <Button variant="primary" icon={UserCheck} disabled={!engineer} loading={update.pending} onClick={assign}>Assign engineer</Button>;
    if (t.status === "Assigned") return <Button variant="primary" icon={CarFront} loading={update.pending} onClick={() => step("En route", `${t.assignee} is on the way to ${t.site}. The customer contact is notified.`)}>Mark en route</Button>;
    if (t.status === "En route") return <Button variant="primary" icon={MapPin} loading={update.pending} onClick={() => step("On site", `Response recorded at ${time(new Date().toISOString())}. Response SLA met if before target.`)}>Arrived on site</Button>;
    if (t.status === "On site") return <Button variant="primary" icon={CheckCircle2} loading={resolve.pending} onClick={doResolve}>Resolve ticket</Button>;
    return null;
  })();

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width={640}
      id={t.id}
      status={
        <span className="row" style={{ gap: 6 }}>
          <Prio p={t.priority} />
          <Status>{t.status}</Status>
        </span>
      }
      title={t.title}
      subtitle={`${t.customer} · ${t.site} · ${t.kind} via ${t.channel.toLowerCase()} · opened ${ago(t.opened)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {next}
        </>
      }
    >
      {/* ---- SLA ---- */}
      <section className={`ast-sla-hero ${open && minutesUntil(t.slaDue) < 180 ? "is-hot" : ""}`} aria-label="Response SLA">
        <div className="ast-sla-main">
          <span className="ast-sla-label">Response target</span>
          <span className="ast-sla-time t-num">
            {time(t.slaDue)} <span className="ast-sla-day">{date(t.slaDue, true)}</span>
          </span>
        </div>
        <div className="ast-sla-side">
          <SlaClock due={t.slaDue} done={!open || t.status === "On site"} />
          <Progress value={open ? elapsedPct : 100} tone={!open ? "ok" : elapsedPct > 75 ? "risk" : elapsedPct > 50 ? "warn" : "accent"} size="sm" label="Share of response window used" />
          <span className="ast-sla-note">{contract ? `${contract.responseHours} h response under ${contract.id}` : "Default 48 h target · no contract"}</span>
        </div>
      </section>

      <div className="ast-stepper">
        <Stepper steps={FLOW.map((s, i) => ({ key: s, label: s, status: i < stage ? "Done" : i === stage ? (s === "Resolved" ? "Done" : "Active") : "Waiting" }))} />
      </div>
      {update.error && <Callout tone="risk" title="Update didn't save">{update.error}</Callout>}

      {/* ---- Entitlement ---- */}
      <section className="stack-sm stack">
        <h3 className="ast-h">Entitlement</h3>
        {contracts.loading ? (
          <LoadingRows rows={2} columns={3} />
        ) : contract ? (
          <div className="ast-ent">
            <div className="ast-ent-verdict">
              {t.chargeable ? <AlertTriangle size={18} aria-hidden className="t-warn-icon" /> : <CheckCircle2 size={18} aria-hidden className="t-ok-icon" />}
              <div>
                <p className="ast-ent-title">{t.chargeable ? "Chargeable visit" : `Covered by ${contract.type} · no charge`}</p>
                <p className="ast-footnote">
                  {t.chargeable ? "This work is outside the contract's included scope; it goes to billing review on resolution." : `${t.kind} on ${t.assetId} is an included service. Resolution uses one included visit.`}
                </p>
              </div>
            </div>
            <KeyValues
              columns={3}
              items={[
                { label: "Contract", value: <RecordLink id={contract.id} /> },
                { label: "Response", value: `${contract.responseHours} h` },
                { label: "Valid until", value: date(contract.end) },
              ]}
            />
            <div className="ast-visits">
              <div className="row row-between">
                <span className="ast-footnote">Included visits</span>
                <span className="t-num t-strong">
                  {contract.visitsUsed} of {contract.visitsIncluded} used
                </span>
              </div>
              <Meter segments={[{ value: contract.visitsUsed, tone: contract.visitsUsed / contract.visitsIncluded >= 0.75 ? "warn" : "accent", label: "Used" }]} total={contract.visitsIncluded} />
            </div>
          </div>
        ) : (
          <Callout tone="warn" title="No entitlement found">
            {t.assetId} has no active AMC or O&M contract. The visit is chargeable; the coordinator confirms the rate with the customer before dispatch.
          </Callout>
        )}
      </section>

      {/* ---- Asset ---- */}
      <section className="stack-sm stack">
        <h3 className="ast-h">Asset</h3>
        {asset ? (
          <div className="ast-asset-sum">
            <div className="row row-between" style={{ alignItems: "flex-start" }}>
              <div>
                <RecordLink id={asset.id}>{asset.name}</RecordLink>
                <p className="ast-footnote">
                  {asset.make} {asset.model} · serial <span className="mono">{asset.serial}</span>
                </p>
              </div>
              <OwnershipTag asset={asset} />
            </div>
            <KeyValues
              columns={3}
              items={[
                { label: "Installed by", value: asset.projectId ? <RecordLink id={asset.projectId} /> : "—" },
                { label: "Open upgrade", value: upgrade ? <RecordLink id={upgrade.id} /> : <span className="t-muted">None</span> },
                { label: "Warranty", value: asset.warrantyEnd ? (daysFrom(asset.warrantyEnd) < 0 ? `Expired ${date(asset.warrantyEnd)}` : `Until ${date(asset.warrantyEnd)}`) : "None recorded" },
              ]}
            />
          </div>
        ) : (
          <LoadingRows rows={1} columns={3} />
        )}
      </section>

      {/* ---- Assignment ---- */}
      <section className="stack-sm stack">
        <h3 className="ast-h">Engineer</h3>
        <div className="ast-assign">
          <Field label="Assigned engineer" htmlFor="tk-eng" hint={chosen ? personDetail(chosen) : "Field roles only. Status comes from People."}>
            <Select
              id="tk-eng"
              label="Assigned engineer"
              placeholder="Choose an engineer"
              value={engineer}
              onChange={setEngineer}
              options={field.map((p) => ({ value: p.name, label: p.name, detail: personDetail(p) }))}
            />
          </Field>
          {t.status !== "New" && open && (
            <Button disabled={!engineer || engineer === t.assignee} loading={update.pending} onClick={assign}>
              Reassign
            </Button>
          )}
        </div>
        {clash && <Callout tone="warn" title="Check availability">{clash}</Callout>}
        {!clash && currentLeave && engineer === t.assignee && (
          <Callout tone="warn" title={`${t.assignee} is on leave`}>
            Pick someone available before the target time.
          </Callout>
        )}
      </section>

      {/* ---- Worksheet ---- */}
      <section className="ast-sheet" aria-label="Field worksheet">
        <div className="row row-between">
          <h3 className="ast-h">
            <Wrench size={15} aria-hidden /> Field worksheet
          </h3>
          <span className="ast-footnote t-num">
            {checked} of {checklist.length} checks
          </span>
        </div>
        {!open ? (
          <Callout tone="ok" title="Visit closed">
            The worksheet is locked with the visit report. Corrections are made by a revisit on the same ticket lineage.
          </Callout>
        ) : (
          <>
            {t.status !== "On site" && <p className="ast-footnote">The engineer fills this on site. You can prepare it now; nothing posts until the ticket is resolved.</p>}
            <div className="ast-checks">
              {checklist.map((c) => (
                <Checkbox key={c} checked={!!draft.checks[c]} onChange={(v) => setDraft((d) => ({ ...d, checks: { ...d.checks, [c]: v } }))} label={c} />
              ))}
            </div>

            <div className="stack-sm stack">
              <p className="ast-subh">Spares used</p>
              {draft.spares.length > 0 ? (
                <ul className="divider-list ast-spares">
                  {draft.spares.map((s) => {
                    const it = items.data?.find((i) => i.id === s.itemId);
                    return (
                      <li key={s.itemId} className="list-row">
                        <div className="list-row-main">
                          <div className="list-row-title ast-clip">{it?.name ?? s.itemId}</div>
                          <div className="list-row-sub">
                            <RecordLink id={s.itemId} quiet /> · from {it?.warehouse} · {it ? inr(it.unitCost * s.qty) : ""}
                          </div>
                        </div>
                        <span className="cell-num">
                          {s.qty} {it?.uom}
                        </span>
                        <IconButton icon={Trash2} label={`Remove ${s.itemId}`} size="sm" onClick={() => setDraft((d) => ({ ...d, spares: d.spares.filter((x) => x.itemId !== s.itemId) }))} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ast-footnote">No spares recorded. Each spare becomes a stock issue against {t.id} when the ticket is resolved.</p>
              )}
              <div className="ast-spare-add">
                <Select label="Spare" placeholder="Pick a spare from stock" value={spareItem} onChange={(v) => { setSpareItem(v); setSpareError(null); }} options={spareOptions} invalid={!!spareError && !spareItem} />
                <Input aria-label="Spare quantity" type="number" inputMode="numeric" min={1} value={spareQty} onChange={(e) => { setSpareQty(e.target.value); setSpareError(null); }} className="ast-spare-qty" invalid={!!spareError && !!spareItem} />
                <Button icon={PackagePlus} onClick={addSpare}>
                  Add
                </Button>
              </div>
              {spareError && <p className="field-error" role="alert">{spareError}</p>}
            </div>

            {t.status === "On site" && (
              <Field label="Resolution note" required htmlFor="tk-note" error={noteError ?? resolve.error} hint="Goes on the customer's visit report with the checklist and spares.">
                <Textarea
                  id="tk-note"
                  rows={3}
                  value={draft.note}
                  invalid={!!(noteError ?? resolve.error)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({ ...d, note: v }));
                    resolve.reset();
                  }}
                  onBlur={() => draft.note && setNoteTouched(true)}
                  placeholder="What was found, what was done, and what the customer should watch"
                />
              </Field>
            )}
            {t.status === "On site" && checked < checklist.length && (
              <p className="ast-footnote">{checklist.length - checked} checks open. They'll be listed as not done on the visit report.</p>
            )}
          </>
        )}
      </section>
    </Drawer>
  );
}
