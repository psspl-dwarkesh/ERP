import { Download, FileText, Package, ReceiptText, Send } from "lucide-react";
import { api } from "../../api/client";
import { inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Tabs, downloadCsv, useToast } from "../../ds/components";
import { AdviceDrawer } from "./AdviceDrawer";
import { BillingView } from "./Billing";
import { OrderDrawer } from "./OrderDrawer";
import { OrdersView } from "./Orders";
import { QuotationDrawer } from "./QuotationDrawer";
import { QuotationsView } from "./Quotations";
import { ReconciliationView } from "./ReconciliationView";
import { adviceStatus, unbilled } from "./shared";
import "./sales.css";

const TABS = ["orders", "quotations", "billing", "reconciliation"] as const;
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
  const unbilledTotal = openOrders.reduce((a, o) => a + unbilled(o), 0);
  const statuses = (advices.data ?? []).map((b) => adviceStatus(b, approvals.data ?? []));
  const mismatches = statuses.filter((s) => s === "Mismatch").length;
  const inReview = statuses.filter((s) => s === "Ready for review").length;
  const loading = orders.loading || advices.loading;
  const postings = useQuery(api.postings);
  const outboxIssues = (postings.data ?? []).filter((p) => p.state === "Failed" || p.state === "Needs attention").length;

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


      <Tabs
        value={tab}
        onChange={(v) => (recordId ? navigate(`/app/sales?tab=${v}`) : setTab(v))}
        items={[
          { value: "orders", label: "Orders", icon: Package, count: orders.loading ? undefined : openOrders.length },
          { value: "quotations", label: "Quotations", icon: FileText, count: quotes.loading ? undefined : quotes.data?.length },
          { value: "billing", label: "Billing advice", icon: ReceiptText, count: advices.loading ? undefined : mismatches + inReview || undefined },
          { value: "reconciliation", label: "Reconciliation", icon: Send, count: outboxIssues || undefined },
        ]}
      />

      {tab === "orders" && <OrdersView rows={orders.data ?? []} loading={orders.loading} onOpen={open} activeId={recordId} />}
      {tab === "quotations" && <QuotationsView rows={quotes.data ?? []} loading={quotes.loading} onOpen={open} activeId={recordId} />}
      {tab === "billing" && <BillingView onOpen={open} activeId={recordId} />}
      {tab === "reconciliation" && <ReconciliationView onOpen={open} />}

      <OrderDrawer id={prefix === "SO" ? recordId : undefined} onClose={close} />
      <QuotationDrawer id={prefix === "QUO" ? recordId : undefined} onClose={close} />
      <AdviceDrawer id={prefix === "BA" ? recordId : undefined} onClose={close} />
    </ModuleFrame>
  );
}
