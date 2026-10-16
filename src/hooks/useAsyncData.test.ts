import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAsyncData } from './useAsyncData';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const successOf = (state: ReturnType<typeof useAsyncData<string>>) =>
  state.status === 'success' ? state.data : undefined;

describe('useAsyncData', () => {
  it('loads on mount and reports success', async () => {
    const { result } = renderHook(() => useAsyncData(async () => 'ready', []));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(successOf(result.current)).toBe('ready'));
    expect(result.current.status).toBe('success');
  });

  it('keeps the previous result on screen while a new deps value loads', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const loader = (dep: number) => (dep === 1 ? first.promise : second.promise);

    const { result, rerender } = renderHook(({ dep }: { dep: number }) => useAsyncData(() => loader(dep), [dep]), {
      initialProps: { dep: 1 },
    });

    first.resolve('one');
    await waitFor(() => expect(successOf(result.current)).toBe('one'));

    rerender({ dep: 2 });
    // Stale-while-revalidate: no spinner flash on a deps change.
    expect(result.current.status).toBe('success');
    expect(successOf(result.current)).toBe('one');

    second.resolve('two');
    await waitFor(() => expect(successOf(result.current)).toBe('two'));
  });

  it('shows loading on reload and delivers the retried result', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    let calls = 0;
    const { result } = renderHook(() => useAsyncData(() => (calls++ === 0 ? first.promise : second.promise), []));

    first.reject(new Error('boom'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');

    second.resolve('recovered');
    await waitFor(() => expect(successOf(result.current)).toBe('recovered'));
  });

  it('still keeps data on a deps change after a reload happened', async () => {
    const initial = deferred<string>();
    const retried = deferred<string>();
    const nextDep = deferred<string>();
    let depOneCalls = 0;
    const loader = (dep: number) => (dep === 2 ? nextDep.promise : depOneCalls++ === 0 ? initial.promise : retried.promise);

    const { result, rerender } = renderHook(({ dep }: { dep: number }) => useAsyncData(() => loader(dep), [dep]), {
      initialProps: { dep: 1 },
    });

    initial.resolve('first');
    await waitFor(() => expect(successOf(result.current)).toBe('first'));

    act(() => result.current.reload());
    retried.resolve('retried');
    await waitFor(() => expect(successOf(result.current)).toBe('retried'));

    rerender({ dep: 2 });
    // Regression: a past reload must not turn later deps changes into a spinner.
    expect(result.current.status).toBe('success');
    expect(successOf(result.current)).toBe('retried');

    nextDep.resolve('third');
    await waitFor(() => expect(successOf(result.current)).toBe('third'));
  });

  it('never shows an error from a previous deps value', async () => {
    const failing = deferred<string>();
    const nextDep = deferred<string>();
    const loader = (dep: number) => (dep === 1 ? failing.promise : nextDep.promise);

    const { result, rerender } = renderHook(({ dep }: { dep: number }) => useAsyncData(() => loader(dep), [dep]), {
      initialProps: { dep: 1 },
    });

    failing.reject(new Error('boom'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    rerender({ dep: 2 });
    expect(result.current.status).toBe('loading');

    nextDep.resolve('fine');
    await waitFor(() => expect(successOf(result.current)).toBe('fine'));
  });

  it('exposes the failure so a screen can react to it', async () => {
    const failing = deferred<string>();
    const { result } = renderHook(() => useAsyncData(() => failing.promise, []));

    failing.reject({ message: 'Could not connect.', code: 'network' });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.status === 'error' && result.current.error).toEqual({ message: 'Could not connect.', code: 'network' });
  });
});
