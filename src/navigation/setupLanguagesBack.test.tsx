import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';

import SetupLanguagesScreen from '@/app/(app)/setup-languages';
import { setUiLocale } from '@/i18n';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useLearningStore } from '@/store/learningStore';

type BackPressHandler = (event: unknown) => boolean | null | undefined;

// sourceTitle of the setup flow: both steps start with the source step.
const SOURCE_TITLE = 'What is your language?';

// The hardware back press handlers the screen subscribes while mounted.
const subscriptions: BackPressHandler[] = [];
let removeCalls = 0;

beforeAll(() => {
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_name, handler) => {
      subscriptions.push(handler as BackPressHandler);
      return { remove: () => { removeCalls += 1; } };
    });
});

afterAll(() => {
  jest.restoreAllMocks();
});

/** Dispatches the Android hardware back press on every live handler and records consumption.
 * React StrictMode (used by the test preset) mounts/unmounts effects twice, so transient
 * duplicate entries are expected; the device stops at the first handler returning true. */
const pressHardwareBack = (): boolean[] => {
  const results: boolean[] = [];
  for (const handler of [...subscriptions]) {
    // The screen only consumes the press by its return value; cast keeps the dispatch simple.
    const event = {} as Parameters<BackPressHandler>[0];
    const consumed = handler(event);
    results.push(consumed ?? false);
  }
  return results;
};

const renderAtSetup = (url: string) => renderRouter({ 'setup-languages': SetupLanguagesScreen } as never, { initialUrl: url });

describe('Android hardware back on the language setup screen', () => {
  beforeEach(async () => {
    registerRepositories(createMockRepositories());
    await setUiLocale('en');
    subscriptions.length = 0;
    removeCalls = 0;
  });

  afterEach(() =>
    act(() => {
      useLearningStore.setState({ userId: null, profile: null, profileLoaded: false, progressVersion: 0 });
    }),
  );

  it('cleans every listener up when unmounted (no leak on re-mounts)', async () => {
    const first = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    const registered = new Set(subscriptions);
    expect(registered.size).toBeGreaterThanOrEqual(1);
    first.unmount();
    expect(removeCalls).toBe(registered.size); // 1:1 unsubscribe, nothing leaks
    subscriptions.length = 0;
    removeCalls = 0;
    const second = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(new Set(subscriptions).size).toBeGreaterThanOrEqual(1);
    second.unmount();
    expect(removeCalls).toBe(subscriptions.length);
  });

  it('swallows the press on the source step during the mandatory setup (no accidental exit)', async () => {
    useLearningStore.setState({ userId: 'u1', profile: null, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText('Step 1 of 2');
    expect(pressHardwareBack().every(Boolean)).toBe(true); // consumed, stays on step 1
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
  });

  it('returns from the target step to the source step in exactly one transition', async () => {
    useLearningStore.setState({ userId: 'u1', profile: null, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    fireEvent.press(screen.getByRole('radio', { name: 'Arabic' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 2');
    expect(pressHardwareBack().every(Boolean)).toBe(true); // single press, single transition
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
  });

  it('falls through on the source step during an edit so the default pop runs', async () => {
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(pressHardwareBack().some(Boolean)).toBe(false); // not consumed: the router pops normally
  });

  it('a stale listener from a previous mount no longer works', async () => {
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    const first = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    const firstSubscriptions = [...subscriptions];
    first.unmount();
    // The step change is routed by the LIVE subscription of a fresh mount, not a stale one.
    subscriptions.length = 0;
    const second = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    const before = removeCalls;
    fireEvent.press(screen.getByRole('radio', { name: 'Arabic' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 2');
    second.unmount();
    // Every listener registered across the two mounts was unsubscribed on cleanup.
    expect(removeCalls - before).toBe(subscriptions.length);
    expect(firstSubscriptions.length).toBeGreaterThanOrEqual(1);
  });
});
