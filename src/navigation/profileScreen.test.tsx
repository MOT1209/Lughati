import { act } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import ProfileScreen from '@/app/(app)/(tabs)/profile';
import { setUiLocale } from '@/i18n';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import { isolate, isolateLtr } from '@/utils/bidi';

// Integration tests through renderRouter are slow on loaded/slow machines
// (documented in docs/PHASE_1_AUDIT.md §12); give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

const session = {
  user: { id: 'u1', name: 'Sara', email: 's@e.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

beforeEach(async () => {
  registerRepositories(createMockRepositories());
  act(() => {
    useAuthStore.setState({ session: session as never, initialized: true });
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true, progressVersion: 0 });
  });
  await setUiLocale('en');
});

afterEach(() =>
  act(() => {
    useAuthStore.setState({ session: null });
    useLearningStore.setState({ userId: null, profile: null, profileLoaded: false, progressVersion: 0 });
  }),
);

describe('Profile screen', () => {
  it('shows the account, current language, level and statistics from data', async () => {
    renderRouter({ profile: ProfileScreen }, { initialUrl: '/profile' });
    expect(await screen.findByText(isolate('Sara'))).toBeTruthy();
    expect(screen.getByText(isolateLtr('s@e.com'))).toBeTruthy();
    expect(screen.getByText('Current language')).toBeTruthy();
    expect(screen.getByText('German')).toBeTruthy();
    expect(screen.getByText(/^A1 · /)).toBeTruthy(); // levelValue interpolated, not the raw key
    expect(screen.queryByText('profile.levelValue')).toBeNull();
    for (const label of ['XP', 'Words learned', 'Minutes learned', 'Day streak']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  }, SLOW_TEST_TIMEOUT);

  it('announces the streak to screen readers with its day count', async () => {
    renderRouter({ profile: ProfileScreen }, { initialUrl: '/profile' });
    await screen.findByText(isolate('Sara'));
    // A new account starts with a streak of 0 (no invented data).
    expect(screen.getByLabelText('Day streak, 0 days')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('offers the settings entry point', async () => {
    renderRouter({ profile: ProfileScreen, settings: () => null }, { initialUrl: '/profile' });
    expect(await screen.findByRole('button', { name: 'Settings' })).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});
