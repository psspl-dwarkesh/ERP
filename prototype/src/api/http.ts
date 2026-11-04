/**
 * HTTP transport for the Threadline API. Reads are GET /api/<resource>;
 * business actions are POST /api/commands/<name>. Cookies carry the session.
 */
import { API_BASE } from "./base";
import { ApiError, invalidate, type ApiErrorCode } from "./store";

const BASE = API_BASE;

type Listener = () => void;
const onUnauthenticated = new Set<Listener>();
/** Called when the server says the session is gone (expired, revoked, signed out elsewhere). */
export function whenSignedOut(fn: Listener) {
  onUnauthenticated.add(fn);
  return () => {
    onUnauthenticated.delete(fn);
  };
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the Threadline server. Check your connection and try again.", "NETWORK");
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const code = (json?.error?.code as ApiErrorCode) ?? (res.status === 401 ? "UNAUTHENTICATED" : "INTERNAL");
    if (code === "UNAUTHENTICATED" && path !== "/auth/login") onUnauthenticated.forEach((l) => l());
    throw new ApiError(json?.error?.message ?? `Request failed (${res.status})`, code);
  }
  return json as T;
}

export const http = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body: unknown) => request<T>("POST", path, body),
  /** Run a business command. Some commit progress and still report a stop: that arrives as BLOCKED after the data refreshes. */
  async command<T>(name: string, input: unknown): Promise<T> {
    const out = await request<{ data: T; blocked?: string }>("POST", `/commands/${name}`, input ?? {});
    invalidate();
    if (out.blocked) throw new ApiError(out.blocked, "BLOCKED");
    return out.data;
  },
};
