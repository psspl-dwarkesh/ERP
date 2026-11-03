import { ArrowRight, Clock3, FileCheck2, GitBranch, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { NOW } from "../../api/fixtures";
import { ago, date, num, time } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval, Bom, BomLine, Item } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { href } from "../../app/router";
import { Button, ButtonLink, Callout, Card, CardHeader, DataTable, EmptyState, KeyValues, LoadingRows, RecordLink, Status, Timeline, type Column } from "../../ds/components";
import { freeQty } from "./shared";

type Row = BomLine & { id: string; free: number; shortage: number; held: number };

export function MrpView({ items, highlight }: { items: Item[]; highlight?: string }) {
  const boms = useQuery(api.boms);
  const approvals = useQuery(api.approvals);
  const prs = useQuery(api.purchaseRequests);
  const workOrders = useQuery(api.workOrders);
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);

  const bom: Bom | undefined = boms.data?.find((b) => b.id === "BOM-042");
  const unknownBom = highlight && !highlight.startsWith("BOM-042") && boms.data && !boms.data.some((b) => b.id === highlight) ? highlight : null;
  const revD = approvals.data?.find((a) => a.reference === "BOM-042-D");
  const pr84 = prs.data?.find((p) => p.id === "PR-0084");
  const pr86 = prs.data?.find((p) => p.id === "PR-0086");
  const wo = workOrders.data?.find((w) => w.bomId === "BOM-042");

  if (boms.loading) return <LoadingRows rows={7} columns={6} />;
  if (!bom) return <EmptyState title="No released BOM in this workspace">Release a BOM in engineering to run material requirements.</EmptyState>;

  const rows: Row[] = bom.lines.map((l) => {
    const it = items.find((i) => i.id === l.itemId);
    const free = it ? freeQty(it) : l.available;
    return { ...l, id: l.itemId, free, held: it?.quarantined ?? 0, shortage: Math.max(0, l.required - l.reserved - free - l.onOrder) };
  });
  const short = rows.filter((r) => r.shortage > 0);
  const prLines = short.filter((r) => pr84?.lines.some((pl) => pl.item === r.item));
  const heldLines = short.filter((r) => r.held > 0);

  const cover = (r: Row) => {
    if (!r.shortage) return r.reserved >= r.required ? <span className="t-muted">Reserved in full</span> : <span className="t-muted">From free stock</span>;
    if (pr84?.lines.some((pl) => pl.item === r.item))
      return (
        <span className="inv-cover">
          <RecordLink id="PR-0084" /> <Status size="sm">{pr84.status}</Status>
        </span>
      );
    if (r.held > 0)
      return (
        <span className="inv-cover">
          <RecordLink id={r.itemId} quiet>QC hold</RecordLink>
          {pr86 && (
            <span className="t-muted">
              fallback <RecordLink id="PR-0086" quiet />
            </span>
          )}
        </span>
      );
    return <span className="inv-uncovered">Not covered</span>;
  };

  const columns: Column<Row>[] = [
    {
      key: "item",
      header: "Component",
      sort: (r) => r.item,
      cell: (r) => (
        <div className="cell-primary">
          <span className="cell-title inv-clip">{r.item}</span>
          <span className="cell-sub">
            <RecordLink id={r.itemId} quiet />
            {r.held > 0 && ` · ${r.held} on QC hold, not counted`}
          </span>
        </div>
      ),
    },
    { key: "req", header: "Required", align: "right", sort: (r) => r.required, cell: (r) => <span className="cell-num">{num(r.required)}</span> },
    { key: "res", header: "Reserved", align: "right", sort: (r) => r.reserved, cell: (r) => <span className="cell-num">{num(r.reserved)}</span> },
    { key: "free", header: "Free", align: "right", sort: (r) => r.free, cell: (r) => <span className="cell-num">{num(r.free)}</span> },
    { key: "ord", header: "On order", align: "right", priority: 2, sort: (r) => r.onOrder, cell: (r) => <span className="cell-num">{num(r.onOrder)}</span> },
    {
      key: "short",
      header: "Shortage",
      align: "right",
      sort: (r) => r.shortage,
      cell: (r) =>
        r.shortage ? (
          <span className="cell-num inv-short-flag">
            −{num(r.shortage)} {r.uom}
          </span>
        ) : (
          <span className="cell-num t-muted">—</span>
        ),
    },
    { key: "cover", header: "Covered by", priority: 2, cell: cover },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {unknownBom && (
        <Callout tone="info" title={`${unknownBom} isn't in this demo dataset`}>
          Showing the BOM that drives the flagship job instead.
        </Callout>
      )}
      <div className="grid grid-main-aside">
        <div className="stack" style={{ gap: "var(--space-4)", minWidth: 0 }}>
          <Card className={highlight?.startsWith("BOM-042") ? "inv-focus" : undefined}>
            <CardHeader
              icon={GitBranch}
              eyebrow={`${bom.id} · REV ${bom.revision}`}
              title={bom.name}
              description={
                <span className="row" style={{ gap: "var(--space-2) var(--space-3)" }}>
                  <span>
                    Demand: {wo ? <RecordLink id={wo.id} /> : null} for <RecordLink id={bom.projectId} />
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <Clock3 size={13} aria-hidden /> Run {date(NOW, true)}, {time(NOW)} IST against rev {bom.revision}
                  </span>
                </span>
              }
              actions={<Status>{bom.status}</Status>}
            />
            {short.length > 0 ? (
              <Callout
                tone="warn"
                title={`${short.length} of ${rows.length} lines short for ${wo?.id ?? "the work order"} assembly`}
                action={<ButtonLink to={href.record("PR-0084")} size="sm" iconRight={ArrowRight}>Open PR-0084</ButtonLink>}
              >
                {prLines.length > 0 && (
                  <>
                    {prLines.map((r) => r.item.split(" ·")[0]).join(" and ")} are covered by <RecordLink id="PR-0084" /> ({pr84?.status.toLowerCase()}), with quotes on <RecordLink id="RFQ-0041" />.{" "}
                  </>
                )}
                {heldLines.length > 0 && (
                  <>
                    {heldLines.map((r) => `${r.held} ${r.item.split(" ·")[0].toLowerCase()}s`).join(", ")} exist but sit on QC hold, so they count as zero{pr86 ? <>; <RecordLink id="PR-0086" /> is drafted in case QC rejects them</> : null}.
                  </>
                )}
              </Callout>
            ) : (
              <Callout tone="ok" title="Every line is covered">
                Reserved and free stock meet rev {bom.revision} for {wo?.id}. Assembly can start once wiring is done.
              </Callout>
            )}
          </Card>

          <Card>
            <CardHeader title="Revision history" description="One released revision at a time; proposals sit beside it, never in place of it." />
            <Timeline
              items={[
                ...(revD ? [{ id: "d", tone: revD.status === "Approved" ? ("ok" as const) : ("warn" as const), title: <span><strong>Rev D</strong> · {revD.status === "Pending" ? "in approval" : revD.status.toLowerCase()}</span>, meta: `Proposed ${date(revD.submitted)} by ${revD.maker}` }] : []),
                { id: "c", tone: "accent" as const, title: <span><strong>Rev C</strong> · released and frozen</span>, meta: `Released ${bom.releasedOn ? date(bom.releasedOn) : ""} · pinned by ${wo?.id ?? "work orders"}` },
                { id: "b", tone: "neutral" as const, title: <span><strong>Rev B</strong> · superseded</span>, meta: "Replaced when rev C was released" },
              ]}
            />
          </Card>
        </div>

        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <Card>
            <CardHeader icon={FileCheck2} title="Revision D proposed" description={revD ? `${revD.maker} · ${ago(revD.submitted)} · ${revD.value}` : "Loading approval"} actions={revD ? <Status>{revD.status === "Pending" ? "In approval" : revD.status}</Status> : null} />
            {approvals.loading ? (
              <LoadingRows rows={2} columns={2} />
            ) : revD ? (
              <div className="stack" style={{ gap: "var(--space-4)" }}>
                <KeyValues
                  columns={2}
                  items={[
                    { label: "Approval", value: <span className="mono">{revD.id}</span> },
                    { label: "Approver", value: revD.level.split("· ")[1] ?? revD.level },
                    { label: "Change note", value: <span className="mono">DOC-1224</span> },
                    { label: "Record", value: <RecordLink id="BOM-042-D" /> },
                  ]}
                />
                <div className="inv-impact">
                  <p className="inv-impact-title">
                    <Lock size={14} aria-hidden /> Impact on released work order
                  </p>
                  <p>
                    {wo ? <RecordLink id={wo.id} /> : "The work order"} stays pinned to rev C for its whole life. It hasn't passed wiring, so adopting D means re-kitting the changed lines before assembly. Whether released work orders follow a new revision is still an open decision.
                  </p>
                </div>
                <Button variant={revD.status === "Pending" ? "primary" : "secondary"} icon={ShieldCheck} onClick={() => setOpenApproval(revD)}>
                  {revD.status === "Pending" ? "Review revision D" : "View decision"}
                </Button>
              </div>
            ) : (
              <p className="t-muted">No pending revision.</p>
            )}
          </Card>
        </div>
      </div>

      <section className="stack" style={{ gap: "var(--space-3)" }} aria-label="Requirement explosion">
        <div className="inv-mrp">
          <DataTable caption={`Material requirements for ${bom.id} rev ${bom.revision}`} rows={rows} columns={columns} />
        </div>
        <p className="inv-footnote">
          Shortage = required − reserved − free − on order. Quarantined stock is never counted as free. The run keeps its timestamp, so a later run can't silently overwrite this demand.
        </p>
      </section>
      <ApprovalDialog approval={openApproval} open={!!openApproval} onOpenChange={(o) => !o && setOpenApproval(null)} />
    </div>
  );
}
