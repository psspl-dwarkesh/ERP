/**
 * Shared by the mock and the HTTP transport: the error type screens catch, and
 * the change counter every useQuery subscribes to (bump it and screens refetch).
 */
export type ApiErrorCode = "NOT_FOUND" | "BLOCKED" | "VALIDATION" | "FORBIDDEN" | "UNAUTHENTICATED" | "CONFLICT" | "INTERNAL" | "NETWORK";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
  ) {
    super(message);
  }
}

let version = 0;
const listeners = new Set<() => void>();

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getVersion() {
  return version;
}

/** Something changed: every mounted query refetches. */
export function invalidate() {
  version += 1;
  listeners.forEach((l) => l());
}

/**
 * "mock" runs the whole ERP in the browser; "remote" talks to the Threadline API.
 * The demo runs against the real database, so "remote" is the default — only an
 * explicit `--mode mock` build (VITE_API_MODE="mock") falls back to in-browser data.
 */
export const API_MODE: "mock" | "remote" = import.meta.env.VITE_API_MODE === "mock" ? "mock" : "remote";
