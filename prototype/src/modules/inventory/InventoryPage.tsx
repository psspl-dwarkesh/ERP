import { ArrowLeftRight, Boxes, ClipboardList, Download, Factory, Handshake, ListTree } from "lucide-react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { href, navigate, setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Tabs, downloadCsv, useToast } from "../../ds/components";
import { AssemblyView } from "./AssemblyView";
import { CountsView } from "./CountsView";
import { MovementsView } from "./MovementsView";
import { MrpView } from "./MrpView";
import { ItemDrawer, StockView } from "./StockView";
import { SubcontractView } from "./SubcontractView";
import { freeQty, type InvTab } from "./shared";
import "./inventory.css";

const TABS: InvTab[] = ["stock", "movements", "mrp", "assembly", "subcontract", "counts"];

/** Which tab a record id belongs to when the URL names a record but no tab. */
function tabForRecord(id?: string): InvTab | undefined {
  if (!id) return undefined;
  if (id.startsWith("WO-")) return "assembly";
  if (id.startsWith("BOM-")) return "mrp";
  if (id.startsWith("SI-")) return "subcontract";
  if (/^(MOV|TRF|GRN|RTN)-/.test(id)) return "movements";
  return undefined;
}

const DESCRIPTIONS: Record<InvTab, string> = {
  stock: "What you can actually issue. Reserved and quarantined stock are shown, never counted as free.",
  movements: "Every receipt, issue, transfer, return and adjustment with its source document.",
  mrp: "Released BOM requirements against free, reserved and on-order stock, with what covers each shortage.",
  assembly: "Panel work orders from kitting to dispatch, with the material and QC gates that hold them.",
  subcontract: "Material issued to partner shops: what was used, returned, damaged and is still outstanding.",
  counts: "Cycle counts, variances and the approvals that turn them into ledger adjustments.",
};

export default function InventoryPage() {
  const route = useRoute();
  const toast = useToast();
  const items = useQuery(api.items);
  const movements = useQuery(api.movements);
  const boms = useQuery(api.boms);

  const rid = route.recordId;
  const routeTab = TABS.includes(route.tab as InvTab) ? (route.tab as InvTab) : undefined;
  const tab: InvTab = routeTab ?? tabForRecord(rid) ?? "stock";
  const itemId = rid?.startsWith("ITM-") ? rid : undefined;

  const onTab = (t: string) => (rid ? navigate(href.module("inventory", t)) : setTab(t));
  const closeRecord = () => navigate(href.module("inventory", routeTab));

  const allItems = items.data ?? [];
  const allMoves = movements.data ?? [];
  const shortLines =
    boms.data
      ?.find((b) => b.id === "BOM-042")
      ?.lines.filter((l) => {
        const it = allItems.find((i) => i.id === l.itemId);
        return l.required - l.reserved - (it ? freeQty(it) : l.available) - l.onOrder > 0;
      }).length ?? undefined;
  const subIssues = useQuery(api.subcontractIssues);
  const subOpen = subIssues.data?.filter((s) => s.status !== "Closed").length;
  const pendingAdj = allMoves.filter((m) => m.type === "Adjustment" && m.status === "Pending").length;

  const exportStock = () => {
    downloadCsv(
      "threadline-stock.csv",
      ["Item", "Name", "Make", "Warehouse", "Bin", "On hand", "Reserved", "QC hold", "Free", "On order", "UOM", "Unit cost", "Status"],
      allItems.map((i) => [i.id, i.name, i.make, i.warehouse, i.bin, i.onHand, i.reserved, i.quarantined, freeQty(i), i.onOrder, i.uom, i.unitCost, i.status]),
    );
    toast({ title: "Stock register exported", body: `${allItems.length} items · threadline-stock.csv · illustrative data` });
  };

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited", to: href.module("dashboard") }, { label: "Inventory & Assembly" }]}
        title="Inventory & Assembly"
        description={DESCRIPTIONS[tab]}
        actions={
          tab === "stock" ? (
            <Button icon={Download} onClick={exportStock} disabled={items.loading}>
              Export stock
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onChange={onTab}
        items={[
          { value: "stock", label: "Stock", icon: Boxes, count: items.data ? allItems.length : undefined },
          { value: "movements", label: "Movements", icon: ArrowLeftRight },
          { value: "mrp", label: "Requirements", icon: ListTree, count: shortLines || undefined },
          { value: "assembly", label: "Assembly", icon: Factory },
          { value: "subcontract", label: "Subcontract", icon: Handshake, count: subOpen || undefined },
          { value: "counts", label: "Counts", icon: ClipboardList, count: pendingAdj || undefined },
        ]}
      />

      {tab === "stock" && <StockView items={allItems} loading={items.loading} />}
      {tab === "movements" && <MovementsView movements={allMoves} items={allItems} loading={movements.loading} highlight={tabForRecord(rid) === "movements" ? rid : undefined} />}
      {tab === "mrp" && <MrpView items={allItems} highlight={rid?.startsWith("BOM-") ? rid : undefined} />}
      {tab === "assembly" && <AssemblyView selectedId={rid?.startsWith("WO-") ? rid : undefined} items={allItems} movements={allMoves} />}
      {tab === "subcontract" && <SubcontractView highlight={rid?.startsWith("SI-") ? rid : undefined} />}
      {tab === "counts" && <CountsView items={allItems} movements={allMoves} loading={items.loading || movements.loading} />}

      {itemId && <ItemDrawer id={itemId} items={allItems} loading={items.loading} onClose={closeRecord} />}
    </ModuleFrame>
  );
}
