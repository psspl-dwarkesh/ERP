import { CalendarClock, FileSignature, Headset, Package } from "lucide-react";
import { api } from "../../api/client";
import { daysFrom } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { href, navigate, setTab, useRoute } from "../../app/router";
import { PageHeader, Tabs } from "../../ds/components";
import { AssetDrawer, AssetRegister } from "./AssetRegister";
import { CalibrationDrawer, CalibrationView } from "./CalibrationView";
import { ContractDrawer, ContractsView } from "./ContractsView";
import { TicketDrawer } from "./TicketDrawer";
import { TicketsView } from "./TicketsView";
import { isOpen, type AstTab } from "./shared";
import "./assets.css";

const TABS: AstTab[] = ["tickets", "assets", "contracts", "calibration"];

function tabForRecord(id?: string): AstTab | undefined {
  if (!id) return undefined;
  if (id.startsWith("SR-")) return "tickets";
  if (id.startsWith("AST-")) return "assets";
  if (id.startsWith("AMC-") || id.startsWith("OM-")) return "contracts";
  if (id.startsWith("CAL-")) return "calibration";
  return undefined;
}

const DESCRIPTIONS: Record<AstTab, string> = {
  tickets: "Service desk: response clocks, entitlement and the engineer on each call.",
  assets: "Customer-installed equipment and company-owned instruments, kept visibly separate.",
  contracts: "AMC and O&M contracts: what is covered, how fast, and how much is used.",
  calibration: "Calibration obligations, readings against tolerance and certificate state.",
};

export default function AssetsPage() {
  const route = useRoute();
  const tickets = useQuery(api.tickets);
  const contracts = useQuery(api.contracts);
  const assets = useQuery(api.assets);
  const cals = useQuery(api.calibrations);

  const rid = route.recordId;
  const routeTab = TABS.includes(route.tab as AstTab) ? (route.tab as AstTab) : undefined;
  const tab: AstTab = routeTab ?? tabForRecord(rid) ?? "tickets";
  const recordKind = tabForRecord(rid);

  const onTab = (t: string) => (rid ? navigate(href.module("assets", t)) : setTab(t));
  const close = () => navigate(href.module("assets", routeTab));

  const openTickets = (tickets.data ?? []).filter(isOpen).length;
  const renewals = (contracts.data ?? []).filter((c) => c.status === "Renewal due").length;
  const calDue = (cals.data ?? []).filter((c) => c.status === "Overdue" || (c.status === "Due" && daysFrom(c.due) <= 14)).length;

  return (
    <ModuleFrame>
      <PageHeader crumbs={[{ label: "ABC Limited", to: href.module("dashboard") }, { label: "Assets & Service" }]} title="Assets & Service" description={DESCRIPTIONS[tab]} />

      <Tabs
        value={tab}
        onChange={onTab}
        items={[
          { value: "tickets", label: "Service desk", icon: Headset, count: tickets.data ? openTickets : undefined },
          { value: "assets", label: "Assets", icon: Package, count: assets.data?.length },
          { value: "contracts", label: "Contracts", icon: FileSignature, count: renewals || undefined },
          { value: "calibration", label: "Calibration", icon: CalendarClock, count: calDue || undefined },
        ]}
      />

      {tab === "tickets" && <TicketsView tickets={tickets.data ?? []} contracts={contracts.data ?? []} loading={tickets.loading} activeId={recordKind === "tickets" ? rid : undefined} />}
      {tab === "assets" && <AssetRegister assets={assets.data ?? []} loading={assets.loading} activeId={recordKind === "assets" ? rid : undefined} />}
      {tab === "contracts" && <ContractsView contracts={contracts.data ?? []} tickets={tickets.data ?? []} loading={contracts.loading} activeId={recordKind === "contracts" ? rid : undefined} />}
      {tab === "calibration" && <CalibrationView jobs={cals.data ?? []} loading={cals.loading} activeId={recordKind === "calibration" ? rid : undefined} />}

      {rid && recordKind === "tickets" && <TicketDrawer id={rid} tickets={tickets.data ?? []} loading={tickets.loading} onClose={close} />}
      {rid && recordKind === "assets" && <AssetDrawer id={rid} assets={assets.data ?? []} loading={assets.loading} onClose={close} />}
      {rid && recordKind === "contracts" && <ContractDrawer id={rid} contracts={contracts.data ?? []} tickets={tickets.data ?? []} loading={contracts.loading} onClose={close} />}
      {rid && recordKind === "calibration" && <CalibrationDrawer id={rid} jobs={cals.data ?? []} loading={cals.loading} onClose={close} />}
    </ModuleFrame>
  );
}
