import { Download, FileText, Package, ReceiptText } from "lucide-react";
import { api } from "../../api/client";
import { inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Stat, Tabs, downloadCsv, useToast } from "../../ds/components";
import { AdviceDrawer } from "./AdviceDrawer";
import { BillingView } from "./Billing";
import { OrderDrawer } from "./OrderDrawer";
import { OrdersView } from "./Orders";
import { QuotationDrawer } from "./QuotationDrawer";
import { QuotationsView } from "./Quotations";
import { adviceStatus, unbilled, validity } from "./shared";
import "./sales.css";

const TABS = ["orders", "quotations", "billing"] as const;
const TAB_FOR_PREFIX: Record<string, (typeof TABS)[number]> = { SO: "orders", QUO: "quotations", BA: "billing" };

export default function SalesPage() {
  const route = useRoute();
  const toast = useToast();
  const orders = useQuery(api.salesOrders);
  const quotes = useQuery(api.quotations);
  const advices = useQuery(api.billingAdvices);
  const approvals = useQuery(api.approvals);

  const recordId = route.recordId;
  const prefix = recordId?.split("-")[0] ?? "";
  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : (TAB_FOR_PREFIX[prefix] ?? "orders");
  const open = (id: string) => navigate(`/app/sales/${id}?tab=${tab}`);
  const close = () => navigate(`/app/sales?tab=${tab}`);

  const openOrders = (orders.data ?? []).filter((o) => o.status !== "Closed");
  const book = openOrders.reduce((a, o) => a + o.value, 0);
  const unbilledTotal = openOrders.reduce((a, o) => a + unbilled(o), 0);
  const statuses = (advices.data ?? []).map((b) => adviceStatus(b, approvals.data ?? []));
  const mismatches = statuses.filter((s) => s === "Mismatch").length;
  const inReview = statuses.filter((s) => s === "Ready for review").length;
  const expiring = (quotes.data ?? []).filter((q) => validity(q).tone === "warn");
  const loading = orders.loading || advices.loading;

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Commercial" }, { label: "Sales" }]}
        title="Orders & billing"
        description={
          loading
            ? "Loading the order book…"
            : `${mismatches ? `${mismatches} billing advice doesn't reconcile with accounting` : "Billing reconciles"}${inReview ? `, and ${inReview} is waiting for Finance review` : ""}. ${inr(unbilledTotal)} of the open order book is still unbilled.`
        }
        actions={
          <Button
            icon={Download}
            onClick={() => {
              downloadCsv(
                "threadline-order-book.csv",
                ["Order", "Title", "Customer", "Status", "Value (₹)", "Billed (₹)", "Unbilled (₹)", "Project", "Quotation"],
                (orders.data ?? []).map((o) => [o.id, o.title, o.customer, o.status, o.value, o.billed, unbilled(o), o.projectId ?? "", o.quotationId ?? ""]),
              );
              toast({ title: "Order book exported", body: "threadline-order-book.csv · values before tax · illustrative data" });
            }}
          >
            Export order book
          </Button>
        }
      />

      <div className="stat-strip">
        <Stat label="Open order book" value={loading ? "–" : inr(book)} foot={`${openOrders.length} orders in fulfilment`} onClick={() => (recordId ? navigate("/app/sales?tab=orders") : setTab("orders"))} />
        <Stat label="Unbilled" value={loading ? "–" : inr(unbilledTotal)} foot="Order value not yet in billing advice" />
        <Stat label="Billing exceptions" value={loading ? "–" : mismatches} tone={mismatches ? "risk" : undefined} foot={mismatches ? "Advice and invoice disagree" : "Nothing to reconcile"} onClick={() => (recordId ? navigate("/app/sales?tab=billing") : setTab("billing"))} />
        <Stat label="Quotes expiring ≤ 21 days" value={quotes.loading ? "–" : expiring.length} tone={expiring.length ? "warn" : undefined} foot={expiring.map((q) => q.id).join(", ") || "None"} onClick={() => (recordId ? navigate("/app/sales?tab=quotations") : setTab("quotations"))} />
      </div>

      <Tabs
        value={tab}
        onChange={(v) => (recordId ? navigate(`/app/sales?tab=${v}`) : setTab(v))}
        items={[
          { value: "orders", label: "Orders", icon: Package, count: orders.loading ? undefined : openOrders.length },
          { value: "quotations", label: "Quotations", icon: FileText, count: quotes.loading ? undefined : quotes.data?.length },
          { value: "billing", label: "Billing advice", icon: ReceiptText, count: advices.loading ? undefined : mismatches + inReview || undefined },
        ]}
      />

      {tab === "orders" && <OrdersView rows={orders.data ?? []} loading={orders.loading} onOpen={open} activeId={recordId} />}
      {tab === "quotations" && <QuotationsView rows={quotes.data ?? []} loading={quotes.loading} onOpen={open} activeId={recordId} />}
      {tab === "billing" && <BillingView onOpen={open} activeId={recordId} />}

      <OrderDrawer id={prefix === "SO" ? recordId : undefined} onClose={close} />
      <QuotationDrawer id={prefix === "QUO" ? recordId : undefined} onClose={close} />
      <AdviceDrawer id={prefix === "BA" ? recordId : undefined} onClose={close} />
    </ModuleFrame>
  );
}
