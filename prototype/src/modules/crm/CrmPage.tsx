import { Download, KanbanSquare, List, Plus, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date, daysFrom } from "../../api/format";
import { useQuery } from "../../api/hooks";
import { ModuleFrame } from "../../app/Shell";
import { navigate, setTab, useRoute } from "../../app/router";
import { Button, PageHeader, Tabs, downloadCsv, useToast } from "../../ds/components";
import { AccountDrawer } from "./AccountDrawer";
import { NewOpportunityDialog } from "./NewOpportunityDialog";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { OpportunityList } from "./OpportunityList";
import { PipelineBoard } from "./Pipeline";
import { RenewalsView } from "./Renewals";
import { isOpen, weighted } from "./shared";
import "./crm.css";

const TABS = ["pipeline", "list", "renewals"] as const;

export default function CrmPage() {
  const route = useRoute();
  const toast = useToast();
  const opps = useQuery(api.opportunities);
  const [creating, setCreating] = useState(false);

  const tab = route.tab && (TABS as readonly string[]).includes(route.tab) ? route.tab : "pipeline";
  const recordId = route.recordId;
  const open = (id: string) => navigate(`/app/crm/${id}?tab=${tab}`);
  const close = () => navigate(`/app/crm?tab=${tab}`);

  const rows = opps.data ?? [];
  const openRows = rows.filter(isOpen);
  const dueSoon = openRows.filter((o) => daysFrom(o.nextActionDue) <= 2).sort((a, b) => a.nextActionDue.localeCompare(b.nextActionDue));
  const first = dueSoon[0];

  return (
    <ModuleFrame>
      <PageHeader
        crumbs={[{ label: "ABC Limited" }, { label: "Commercial" }, { label: "CRM" }]}
        title="Pipeline"
        description={
          opps.loading
            ? "Loading the pipeline…"
            : first
              ? `${dueSoon.length} follow-up${dueSoon.length > 1 ? "s" : ""} due in the next two days. First: ${first.nextAction} for ${first.account} (${first.id}), due ${date(first.nextActionDue, true)}.`
              : "No follow-ups are due in the next two days."
        }
        actions={
          <>
            <Button
              icon={Download}
              onClick={() => {
                downloadCsv(
                  "threadline-pipeline.csv",
                  ["Opportunity", "Name", "Account", "Vertical", "Stage", "Value (₹)", "Probability %", "Weighted (₹)", "Expected close", "Owner", "Next action", "Next action due"],
                  rows.map((o) => [o.id, o.name, o.account, o.vertical, o.stage, o.value, o.probability, weighted(o), o.closeDate, o.owner, o.nextAction, o.nextActionDue]),
                );
                toast({ title: "Pipeline exported", body: `threadline-pipeline.csv · ${rows.length} opportunities` });
              }}
            >
              Export
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              New opportunity
            </Button>
          </>
        }
      />


      <Tabs
        value={tab}
        onChange={(v) => (recordId ? navigate(`/app/crm?tab=${v}`) : setTab(v))}
        items={[
          { value: "pipeline", label: "Pipeline", icon: KanbanSquare },
          { value: "list", label: "All opportunities", icon: List, count: opps.loading ? undefined : rows.length },
          { value: "renewals", label: "Renewals", icon: RefreshCcw },
        ]}
      />

      {tab === "pipeline" && (opps.loading ? <BoardSkeleton /> : <PipelineBoard rows={rows} onOpen={open} activeId={recordId} />)}
      {tab === "list" && <OpportunityList rows={rows} loading={opps.loading} onOpen={open} activeId={recordId} />}
      {tab === "renewals" && <RenewalsView />}

      <OpportunityDrawer id={recordId?.startsWith("OPP-") ? recordId : undefined} onClose={close} />
      <AccountDrawer id={recordId?.startsWith("CUS-") ? recordId : undefined} onClose={close} />
      <NewOpportunityDialog open={creating} onOpenChange={setCreating} tab={tab} />
    </ModuleFrame>
  );
}

function BoardSkeleton() {
  return (
    <div className="crm-board-scroll" aria-busy="true" aria-label="Loading pipeline">
      <div className="crm-board">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="crm-col">
            <div className="crm-col-head">
              <span className="crm-skel" style={{ width: "50%" }} />
              <span className="crm-skel" style={{ width: "70%", height: 10 }} />
            </div>
            <div className="crm-col-body">
              {Array.from({ length: 2 - (i % 2) }).map((__, j) => (
                <div key={j} className="crm-card crm-card-skel">
                  <span className="crm-skel" style={{ width: "40%", height: 10 }} />
                  <span className="crm-skel" style={{ width: "85%" }} />
                  <span className="crm-skel" style={{ width: "60%", height: 10 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
