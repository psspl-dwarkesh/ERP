import { CalendarClock, Plus, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { date, daysFrom, inr } from "../../api/format";
import { useQuery } from "../../api/hooks";
import type { ServiceContract } from "../../api/types";
import { Button, Callout, Card, CardHeader, LoadingRows, Progress, RecordLink, Status, Tag, cx, useToast } from "../../ds/components";
import { navigate } from "../../app/router";
import { createRenewalOpportunity } from "./commands";

const WINDOW_DAYS = 90;

export function RenewalsView() {
  const contracts = useQuery(api.contracts);
  const opps = useQuery(api.opportunities);
  const loading = contracts.loading || opps.loading;
  const rows = (contracts.data ?? []).slice().sort((a, b) => a.end.localeCompare(b.end));
  const inWindow = rows.filter((c) => daysFrom(c.end) <= WINDOW_DAYS);
  const later = rows.filter((c) => daysFrom(c.end) > WINDOW_DAYS);
  const atRisk = inWindow.filter((c) => !(opps.data ?? []).some((o) => o.name.includes(c.id))).reduce((a, c) => a + c.annualValue, 0);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <Callout tone="info" icon={RefreshCcw} title={`Contracts ending within ${WINDOW_DAYS} days get a suggested renewal`}>
        Threadline reads the end date and visit usage from each AMC/O&amp;M contract and proposes a renewal opportunity at +5% (illustrative uplift). The window and uplift are pending sign-off; nothing is sent to the customer from here.
      </Callout>

      {loading ? (
        <LoadingRows rows={4} columns={4} />
      ) : (
        <>
          <div className="row row-between">
            <h2 className="section-title">Suggested renewals</h2>
            <span className="t-muted crm-small t-num">{atRisk > 0 ? `${inr(atRisk)} annual value has no renewal opportunity yet` : "Every contract in the window has a renewal opportunity"}</span>
          </div>
          <div className="crm-renewals">
            {inWindow.map((c) => (
              <RenewalCard key={c.id} c={c} existing={(opps.data ?? []).find((o) => o.name.includes(c.id))?.id} />
            ))}
          </div>
          {later.length > 0 && (
            <Card>
              <CardHeader title="Later this year" description={`Outside the ${WINDOW_DAYS}-day window — no action yet`} icon={CalendarClock} />
              <ul className="divider-list">
                {later.map((c) => (
                  <li key={c.id} className="list-row">
                    <RecordLink id={c.id} />
                    <div className="list-row-main">
                      <div className="list-row-title">{c.customer}</div>
                      <div className="list-row-sub">
                        {c.type} · ends {date(c.end)} · {inr(c.annualValue)} / year
                      </div>
                    </div>
                    <span className="t-muted crm-small t-num">{daysFrom(c.end)} days left</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RenewalCard({ c, existing }: { c: ServiceContract; existing?: string }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = daysFrom(c.end);
  const usage = Math.round((c.visitsUsed / c.visitsIncluded) * 100);
  const suggested = Math.round((c.annualValue * 1.05) / 1000) * 1000;

  const create = async () => {
    setPending(true);
    setError(null);
    try {
      const o = await createRenewalOpportunity(c.id);
      toast({ title: `${o.id} created from ${c.id}`, body: `${inr(o.value)} renewal in Qualified, owned by ${o.owner}.`, action: { label: "Open", onClick: () => navigate(`/app/crm/${o.id}?tab=renewals`) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <article className={cx("crm-renewal", left <= 45 ? "tone-warn" : "tone-neutral")}>
      <div className="row row-between" style={{ gap: 8 }}>
        <RecordLink id={c.id} />
        <Status>{c.status}</Status>
      </div>
      <div>
        <h3 className="crm-renewal-name">{c.customer}</h3>
        <p className="crm-renewal-sub">
          {c.type} · {c.assets.length} asset{c.assets.length > 1 ? "s" : ""} · {c.responseHours} h response
        </p>
      </div>
      <div className="crm-renewal-end">
        <span className="crm-renewal-days t-num">{left}</span>
        <span>
          days to end
          <br />
          <span className="t-muted">{date(c.end)}</span>
        </span>
      </div>
      <div className="stack-sm stack">
        <div className="row row-between crm-small">
          <span>Visits used</span>
          <span className="t-num t-strong">
            {c.visitsUsed} of {c.visitsIncluded}
          </span>
        </div>
        <Progress value={usage} tone={usage >= 85 ? "warn" : "accent"} size="sm" label="Visits used" />
        {usage >= 85 && <p className="crm-small t-muted">High usage — the renewal should re-price the visit count.</p>}
      </div>
      <div className="crm-renewal-foot">
        <div>
          <span className="crm-small t-muted">Suggested renewal</span>
          <div className="t-strong t-num">{inr(suggested)}</div>
        </div>
        {existing ? (
          <Tag tone="ok">
            <RecordLink id={existing} quiet />
          </Tag>
        ) : (
          <Button size="sm" variant="primary" icon={Plus} loading={pending} onClick={create}>
            Create opportunity
          </Button>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </article>
  );
}
