import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '@/app/(app)/(tabs)/home';
import ProgressScreen from '@/app/(app)/(tabs)/progress';
import ReviewScreen from '@/app/(app)/(tabs)/review';
import LessonScreen from '@/app/(app)/lesson/[id]';
import { setUiLocale } from '@/i18n';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { VocabularyReviewState } from '@/types';
import { isolateLtr } from '@/utils/bidi';

// Integration tests through renderRouter are slow on loaded/slow machines
// (documented in docs/PHASE_1_AUDIT.md §12); give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

const session = {
  user: { id: 'u1', name: 'Sara', email: 's@e.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

const dueState: VocabularyReviewState = {
  userId: 'u1',
  targetLanguage: 'de',
  wordId: 'de-a1-1-w1', // "Hallo" / meaning "مرحباً"
  step: 0,
  correctCount: 0,
  wrongCount: 0,
  lastReviewedAt: null,
  nextReviewAt: '2026-01-01T00:00:00.000Z',
};

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

describe('Home screen', () => {
  it('renders the current lesson meta and daily goal from data, not raw keys', async () => {
    renderRouter({ home: HomeScreen }, { initialUrl: '/home' });
    expect(await screen.findByText('Hello, Sara')).toBeTruthy();
    expect(screen.getByText('A1 · 8 min')).toBeTruthy(); // lessonMeta, not "home.lessonMeta"
    expect(screen.getByText('0 of 15 minutes')).toBeTruthy();
    expect(screen.queryByText('home.lessonMeta')).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('surfaces the top recommendation with localized copy and a way to act on it', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, reviews: { ...repos.reviews, getDue: async () => [] } });
    renderRouter({ home: HomeScreen }, { initialUrl: '/home' });

    expect(await screen.findByText('Recommended for you')).toBeTruthy();
    expect(screen.getByText('You have 15 minutes left to reach today’s goal.')).toBeTruthy();
    expect(screen.queryByText('home.recDailyGoal')).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('shows the hero: streak, current language with a change action, and the daily goal ring', async () => {
    const router = renderRouter({ home: HomeScreen, 'language-selection': () => null }, { initialUrl: '/home' });
    expect(await screen.findByLabelText('Day streak, 0 days')).toBeTruthy();
    expect(screen.getByText('German')).toBeTruthy();
    expect(screen.getByText('Lesson 1 of 10')).toBeTruthy();
    const goal = screen.getByRole('progressbar', { name: 'Daily goal' });
    expect(goal.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });

    fireEvent.press(screen.getByRole('button', { name: 'Change language' }));
    expect(router.getPathname()).toBe('/language-selection');
  }, SLOW_TEST_TIMEOUT);

  it('opens the current lesson from the recommendation row', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, reviews: { ...repos.reviews, getDue: async () => [] } });
    const router = renderRouter({ home: HomeScreen, 'lesson/[id]': () => null }, { initialUrl: '/home' });

    const row = await screen.findByRole('button', { name: /^Recommended for you: / });
    fireEvent.press(row);
    expect(router.getPathname()).toBe('/lesson/de-a1-1');
  }, SLOW_TEST_TIMEOUT);

  it('opens the current lesson from the gold continue button', async () => {
    const router = renderRouter({ home: HomeScreen, 'lesson/[id]': () => null }, { initialUrl: '/home' });
    fireEvent.press(await screen.findByRole('button', { name: 'Continue learning' }));
    expect(router.getPathname()).toBe('/lesson/de-a1-1');
  }, SLOW_TEST_TIMEOUT);
});

describe('Progress screen', () => {
  it('shows the real level name and current lesson', async () => {
    renderRouter({ progress: ProgressScreen }, { initialUrl: '/progress' });
    expect(await screen.findByText('Level Beginner')).toBeTruthy();
    expect(screen.getByText('Current lesson')).toBeTruthy();
    expect(screen.getByText('Greetings and politeness')).toBeTruthy();
    expect(screen.getByText('Lessons completed')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});

describe('Review screen', () => {
  it('reviews a due word, records the outcome and schedules the next review', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, reviews: { ...repos.reviews, getDue: async () => [dueState] } });
    renderRouter({ review: ReviewScreen }, { initialUrl: '/review' });

    expect(await screen.findByText(isolateLtr('Hallo'))).toBeTruthy();
    expect(screen.getByText('1 of 1')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Show meaning' }));
    expect(screen.getByText('مرحباً')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Good' }));
    });
    expect(await screen.findByText(/^Next review:/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('Review session complete')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it("shows review dates as the learner's local day, also just after midnight", async () => {
    // 00:30 on 17 Oct in Riyadh (tests run in UTC+3) is still 16 Oct in UTC.
    const repos = createMockRepositories({ now: () => new Date('2026-10-16T21:30:00Z') });
    registerRepositories({ ...repos, reviews: { ...repos.reviews, getDue: async () => [dueState] } });
    renderRouter({ review: ReviewScreen }, { initialUrl: '/review' });

    fireEvent.press(await screen.findByRole('button', { name: 'Show meaning' }));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Good' }));
    });
    expect(await screen.findByText('Last reviewed: 2026-10-17')).toBeTruthy();
    expect(screen.getByText('Next review: 2026-10-18')).toBeTruthy(); // step 0 + "good" = 1 day
  }, SLOW_TEST_TIMEOUT);

  it('shows an empty state when nothing is due', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, reviews: { ...repos.reviews, getDue: async () => [] } });
    renderRouter({ review: ReviewScreen }, { initialUrl: '/review' });
    expect(await screen.findByText('Nothing to review right now')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('asks for a language instead of guessing when there is no session', async () => {
    act(() => {
      useAuthStore.setState({ session: null });
    });
    renderRouter({ review: ReviewScreen }, { initialUrl: '/review' });
    expect(await screen.findByText('Choose what you want to learn before reviewing.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});

describe('Lesson practice entry', () => {
  const routes = { 'lesson/[id]': LessonScreen };

  it('offers the matching practice and opens it', async () => {
    renderRouter(routes, { initialUrl: '/lesson/de-a1-1' });
    fireEvent.press(await screen.findByRole('button', { name: 'Play matching practice' }));
    expect(await screen.findByText('What does this word mean?')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('hides the practice when the lesson has too few words', async () => {
    const repos = createMockRepositories();
    registerRepositories({
      ...repos,
      lessons: {
        ...repos.lessons,
        getVocabulary: async (lessonId) => (await repos.lessons.getVocabulary(lessonId)).slice(0, 1),
      },
    });
    renderRouter(routes, { initialUrl: '/lesson/de-a1-1' });
    await screen.findByText(isolateLtr('Hallo'));
    expect(screen.queryByRole('button', { name: 'Play matching practice' })).toBeNull();
  }, SLOW_TEST_TIMEOUT);
});
