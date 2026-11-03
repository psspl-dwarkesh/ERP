import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Factory, PackageCheck, ScanBarcode, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { date, daysFrom, num, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Item, StockMovement, WorkOrder } from "../../api/types";
import { href } from "../../app/router";
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  KeyValues,
  LoadingRows,
  Person,
  RadioCards,
  RecordLink,
  Status,
  Stepper,
  Textarea,
  cx,
  useToast,
  type Column,
} from "../../ds/components";
import { recordWorkOrderQc } from "./commands";
import { RefText, freeQty, openInventoryRecord } from "./shared";

function currentStage(wo: WorkOrder) {
  return wo.stages.find((s) => s.status === "Active") ?? wo.stages.find((s) => s.status === "Blocked");
}

export function AssemblyView({ selectedId, items, movements }: { selectedId?: string; items: Item[]; movements: StockMovement[] }) {
  const workOrders = useQuery(api.workOrders);
  const wos = workOrders.data ?? [];
  const wo = wos.find((w) => w.id === selectedId) ?? wos.find((w) => w.id === "WO-0187") ?? wos[0];
  const missing = selectedId && workOrders.data && !wos.some((w) => w.id === selectedId) ? selectedId : null;

  const columns: Column<WorkOrder>[] = [
    {
      key: "wo",
      header: "Work order",
      sort: (w) => w.id,
      cell: (w) => (
        <div className="cell-primary">
          <span className="cell-title">{w.name}</span>
          <span className="cell-sub">
            <span className="mono">{w.id}</span> · serial <span className="mono">{w.serial}</span>
          </span>
        </div>
      ),
    },
    { key: "prj", header: "Project", priority: 2, cell: (w) => <RecordLink id={w.projectId} /> },
    {
      key: "stage",
      header: "Stage",
      cell: (w) => {
        const s = currentStage(w);
        return s ? <Status tone={s.status === "Blocked" ? "risk" : "accent"}>{`${s.name}${s.status === "Blocked" ? " · blocked" : ""}`}</Status> : <Status>Done</Status>;
      },
    },
    { key: "qc", header: "QC", sort: (w) => w.qc, cell: (w) => <Status>{w.qc}</Status> },
    {
      key: "due",
      header: "Due",
      sort: (w) => w.due,
      priority: 2,
      cell: (w) => (
        <div className="cell-primary">
          <span className="cell-num">{date(w.due, true)}</span>
          <span className="cell-sub">{w.stages.every((s) => s.status === "Done") ? "Dispatched" : relativeDay(w.due)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {missing && (
        <Callout tone="info" title={`${missing} isn't in this demo dataset`}>
          Showing WO-0187 instead.
        </Callout>
      )}
      {workOrders.loading ? <LoadingRows rows={6} columns={4} /> : wo ? <WorkOrderPanel wo={wo} items={items} movements={movements} /> : <EmptyState icon={Factory} title="No work orders yet">Work orders are created from a released BOM and a confirmed project.</EmptyState>}

      <section className="stack" style={{ gap: "var(--space-3)" }} aria-label="All work orders">
        <div className="section-head">
          <div>
            <h2 className="section-title">Work orders</h2>
            <p className="section-description">Each pins one BOM revision for its whole life.</p>
          </div>
        </div>
        <DataTable caption="Work orders" loading={workOrders.loading} rows={wos} columns={columns} activeId={wo?.id} onRowClick={(w) => openInventoryRecord(w.id, "assembly")} />
      </section>
    </div>
  );
}

function WorkOrderPanel({ wo, items, movements }: { wo: WorkOrder; items: Item[]; movements: StockMovement[] }) {
  const toast = useToast();
  const boms = useQuery(api.boms);
  const advance = useMutation(api.advanceWorkOrder);
  const cur = currentStage(wo);
  const [focus, setFocus] = useState<string | undefined>(cur?.key);
  const [qcOpen, setQcOpen] = useState(false);

  useEffect(() => {
    setFocus(currentStage(wo)?.key);
    advance.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wo.id]);

  const bom = boms.data?.find((b) => b.id === wo.bomId);
  const shortLines = (bom?.lines ?? []).filter((l) => {
    const it = items.find((i) => i.id === l.itemId);
    const free = it ? freeQty(it) : l.available;
    return l.reserved + free + l.onOrder < l.required;
  });
  const active = wo.stages.find((s) => s.status === "Active");
  const blocked = wo.stages.find((s) => s.status === "Blocked");
  const allDone = wo.stages.every((s) => s.status === "Done");
  const dispatchIdx = wo.stages.findIndex((s) => s.key === "dispatch");
  const preDispatchDone = wo.stages.slice(0, dispatchIdx).every((s) => s.status === "Done");
  const focused = wo.stages.find((s) => s.key === focus) ?? cur ?? wo.stages[wo.stages.length - 1];
  const issued = movements.filter((m) => m.to === wo.id || m.reference.includes(wo.id));
  const dueIn = daysFrom(wo.due);

  const complete = async () => {
    if (!active) return;
    const r = await advance.run(wo.id);
    if (r) {
      const next = r.stages.find((s) => s.status === "Active");
      setFocus(next?.key);
      toast({ title: `${active.name} complete on ${wo.id}`, body: next ? `${next.name} is now active · ${next.owner}` : "All stages done.", tone: "ok" });
    } else {
      const idx = wo.stages.findIndex((s) => s.key === active.key);
      setFocus(wo.stages[idx + 1]?.key ?? active.key);
    }
  };

  return (
    <Card className="inv-wo">
      <div className="inv-wo-head">
        <div className="inv-wo-title">
          <span className="mono inv-wo-id">{wo.id}</span>
          <h2 className="inv-wo-name">{wo.name}</h2>
        </div>
        <div className="inv-wo-facts">
          <KeyValues
            columns={3}
            items={[
              { label: "Serial", value: <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><ScanBarcode size={14} aria-hidden className="t-muted" /><span className="mono">{wo.serial}</span></span> },
              { label: "Project", value: <RecordLink id={wo.projectId} /> },
              { label: "BOM", value: <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><RecordLink id={wo.bomId} />{bom && <span className="t-muted">rev {bom.revision} · pinned</span>}</span> },
              { label: "Due", value: <span className={cx("t-num", !allDone && dueIn <= 5 && "inv-due-soon")}>{date(wo.due)} · {allDone ? "dispatched" : relativeDay(wo.due).toLowerCase()}</span> },
              { label: "Production QC", value: <Status>{wo.qc}</Status> },
              { label: "Stage", value: cur ? `${cur.name} · ${cur.status === "Blocked" ? "blocked" : "in progress"}` : "Complete" },
            ]}
          />
        </div>
      </div>

      <div className="inv-stepper">
        <Stepper
          active={focused?.key}
          onSelect={setFocus}
          steps={wo.stages.map((s) => ({
            key: s.key,
            label: s.name,
            status: s.status,
            detail: s.done ? `Done ${date(s.done, true)}` : s.status === "Blocked" ? "Blocked" : s.status === "Active" ? (s.note ?? "In progress") : s.owner,
          }))}
        />
      </div>

      <div className="grid inv-wo-body">
        <div className="stack" style={{ gap: "var(--space-4)", minWidth: 0 }}>
          {focused && (
            <div className="inv-stage">
              <div className="row row-between">
                <h3 className="inv-h">{focused.name}</h3>
                <Status tone={focused.status === "Blocked" ? "risk" : focused.status === "Active" ? "accent" : focused.status === "Done" ? "ok" : "neutral"}>
                  {focused.status === "Active" ? "In progress" : focused.status}
                </Status>
              </div>
              <KeyValues
                columns={2}
                items={[
                  { label: "Owner", value: <Person name={focused.owner} size="xs" /> },
                  { label: focused.done ? "Completed" : "Note", value: focused.done ? date(focused.done) : (focused.note ? <RefText text={focused.note} /> : <span className="t-muted">—</span>) },
                ]}
              />
              {focused.key === "kitting" && (
                <div className="stack-sm stack">
                  <p className="inv-subh">Issued against this work order</p>
                  {issued.length ? (
                    <ul className="divider-list">
                      {issued.map((m) => (
                        <li key={m.id} className="list-row">
                          <div className="list-row-main">
                            <div className="list-row-title inv-clip">{m.item}</div>
                            <div className="list-row-sub">
                              <RecordLink id={m.id} quiet /> · {date(m.at, true)} · {m.by}
                            </div>
                          </div>
                          <span className="cell-num">{num(Math.abs(m.qty))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="inv-footnote">Nothing issued yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {advance.error && (
            <Callout
              tone="risk"
              title={advance.error}
              action={
                advance.error.includes("QC") ? (
                  <Button size="sm" onClick={() => setQcOpen(true)} disabled={wo.stages.find((s) => s.key === "testing")?.status !== "Active"}>
                    Record QC result
                  </Button>
                ) : (
                  <ButtonLink to={href.module("inventory", "mrp")} size="sm" iconRight={ArrowRight}>See shortages</ButtonLink>
                )
              }
            >
              {advance.error.includes("QC") ? (
                `QC is ${wo.qc.toLowerCase()}. Record a passed result, then complete testing to release dispatch.`
              ) : shortLines.length > 0 ? (
                <>
                  Short: {shortLines.map((l) => l.item.split(" ·")[0]).join(", ")}. Covered by <RecordLink id="PR-0084" /> once approved and received.
                </>
              ) : (
                "Resolve the block, then complete the stage again."
              )}
            </Callout>
          )}
          {!advance.error && blocked && (
            <Callout tone="risk" title={`${blocked.name} is blocked`} action={<ButtonLink to={href.module("inventory", "mrp")} size="sm" iconRight={ArrowRight}>See shortages</ButtonLink>}>
              <RefText text={blocked.note ?? "Waiting on material."} /> The stage starts as soon as the short lines are received and kitted.
            </Callout>
          )}
          {allDone && (
            <Callout tone="ok" title="Dispatched as finished goods">
              Serial <span className="mono">{wo.serial}</span> left the assembly store with a passed QC record.
            </Callout>
          )}

          <div className="row">
            {active ? (
              <Button variant="primary" icon={CheckCircle2} loading={advance.pending} onClick={complete}>
                Complete {active.name.toLowerCase()}
              </Button>
            ) : (
              !allDone && (
                <Button variant="primary" disabled icon={CircleDashed}>
                  Waiting on material
                </Button>
              )
            )}
            {active && <span className="inv-footnote">Owner: {active.owner}. Completing records today's date on the stage.</span>}
          </div>
        </div>

        <aside className="inv-gate" aria-label="Dispatch gate">
          <div className="inv-gate-head">
            <PackageCheck size={18} aria-hidden />
            <h3 className="inv-h">Dispatch gate</h3>
            <Status tone={allDone ? "ok" : preDispatchDone && wo.qc === "Passed" ? "ok" : "risk"}>{allDone ? "Dispatched" : preDispatchDone && wo.qc === "Passed" ? "Ready" : "Blocked"}</Status>
          </div>
          <ul className="inv-gate-list">
            <GateRow ok={preDispatchDone} label="Assembly and testing stages complete" detail={preDispatchDone ? "All done" : `${wo.stages.slice(0, dispatchIdx).filter((s) => s.status !== "Done").length} stages open`} />
            <GateRow ok={wo.qc === "Passed"} label="Production QC passed" detail={`QC is ${wo.qc.toLowerCase()} · ${wo.stages.find((s) => s.key === "testing")?.owner ?? "QC"}`} />
            <GateRow ok label="Serial tagged" detail={wo.serial} />
          </ul>
          <p className="inv-footnote">Dispatch needs a passed QC record first. Finished goods are received under the serial with their test result.</p>
          <Button icon={ClipboardCheck} block disabled={wo.stages.find((s) => s.key === "testing")?.status !== "Active"} onClick={() => setQcOpen(true)}>
            Record QC result
          </Button>
          {wo.stages.find((s) => s.key === "testing")?.status !== "Active" && !allDone && <p className="inv-footnote">Opens when the panel reaches testing.</p>}
        </aside>
      </div>
      <QcDialog wo={wo} open={qcOpen} onOpenChange={setQcOpen} />
    </Card>
  );
}

function GateRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className={cx("inv-gate-row", ok ? "is-ok" : "is-open")}>
      {ok ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
      <div>
        <div className="inv-gate-label">{label}</div>
        <div className="inv-gate-detail">{detail}</div>
      </div>
    </li>
  );
}

function QcDialog({ wo, open, onOpenChange }: { wo: WorkOrder; open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const [result, setResult] = useState<"Passed" | "Failed" | "">("");
  const [note, setNote] = useState("");
  const m = useMutation(recordWorkOrderQc);
  useEffect(() => {
    if (open) {
      setResult("");
      setNote("");
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardCheck}
      title={`Production QC · ${wo.serial}`}
      description={`${wo.id} · tested against BOM rev and FAT checklist`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={result === "Failed" ? "danger" : "primary"}
            disabled={!result}
            loading={m.pending}
            onClick={async () => {
              if (!result) return;
              const r = await m.run(wo.id, result, note);
              if (r) {
                onOpenChange(false);
                toast({ title: `QC ${result.toLowerCase()} on ${wo.id}`, body: result === "Passed" ? "Dispatch is unblocked once testing is completed." : "Panel returned for rework; dispatch stays blocked.", tone: result === "Passed" ? "ok" : "warn" });
              }
            }}
          >
            Record result
          </Button>
        </>
      }
    >
      <div className="stack">
        <RadioCards
          label="QC result"
          columns={2}
          value={result}
          onChange={(v) => { setResult(v); m.reset(); }}
          options={[
            { value: "Passed", title: "Passed", detail: "All checkpoints within limits" },
            { value: "Failed", title: "Failed · rework", detail: "Defect recorded, panel held" },
          ]}
        />
        <Field label={result === "Failed" ? "Defect and rework" : "Evidence note"} required={result === "Failed"} optional={result !== "Failed"} error={m.error} htmlFor="woqc-note">
          <Textarea id="woqc-note" rows={3} value={note} invalid={!!m.error} onChange={(e) => setNote(e.target.value)} placeholder={result === "Failed" ? "What failed, and what rework is needed?" : "e.g. IR test, I/O check and HMI sign-off attached"} />
        </Field>
      </div>
    </Dialog>
  );
}
