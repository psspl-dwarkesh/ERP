import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { moduleForId } from "../api/client";
import type { ModuleKey } from "../api/types";

/**
 * Hash router. Routes:
 *   #/                      product showcase
 *   #/app/<module>          module home
 *   #/app/<module>/<id>     record inside a module
 *   ?tab=<key>              sub-view within a module
 */
export type Route = {
  path: string[];
  query: URLSearchParams;
  area: "showcase" | "app";
  module: ModuleKey;
  recordId?: string;
  tab?: string;
};

const MODULES: ModuleKey[] = ["dashboard", "projects", "inventory", "assets", "purchase", "sales", "crm", "hr", "payroll", "users", "reports"];

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(queryPart);
  if (path[0] !== "app") {
    return { path, query, area: "showcase", module: "dashboard" };
  }
  const module = (MODULES.includes(path[1] as ModuleKey) ? path[1] : "dashboard") as ModuleKey;
  return { path, query, area: "app", module, recordId: path[2], tab: query.get("tab") ?? undefined };
}

let current = parse(window.location.hash);
const subs = new Set<() => void>();
window.addEventListener("hashchange", () => {
  const prev = current;
  current = parse(window.location.hash);
  // Scroll to top on a module change only; opening/closing a record drawer keeps the list in place.
  if (prev.module !== current.module || prev.area !== current.area) {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
  subs.forEach((s) => s());
});

export function useRoute() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
  );
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = to.startsWith("#") ? to : `#${to}`;
  if (opts.replace) {
    history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
}

export const href = {
  showcase: (anchor?: string) => (anchor ? `#/?s=${anchor}` : "#/"),
  module: (m: ModuleKey, tab?: string) => `#/app/${m}${tab ? `?tab=${tab}` : ""}`,
  record: (id: string) => {
    const m = moduleForId(id);
    return m ? `#/app/${m}/${encodeURIComponent(id)}` : "#/app/dashboard";
  },
};

/** Set a query param on the current route without a history entry per keystroke. */
export function setTab(tab: string) {
  const { path, query } = current;
  query.set("tab", tab);
  navigate(`/${path.join("/")}?${query.toString()}`, { replace: true });
}

export function Link({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
