import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error' }
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
      () => !cancelled && setSettled({ key, state: { status: 'error' } }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures deps+attempt; `load` identity is ignored on purpose
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const state: AsyncState<T> = settled?.key === key ? settled.state : { status: 'loading' };
  return { ...state, reload };
}
