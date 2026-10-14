import { useCallback, useEffect, useState } from 'react';

export type AsyncError = Error | { message: string; code?: string };

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: AsyncError }
  | { status: 'success'; data: T };

/**
 * Runs `load` on mount and whenever `deps` (primitives only) change; `reload` retries.
 * Loading is derived (result is tagged with the request key) so no setState runs in the effect.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: readonly (string | number | boolean | null)[]) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; state: AsyncState<T> } | null>(null);
  const key = JSON.stringify([...deps, attempt]);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setSettled({ key, state: { status: 'success', data } }),
      (err) => !cancelled && setSettled({ key, state: { status: 'error', error: err } }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures deps+attempt; `load` identity is ignored on purpose
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  // When the key changes due to attempt (reload = key includes old attempt),
  // always show loading to trigger a refetch.
  // When the key changes due to deps only (e.g. navigation), preserve the previous
  // settled state so the UI doesn't flash a spinner/loading state.
  const isReload = attempt > 0;
  const state: AsyncState<T> =
    settled === null
      ? { status: 'loading' }
      : isReload
        ? { status: 'loading' }
        : settled.state;
  return { ...state, reload };
}
