import { FileBadge2, FileQuestion, Gauge, Ruler } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { date } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { CalibrationJob } from "../../api/types";
import {
  Button,
  Callout,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  KeyValues,
  LoadingRows,
  Person,
  RadioCards,
  RecordLink,
  Status,
  Textarea,
  useToast,
  type Column,
} from "../../ds/components";
import { dispositionCalibration } from "./commands";
import { DueText, openAssetsRecord } from "./shared";

const ORDER: Record<CalibrationJob["status"], number> = { Overdue: 0, Failed: 1, Due: 2, Scheduled: 3, Passed: 4 };

/** "10.007 bar" → 10.007; "±0.005" → 0.005 */
const numOf = (s: string) => parseFloat(s.replace(/[^0-9.+-]/g, ""));
const unitOf = (s: string) => s.replace(/^[\s0-9.+-]+/, "").trim();

function analyse(p: CalibrationJob["points"][number]) {
  const dev = numOf(p.reading) - numOf(p.nominal);
  const tol = numOf(p.tolerance);
  return { dev, tol, over: Math.max(0, Math.abs(dev) - tol), unit: unitOf(p.reading) };
}
const fmt = (n: number, digits = 4) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")}`;

/** The master instrument a result is only as good as (E2E-07 step 2). */
function referenceFor(job: CalibrationJob) {
  if (/pressure/i.test(job.asset)) return { id: "ITM-0402", label: "Fluke pressure reference" };
  if (job.assetId === "AST-0093") return { id: null, label: "External accredited lab" };
  return { id: null, label: "Allocated when the job is scheduled" };
}

