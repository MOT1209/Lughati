import { useCallback, useEffect, useState } from 'react';

export type AsyncError = Error | { message: string; code?: string };

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: AsyncError }
  | { status: 'success'; data: T };

/** A finished request, tagged with the request it belongs to (see useAsyncData). */
interface Settled<T> {
  depsKey: string;
  attempt: number;
  state: AsyncState<T>;
}

/**
 * Runs `load` on mount and whenever `deps` (primitives only) change; `reload` retries.
 * Loading is derived (the request is tagged with its key) so no setState runs in the effect.
 *
 * Stale-while-revalidate: when only `deps` change, the previous result stays on screen
 * instead of flashing a spinner (Home/Learn reload after every finished lesson). Loading is
 * shown for the first request and whenever `reload` is called — including after a reload
 * once more, which is exactly when a retry must look like a retry.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: readonly (string | number | boolean | null)[]) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const depsKey = JSON.stringify(deps);
  const key = `${depsKey}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setSettled({ depsKey, attempt, state: { status: 'success', data } }),
      (error) => !cancelled && setSettled({ depsKey, attempt, state: { status: 'error', error } }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures deps+attempt; `load` identity is ignored on purpose
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const retrying = settled !== null && settled.attempt !== attempt;
  const staleError = settled !== null && settled.depsKey !== depsKey && settled.state.status === 'error';
  const state: AsyncState<T> = settled === null || retrying || staleError ? { status: 'loading' } : settled.state;
  return { ...state, reload };
}
