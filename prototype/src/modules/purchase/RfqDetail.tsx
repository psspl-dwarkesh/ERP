import { ArrowLeft, ArrowRight, Award, CheckCircle2, Download, FileSearch, FileX, Sparkles, Timer, Truck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { TODAY } from "../../api/fixtures";
import { date, inr, num, relativeDay } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Approval } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { href } from "../../app/router";
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  Field,
  LoadingRows,
  PageHeader,
  Progress,
  RadioCards,
  RecordLink,
  Status,
  Tag,
  Textarea,
  cx,
  downloadCsv,
  useToast,
} from "../../ds/components";
import { Stars } from "./Stars";
import { raisePurchaseOrder } from "./commands";
import { daysBetween, evaluateRfq, fitTone, prStatus, type QuoteEval } from "./util";

export function RfqDetail({ id }: { id: string }) {
  const rfqs = useQuery(api.rfqs);
  const prs = useQuery(api.purchaseRequests);
  const vendors = useQuery(api.vendors);
  const approvals = useQuery(api.approvals);
  const pos = useQuery(api.purchaseOrders);
  const award = useMutation(api.awardRfq);
  const raise = useMutation(raisePurchaseOrder);
  const toast = useToast();
  const [choice, setChoice] = useState("");
  const [rationale, setRationale] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedRationale, setSavedRationale] = useState<string | null>(null);
  const [review, setReview] = useState<Approval | null>(null);

  if (rfqs.loading || prs.loading || vendors.loading) {
    return (
      <div className="stack">
        <LoadingRows rows={2} columns={4} />
        <LoadingRows rows={8} columns={4} />
      </div>
    );
  }

  const rfq = rfqs.data?.find((r) => r.id === id);
  if (!rfq) {
    return (
      <Card>
        <EmptyState icon={FileX} title={`There is no RFQ ${id}`} action={<ButtonLink to={href.module("purchase", "rfqs")} icon={ArrowLeft} size="sm">Back to RFQs</ButtonLink>}>
          RFQ ids look like RFQ-0041. It may have been cancelled and archived.
        </EmptyState>
      </Card>
    );
  }

  const pr = prs.data?.find((p) => p.id === rfq.prId);
  const allApprovals = approvals.data ?? [];
  const status = pr ? prStatus(pr, allApprovals) : undefined;
  const prApproval = allApprovals.find((a) => a.reference === rfq.prId && a.status === "Pending");
  const { evals, rec, reason } = evaluateRfq(rfq, pr?.needBy, vendors.data ?? []);
  const awarded = rfq.status === "Awarded" ? evals.find((e) => e.q.vendor === rfq.awardedTo) : undefined;
  const po = (pos.data ?? []).find((p) => p.title.includes(rfq.id));
  const chosen = evals.find((e) => e.q.vendorId === choice);
  const needDays = pr ? daysBetween(TODAY, pr.needBy) : undefined;
  const scale = Math.max(...evals.map((e) => e.q.leadDays), needDays ?? 0) * 1.12;

  const submitAward = async () => {
    setLocalError(null);
    if (!choice) return setLocalError("Choose the supplier to award.");
    if (!rationale.trim()) return setLocalError("Record why this supplier was chosen. The approver and auditors read this.");
    const r = await award.run(rfq.id, choice, rationale);
    if (r) {
      setSavedRationale(rationale.trim());
      toast({ title: `${rfq.id} awarded to ${r.awardedTo}`, body: status === "Approved" ? "Rationale saved. Raise the purchase order next." : `Rationale saved. The PO can be raised once ${rfq.prId} is approved.` });
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `${rfq.id}-comparison.csv`,
      ["Supplier", "Vendor id", "Price (INR)", "Lead days", "Arrives", "Days after need-by", "Technical fit", "Warranty months", "Payment terms", "Rating", "On-time %", "Notes"],
      evals.map((e) => [e.q.vendor, e.q.vendorId, e.q.price, e.q.leadDays, e.arrival, e.lateBy, e.q.technicalFit, e.q.warrantyMonths, e.q.paymentTerms, e.vendor?.rating ?? "", e.vendor?.onTimeRate ?? "", e.q.notes]),
    );
    toast({ title: "Comparison exported", body: `${rfq.id}-comparison.csv · ${evals.length} quotes` });
  };

  const colClass = (e: QuoteEval) => cx(awarded ? awarded === e && "is-awarded" : rec === e && "is-rec");

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Purchase", to: href.module("purchase") }, { label: "RFQs", to: href.module("purchase", "rfqs") }, { label: rfq.id }]}
        id={rfq.id}
        title={rfq.title}
        description={`${evals.length} supplier quote${evals.length === 1 ? "" : "s"} against ${rfq.prId}${pr ? ` · ${pr.lines.map((l) => `${num(l.qty)} × ${l.item}`).join(", ")}` : ""}`}
        meta={
          <>
            <Status>{rfq.status}</Status>
            <span>Closes {date(rfq.closes, true)} · {relativeDay(rfq.closes).toLowerCase()}</span>
            {pr && <span>Need by <b className="t-strong">{date(pr.needBy, true)}</b> ({relativeDay(pr.needBy).toLowerCase()})</span>}
          </>
        }
        actions={
          <Button icon={Download} onClick={exportCsv}>
            Export comparison
          </Button>
        }
      />

      <div className="pur-rfq-context">
        <div>
          <span className="pur-k">Requisition</span>
          <span className="pur-v">
            <RecordLink id={rfq.prId} /> {status && <Status size="sm">{status}</Status>}
          </span>
        </div>
        <div>
          <span className="pur-k">Project</span>
          <span className="pur-v">{rfq.projectId ? <RecordLink id={rfq.projectId} /> : <span className="t-muted">General</span>}</span>
        </div>
        <div>
          <span className="pur-k">Requisition estimate</span>
          <span className="pur-v t-num">{pr ? inr(pr.value) : "—"}</span>
        </div>
        <div>
          <span className="pur-k">Need by</span>
          <span className="pur-v t-num">{pr ? `${date(pr.needBy, true)} · ${needDays} days out` : "Not stated"}</span>
        </div>
      </div>

      {!awarded && rec && (
        <section className="pur-rec" aria-label="Recommendation">
          <span className="pur-rec-icon">
            <Sparkles size={18} aria-hidden />
          </span>
          <div className="pur-rec-body">
            <p className="pur-rec-kicker">Recommended on delivery and fit, not price alone</p>
            <h2 className="pur-rec-title">{rec.q.vendor}</h2>
            <p className="pur-rec-text">{reason}</p>
          </div>
          <div className="pur-rec-figs">
            <span>
              <b className="t-num">{inr(rec.q.price)}</b> quoted
            </span>
            <span>
              <b className="t-num">{date(rec.arrival, true)}</b> arrival
            </span>
          </div>
        </section>
      )}

      {awarded && (
        <Callout
          tone="ok"
          icon={Award}
          title={`Awarded to ${awarded.q.vendor} · ${inr(awarded.q.price)}`}
          action={
            po ? (
              <ButtonLink to={`#/app/purchase/${po.id}?tab=orders`} size="sm" iconRight={ArrowRight}>
                Open {po.id}
              </ButtonLink>
            ) : undefined
          }
        >
          {savedRationale ? <>Rationale: “{savedRationale}”. </> : <>Selection rationale is on the audit trail. </>}
          {po ? (
            <>
              Ordered on <RecordLink id={po.id} /> — expected {date(po.expected, true)}.
            </>
          ) : (
            <>Arrives about {date(awarded.arrival, true)} once ordered.</>
          )}
        </Callout>
      )}

      <Card padded={false}>
        <div className="card-padded" style={{ paddingBottom: "var(--space-3)" }}>
          <CardHeader icon={FileSearch} title="Supplier comparison" description="Same lines, every supplier side by side. Lead time is measured from today against the requisition's need-by date." />
        </div>
        <div className="pur-compare-wrap" role="region" aria-label="Supplier comparison" tabIndex={0}>
          <table className="pur-compare">
            <thead>
              <tr>
                <th scope="col" className="pur-compare-corner">
                  Criteria
                </th>
                {evals.map((e) => (
                  <th key={e.q.vendorId} scope="col" className={colClass(e)}>
                    <div className="pur-sup">
                      {awarded === e ? <Tag tone="ok" icon={Award}>Awarded</Tag> : !awarded && rec === e ? <Tag tone="accent" icon={Sparkles}>Recommended</Tag> : <span className="pur-sup-spacer" />}
                      <span className="pur-sup-name">{e.q.vendor}</span>
                      <span className="pur-sup-meta">
                        <RecordLink id={e.q.vendorId} quiet /> {e.vendor && <>· {e.vendor.city}</>}
                      </span>
                      <span className="pur-sup-tags">
                        {e.lowest && <Tag tone="info">Lowest price</Tag>}
                        {e.fastest && <Tag tone="violet" icon={Timer}>Fastest</Tag>}
                        {e.fullFit && <Tag tone="ok" icon={CheckCircle2}>Full technical fit</Tag>}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Price<span>As quoted, ex-GST</span>
                </th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    <span className="pur-big t-num">{inr(e.q.price, { compact: false })}</span>
                    <span className={cx("pur-cell-sub", e.lowest && "pur-t-ok")}>{e.lowest ? "Lowest quote" : `+${inr(e.priceDelta, { compact: false })} · +${((e.priceDelta / (e.q.price - e.priceDelta)) * 100).toFixed(1)}%`}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  Lead time<span>Against need-by {pr ? date(pr.needBy, true) : "—"}</span>
                </th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    <span className="pur-big t-num">{e.q.leadDays} days</span>
                    <span className="pur-cell-sub">Lands {date(e.arrival, true)}</span>
                    <div className="pur-lead" aria-hidden>
                      <span className={cx("pur-lead-bar", e.lateBy ? (e.lateBy > 7 ? "tone-risk" : "tone-warn") : "tone-ok")} style={{ width: `${(e.q.leadDays / scale) * 100}%` }} />
                      {needDays !== undefined && <i className="pur-lead-need" style={{ left: `${(needDays / scale) * 100}%` }} />}
                    </div>
                    {pr && (e.lateBy ? <Status tone={e.lateBy > 7 ? "risk" : "warn"} size="sm">{`${e.lateBy} days after need-by`}</Status> : <Status tone="ok" size="sm">Before need-by</Status>)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  Technical fit<span>Against BOM specification</span>
                </th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    <Status tone={fitTone(e.q.technicalFit)}>{e.q.technicalFit === "Full" ? "Full fit" : e.q.technicalFit}</Status>
                    {e.q.technicalFit !== "Full" && <span className="pur-cell-sub pur-t-risk">Needs engineering approval before ordering</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Warranty</th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    <span className="t-num">{e.q.warrantyMonths} months</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Payment terms</th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    {e.q.paymentTerms}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  Vendor record<span>Rating · on-time delivery, 12 months</span>
                </th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={colClass(e)}>
                    {e.vendor ? (
                      <div className="pur-vendor-rec">
                        <Stars rating={e.vendor.rating} />
                        <div className="pur-ontime">
                          <Progress value={e.vendor.onTimeRate} size="sm" tone={e.vendor.onTimeRate < 85 ? "warn" : "ok"} label={`${e.q.vendor} on-time rate`} />
                          <span className="cell-num">{e.vendor.onTimeRate}%</span>
                        </div>
                        <span className="pur-cell-sub">{e.vendor.openPOs} open PO{e.vendor.openPOs === 1 ? "" : "s"}</span>
                      </div>
                    ) : (
                      <span className="t-muted">New vendor — no history</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Notes</th>
                {evals.map((e) => (
                  <td key={e.q.vendorId} className={cx(colClass(e), "pur-notes")}>
                    {e.q.notes || <span className="t-muted">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pur-compare-foot">Taxes, freight and currency are not captured separately in this prototype; all quotes are INR, delivered to Pune.</p>
      </Card>

      {!awarded ? (
        <Card>
          <CardHeader icon={Award} title="Award" description="Nothing is pre-selected. The rationale is saved with your name to the audit trail and shown to the requisition approver." />
          <div className="pur-form">
            <RadioCards
              label="Supplier to award"
              columns={2}
              value={choice}
              onChange={(v) => {
                setChoice(v);
                setLocalError(null);
                award.reset();
              }}
              options={evals.map((e) => ({
                value: e.q.vendorId,
                title: e.q.vendor,
                detail: `${inr(e.q.price)} · ${e.q.leadDays} days · ${e.q.technicalFit === "Full" ? "full fit" : e.q.technicalFit.toLowerCase()}`,
                aside: rec === e ? <Tag tone="accent">Recommended</Tag> : undefined,
              }))}
            />
            {chosen && rec && chosen !== rec && (
              <Callout tone={chosen.q.technicalFit === "Deviation" ? "risk" : "warn"} title={chosen.q.technicalFit === "Deviation" ? `${chosen.q.vendor} quotes a deviation` : `You're choosing against the recommendation`}>
                {chosen.q.technicalFit === "Deviation"
                  ? `${chosen.q.notes}. Engineering must approve the substitute before the PO is raised, and it lands ${chosen.lateBy - rec.lateBy} days later than ${rec.q.vendor}.`
                  : `${chosen.q.vendor} saves ${inr(Math.max(0, rec.q.price - chosen.q.price))} but lands ${date(chosen.arrival, true)}, ${chosen.lateBy - rec.lateBy} days later. Say in the rationale how the schedule absorbs that.`}
              </Callout>
            )}
            <Field label="Selection rationale" required htmlFor="rfq-rationale" error={localError ?? award.error} hint="Why this supplier: delivery against need-by, fit, price, vendor record. At least 12 characters.">
              <Textarea
                id="rfq-rationale"
                rows={3}
                value={rationale}
                onChange={(e) => {
                  setRationale(e.target.value);
                  setLocalError(null);
                  award.reset();
                }}
                invalid={!!(localError ?? award.error)}
                placeholder={rec ? `e.g. ${rec.q.vendor}: only full-fit quote that can land before the loop test; premium over the lowest quote accepted to protect SAT.` : "Why this supplier?"}
              />
            </Field>
            <div className="pur-award-actions">
              <span className="pur-cell-sub">{status && status !== "Approved" ? `${rfq.prId} is ${status.toLowerCase()}. You can award now; the PO waits for the approval.` : "After award, raise the purchase order from here."}</span>
              <Button variant="primary" icon={Award} loading={award.pending} onClick={submitAward}>
                {chosen ? `Award to ${chosen.q.vendor}` : "Award"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        !po && (
          <Card>
            <CardHeader icon={Truck} title="Purchase order" description={`${awarded.q.vendor} · ${inr(awarded.q.price)} · ${awarded.q.leadDays} days lead · ${awarded.q.paymentTerms}`} />
            {raise.error && (
              <Callout
                tone="warn"
                title="The order can't be raised yet"
                action={
                  prApproval ? (
                    <Button size="sm" variant="primary" onClick={() => setReview(prApproval)}>
                      Review {rfq.prId}
                    </Button>
                  ) : undefined
                }
              >
                {raise.error}
              </Callout>
            )}
            <div className="pur-award-actions">
              <span className="pur-cell-sub">Lines and quantities come from {rfq.prId}; the value is the awarded quote. Expected date = today + quoted lead time.</span>
              <Button
                variant="primary"
                icon={Truck}
                loading={raise.pending}
                onClick={async () => {
                  const r = await raise.run(rfq.id);
                  if (r) toast({ title: `${r.id} issued to ${r.vendor}`, body: `${inr(r.value)} · expected ${date(r.expected, true)}. ${rfq.prId} is now converted.`, action: { label: "Open", onClick: () => (window.location.hash = `#/app/purchase/${r.id}?tab=orders`) } });
                }}
              >
                Raise purchase order
              </Button>
            </div>
          </Card>
        )
      )}

      <ApprovalDialog approval={review} open={!!review} onOpenChange={(o) => !o && setReview(null)} />
    </>
  );
}
