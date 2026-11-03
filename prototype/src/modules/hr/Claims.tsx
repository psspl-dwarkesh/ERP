import { useState } from "react";
import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Approval, Claim, Person } from "../../api/types";
import { ApprovalDialog } from "../../app/patterns";
import { Button, Callout, DataTable, Person as PersonChip, RecordLink, Status, Tag, type Column } from "../../ds/components";

export function ClaimsView({ claims, people, loading, onOpen, activeId }: { claims: Claim[]; people: Person[]; loading: boolean; onOpen: (id: string) => void; activeId?: string }) {
  const approvals = useQuery(api.approvals);
  const [open, setOpen] = useState<Approval | null>(null);
  const approvalFor = (c: Claim) => approvals.data?.find((a) => a.reference === c.id);
  const managerOf = (c: Claim) => people.find((p) => p.id === people.find((x) => x.id === c.personId)?.reportsTo)?.name;
  const pending = claims.filter((c) => c.status === "Pending");

  const columns: Column<Claim>[] = [
    { key: "person", header: "Claimant", sort: (c) => c.person, cell: (c) => <PersonChip name={c.person} detail={c.id} /> },
    { key: "kind", header: "Type", sort: (c) => c.kind, cell: (c) => <Tag>{c.kind}</Tag>, priority: 2 },
    {
      key: "ref",
      header: "Against",
      cell: (c) => {
        const [ref, ...rest] = c.reference.split(" · ");
        return (
          <div className="cell-primary">
            <RecordLink id={ref} />
            <span className="cell-sub">{rest.join(" · ")}</span>
          </div>
        );
      },
    },
    { key: "amount", header: "Amount", align: "right", sort: (c) => c.amount, cell: (c) => <span className="cell-num hr-nowrap">{inr(c.amount)}</span> },
    { key: "sub", header: "Submitted", sort: (c) => c.submitted, cell: (c) => <span className="cell-num hr-nowrap">{date(c.submitted, true)}</span>, priority: 3 },
    { key: "status", header: "Status", sort: (c) => c.status, cell: (c) => <Status>{c.status}</Status> },
    {
      key: "act",
      header: "",
      align: "right",
      cell: (c) => {
        const a = approvalFor(c);
        if (c.status !== "Pending") return null;
        if (a?.status === "Pending")
          return (
            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setOpen(a); }}>
              Review
            </Button>
          );
        return <span className="hr-small t-muted hr-nowrap">With {managerOf(c) ?? "reporting manager"}</span>;
      },
    },
  ];

  return (
    <div className="stack">
      {pending.length > 0 && (
        <Callout tone="info" title={`${pending.length} claims pending · ${inr(pending.reduce((a, c) => a + c.amount, 0), { compact: false })}`}>
          The claimant's reporting manager approves; nobody approves their own claim.
        </Callout>
      )}
      <DataTable rows={claims} columns={columns} loading={loading} onRowClick={(c) => onOpen(c.id)} activeId={activeId} caption="Expense claims" />
      <ApprovalDialog approval={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
