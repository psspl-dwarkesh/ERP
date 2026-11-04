import { FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { date, inr, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { SalesOrder } from "../../api/types";
import { TODAY } from "../../api/fixtures";
import { href, navigate } from "../../app/router";
import { Button, ButtonLink, Callout, Dialog, Drawer, EmptyState, Field, Input, KeyValues, LoadingRows, Meter, Person, RecordLink, Select, Status, Tag, useToast } from "../../ds/components";
import { openFromOrder } from "../projects/commands";
import { addDays } from "../projects/util";
import { adviceStatus, billedPct, milestoneBilling, unbilled } from "./shared";

/** Illustrative customer PO references (SAL-005). */
const CUSTOMER_PO: Record<string, string> = { "SO-0196": "NSP/PO/26/1187", "SO-0188": "MF/ENG/PO/2611", "SO-0179": "CC/NDS/26-114", "SO-0201": "NSP/AMC/26/031", "SO-0172": "AB/CAL/26/007" };

/** Illustrative quarterly schedule for the AMC order (SAL-011). */
const AMC_SCHEDULE = [
  { key: "Q1", label: "Q1 · Apr–Jun 2026", value: 170000, status: "Posted" },
  { key: "Q2", label: "Q2 · Jul–Sep 2026", value: 170000, status: "Posted" },
  { key: "Q3", label: "Q3 · Oct–Dec 2026", value: 170000, status: "Sent to accounting", adviceId: "BA-0064" },
  { key: "Q4", label: "Q4 · Jan–Mar 2027", value: 170000, status: "Upcoming" },
];

export function OrderDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const orders = useQuery(api.salesOrders);
  const projects = useQuery(api.projects);
  const advices = useQuery(api.billingAdvices);
  const approvals = useQuery(api.approvals);
  const o = orders.data?.find((x) => x.id === id);
  const project = projects.data?.find((p) => p.id === o?.projectId);
  const soAdvices = (advices.data ?? []).filter((b) => b.salesOrderId === id);
  const ms = project ? milestoneBilling(project, soAdvices, approvals.data ?? []) : [];
  const inAdvice = soAdvices.filter((b) => !["Posted"].includes(adviceStatus(b, approvals.data ?? []))).reduce((a, b) => a + b.value, 0);

  return (
    <Drawer
      open={!!id}
      onOpenChange={(v) => !v && onClose()}
      width={620}
      id={id}
      status={o ? <Status>{o.status}</Status> : undefined}
      title={o?.title ?? (orders.loading ? "Loading order…" : "Order not found")}
      subtitle={o ? `${o.customer} · booked ${date(o.booked)}` : undefined}
      footer={
        o ? (
          o.projectId ? (
            <ButtonLink to={href.record(o.projectId)} variant="primary">
              Open {o.projectId}
            </ButtonLink>
          ) : o.quotationId ? (
            <OpenProjectAction o={o} />
          ) : undefined
        ) : undefined
      }
    >
      {!o ? (
        orders.loading ? <LoadingRows rows={6} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`}>Check the order number on the customer PO.</EmptyState>
      ) : (
        <>
          <section className="sal-money">
            <div className="sal-money-row">
              <div>
                <span className="sal-label">Order value</span>
                <span className="sal-money-v t-num">{inr(o.value)}</span>
              </div>
              <div>
                <span className="sal-label">
                  <i className="sal-key tone-ok" /> Billed
                </span>
                <span className="sal-money-v t-num">{inr(o.billed)}</span>
              </div>
              <div>
                <span className="sal-label">
                  <i className="sal-key tone-warn" /> In advice
                </span>
                <span className="sal-money-v t-num">{inr(inAdvice)}</span>
              </div>
              <div>
                <span className="sal-label">
                  <i className="sal-key tone-neutral" /> Unbilled
                </span>
                <span className="sal-money-v t-num">{inr(Math.max(0, unbilled(o) - inAdvice))}</span>
              </div>
            </div>
            <Meter
              total={o.value}
              segments={[
                { value: o.billed, tone: "ok", label: "Billed" },
                { value: Math.min(inAdvice, unbilled(o)), tone: "warn", label: "In billing advice" },
              ]}
            />
            <p className="sal-small t-muted">{billedPct(o)}% billed. Amounts are order values before tax; tax treatment sits with accounting.</p>
          </section>

          <KeyValues
            columns={2}
            items={[
              { label: "Customer", value: o.customer },
              { label: "Order owner", value: <Person name={o.owner} size="xs" /> },
              { label: "From quotation", value: o.quotationId ? <RecordLink id={o.quotationId}>accepted revision</RecordLink> : <span className="t-muted">Contract renewal — no quotation</span> },
              { label: "Delivered through", value: o.projectId ? <RecordLink id={o.projectId}>{project?.name}</RecordLink> : "Service contract schedule" },
              { label: "Customer PO", value: <span className="mono">{CUSTOMER_PO[o.id] ?? "Not recorded"}</span> },
              { label: "Delivery commitment", value: project ? `${date(project.due)} (${relativeDay(project.due)})` : "Per contract term" },
            ]}
          />

          {project && (
            <section className="stack-sm stack">
              <div className="row row-between">
                <h3 className="sal-h">Milestone billing</h3>
                <span className="sal-small t-muted">Read from {project.id} milestone status</span>
              </div>
              <ul className="divider-list sal-ms">
                {ms.map((m) => (
                  <li key={m.id} className="list-row">
                    <span className="mono sal-ms-id">{m.id}</span>
                    <div className="list-row-main">
                      <div className="list-row-title">{m.name}</div>
                      <div className="list-row-sub">
                        {m.done ? `Done ${date(m.done, true)}` : `Due ${date(m.due, true)}`} · <Status size="sm" dot={false}>{m.status}</Status>
                        {m.gate ? ` · ${m.gate} gate` : ""}
                      </div>
                    </div>
                    <div className="sal-ms-bill">
                      <span className="cell-num">{m.billable ? inr(m.billable) : "—"}</span>
                      <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {m.billing.adviceId && <RecordLink id={m.billing.adviceId} quiet />}
                        <Tag tone={m.billing.tone}>{m.billing.label}</Tag>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {ms.some((m) => m.billing.tone === "risk" && m.billing.label.startsWith("Not earned")) && (
                <Callout tone="warn" title="A billable milestone is behind its gate">
                  Billing eligibility follows the milestone, not a note: {ms.find((m) => m.billing.label.startsWith("Not earned"))?.name} must pass its gate before advice can be raised.
                </Callout>
              )}
            </section>
          )}

          {!project && o.title.startsWith("AMC") && (
            <section className="stack-sm stack">
              <h3 className="sal-h">Recurring billing schedule</h3>
              <ul className="divider-list">
                {AMC_SCHEDULE.map((s) => (
                  <li key={s.key} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">{s.label}</div>
                      <div className="list-row-sub t-num">{inr(s.value)}</div>
                    </div>
                    {s.adviceId && <RecordLink id={s.adviceId} quiet />}
                    <Status>{s.status}</Status>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Drawer>
  );
}

/** E2E-01 step 6 — open the delivery project from a confirmed order that has no project yet. */
function OpenProjectAction({ o }: { o: SalesOrder }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" icon={FolderPlus} onClick={() => setOpen(true)}>
        Create delivery project
      </Button>
      <OpenProjectDialog o={o} open={open} onOpenChange={setOpen} />
    </>
  );
}

function OpenProjectDialog({ o, open, onOpenChange }: { o: SalesOrder; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast();
  const people = useQuery(api.people);
  const m = useMutation(openFromOrder);
  const [manager, setManager] = useState("");
  const [start, setStart] = useState(TODAY);
  const [due, setDue] = useState(addDays(TODAY, 90));
  useEffect(() => {
    if (open) {
      setManager("");
      setStart(TODAY);
      setDue(addDays(TODAY, 90));
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const p = await m.run(o.id, manager, start, due);
    if (!p) return;
    onOpenChange(false);
    toast({
      title: `${p.id} opened`,
      body: `Delivery project created from ${o.id} for ${p.manager}. Milestones follow the ${p.vertical} billing pattern; the working budget is ${inr(p.budget)}.`,
      action: { label: `Open ${p.id}`, onClick: () => navigate(href.record(p.id)) },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={FolderPlus}
      title="Create delivery project"
      description={`Open the project that delivers ${o.id} for ${o.customer}. Scope and vertical carry over from the accepted quotation; the working budget is 80% of the ${inr(o.value)} contract value.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Create project
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Project manager" htmlFor="op-pm">
          <Select
            id="op-pm"
            label="Project manager"
            value={manager}
            placeholder="Choose a manager"
            onChange={(v) => { setManager(v); m.reset(); }}
            options={(people.data ?? []).map((p) => ({ value: p.name, label: p.name, detail: p.role }))}
            invalid={m.error?.includes("manager") || undefined}
          />
        </Field>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <Field label="Start" htmlFor="op-start">
            <Input id="op-start" type="date" value={start} onChange={(e) => { setStart(e.target.value); m.reset(); }} />
          </Field>
          <Field label="Due" htmlFor="op-due">
            <Input id="op-due" type="date" min={start} value={due} onChange={(e) => { setDue(e.target.value); m.reset(); }} />
          </Field>
        </div>
        {m.error && (
          <Callout tone="risk" title="The project wasn't created">
            {m.error}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}
