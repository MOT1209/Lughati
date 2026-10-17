import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import ProfileScreen from '@/app/(app)/(tabs)/profile';
import { setUiLocale } from '@/i18n';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import { isolate, isolateLtr } from '@/utils/bidi';

// Integration tests through renderRouter are slow on loaded machines; give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

const session = {
  user: { id: 'u1', name: 'Sara', email: 'sara@example.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

const routes = { profile: ProfileScreen, settings: () => <Text>settings screen</Text> };

beforeEach(async () => {
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
  it('shows the learner, the current language and level, and honest empty stats for a new account', async () => {
    registerRepositories(createMockRepositories());
    renderRouter(routes, { initialUrl: '/profile' });

    expect(await screen.findByText(isolate('Sara'))).toBeTruthy();
    expect(screen.getByText(isolateLtr('sara@example.com'))).toBeTruthy();
    expect(screen.getByText('German')).toBeTruthy();
    expect(screen.getByText('A1 · Beginner')).toBeTruthy();
    expect(screen.getByLabelText('Day streak: no days yet')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3); // XP, words, minutes
  }, SLOW_TEST_TIMEOUT);

  it('shows recorded progress after a passed lesson', async () => {
    const repos = createMockRepositories();
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    registerRepositories(repos);
    renderRouter(routes, { initialUrl: '/profile' });

    expect(await screen.findByText('140')).toBeTruthy(); // 12 × 10 XP + 20 lesson bonus
    expect(screen.getByText('6')).toBeTruthy(); // words of the lesson
    expect(screen.getByLabelText('Day streak: 1 day')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('opens the settings', async () => {
    registerRepositories(createMockRepositories());
    renderRouter(routes, { initialUrl: '/profile' });
    fireEvent.press(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('settings screen')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});
