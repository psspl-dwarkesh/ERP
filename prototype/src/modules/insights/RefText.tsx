import { Fragment, type ReactNode } from "react";
import { moduleForId } from "../../api/client";
import { canAccess, useSession } from "../../api/session";
import { RecordLink } from "../../ds/components";

/** True when the signed-in role can open the module a record id belongs to. */
export function useCanOpen() {
  const user = useSession().user;
  return (id: string) => {
    const m = moduleForId(id);
    return !!m && canAccess(user, m);
  };
}

const ID_RE = /\b((?:PRJ|BOM|PR|RFQ|PO|WO|AST|SR|AMC|OM|CAL|ITM|GRN|SO|BA|QUO|OPP|CUS|VEN|EMP|LV|CLM|SI|EXT|MOV|TRF|CNT|RTN|PAY|APR)-\d{2,4}(?:-\d{2})?)\b/g;

/** Free text with every record id it mentions turned into a link (ids outside the role, or without a home, stay plain mono). */
export function RefText({ text }: { text: string }) {
  const canOpen = useCanOpen();
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ID_RE)) {
    const id = m[1];
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(canOpen(id) ? <RecordLink key={start} id={id} /> : <span key={start} className="mono ins-plain-id">{id}</span>);
    last = start + id.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}
