import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getVersion, subscribe } from "./client";

/**
 * Minimal data hook: runs the loader, re-runs when any mutation commits.
 * `loading` is true only for the first load, so refetches don't flash placeholders.
 */
export function useQuery<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const version = useSyncExternalStore(subscribe, getVersion);
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let live = true;
    loaderRef
      .current()
      .then((data) => live && setState({ data, loading: false }))
      .catch((error: Error) => live && setState((s) => ({ ...s, error, loading: false })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return state;
}

/** Wraps a command with pending + error state. */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );
  return { run, pending, error, reset: () => setError(null) };
}
