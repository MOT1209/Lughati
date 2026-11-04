import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { setUiLocale } from '@/i18n';
import { vocabulary } from '@/mocks/vocabulary';
import { isolate, isolateLtr } from '@/utils/bidi';
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
    expect(screen.getByText('Question 1 of 12')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5); // four options + listen to the word
    expect(screen.getByRole('button', { name: 'Listen to Hallo' })).toBeTruthy();
  });

  it('does not read the answer aloud when the options are target words (translate)', () => {
    const translate = exercises.filter((e) => e.type === 'translate');
    expect(translate.length).toBeGreaterThan(0);
    render(<LessonQuiz exercises={translate} words={words} onFinish={() => {}} />);
    expect(screen.queryByRole('button', { name: /^Listen to / })).toBeNull();
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

  it('announces the verdict to screen readers, not only by colour', () => {
    render(<LessonQuiz exercises={exercises} words={words} onFinish={() => {}} />);
    const first = exercises[0]!;
    const wrongId = first.options.find((id) => id !== first.answer)!;
    fireEvent.press(screen.getByRole('button', { name: optionName(first.type, wrongId) }));
    expect(screen.getByRole('button', { name: `${optionName(first.type, first.answer)}. Correct answer` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${optionName(first.type, wrongId)}. Wrong answer` })).toBeTruthy();
  });

  it('shows the right answer after a wrong one', () => {
    render(<LessonQuiz exercises={exercises} words={words} onFinish={() => {}} />);
    const first = exercises[0]!;
    const wrongId = first.options.find((id) => id !== first.answer)!;
    fireEvent.press(screen.getByRole('button', { name: optionName(first.type, wrongId) }));
    expect(screen.getByText('Not quite')).toBeTruthy();
    expect(screen.getByText(`Correct answer: ${byId.get(first.answer)!.translations.ar}`)).toBeTruthy();
  });

  it('reports the score after the last question once confirmed', () => {
    const onFinish = jest.fn();
    // Capture the confirm Alert buttons so the test can accept it.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => b.text === 'Finish');
      confirm?.onPress?.();
    });
    render(<LessonQuiz exercises={exercises} words={words} onFinish={onFinish} />);
    exercises.forEach((exercise, index) => {
      // Answer the first three correctly and the rest wrongly.
      const id = index < 3 ? exercise.answer : exercise.options.find((o) => o !== exercise.answer)!;
      fireEvent.press(screen.getByRole('button', { name: optionName(exercise.type, id) }));
      fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    // The score is not known yet (3 of 12 fails), so the confirmation must not congratulate.
    expect(alertSpy.mock.calls[0]![0]).toBe('Finish the lesson');
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ correct: 3, total: 12 });
    alertSpy.mockRestore();
  });

  it('does not report the score when the confirmation is cancelled', () => {
    const onFinish = jest.fn();
    // No buttons pressed: the alert stays open and the lesson is not finished.
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<LessonQuiz exercises={exercises} words={words} onFinish={onFinish} />);
    exercises.forEach((exercise, index) => {
      const id = exercise.answer;
      fireEvent.press(screen.getByRole('button', { name: optionName(exercise.type, id) }));
      fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
    });
    expect(onFinish).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('LessonQuiz for learners of Arabic', () => {
  const arWords = vocabulary.filter((w) => w.lessonId === 'ar-a1-1');
  const arExercises = buildExercises('ar-a1-1', arWords);

  it('shows the Arabic word (RTL-isolated) and offers English meanings', () => {
    render(<LessonQuiz exercises={arExercises} words={arWords} onFinish={() => {}} />);
    expect(screen.getByText(isolate('مرحباً'))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Option: Hello' })).toBeTruthy();
  });
});
