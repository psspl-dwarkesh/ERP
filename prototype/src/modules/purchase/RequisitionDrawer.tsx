import { ArrowRight, ClipboardX, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, inr, num, relativeDay, time } from "../../api/format";
import { useMutation, useQuery } from "../../api/hooks";
import type { Approval, Tone } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { href } from "../../app/router";
import { Button, ButtonLink, Callout, Drawer, EmptyState, KeyValues, LoadingRows, RecordLink, Status, Timeline, useToast } from "../../ds/components";
import { SourceText } from "./RequisitionsView";
import { submitRequisition } from "./commands";
import { OPS_HEAD_THRESHOLD, approverFor, prStatus } from "./util";

export function RequisitionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const prs = useQuery(api.purchaseRequests);
  const approvals = useQuery(api.approvals);
  const rfqs = useQuery(api.rfqs);
  const projects = useQuery(api.projects);
  const activity = useQuery(api.activity);
  const submit = useMutation(submitRequisition);
  const toast = useToast();
  const [review, setReview] = useState<Approval | null>(null);

  const loading = prs.loading || approvals.loading;
  const pr = prs.data?.find((p) => p.id === id);
  const all = approvals.data ?? [];
  const approval = all.find((a) => a.reference === id);
  const status = pr ? prStatus(pr, all) : undefined;
  const project = projects.data?.find((p) => p.id === pr?.projectId);
  const rfq = rfqs.data?.find((r) => r.prId === id);
  const raisedAt = activity.data?.find((e) => e.reference === id && (e.action.includes("submitted") || e.action.includes("created")));

  if (!loading && !pr) {
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()} title="Requisition not found" id={id}>
        <EmptyState icon={ClipboardX} title={`${id} isn't in this workspace`} action={<Button size="sm" onClick={onClose}>Back to requisitions</Button>}>
          It may have been archived before this system went live, or the id is mistyped.
        </EmptyState>
      </Drawer>
    );
  }

  const ops = (pr?.value ?? 0) > OPS_HEAD_THRESHOLD;
  const approver = approverFor(pr?.value ?? 0);
  const headroom = project ? project.budget - project.committed : undefined;

  const decided = approval && approval.status !== "Pending";
  const finalTone: Tone = status === "Rejected" ? "risk" : decided || status === "Approved" || status === "Converted" ? "ok" : status === "Awaiting approval" ? "warn" : "neutral";
  const chain = pr
    ? [
        {
          id: "raised",
          tone: (status === "Draft" ? "neutral" : "ok") as Tone,
          title: (
            <span>
              <strong>{status === "Draft" ? "Draft" : "Raised"}</strong> by {pr.requester}
            </span>
          ),
          meta: status === "Draft" ? "Not submitted yet — nobody has been asked to approve" : raisedAt ? `${ago(raisedAt.at)} · ${time(raisedAt.at)}` : "Before this week",
        },
        {
          id: "l1",
          tone: (status === "Draft" ? "neutral" : "ok") as Tone,
          title: (
            <span>
              <strong>Level 1 · Budget check</strong> {status === "Draft" ? "runs on submission" : "passed automatically"}
            </span>
          ),
          meta: project ? `${inr(pr.value)} against ${project.id} headroom of ${inr(headroom!)}` : "General procurement budget",
        },
        {
          id: "l2",
          tone: finalTone,
          title: (
            <span>
              <strong>Level 2 · {approver.role}</strong>
              {approver.person ? ` (${approver.person})` : ""}{" "}
              {status === "Approved" || status === "Converted" ? "approved" : status === "Rejected" ? "returned it" : status === "Awaiting approval" ? "to decide" : "waits for submission"}
            </span>
          ),
          meta: ops ? "Required above ₹2 L" : "Up to ₹2 L",
          body: status === "Awaiting approval" && approval ? <span className="pur-chain-note">Waiting {ago(approval.submitted).replace(" ago", "")} · {approval.id}</span> : undefined,
        },
        ...(status === "Converted"
          ? [{ id: "conv", tone: "accent" as Tone, title: <span><strong>Converted</strong> {rfq ? <>to <RecordLink id={rfq.id} /></> : "to a purchase order"}</span>, meta: "Requisition closed" }]
          : []),
      ]
    : [];

  return (
    <>
      <Drawer
        open
        onOpenChange={(o) => !o && onClose()}
        width={580}
        id={id}
        status={status ? <Status>{status}</Status> : undefined}
        title={pr?.title ?? "Loading requisition"}
        subtitle={pr ? `${inr(pr.value)} · raised by ${pr.requester} · need by ${date(pr.needBy, true)}` : undefined}
        footer={
          pr && (
            <>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              {status === "Draft" && (
                <Button
                  variant="primary"
                  icon={Send}
                  loading={submit.pending}
                  onClick={async () => {
                    const a = await submit.run(pr.id);
                    if (a) toast({ title: `${pr.id} submitted`, body: `Routed to the ${approver.role.toLowerCase()} · ${a.id}`, tone: "accent" });
                  }}
                >
                  Submit for approval
                </Button>
              )}
              {approval?.status === "Pending" && (
                <Button variant="primary" icon={ShieldCheck} onClick={() => setReview(approval)}>
                  Review approval
                </Button>
              )}
              {rfq && status !== "Draft" && approval?.status !== "Pending" && (
                <ButtonLink to={href.record(rfq.id)} variant="primary" iconRight={ArrowRight}>
                  Open {rfq.id}
                </ButtonLink>
              )}
            </>
          )
        }
      >
        {loading || !pr ? (
          <LoadingRows rows={4} columns={2} />
        ) : (
          <>
            {submit.error && <Callout tone="risk" title="Not submitted">{submit.error}</Callout>}
            {approval?.status === "Pending" && (
              <Callout tone="accent" icon={ShieldCheck} title={`Waiting on ${approval.level.split("·")[1]?.trim() ?? "approval"}`}>
                Evidence attached: {approval.evidence.join(" · ")}.
              </Callout>
            )}
            {status === "Rejected" && <Callout tone="risk" title="Returned to the requester">The approver's reason is on the audit trail. Revise and raise a new requisition.</Callout>}

            <KeyValues
              columns={2}
              items={[
                { label: "Raised from", value: <SourceText text={pr.source} /> },
                { label: "Project", value: pr.projectId ? <RecordLink id={pr.projectId}>{project?.customer}</RecordLink> : <span className="t-muted">General procurement</span> },
                { label: "Need by", value: <span>{date(pr.needBy)} <span className="t-muted">· {relativeDay(pr.needBy).toLowerCase()}</span></span> },
                { label: "Estimated value", value: <span className="t-num t-strong">{inr(pr.value, { compact: false })}</span> },
                { label: "Approval route", value: `Budget check → ${approver.role}` },
                { label: "Sourcing", value: rfq ? <RecordLink id={rfq.id}>{rfq.status}</RecordLink> : <span className="t-muted">No RFQ yet</span> },
              ]}
            />

            <section>
              <h3 className="pur-sub">Lines</h3>
              <ul className="pur-lines-list">
                {pr.lines.map((l, i) => (
                  <li key={i}>
                    <span className="pur-lines-n mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pur-lines-item">{l.item}</span>
                    <span className="cell-num">
                      {num(l.qty)} {l.uom}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="pur-sub">Approval chain</h3>
              <Timeline items={chain} />
            </section>
          </>
        )}
      </Drawer>
      <ApprovalDialog approval={review} open={!!review} onOpenChange={(o) => !o && setReview(null)} />
    </>
  );
}
