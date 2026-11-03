import { api } from "../../api/client";
import { date, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { Drawer, EmptyState, KeyValues, LoadingRows, Person, RecordLink, Status } from "../../ds/components";
import { isOpen } from "./shared";

/** CRM-011: one customer master shared by Sales, Projects, Assets and Service. */
export function AccountDrawer({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const customers = useQuery(api.customers);
  const opps = useQuery(api.opportunities);
  const orders = useQuery(api.salesOrders);
  const contracts = useQuery(api.contracts);
  const projects = useQuery(api.projects);
  const c = customers.data?.find((x) => x.id === id);
  const related = c
    ? [
        ...(opps.data ?? []).filter((o) => o.account === c.name).map((o) => ({ id: o.id, label: o.name, status: o.stage, value: o.value, open: isOpen(o) })),
        ...(orders.data ?? []).filter((o) => o.customer === c.name).map((o) => ({ id: o.id, label: o.title, status: o.status, value: o.value, open: o.status !== "Closed" })),
        ...(projects.data ?? []).filter((p) => p.customerId === c.id).map((p) => ({ id: p.id, label: p.name, status: p.status, value: p.contractValue, open: p.status !== "Closed" })),
        ...(contracts.data ?? []).filter((k) => k.customer === c.name).map((k) => ({ id: k.id, label: `${k.type} · ends ${date(k.end)}`, status: k.status, value: k.annualValue, open: k.status !== "Expired" })),
      ]
    : [];

  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      id={id}
      title={c?.name ?? (customers.loading ? "Loading account…" : "Account not found")}
      subtitle={c ? `${c.industry} · ${c.sites.map((s) => s.city).join(", ")}` : undefined}
    >
      {!c ? (
        customers.loading ? <LoadingRows rows={5} columns={2} /> : <EmptyState title={`${id} isn't in this workspace`}>Duplicate accounts are merged under one id; search by name instead.</EmptyState>
      ) : (
        <>
          <KeyValues
            columns={2}
            items={[
              { label: "Account owner", value: <Person name={c.accountOwner} size="xs" /> },
              { label: "GSTIN", value: <span className="mono">{c.gstin}</span> },
              { label: "Industry", value: c.industry },
              { label: "Sites", value: c.sites.map((s) => `${s.name}, ${s.city}`).join(" · ") },
            ]}
          />
          <section className="stack-sm stack">
            <h3 className="crm-drawer-h">Everything linked to this account</h3>
            <p className="crm-drawer-hint">Sales, Projects and Service read this same master record — there is no second copy to keep in sync.</p>
            <ul className="divider-list">
              {related.map((r) => (
                <li key={r.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-title">
                      <RecordLink id={r.id}>{r.label}</RecordLink>
                    </div>
                    <div className="list-row-sub t-num">{inr(r.value)}</div>
                  </div>
                  <Status>{r.status}</Status>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Drawer>
  );
}
