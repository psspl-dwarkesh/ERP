import { CalendarDays, DoorOpen, Download, Receipt, Users, UsersRound } from "lucide-react";
import { api } from "../../api/client";
import { date } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { Button, Callout, PageHeader, RecordLink, Tabs, downloadCsv, useToast } from "../../ds/components";
import { ClaimsView } from "./Claims";
import { DeploymentRoster } from "./Deployment";
import { Directory } from "./Directory";
import { ExitsView } from "./ExitsView";
import { LeaveView } from "./Leave";
import { PersonDrawer } from "./PersonDrawer";
import { ClaimDrawer, LeaveDrawer } from "./RecordDrawers";
import { expiringCerts } from "./shared";
import "./hr.css";

const TABS = ["directory", "deployment", "leave", "claims", "exits"] as const;
const TAB_FOR_PREFIX: Record<string, (typeof TABS)[number]> = { EMP: "directory", LV: "leave", CLM: "claims", EXT: "exits" };

export default function HrPage() {
  const route = useRoute();
  const toast = useToast();
  const people = useQuery(api.people);
  const leave = useQuery(api.leaveRequests);
  const claims = useQuery(api.claims);

  const recordId = route.recordId;
  const prefix = recordId?.split("-")[0] ?? "";
  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : (TAB_FOR_PREFIX[prefix] ?? "directory");
  const open = (id: string) => navigate(`/app/hr/${id}?tab=${tab}`);
  const close = () => navigate(`/app/hr?tab=${tab}`);
  const go = (t: string) => (recordId ? navigate(`/app/hr?tab=${t}`) : setTab(t));

  const list = people.data ?? [];
  const deployed = list.filter((p) => p.status === "Deployed").length;
  const pendingLeave = (leave.data ?? []).filter((l) => l.status === "Pending").length;
  const pendingClaims = (claims.data ?? []).filter((c) => c.status === "Pending").length;
  const certs = expiringCerts(list);
  const exits = useQuery(api.exitCases);
  const openExits = exits.data?.filter((e) => e.status !== "Closed").length;

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "Pinnacle Engineering" }, { label: "People" }]}
        title="People"
        description={people.loading ? "Loading the directory…" : `${deployed} of ${list.length} people deployed today · ${pendingLeave + pendingClaims} requests waiting for a manager`}
        actions={
          <Button
            icon={Download}
            onClick={() => {
              downloadCsv(
                "threadline-people.csv",
                ["Employee", "Name", "Role", "Department", "Location", "Employment", "Status", "Assignment", "Until", "Utilisation %"],
                list.map((p) => [p.id, p.name, p.role, p.department, p.location, p.employment, p.status, p.assignment ?? "", p.assignmentUntil ?? "", p.utilisation]),
              );
              toast({ title: "Directory exported", body: "threadline-people.csv · no salary or identity fields" });
            }}
          >
            Export
          </Button>
        }
      />

      {certs.length > 0 && (
        <Callout tone="warn" title={`${certs.length} site certificate${certs.length > 1 ? "s" : ""} expire within 30 days`}>
          {certs.map((c, i) => (
            <span key={c.person.id + c.cert.name}>
              {i > 0 && "; "}
              <RecordLink id={c.person.id}>{c.person.name}</RecordLink> — {c.cert.name}, {date(c.cert.expires, true)} ({c.days} days)
            </span>
          ))}
          .
        </Callout>
      )}


      <Tabs
        value={tab}
        onChange={go}
        items={[
          { value: "directory", label: "Directory", icon: Users, count: people.loading ? undefined : list.length },
          { value: "deployment", label: "Deployment", icon: UsersRound },
          { value: "leave", label: "Leave & attendance", icon: CalendarDays, count: pendingLeave || undefined },
          { value: "claims", label: "Claims", icon: Receipt, count: pendingClaims || undefined },
          { value: "exits", label: "Exits", icon: DoorOpen, count: openExits || undefined },
        ]}
      />

      {tab === "directory" && <Directory rows={list} loading={people.loading} onOpen={open} activeId={recordId} />}
      {tab === "deployment" && <DeploymentRoster people={list} leave={leave.data ?? []} loading={people.loading || leave.loading} />}
      {tab === "leave" && <LeaveView leave={leave.data ?? []} people={list} loading={leave.loading || people.loading} onOpen={open} activeId={recordId} />}
      {tab === "exits" && <ExitsView />}
      {tab === "claims" && <ClaimsView claims={claims.data ?? []} people={list} loading={claims.loading} onOpen={open} activeId={recordId} />}

      <PersonDrawer id={prefix === "EMP" ? recordId : undefined} onClose={close} />
      <ClaimDrawer id={prefix === "CLM" ? recordId : undefined} onClose={close} />
      <LeaveDrawer id={prefix === "LV" ? recordId : undefined} onClose={close} />
    </ModuleFrame>
  );
}
