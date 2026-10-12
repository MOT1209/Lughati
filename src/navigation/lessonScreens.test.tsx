import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

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

beforeEach(async () => {
  registerRepositories(createMockRepositories());
  useLearningStore.setState({ selectedTarget: 'de', progressVersion: 0 });
  await setUiLocale('en');
});

describe('Learn screen', () => {
  it('lists the lessons of the current language with their status', async () => {
    renderRouter({ learn: LearnScreen }, { initialUrl: '/learn' });
    expect(await screen.findAllByRole('button')).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Greetings and politeness, Completed' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Introducing yourself, Completed' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Numbers, Current lesson' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Getting around, Not started' })).toBeTruthy();
  });

  it('shows an empty state for a language without lessons', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, lessons: { ...repos.lessons, getByLanguage: async () => [] } });
    renderRouter({ learn: LearnScreen }, { initialUrl: '/learn' });
    expect(await screen.findByText('There are no lessons for this language yet.')).toBeTruthy();
  });
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
  });

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
  });

  it('shows a not-found state for an unknown lesson', async () => {
    renderRouter(routes, { initialUrl: '/lesson/nope' });
    expect(await screen.findByText('We could not find this lesson.')).toBeTruthy();
  });
});
