import { fireEvent, render, screen } from '@testing-library/react-native';

import { setUiLocale } from '@/i18n';
import { vocabulary } from '@/mocks/vocabulary';
import { isolateLtr } from '@/utils/bidi';
import { buildExercises } from '@/utils/exercises';

import { LessonQuiz } from './LessonQuiz';

const words = vocabulary.filter((w) => w.lessonId === 'de-a1-1');
const exercises = buildExercises('de-a1-1', words);
const byId = new Map(words.map((w) => [w.id, w]));

beforeAll(() => setUiLocale('en'));

// Option label for a vocabulary id, depending on the exercise direction.
const optionName = (type: string, id: string) =>
  `Option: ${type === 'multiple-choice' ? byId.get(id)!.translations.ar : isolateLtr(byId.get(id)!.term)}`;

describe('LessonQuiz', () => {
  it('shows the target word first and the meaning options (multiple-choice)', () => {
    render(<LessonQuiz exercises={exercises} words={words} onFinish={() => {}} />);
    expect(screen.getByText(isolateLtr('Hallo'))).toBeTruthy();
    expect(screen.getByText('Question 1 of 10')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('gives feedback on a correct answer and locks the other options', () => {
    render(<LessonQuiz exercises={exercises} words={words} onFinish={() => {}} />);
    const first = exercises[0]!;
    fireEvent.press(screen.getByRole('button', { name: optionName(first.type, first.answer) }));
    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    const wrongId = first.options.find((id) => id !== first.answer)!;
    expect(screen.getByRole('button', { name: optionName(first.type, wrongId) })).toBeDisabled();
  });

  it('shows the right answer after a wrong one', () => {
    render(<LessonQuiz exercises={exercises} words={words} onFinish={() => {}} />);
    const first = exercises[0]!;
    const wrongId = first.options.find((id) => id !== first.answer)!;
    fireEvent.press(screen.getByRole('button', { name: optionName(first.type, wrongId) }));
    expect(screen.getByText('Not quite')).toBeTruthy();
    expect(screen.getByText(`Correct answer: ${byId.get(first.answer)!.translations.ar}`)).toBeTruthy();
  });

  it('reports the score after the last question', () => {
    const onFinish = jest.fn();
    render(<LessonQuiz exercises={exercises} words={words} onFinish={onFinish} />);
    exercises.forEach((exercise, index) => {
      // Answer the first three correctly and the rest wrongly.
      const id = index < 3 ? exercise.answer : exercise.options.find((o) => o !== exercise.answer)!;
      fireEvent.press(screen.getByRole('button', { name: optionName(exercise.type, id) }));
      fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ correct: 3, total: 10 });
  });
});
