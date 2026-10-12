import { fireEvent, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';

import '@/i18n';

import { exercises } from '@/mocks/exercises';
import { useAuthStore } from '@/store/authStore';
import { useCompletionStore } from '@/store/completionStore';

import LessonScreen from '@/app/(app)/lesson/[id]';

const lessonExercises = exercises.filter((e) => e.lessonId === 'de-a1-1');

function open(id: string) {
  return renderRouter({ _layout: () => <Stack />, 'lesson/[id]': LessonScreen }, { initialUrl: `/lesson/${id}` });
}

beforeEach(() => {
  useCompletionStore.setState({ byUser: {} });
  useAuthStore.setState({ session: { user: { id: 'u1' } as never, issuedAt: '' }, initialized: true });
});

/** Answers every exercise of the lesson correctly through the UI. */
async function playPerfectly(count: number) {
  for (let i = 0; i < count; i++) {
    const exercise = lessonExercises[i]!;
    if (exercise.type === 'multiple-choice') {
      fireEvent.press(await screen.findByRole('radio', { name: exercise.answer }));
    } else {
      fireEvent.changeText(await screen.findByLabelText('Your answer'), exercise.answer);
    }
    fireEvent.press(screen.getByRole('button', { name: 'Check' }));
    fireEvent.press(screen.getByRole('button', { name: i === count - 1 ? 'Finish' : 'Next' }));
  }
}

describe('lesson screen', () => {
  it('shows an empty state for a lesson without exercises', async () => {
    open('fr-a1-1');
    expect(await screen.findByText('No exercises yet')).toBeTruthy();
    expect(useCompletionStore.getState().byUser).toEqual({});
  });

  it('plays a whole lesson and records the result', async () => {
    open('de-a1-1');
    await playPerfectly(lessonExercises.length);
    await waitFor(() =>
      expect(useCompletionStore.getState().byUser['u1']?.['de-a1-1']).toMatchObject({
        correct: lessonExercises.length,
        total: lessonExercises.length,
      }),
    );
  });
});