export function CalibrationView({ jobs, loading, activeId }: { jobs: CalibrationJob[]; loading: boolean; activeId?: string }) {
  const sorted = [...jobs].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.due.localeCompare(b.due));
  const overdue = jobs.filter((j) => j.status === "Overdue");
  const failing = jobs.filter((j) => j.status !== "Failed" && j.points.some((p) => !p.pass));

  const columns: Column<CalibrationJob>[] = [
    {
      key: "job",
      header: "Instrument",
      sort: (j) => j.asset,
      cell: (j) => (
        <div className="cell-primary">
          <span className="cell-title ast-clip">{j.asset}</span>
          <span className="cell-sub">
            <span className="mono">{j.id}</span> · <span className="mono">{j.assetId}</span>
          </span>
        </div>
      ),
    },
    {
      key: "due",
      header: "Due",
      sort: (j) => j.due,
      cell: (j) => (
        <div className="cell-primary">
          <span className="cell-num">{date(j.due, true)}</span>
          {j.status === "Passed" ? <span className="cell-sub">Completed</span> : <DueText iso={j.due} />}
        </div>
      ),
    },
    { key: "eng", header: "Engineer", priority: 2, sort: (j) => j.engineer, cell: (j) => <Person name={j.engineer} size="xs" /> },
    {
      key: "result",
      header: "Readings",
      cell: (j) => {
        if (!j.points.length) return <span className="t-muted">No readings yet</span>;
        const bad = j.points.filter((p) => !p.pass).length;
        return bad ? <span className="ast-bad">{bad} of {j.points.length} out of tolerance</span> : <span className="ast-good">All {j.points.length} within tolerance</span>;
      },
    },
    { key: "cert", header: "Certificate", priority: 2, cell: (j) => (j.certificate ? <span className="mono">{j.certificate}</span> : <span className="t-muted">Not issued</span>) },
    { key: "status", header: "Status", sort: (j) => ORDER[j.status], cell: (j) => <Status>{j.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {!loading && (overdue.length > 0 || failing.length > 0) && (
        <div className="ast-cal-alerts">
          {overdue.map((j) => (
            <Callout key={j.id} tone="risk" title={`${j.asset} is overdue since ${date(j.due, true)}`} action={<Button size="sm" onClick={() => openAssetsRecord(j.id, "calibration")}>Open {j.id}</Button>}>
              <RecordLink id={j.assetId} /> can't be used where a calibrated instrument is required until {j.engineer} completes the job.
            </Callout>
          ))}
          {failing.map((j) => (
            <Callout key={j.id} tone="warn" title={`${j.id}: ${j.points.filter((p) => !p.pass).length} point out of tolerance on ${j.asset.toLowerCase()}`} action={<Button size="sm" variant="primary" onClick={() => openAssetsRecord(j.id, "calibration")}>Decide disposition</Button>}>
              A failed point is a state change, not a comment. The instrument stays out of use until it is adjusted and re-verified or recertified.
            </Callout>
          ))}
        </div>
      )}
      <DataTable
        caption="Calibration jobs"
        loading={loading}
        rows={sorted}
        columns={columns}
        activeId={activeId}
        onRowClick={(j) => openAssetsRecord(j.id, "calibration")}
        empty={<EmptyState icon={Gauge} title="No calibration obligations">Instruments with a calibration interval appear here as their due date approaches.</EmptyState>}
      />
    </div>
  );
}

export function CalibrationDrawer({ id, jobs, loading, onClose }: { id: string; jobs: CalibrationJob[]; loading: boolean; onClose: () => void }) {
  const toast = useToast();
  const j = jobs.find((x) => x.id === id);
  const prs = useQuery(api.purchaseRequests);
  const [choice, setChoice] = useState<"adjust" | "external" | "">("");
  const [note, setNote] = useState("");
  const m = useMutation(dispositionCalibration);
  useEffect(() => {
    setChoice("");
    setNote("");
    m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!j) {
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()} id={id} title={loading ? "Loading calibration" : "Calibration not found"} width={620}>
        {loading ? <LoadingRows rows={4} columns={3} /> : <EmptyState title={`${id} isn't a calibration job here`} />}
      </Drawer>
    );
  }

  const ref = referenceFor(j);
  const fails = j.points.filter((p) => !p.pass);
  const recert = prs.data?.find((p) => p.source.includes(j.id));

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width={620}
      id={j.id}
      status={<Status>{j.status}</Status>}
      title={j.asset}
      subtitle={`Calibration due ${date(j.due)} · ${j.engineer}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {fails.length > 0 && j.status !== "Failed" && (
            <Button
              variant="primary"
              disabled={!choice}
              loading={m.pending}
              onClick={async () => {
                if (!choice) return;
                const r = await m.run(j.id, choice, note);
                if (r)
                  toast({
                    title: `${j.id} recorded as out of tolerance`,
                    body: choice === "external" ? `${j.assetId} goes for external recertification${recert ? ` under ${recert.id}` : ""}. It stays unavailable until accepted.` : `${j.assetId} is held for adjustment and re-verification by ${j.engineer}.`,
                    tone: "warn",
                  });
              }}
            >
              Record disposition
            </Button>
          )}
        </>
      }
    >
      <section className="stack-sm stack">
        <KeyValues
          columns={3}
          items={[
            { label: "Instrument", value: <RecordLink id={j.assetId} /> },
            { label: "Due", value: <span>{date(j.due, true)} · {j.status === "Passed" ? "done" : <DueText iso={j.due} />}</span> },
            { label: "Engineer", value: <Person name={j.engineer} size="xs" /> },
          ]}
        />
        <KeyValues
          items={[
            { label: "Reference standard", value: ref.id ? <span className="row" style={{ gap: 8 }}><RecordLink id={ref.id} /><span>{ref.label} · the result is only as good as this standard</span></span> : <span className="t-muted">{ref.label}</span> },
          ]}
        />
      </section>

      <section className="stack-sm stack">
        <h3 className="ast-h">
          <Ruler size={15} aria-hidden /> Measurement points
        </h3>
        {j.points.length === 0 ? (
          <EmptyState icon={Gauge} title="No readings yet">
            As-found and as-left readings are entered when {j.engineer} starts the job{j.status === "Overdue" ? " — it is already overdue" : ""}.
          </EmptyState>
        ) : (
          <div className="table-wrap ast-points">
            <table className="table">
              <caption className="sr-only">Calibration readings for {j.id}</caption>
              <thead>
                <tr>
                  <th>Nominal</th>
                  <th style={{ textAlign: "right" }}>Reading</th>
                  <th style={{ textAlign: "right" }}>Deviation</th>
                  <th style={{ textAlign: "right" }}>Tolerance</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {j.points.map((p) => {
                  const a = analyse(p);
                  return (
                    <tr key={p.nominal} className={p.pass ? undefined : "is-fail"}>
                      <td className="cell-num">{p.nominal}</td>
                      <td className="cell-num" style={{ textAlign: "right" }}>{p.reading}</td>
                      <td className="cell-num" style={{ textAlign: "right" }}>{fmt(a.dev)} {a.unit}</td>
                      <td className="cell-num" style={{ textAlign: "right" }}>{p.tolerance}</td>
                      <td><Status>{p.pass ? "Pass" : "Failed"}</Status></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {fails.map((p) => {
          const a = analyse(p);
          return (
            <Callout key={p.nominal} tone="risk" title={`${p.nominal} point reads ${fmt(a.dev)} ${a.unit} against ${p.tolerance}`}>
              Outside tolerance by {Math.abs(a.over).toFixed(3)} {a.unit}. The lower points pass, so this is a span error at the top of the range rather than a zero offset. {j.assetId} can't be issued to jobs that need a calibrated standard until it is adjusted and re-verified, or recertified.
            </Callout>
          );
        })}
      </section>

      {fails.length > 0 && j.status !== "Failed" && (
        <section className="stack-sm stack">
          <h3 className="ast-h">Disposition</h3>
          <RadioCards
            label="Disposition"
            columns={2}
            value={choice}
            onChange={(v) => { setChoice(v); m.reset(); }}
            options={[
              { value: "adjust", title: "Adjust and re-verify", detail: `In-house by ${j.engineer}, then repeat all points` },
              { value: "external", title: "External recertification", detail: recert ? `${recert.id} is ${recert.status.toLowerCase()} for this` : "Raise a requisition for the lab" },
            ]}
          />
          <Field label="Reason" required htmlFor="cal-note" error={m.error} hint="Kept with the readings. Reviewed readings are never edited; a correction is a new event.">
            <Textarea id="cal-note" rows={2} value={note} invalid={!!m.error} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Span drift at 10 bar; zero and mid-range fine" />
          </Field>
        </section>
      )}
      {j.status === "Failed" && (
        <Callout tone="warn" title="Out-of-tolerance recorded">
          {j.assetId} is held out of use. Acceptance of a new certificate sets the next due date and clears the hold.
        </Callout>
      )}

      <section className="stack-sm stack">
        <h3 className="ast-h">
          <FileBadge2 size={15} aria-hidden /> Certificate
        </h3>
        {j.certificate ? (
          <KeyValues columns={3} items={[{ label: "Certificate", value: <span className="mono">{j.certificate}</span> }, { label: "State", value: <Status>Accepted</Status> }, { label: "Approver", value: "Quality lead" }]} />
        ) : (
          <p className="ast-footnote">Not issued. {fails.length ? "Blocked by the out-of-tolerance point." : j.points.length ? "Waiting for review of the readings." : "Issued after the readings are reviewed."}</p>
        )}
        <Callout tone="info" icon={FileQuestion} title="Open in scope: certificate authoring or attachment only">
          Whether Threadline generates the certificate or stores the lab's PDF is undecided. Both paths end in the same review action, which sets the next due date.
        </Callout>
      </section>
    </Drawer>
  );
}
