import { Building2, ClipboardList, FileSearch, Plus, Truck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { href, navigate, setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Tabs } from "../../ds/components";
import { NewRequisitionDialog } from "./NewRequisitionDialog";
import { NotFoundDrawer, OrderDrawer } from "./OrderDrawer";
import { OrdersView } from "./OrdersView";
import { RequisitionDrawer } from "./RequisitionDrawer";
import { RequisitionsView } from "./RequisitionsView";
import { RfqDetail } from "./RfqDetail";
import { RfqsView } from "./RfqsView";
import { VendorDrawer, VendorsView } from "./VendorsView";
import { poOverdue, prStatus } from "./util";
import "./purchase.css";

const TAB_FOR: Record<string, string> = { PR: "requisitions", RFQ: "rfqs", PO: "orders", VEN: "vendors" };

export default function PurchasePage() {
  const route = useRoute();
  const id = route.recordId;
  const prefix = id?.split("-")[0] ?? "";
  if (id && prefix === "RFQ") {
    return (
      <ModuleFrame>
        <RfqDetail key={id} id={id} />
      </ModuleFrame>
    );
  }
  const tab = route.tab ?? TAB_FOR[prefix] ?? "requisitions";
  const close = () => navigate(href.module("purchase", tab));
  return (
    <ModuleFrame>
      <PurchaseHome tab={tab} />
      {id && prefix === "PR" && <RequisitionDrawer id={id} onClose={close} />}
      {id && prefix === "PO" && <OrderDrawer id={id} onClose={close} />}
      {id && prefix === "VEN" && <VendorDrawer id={id} onClose={close} />}
      {id && !TAB_FOR[prefix] && <NotFoundDrawer id={id} onClose={close} />}
    </ModuleFrame>
  );
}

function PurchaseHome({ tab }: { tab: string }) {
  const prs = useQuery(api.purchaseRequests);
  const rfqs = useQuery(api.rfqs);
  const pos = useQuery(api.purchaseOrders);
  const vendors = useQuery(api.vendors);
  const approvals = useQuery(api.approvals);
  const [newOpen, setNewOpen] = useState(false);

  const allApprovals = approvals.data ?? [];
  const waiting = (prs.data ?? []).filter((p) => prStatus(p, allApprovals) === "Awaiting approval").length;
  const evaluating = (rfqs.data ?? []).filter((r) => r.status === "Open" || r.status === "Evaluating").length;
  const overdue = (pos.data ?? []).filter((p) => poOverdue(p) > 0).length;
  const loaded = !prs.loading && !rfqs.loading && !pos.loading;

  const summary = [
    waiting && `${waiting} requisition${waiting === 1 ? "" : "s"} waiting on approval`,
    evaluating && `${evaluating} RFQ${evaluating === 1 ? "" : "s"} in evaluation`,
    overdue && `${overdue} deliver${overdue === 1 ? "y" : "ies"} overdue`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Purchase" }]}
        title="Purchase"
        description={loaded ? (summary.length ? `${summary.join(", ").replace(/, ([^,]*)$/, " and $1")}. Everything else is moving.` : "No requisitions, quotes or deliveries need attention.") : "Requisitions, supplier quotes, orders and receipts."}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>
            New requisition
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "requisitions", label: "Requisitions", icon: ClipboardList, count: prs.data?.length },
          { value: "rfqs", label: "RFQs & quotes", icon: FileSearch, count: rfqs.data?.length },
          { value: "orders", label: "Purchase orders", icon: Truck, count: pos.data?.length },
          { value: "vendors", label: "Vendors", icon: Building2, count: vendors.data?.length },
        ]}
      />
      {tab === "rfqs" ? (
        <RfqsView rfqs={rfqs.data ?? []} prs={prs.data ?? []} loading={rfqs.loading} />
      ) : tab === "orders" ? (
        <OrdersView pos={pos.data ?? []} loading={pos.loading} />
      ) : tab === "vendors" ? (
        <VendorsView vendors={vendors.data ?? []} pos={pos.data ?? []} loading={vendors.loading} />
      ) : (
        <RequisitionsView prs={prs.data ?? []} approvals={allApprovals} loading={prs.loading || approvals.loading} onNew={() => setNewOpen(true)} />
      )}
      <NewRequisitionDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}
