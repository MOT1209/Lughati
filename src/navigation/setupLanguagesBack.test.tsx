import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';

import SetupLanguagesScreen from '@/app/(app)/setup-languages';
import { setUiLocale } from '@/i18n';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useLearningStore } from '@/store/learningStore';

type BackPressHandler = (event: unknown) => boolean | null | undefined;

// Source title of the setup flow: both steps start with the source step.
const SOURCE_TITLE = 'What is your language?';

// Hardware back handlers currently registered with BackHandler (live entries only:
// a subscription is removed from this array the moment its remove() is called).
const subscriptions: BackPressHandler[] = [];
let removeCalls = 0;
let registrationCalls = 0;

beforeAll(() => {
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, handler) => {
    const registered = handler as BackPressHandler;
    subscriptions.push(registered);
    registrationCalls += 1;
    return {
      remove: () => {
        const index = subscriptions.indexOf(registered);
        if (index !== -1) subscriptions.splice(index, 1);
        removeCalls += 1;
      },
    };
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

/** Simulates one Android hardware back press exactly the way the device dispatches it:
 * handlers are invoked newest-registration first and the press is offered to each of
 * them only until the first one consumes it (returns true). A consuming handler may
 * update React state (the screen's setStep), so the dispatch runs inside act(), the
 * same guarantee react-test-renderer expects for user-driven events. */
const pressHardwareBack = (): boolean => {
  let consumed = false;
  act(() => {
    for (let i = subscriptions.length - 1; i >= 0 && !consumed; i -= 1) {
      const event = {} as Parameters<BackPressHandler>[0];
      consumed = subscriptions[i](event) === true;
    }
  });
  return consumed;
};

const renderAtSetup = (url: string) => renderRouter({ 'setup-languages': SetupLanguagesScreen } as never, { initialUrl: url });

describe('Android hardware back on the language setup screen', () => {
  beforeEach(async () => {
    registerRepositories(createMockRepositories());
    await setUiLocale('en');
    subscriptions.length = 0;
    removeCalls = 0;
    registrationCalls = 0;
  });

  afterEach(() =>
    act(() => {
      useLearningStore.setState({ userId: null, profile: null, profileLoaded: false, progressVersion: 0 });
    }),
  );

  it('unsubscribes every listener on unmount (no leak on re-mounts)', async () => {
    const first = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    // React StrictMode (used by the test preset) mounts/unmounts effects twice, so
    // the transient first registration was already unsubscribed on its cleanup.
    expect(subscriptions.length).toBeGreaterThanOrEqual(1);
    first.unmount();
    expect(subscriptions.length).toBe(0); // nothing is left listening
    expect(removeCalls).toBe(registrationCalls); // 1:1 unsubscribe for every registration

    const second = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(subscriptions.length).toBeGreaterThanOrEqual(1);
    second.unmount();
    expect(subscriptions.length).toBe(0);
    expect(removeCalls).toBe(registrationCalls);
  });

  it('swallows the press on the source step during the mandatory setup (no accidental exit)', async () => {
    useLearningStore.setState({ userId: 'u1', profile: null, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText('Step 1 of 2');
    expect(pressHardwareBack()).toBe(true); // consumed, stays on step 1
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
  });

  it('returns from the target step to the source step in exactly one transition', async () => {
    useLearningStore.setState({ userId: 'u1', profile: null, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    fireEvent.press(screen.getByRole('radio', { name: 'Arabic' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 2');
    expect(pressHardwareBack()).toBe(true); // single press, single transition
    await screen.findByText('Step 1 of 2');
  });

  it('falls through on the source step during an edit so the default pop runs', async () => {
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(pressHardwareBack()).toBe(false); // not consumed: the router pops normally
  });

  it('a listener whose mount has been cleaned up no longer receives presses', async () => {
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    const first = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(subscriptions.length).toBeGreaterThanOrEqual(1);
    first.unmount();
    // The cleanup removed the handler from the registry: a later press cannot reach
    // a listener whose screen is gone, and no live handler was leaked either.
    expect(subscriptions.length).toBe(0);
    expect(removeCalls).toBe(registrationCalls);

    const second = renderAtSetup('/setup-languages');
    await screen.findByText(SOURCE_TITLE);
    expect(subscriptions.length).toBeGreaterThanOrEqual(1);
    // The step change is routed by the LIVE subscription of the fresh mount.
    fireEvent.press(screen.getByRole('radio', { name: 'Arabic' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 2');
    second.unmount();
    expect(subscriptions.length).toBe(0);
    expect(removeCalls).toBe(registrationCalls);
  });
});
