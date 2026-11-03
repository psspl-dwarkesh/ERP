import { CalendarRange, Download, LayoutList, Users } from "lucide-react";
import { api } from "../../api/client";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Tabs, downloadCsv, useToast } from "../../ds/components";
import { PortfolioView } from "./PortfolioView";
import { ProjectDetail } from "./ProjectDetail";
import { ResourcesView } from "./ResourcesView";
import { TimelineView } from "./TimelineView";
import { margin } from "./util";
import "./projects.css";

export default function ProjectsPage() {
  const route = useRoute();
  return <ModuleFrame>{route.recordId ? <ProjectDetail key={route.recordId} id={route.recordId} tab={route.tab ?? "overview"} /> : <ProjectsHome tab={route.tab ?? "portfolio"} />}</ModuleFrame>;
}

function ProjectsHome({ tab }: { tab: string }) {
  const toast = useToast();
  const projects = useQuery(api.projects);
  const people = useQuery(api.people);
  const list = projects.data ?? [];
  const live = list.filter((p) => p.status !== "Closed");
  const atRisk = live.filter((p) => p.status === "At risk").length;
  const onHold = live.filter((p) => p.status === "On hold").length;
  const teamIds = new Set(list.flatMap((p) => p.team));
  const staffed = (people.data ?? []).filter((p) => teamIds.has(p.id));

  const exportCsv = () => {
    downloadCsv(
      "threadline-projects.csv",
      ["Project", "Name", "Customer", "Site", "Vertical", "Manager", "Status", "Progress %", "Start", "Due", "Contract value", "Budget", "Committed", "Incurred", "Billed", "Estimated margin %"],
      list.map((p) => [p.id, p.name, p.customer, p.site, p.vertical, p.manager, p.status, p.progress, p.start, p.due, p.contractValue, p.budget, p.committed, p.incurred, p.billed, margin(p).pct.toFixed(1)]),
    );
    toast({ title: "Portfolio exported", body: `threadline-projects.csv · ${list.length} projects · illustrative data` });
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Projects" }]}
        title="Projects"
        description={
          projects.loading
            ? "Engagements across turnkey automation, panels, instrumentation, validation and O&M."
            : `${live.length} live engagements across ${new Set(live.map((p) => p.vertical)).size} verticals. ${atRisk ? `${atRisk} at risk` : "None at risk"}${onHold ? `, ${onHold} on hold` : ""}; everything else is on plan.`
        }
        actions={
          <Button icon={Download} onClick={exportCsv} disabled={!list.length}>
            Export CSV
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "portfolio", label: "Portfolio", icon: LayoutList, count: projects.data ? list.length : undefined },
          { value: "timeline", label: "Milestone timeline", icon: CalendarRange },
          { value: "resources", label: "Resources", icon: Users, count: people.data && projects.data ? staffed.length : undefined },
        ]}
      />
      {tab === "timeline" ? (
        <TimelineView projects={list} loading={projects.loading} />
      ) : tab === "resources" ? (
        <ResourcesView projects={list} people={people.data ?? []} loading={projects.loading || people.loading} />
      ) : (
        <PortfolioView projects={list} loading={projects.loading} />
      )}
    </>
  );
}
