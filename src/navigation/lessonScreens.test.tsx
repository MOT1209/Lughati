import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import LearnScreen from '@/app/(app)/(tabs)/learn';
import LessonScreen from '@/app/(app)/lesson/[id]';
import { setUiLocale } from '@/i18n';
import { vocabulary } from '@/mocks/vocabulary';
import { getRepositories, registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useLearningStore } from '@/store/learningStore';
import { isolateLtr } from '@/utils/bidi';
import { buildExercises } from '@/utils/exercises';

const routes = {
  'learn': LearnScreen,
  'lesson/[id]': LessonScreen,
};

// Integration tests through renderRouter are slow on loaded/slow machines
// (documented in docs/PHASE_1_AUDIT.md §12); give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

beforeEach(async () => {
  // The quiz asks for confirmation before finishing; auto-accept it in these tests.
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const confirm = buttons?.find((b) => b.text === 'Finish');
    confirm?.onPress?.();
  });
  registerRepositories(createMockRepositories());
  useLearningStore.setState({ userId: '', profile: { source: 'ar', target: 'de' }, profileLoaded: true, progressVersion: 0 });
  await setUiLocale('en');
});

afterEach(() => jest.restoreAllMocks());

describe('Learn screen', () => {
  it('lists the lessons of the current language with their status', async () => {
    renderRouter({ learn: LearnScreen }, { initialUrl: '/learn' });
    expect(await screen.findAllByRole('button')).toHaveLength(10);
    // A new learner starts at the first lesson with nothing completed.
    expect(screen.getByRole('button', { name: 'Greetings and politeness, Current lesson' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Introducing yourself, Not started' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Numbers, Not started' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Getting around, Not started' })).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('shows an empty state for a language without lessons', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, lessons: { ...repos.lessons, getByLanguage: async () => [] } });
    renderRouter({ learn: LearnScreen }, { initialUrl: '/learn' });
    expect(await screen.findByText('There are no lessons for this language yet.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});

describe('Lesson screen', () => {
  it('shows the lesson words, then runs the quiz, saves progress and shows a summary', async () => {
    renderRouter(routes, { initialUrl: '/lesson/de-a1-3' });
    expect(await screen.findByText(isolateLtr('eins'))).toBeTruthy();

    const words = vocabulary.filter((w) => w.lessonId === 'de-a1-3');
    const byId = new Map(words.map((w) => [w.id, w]));
    const exercises = buildExercises('de-a1-3', words);

    fireEvent.press(screen.getByRole('button', { name: 'Start exercises' }));
    for (const [index, exercise] of exercises.entries()) {
      const word = byId.get(exercise.answer)!;
      const text = exercise.type === 'multiple-choice' ? word.translations.ar : isolateLtr(word.term);
      fireEvent.press(await screen.findByRole('button', { name: `Option: ${text}` }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
      });
    }

    expect(await screen.findByText('Well done! Lesson complete')).toBeTruthy();
    expect(screen.getByText('You got 12 of 12 right')).toBeTruthy();
    const progress = await getRepositories().progress.get('', 'de');
    expect(progress?.completedLessonIds).toContain('de-a1-3');
    expect(useLearningStore.getState().progressVersion).toBe(1);
  }, SLOW_TEST_TIMEOUT);

  it('keeps the quiz and offers a retry when saving fails', async () => {
    const repos = createMockRepositories();
    let attempts = 0;
    registerRepositories({
      ...repos,
      progress: {
        ...repos.progress,
        completeLesson: async (...args) => {
          attempts += 1;
          if (attempts === 1) throw new Error('disk full');
          return repos.progress.completeLesson(...args);
        },
      },
    });
    renderRouter(routes, { initialUrl: '/lesson/de-a1-3' });
    fireEvent.press(await screen.findByRole('button', { name: 'Start exercises' }));

    const words = vocabulary.filter((w) => w.lessonId === 'de-a1-3');
    const byId = new Map(words.map((w) => [w.id, w]));
    for (const [index, exercise] of buildExercises('de-a1-3', words).entries()) {
      const word = byId.get(exercise.answer)!;
      const text = exercise.type === 'multiple-choice' ? word.translations.ar : isolateLtr(word.term);
      fireEvent.press(await screen.findByRole('button', { name: `Option: ${text}` }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: index === 11 ? 'Finish' : 'Next' }));
      });
    }

    expect(await screen.findByText('We could not save your progress.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });
    await waitFor(() => expect(screen.getByText('Well done! Lesson complete')).toBeTruthy());
    expect(attempts).toBe(2);
  }, SLOW_TEST_TIMEOUT);

  it('below the pass mark the lesson stays unfinished and can be retried', async () => {
    renderRouter(routes, { initialUrl: '/lesson/de-a1-3' });
    fireEvent.press(await screen.findByRole('button', { name: 'Start exercises' }));

    const words = vocabulary.filter((w) => w.lessonId === 'de-a1-3');
    const byId = new Map(words.map((w) => [w.id, w]));
    const exercises = buildExercises('de-a1-3', words);
    // Wrong on every question: pick the first option that is not the answer.
    for (const [index, exercise] of exercises.entries()) {
      const word = byId.get(exercise.options.find((id) => id !== exercise.answer)!)!;
      const text = exercise.type === 'multiple-choice' ? word.translations.ar : isolateLtr(word.term);
      fireEvent.press(await screen.findByRole('button', { name: `Option: ${text}` }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
      });
    }

    expect(await screen.findByText('Not passed yet')).toBeTruthy();
    expect(screen.getByText('You got 0 of 12 right')).toBeTruthy();
    expect(screen.getByText('You need 70% correct answers to complete the lesson. Give it another go.')).toBeTruthy();
    expect(screen.getByText('You earned 0 XP')).toBeTruthy();
    const progress = await getRepositories().progress.get('', 'de');
    expect(progress?.completedLessonIds).not.toContain('de-a1-3');

    fireEvent.press(screen.getByRole('button', { name: 'Retry the lesson' }));
    expect(await screen.findByText('Question 1 of 12')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('asks before leaving an unfinished quiz, and leaves only when confirmed', async () => {
    const buttons: { text?: string; onPress?: () => void }[][] = [];
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, options) => {
      buttons.push((options ?? []) as { text?: string; onPress?: () => void }[]);
    });
    renderRouter({ _layout: () => <Stack />, ...routes }, { initialUrl: '/learn' });
    fireEvent.press(await screen.findByRole('button', { name: 'Numbers, Not started' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Start exercises' }));
    expect(await screen.findByText('Question 1 of 12')).toBeTruthy();

    act(() => router.back());
    expect(alert).toHaveBeenCalledWith('Leave the quiz?', expect.any(String), expect.any(Array));
    expect(screen.getByText('Question 1 of 12')).toBeTruthy(); // still on the quiz

    act(() => buttons[0]!.find((b) => b.text === 'Keep going')?.onPress?.());
    expect(screen.getByText('Question 1 of 12')).toBeTruthy();

    act(() => router.back());
    await act(async () => buttons[1]!.find((b) => b.text === 'Leave')!.onPress!());
    expect(await screen.findByRole('button', { name: 'Numbers, Not started' })).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('leaves the lesson intro without asking', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    renderRouter({ _layout: () => <Stack />, ...routes }, { initialUrl: '/learn' });
    fireEvent.press(await screen.findByRole('button', { name: 'Numbers, Not started' }));
    expect(await screen.findByRole('button', { name: 'Start exercises' })).toBeTruthy();

    act(() => router.back());
    expect(await screen.findByRole('button', { name: 'Numbers, Not started' })).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
  }, SLOW_TEST_TIMEOUT);

  it("shows meanings in the learner's own language", async () => {
    useLearningStore.setState({ profile: { source: 'es', target: 'de' } });
    renderRouter(routes, { initialUrl: '/lesson/de-a1-1' });
    expect(await screen.findByText(isolateLtr('Hallo'))).toBeTruthy();
    expect(screen.getByText('Hola')).toBeTruthy();
    expect(screen.queryByText('مرحباً')).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('shows a not-found state for an unknown lesson', async () => {
    renderRouter(routes, { initialUrl: '/lesson/nope' });
    expect(await screen.findByText('We could not find this lesson.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});
