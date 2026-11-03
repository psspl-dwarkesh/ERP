import { ClipboardList, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { date, inr, num, time } from "../../api/format";
import { useMutation } from "../../api/hooks";
import type { Item, StockMovement } from "../../api/types";
import {
  Button,

  Card,
  CardHeader,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  LoadingRows,
  Person,
  RadioCards,
  RecordLink,
  Select,
  Status,
  Switch,
  Textarea,
  cx,
  useToast,
  type Column,
} from "../../ds/components";
import { decideAdjustment, submitCount } from "./commands";
import { RefText } from "./shared";

const SESSION = "CNT-0013";
const SESSION_ITEMS = ["ITM-0042", "ITM-0051", "ITM-0052", "ITM-0089"];
const REASONS = ["Damaged in store", "Mis-picked or wrong bin", "Unrecorded issue", "Unrecorded receipt", "Counting error suspected"];

type Line = { id: string; item: Item; counted: string; reason: string };

export function CountsView({ items, movements, loading }: { items: Item[]; movements: StockMovement[]; loading: boolean }) {
  const pending = movements.filter((m) => m.type === "Adjustment" && m.status === "Pending");
  const decided = movements.filter((m) => m.type === "Adjustment" && m.status !== "Pending");
  const [review, setReview] = useState<StockMovement | null>(null);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <section className="stack" style={{ gap: "var(--space-3)" }} aria-label="Variances awaiting approval">
        <div className="section-head">
          <div>
            <h2 className="section-title">Variances waiting for approval</h2>
            <p className="section-description">The counter can't approve their own variance.</p>
          </div>
        </div>
        {loading ? (
          <LoadingRows rows={2} columns={5} />
        ) : pending.length === 0 ? (
          <Card>
            <EmptyState icon={ShieldCheck} title="No variances waiting">
              Every count adjustment has been decided. New ones appear here as soon as a session is submitted.
            </EmptyState>
          </Card>
        ) : (
          <div className="inv-var-list">
            {pending.map((m) => {
              const it = items.find((i) => i.id === m.itemId);
              const value = it ? m.qty * it.unitCost : 0;
              return (
                <article key={m.id} className="inv-var">
                  <div className="inv-var-main">
                    <div className="row" style={{ gap: 8 }}>
                      <RecordLink id={m.id} />
                      <span className="t-muted">·</span>
                      <RefText text={m.reference} />
                      <Status size="sm">Pending review</Status>
                    </div>
                    <p className="inv-var-title">{m.item}</p>
                    <p className="inv-var-sub">
                      <RecordLink id={m.itemId} quiet /> · {m.from} · counted {date(m.at, true)} {time(m.at)} · {m.to.replace("Count variance · ", "").replace("Count variance", "No reason recorded")}
                    </p>
                  </div>
                  <div className="inv-var-figs">
                    <div>
                      <span className="inv-var-label">Variance</span>
                      <span className={cx("inv-var-num t-num", m.qty < 0 ? "is-out" : "is-in")}>
                        {m.qty > 0 ? "+" : ""}
                        {num(m.qty)} {it?.uom}
                      </span>
                    </div>
                    <div>
                      <span className="inv-var-label">Value at stake</span>
                      <span className="inv-var-num t-num">{inr(value)}</span>
                    </div>
                    <div>
                      <span className="inv-var-label">Counted by</span>
                      <Person name={m.by} size="xs" />
                    </div>
                  </div>
                  <div className="inv-var-actions">
                    <Button variant="primary" size="sm" onClick={() => setReview(m)}>
                      Review
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-main-aside" style={{ alignItems: "start" }}>
        <CountSession items={items} movements={movements} loading={loading} />
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <Card>
            <CardHeader title="Decided adjustments" />
            {decided.length === 0 ? (
              <p className="t-muted inv-footnote">None yet in this demo period.</p>
            ) : (
              <ul className="divider-list">
                {decided.map((m) => (
                  <li key={m.id} className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title inv-clip">{m.item}</div>
                      <div className="list-row-sub">
                        <RecordLink id={m.id} quiet /> · {m.qty > 0 ? "+" : ""}
                        {m.qty}
                      </div>
                    </div>
                    <Status>{m.status === "Blocked" ? "Recount" : m.status}</Status>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ReviewDialog movement={review} item={items.find((i) => i.id === review?.itemId)} onClose={() => setReview(null)} />
    </div>
  );
}

function CountSession({ items, movements, loading }: { items: Item[]; movements: StockMovement[]; loading: boolean }) {
  const toast = useToast();
  const submitted = movements.some((m) => m.reference === SESSION);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [blind, setBlind] = useState(false);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  const m = useMutation(submitCount);

  useEffect(() => {
    if (submitted) setDone(true);
  }, [submitted]);

  const lines: Line[] = useMemo(
    () => SESSION_ITEMS.map((id) => items.find((i) => i.id === id)).filter((i): i is Item => !!i).map((item) => ({ id: item.id, item, counted: counted[item.id] ?? "", reason: reasons[item.id] ?? "" })),
    [items, counted, reasons],
  );

  const variance = (l: Line) => (l.counted === "" ? null : Number(l.counted) - l.item.onHand);
  const counts = lines.filter((l) => l.counted !== "").length;
  const missingReason = (l: Line) => {
    const v = variance(l);
    return v !== null && v !== 0 && !l.reason;
  };
  const invalid = (l: Line) => l.counted !== "" && (!Number.isInteger(Number(l.counted)) || Number(l.counted) < 0);
  const totalValue = lines.reduce((a, l) => a + (variance(l) ?? 0) * l.item.unitCost, 0);
  const varianceCount = lines.filter((l) => (variance(l) ?? 0) !== 0).length;

  const submit = async () => {
    setTried(true);
    if (counts < lines.length || lines.some(missingReason) || lines.some(invalid)) return;
    const r = await m.run(
      SESSION,
      lines.map((l) => ({ itemId: l.id, system: l.item.onHand, counted: Number(l.counted), reason: l.reason })),
    );
    if (r) {
      setDone(true);
      toast({
        title: `${SESSION} submitted`,
        body: r.length ? `${r.length} variance${r.length > 1 ? "s" : ""} sent for approval. Stock is unchanged until approved.` : "No variances. Ledger and shelf agree.",
        tone: r.length ? "warn" : "ok",
      });
    }
  };

  const columns: Column<Line>[] = [
    {
      key: "item",
      header: "Item",
      cell: (l) => (
        <div className="cell-primary">
          <span className="cell-title inv-clip">{l.item.name}</span>
          <span className="cell-sub">
            <span className="mono">{l.item.id}</span> · bin {l.item.bin}
          </span>
        </div>
      ),
    },
    { key: "sys", header: "System", align: "right", cell: (l) => (blind && !done ? <span className="t-muted">Hidden</span> : <span className="cell-num">{num(l.item.onHand)}</span>) },
    {
      key: "count",
      header: "Counted",
      width: 130,
      cell: (l) => (
        <Input
          aria-label={`Counted quantity for ${l.item.id}`}
          type="number"
          inputMode="numeric"
          min={0}
          value={l.counted}
          disabled={done}
          invalid={invalid(l) || (tried && l.counted === "")}
          suffix={l.item.uom}
          onChange={(e) => {
            setCounted((c) => ({ ...c, [l.id]: e.target.value }));
            m.reset();
          }}
          className="inv-count-input"
        />
      ),
    },
    {
      key: "var",
      header: "Variance",
      align: "right",
      cell: (l) => {
        const v = variance(l);
        if (v === null || invalid(l)) return <span className="t-muted">—</span>;
        if (blind && !done) return <span className="t-muted">After submit</span>;
        return (
          <div className="cell-primary" style={{ alignItems: "flex-end" }}>
            <span className={cx("cell-num", v < 0 ? "inv-out" : v > 0 ? "inv-in" : "t-muted")}>
              {v > 0 ? "+" : ""}
              {v}
            </span>
            {v !== 0 && <span className="cell-sub t-num">{inr(v * l.item.unitCost)}</span>}
          </div>
        );
      },
    },
    {
      key: "reason",
      header: "Reason",
      width: 200,
      cell: (l) => {
        const v = variance(l);
        if (v === null || v === 0) return <span className="t-muted">{v === 0 ? "Matches" : ""}</span>;
        return (
          <Select
            size="sm"
            label={`Variance reason for ${l.item.id}`}
            placeholder="Pick a reason"
            value={l.reason}
            invalid={tried && !l.reason}
            onChange={(r) => setReasons((s) => ({ ...s, [l.id]: r }))}
            options={REASONS.map((r) => ({ value: r, label: r }))}
          />
        );
      },
    },
  ];

  const problems = tried ? [counts < lines.length && `${lines.length - counts} line${lines.length - counts > 1 ? "s" : ""} not counted`, lines.some(missingReason) && "a variance without a reason", lines.some(invalid) && "a quantity that isn't a whole number"].filter(Boolean) : [];

  return (
    <Card padded={false}>
      <div className="card-padded" style={{ paddingBottom: "var(--space-3)" }}>
        <CardHeader
          icon={ClipboardList}
          eyebrow={`${SESSION} · CYCLE COUNT`}
          title="Central warehouse · rack A"
          description={done ? "Submitted · variances are with the reviewer" : `In progress · Imran Sheikh · ${counts} of ${lines.length} counted`}
          actions={done ? <Status>Submitted</Status> : <Switch checked={blind} onChange={setBlind} label="Blind count" />}
        />
      </div>
      <div className="inv-flush">
        {loading ? <LoadingRows rows={4} columns={4} /> : <DataTable caption={`Count session ${SESSION}`} rows={lines} columns={columns} dense />}
      </div>
      <div className="inv-count-foot">
        <div className="inv-count-sum">
          {varianceCount > 0 && !(blind && !done) ? (
            <>
              <b className="t-num">{varianceCount}</b> variance{varianceCount > 1 ? "s" : ""} · <span className="t-num">{inr(totalValue)}</span> at cost
            </>
          ) : (
            <span className="t-muted">{counts ? "No variance so far" : "Enter what is on the shelf, not what the system says."}</span>
          )}
          {problems.length > 0 && <span className="inv-inline-error">Can't submit yet: {problems.join(", ")}.</span>}
          {m.error && <span className="inv-inline-error">{m.error}</span>}
        </div>
        {done ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDone(submitted);
              setCounted({});
              setReasons({});
              setTried(false);
            }}
            disabled={submitted}
          >
            {submitted ? "Session closed" : "Start again"}
          </Button>
        ) : (
          <Button variant="primary" loading={m.pending} onClick={submit}>
            Submit for approval
          </Button>
        )}
      </div>
    </Card>
  );
}

function ReviewDialog({ movement, item, onClose }: { movement: StockMovement | null; item?: Item; onClose: () => void }) {
  const toast = useToast();
  const [decision, setDecision] = useState<"approve" | "recount" | "">("");
  const [note, setNote] = useState("");
  const m = useMutation(decideAdjustment);
  useEffect(() => {
    setDecision("");
    setNote("");
    m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement?.id]);
  if (!movement) return null;
  const value = item ? movement.qty * item.unitCost : 0;

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={Scale}
      title={`Count variance · ${movement.item.split(" ·")[0]}`}
      description={`${movement.id} · from ${movement.reference} · counted by ${movement.by}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === "recount" ? "danger" : "primary"}
            disabled={!decision}
            loading={m.pending}
            onClick={async () => {
              if (!decision) return;
              const r = await m.run(movement.id, decision === "approve", note);
              if (r) {
                onClose();
                toast({
                  title: decision === "approve" ? `${movement.id} posted` : `${movement.id} sent back for recount`,
                  body: decision === "approve" ? `${item?.id} on hand changed by ${movement.qty}. The adjustment is now a ledger movement.` : "The count team sees your note; stock is unchanged.",
                  tone: decision === "approve" ? "ok" : "warn",
                });
              }
            }}
          >
            {decision === "recount" ? "Send for recount" : "Approve adjustment"}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="approval-summary inv-review-sum">
          <div>
            <span className="approval-label">Variance</span>
            <span className="t-strong t-num">
              {movement.qty > 0 ? "+" : ""}
              {movement.qty} {item?.uom}
            </span>
          </div>
          <div>
            <span className="approval-label">Value at cost</span>
            <span className="t-strong t-num">{inr(value, { compact: false })}</span>
          </div>
          <div>
            <span className="approval-label">After posting</span>
            <span className="t-num">{item ? `${item.onHand} → ${item.onHand + movement.qty} on hand` : "—"}</span>
          </div>
        </div>
        <RadioCards
          label="Decision"
          columns={2}
          value={decision}
          onChange={(v) => { setDecision(v); m.reset(); }}
          options={[
            { value: "approve", title: "Approve", detail: "Post the adjustment to the ledger" },
            { value: "recount", title: "Recount", detail: "Send back with what to check" },
          ]}
        />
        <Field label={decision === "recount" ? "What should the recount check?" : "Note"} required={decision === "recount"} optional={decision !== "recount"} error={m.error} htmlFor="adj-note" hint="Saved with your name to the audit trail.">
          <Textarea id="adj-note" rows={2} value={note} invalid={!!m.error} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}


