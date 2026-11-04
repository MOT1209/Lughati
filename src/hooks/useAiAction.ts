import { useCallback, useEffect, useRef, useState } from 'react';

import { AIError, type AIErrorCode } from '@/services/ai';

export type AiActionState<R> = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: R } | { status: 'error'; code: AIErrorCode };

/** Runs one AI call with loading / error / retry state. A repeat press while loading is ignored. */
export function useAiAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [state, setState] = useState<AiActionState<R>>({ status: 'idle' });
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  const lastArgs = useRef<A | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    if (busy.current) return undefined;
    busy.current = true;
    lastArgs.current = args;
    if (mounted.current) setState({ status: 'loading' });
    try {
      const data = await latest.current(...args);
      if (mounted.current) setState({ status: 'success', data });
      return data;
    } catch (error) {
      if (mounted.current) setState({ status: 'error', code: error instanceof AIError ? error.code : 'unknown' });
      return undefined;
    } finally {
      busy.current = false;
    }
  }, []);

  const retry = useCallback(() => (lastArgs.current ? run(...lastArgs.current) : Promise.resolve(undefined)), [run]);
  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, run, retry, reset, loading: state.status === 'loading' };
}
