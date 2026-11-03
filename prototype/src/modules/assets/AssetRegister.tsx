import { Building2, CalendarClock, Factory, PackageSearch, ShieldAlert, Wrench } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { ago, date, daysFrom, relativeDay } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { Asset } from "../../api/types";
import {
  Button,
  Callout,
  DataTable,
  Drawer,
  EmptyState,
  KeyValues,
  LoadingRows,
  Person,
  RecordLink,
  SearchField,
  Segmented,
  Status,
  Timeline,
  Toolbar,
  type Column,
} from "../../ds/components";
import { DueText, OwnershipTag, Prio, openAssetsRecord } from "./shared";

type Own = "all" | "Customer" | "Company";

/** The date that matters next for an asset: calibration for instruments, service otherwise. */
function nextDue(a: Asset) {
  if (a.calibrationDue && (!a.nextService || a.calibrationDue < a.nextService)) return { iso: a.calibrationDue, label: "Calibration" };
  if (a.nextService) return { iso: a.nextService, label: "Service" };
  return null;
}

export function AssetRegister({ assets, loading, activeId }: { assets: Asset[]; loading: boolean; activeId?: string }) {
  const [own, setOwn] = useState<Own>("all");
  const [q, setQ] = useState("");

  const rows = assets.filter((a) => {
    if (own !== "all" && a.ownership !== own) return false;
    const s = q.trim().toLowerCase();
    return !s || `${a.id} ${a.name} ${a.make} ${a.model} ${a.serial} ${a.customer ?? ""} ${a.site} ${a.custodian}`.toLowerCase().includes(s);
  });

  const watch = [
    ...assets.filter((a) => a.calibrationDue && daysFrom(a.calibrationDue) <= 21).map((a) => ({ a, icon: CalendarClock, tone: daysFrom(a.calibrationDue!) <= 7 ? "warn" : "neutral", text: `Calibration due ${relativeDay(a.calibrationDue!).toLowerCase()}`, sort: daysFrom(a.calibrationDue!) })),
    ...assets.filter((a) => a.warrantyEnd && daysFrom(a.warrantyEnd) >= 0 && daysFrom(a.warrantyEnd) <= 60).map((a) => ({ a, icon: ShieldAlert, tone: "warn", text: `Warranty ends ${date(a.warrantyEnd!, true)} · ${relativeDay(a.warrantyEnd!).toLowerCase()}`, sort: daysFrom(a.warrantyEnd!) })),
    ...assets.filter((a) => a.status === "Under repair").map((a) => ({ a, icon: Wrench, tone: "risk", text: "Under repair", sort: -1 })),
  ].sort((x, y) => x.sort - y.sort);

  const columns: Column<Asset>[] = [
    {
      key: "asset",
      header: "Asset",
      sort: (a) => a.name,
      cell: (a) => (
        <div className="cell-primary">
          <span className="cell-title ast-clip">{a.name}</span>
          <span className="cell-sub">
            <span className="mono">{a.id}</span> · {a.make} {a.model}
          </span>
        </div>
      ),
    },
    { key: "own", header: "Ownership", sort: (a) => a.ownership, cell: (a) => <OwnershipTag asset={a} /> },
    {
      key: "where",
      header: "Customer · site",
      sort: (a) => a.customer ?? a.site,
      priority: 2,
      cell: (a) => (
        <div className="cell-primary">
          <span>{a.customer ?? "ABC Limited"}</span>
          <span className="cell-sub">{a.site}</span>
        </div>
      ),
    },
    { key: "contract", header: "Contract", priority: 2, cell: (a) => (a.contractId ? <RecordLink id={a.contractId} /> : <span className="t-muted">—</span>) },
    { key: "cust", header: "Custodian", priority: 3, sort: (a) => a.custodian, cell: (a) => <Person name={a.custodian} size="xs" /> },
    {
      key: "due",
      header: "Next due",
      sort: (a) => nextDue(a)?.iso ?? "9999",
      cell: (a) => {
        const n = nextDue(a);
        return n ? (
          <div className="cell-primary">
            <DueText iso={n.iso} />
            <span className="cell-sub">
              {n.label} · {date(n.iso, true)}
            </span>
          </div>
        ) : (
          <span className="t-muted">—</span>
        );
      },
    },
    { key: "status", header: "Status", sort: (a) => a.status, cell: (a) => <Status>{a.status}</Status> },
  ];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {loading ? (
        <LoadingRows rows={2} columns={3} />
      ) : (
        watch.length > 0 && (
          <section className="ast-watch" aria-label="Coming due">
            <p className="ast-watch-head">Coming due</p>
            <ul className="ast-watch-list">
              {watch.map((w) => (
                <li key={`${w.a.id}-${w.text}`}>
                  <a href={`#/app/assets/${w.a.id}?tab=assets`} className={`ast-watch-item tone-${w.tone}`}>
                    <span className="ast-watch-icon">
                      <w.icon size={15} aria-hidden />
                    </span>
                    <span className="ast-watch-text">
                      <span className="ast-watch-title">{w.a.name}</span>
                      <span className="ast-watch-sub">
                        <span className="mono">{w.a.id}</span> · {w.text}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <Toolbar
        end={
          <Segmented
            label="Ownership"
            value={own}
            onChange={setOwn}
            options={[
              { value: "all", label: `All ${assets.length || ""}`.trim() },
              { value: "Customer", label: "Customer installed", icon: Factory },
              { value: "Company", label: "Company owned", icon: Building2 },
            ]}
          />
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Search asset, serial, customer" label="Search assets" />
      </Toolbar>


      <DataTable
        caption="Asset register"
        loading={loading}
        rows={rows}
        columns={columns}
        activeId={activeId}
        onRowClick={(a) => openAssetsRecord(a.id, "assets")}
        empty={
          <EmptyState icon={PackageSearch} title="No assets match" action={<Button size="sm" onClick={() => { setOwn("all"); setQ(""); }}>Clear filters</Button>}>
            Try a serial number or customer name.
          </EmptyState>
        }
      />
    </div>
  );
}

/* ====================================================================== Asset drawer */
export function AssetDrawer({ id, assets, loading, onClose }: { id: string; assets: Asset[]; loading: boolean; onClose: () => void }) {
  const a = assets.find((x) => x.id === id);
  const tickets = useQuery(api.tickets);
  const contracts = useQuery(api.contracts);
  const projects = useQuery(api.projects);
  const cals = useQuery(api.calibrations);

  const contract = contracts.data?.find((c) => c.id === a?.contractId);
  const history = (tickets.data ?? []).filter((t) => t.assetId === id).sort((x, y) => y.opened.localeCompare(x.opened));
  const upgrade = projects.data?.find((p) => p.installedAsset === id);
  const origin = projects.data?.find((p) => p.id === a?.projectId);
  const calJobs = (cals.data ?? []).filter((c) => c.assetId === id);

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width={600}
      id={id}
      status={a ? <Status>{a.status}</Status> : undefined}
      title={a?.name ?? (loading ? "Loading asset" : "Asset not found")}
      subtitle={a ? `${a.category} · ${a.make} ${a.model}` : undefined}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {!a ? (
        loading ? <LoadingRows rows={4} columns={2} /> : <EmptyState title={`${id} isn't in the register`}>It may have been retired and archived.</EmptyState>
      ) : (
        <>
          <div className={`ast-own ${a.ownership === "Customer" ? "tone-info" : "tone-violet"}`}>
            {a.ownership === "Customer" ? <Factory size={18} aria-hidden /> : <Building2 size={18} aria-hidden />}
            <div>
              <p className="ast-own-title">{a.ownership === "Customer" ? `Customer-owned · ${a.customer}, ${a.site}` : `Company-owned · ABC Limited, ${a.site}`}</p>
              <p className="ast-footnote">
                {a.ownership === "Customer"
                  ? "Service history and contract cover are kept here; it isn't on ABC's fixed-asset register."
                  : `ABC fixed asset held by ${a.custodian}.`}
              </p>
            </div>
          </div>

          <section className="stack-sm stack">
            <h3 className="ast-h">Identity</h3>
            <KeyValues
              columns={3}
              items={[
                { label: "Make", value: a.make },
                { label: "Model", value: a.model },
                { label: "Serial", value: <span className="mono">{a.serial}</span> },
                { label: "Category", value: a.category },
                { label: a.ownership === "Customer" ? "Commissioned" : "Acquired", value: date(a.installed) },
                { label: "Custodian", value: <Person name={a.custodian} size="xs" /> },
              ]}
            />
          </section>

          <section className="stack-sm stack">
            <h3 className="ast-h">Cover</h3>
            <KeyValues
              columns={2}
              items={[
                {
                  label: "Warranty",
                  value: a.warrantyEnd ? (
                    daysFrom(a.warrantyEnd) < 0 ? (
                      <span className="row" style={{ gap: 6 }}><Status>Expired</Status><span className="t-muted">{date(a.warrantyEnd)}</span></span>
                    ) : (
                      <span className="row" style={{ gap: 6 }}><Status tone={daysFrom(a.warrantyEnd) <= 60 ? "warn" : "ok"}>Active</Status><span className="t-muted">until {date(a.warrantyEnd)}</span></span>
                    )
                  ) : (
                    <span className="t-muted">None recorded</span>
                  ),
                },
                {
                  label: "Contract",
                  value: contract ? (
                    <span className="row" style={{ gap: 6 }}>
                      <RecordLink id={contract.id} />
                      <span className="t-muted">
                        {contract.type} · {contract.responseHours} h · until {date(contract.end, true)}
                      </span>
                    </span>
                  ) : (
                    <span className="t-muted">{a.ownership === "Company" ? "Not applicable" : "No contract"}</span>
                  ),
                },
                ...(a.nextService ? [{ label: "Next service", value: <span>{date(a.nextService)} · <DueText iso={a.nextService} /></span> }] : []),
                ...(a.calibrationDue ? [{ label: "Calibration due", value: <span>{date(a.calibrationDue)} · <DueText iso={a.calibrationDue} /></span> }] : []),
              ]}
            />
            {a.ownership === "Customer" && !contract && (
              <Callout tone="warn" title="No service contract">
                Every visit to this asset is chargeable until a contract is signed.
              </Callout>
            )}
          </section>

          {(origin || a.projectId || upgrade) && (
            <section className="stack-sm stack">
              <h3 className="ast-h">Projects</h3>
              <ul className="divider-list">
                {a.projectId && (
                  <li className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">Installed by</div>
                      <div className="list-row-sub">{origin ? origin.name : "Original installation project (archived)"}</div>
                    </div>
                    {origin ? <RecordLink id={a.projectId} /> : <span className="mono t-muted">{a.projectId}</span>}
                  </li>
                )}
                {upgrade && (
                  <li className="list-row">
                    <div className="list-row-main">
                      <div className="list-row-title">{upgrade.name}</div>
                      <div className="list-row-sub">Upgrade in progress · a separate record that references this asset</div>
                    </div>
                    <RecordLink id={upgrade.id} />
                  </li>
                )}
              </ul>
            </section>
          )}

          {calJobs.length > 0 && (
            <section className="stack-sm stack">
              <h3 className="ast-h">Calibration</h3>
              <ul className="divider-list">
                {calJobs.map((c) => (
                  <li key={c.id} className="list-row">
                    <div className="list-row-main">
                      <RecordLink id={c.id} />
                      <div className="list-row-sub">
                        Due {date(c.due)} · {c.engineer}
                        {c.certificate ? ` · ${c.certificate}` : ""}
                      </div>
                    </div>
                    <Status>{c.status}</Status>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="stack-sm stack">
            <h3 className="ast-h">Service history</h3>
            {tickets.loading ? (
              <LoadingRows rows={2} columns={2} />
            ) : history.length === 0 ? (
              <p className="ast-footnote">No service tickets recorded against this asset.</p>
            ) : (
              <Timeline
                items={history.map((t) => ({
                  id: t.id,
                  tone: t.status === "Resolved" || t.status === "Closed" ? "ok" : t.priority === "P1" ? "risk" : "accent",
                  title: (
                    <span className="row" style={{ gap: 8 }}>
                      <Prio p={t.priority} />
                      <span>{t.title}</span>
                    </span>
                  ),
                  meta: (
                    <span>
                      <RecordLink id={t.id} quiet /> · {t.status} · {t.assignee ?? "Unassigned"} · opened {ago(t.opened)}
                    </span>
                  ),
                }))}
              />
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}
