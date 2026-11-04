import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { setUiLocale } from '@/i18n';
import { vocabulary } from '@/mocks/vocabulary';
import { getSpeechService, registerSpeechService, type SpeakCallbacks, type SpeechService } from '@/services/speech';
import { isolateLtr } from '@/utils/bidi';
import { buildListeningExercises } from '@/utils/exercises';

import { ListeningPractice } from './ListeningPractice';

const words = vocabulary.filter((w) => w.lessonId === 'de-a1-1');
const exercises = buildListeningExercises('de-a1-1', words);
const byId = new Map(words.map((w) => [w.id, w]));
const optionName = (id: string) => `Option: ${isolateLtr(byId.get(id)!.term)}`;

function fakeSpeech() {
  const calls: { text: string; callbacks?: SpeakCallbacks }[] = [];
  const service: SpeechService & { calls: typeof calls; stop: jest.Mock } = {
    calls,
    supports: () => new Promise(() => {}),
    speak: (text, _language, callbacks) => {
      calls.push({ text, callbacks });
    },
    stop: jest.fn(),
  };
  return service;
}

const original = getSpeechService();
let speech: ReturnType<typeof fakeSpeech>;
beforeAll(() => setUiLocale('en'));
beforeEach(() => {
  speech = fakeSpeech();
  registerSpeechService(speech);
});
afterEach(() => registerSpeechService(original));

/** Answers every question: the first `right` correctly, the rest wrongly. */
function answerAll(right: number) {
  exercises.forEach((exercise, index) => {
    const id = index < right ? exercise.answer : exercise.options.find((o) => o !== exercise.answer)!;
    fireEvent.press(screen.getByRole('button', { name: optionName(id) }));
    fireEvent.press(screen.getByRole('button', { name: index === exercises.length - 1 ? 'Finish' : 'Next' }));
  });
}

describe('ListeningPractice', () => {
  it('reads the word only when asked, and offers written words without showing the answer', () => {
    render(<ListeningPractice lessonId="de-a1-1" words={words} source="ar" />);
    expect(speech.calls).toEqual([]); // nothing plays on its own (no talking over a screen reader)
    expect(screen.getByText('Listen and pick the word you hear')).toBeTruthy();
    for (const id of exercises[0]!.options) expect(screen.getByRole('button', { name: optionName(id) })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Listen' }));
    expect(speech.calls.map((c) => c.text)).toEqual(['Hallo']);
    expect(screen.getByRole('button', { name: 'Listen again' })).toBeTruthy();
  });

  it('after an answer tells whether it was right and shows the word with its meaning', () => {
    render(<ListeningPractice lessonId="de-a1-1" words={words} source="ar" />);
    const first = exercises[0]!;
    fireEvent.press(screen.getByRole('button', { name: optionName(first.options.find((o) => o !== first.answer)!) }));
    expect(screen.getByText('Not quite')).toBeTruthy();
    expect(screen.getByText(`The word: ${isolateLtr('Hallo')} (مرحباً)`)).toBeTruthy();
  });

  it('a new question starts unheard and reads its own word', () => {
    render(<ListeningPractice lessonId="de-a1-1" words={words} source="ar" />);
    fireEvent.press(screen.getByRole('button', { name: 'Listen' }));
    fireEvent.press(screen.getByRole('button', { name: optionName(exercises[0]!.answer) }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    fireEvent.press(screen.getByRole('button', { name: 'Listen' }));
    expect(speech.calls.map((c) => c.text)).toEqual(['Hallo', byId.get(exercises[1]!.subjectId)!.term]);
  });

  it('records the run once and shows the score; retry starts again', async () => {
    const onFinish = jest.fn();
    render(<ListeningPractice lessonId="de-a1-1" words={words} source="ar" onFinish={onFinish} />);
    answerAll(4);
    await act(async () => {}); // let the save settle
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ correct: 4, total: words.length });
    expect(screen.getByText(`You recognised 4 of ${words.length} by ear`)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText(`Question 1 of ${words.length}`)).toBeTruthy();
  });

  it('keeps the score and offers a retry when saving fails', async () => {
    const onFinish = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined);
    render(<ListeningPractice lessonId="de-a1-1" words={words} onFinish={onFinish} />);
    answerAll(words.length);
    await act(async () => {});
    expect(screen.getByText('We could not save your progress.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(onFinish).toHaveBeenLastCalledWith({ correct: words.length, total: words.length });
    expect(screen.getByText(`You recognised ${words.length} of ${words.length} by ear`)).toBeTruthy();
  });

  it('stops a word still being read when the practice is left', () => {
    const view = render(<ListeningPractice lessonId="de-a1-1" words={words} />);
    fireEvent.press(screen.getByRole('button', { name: 'Listen' }));
    view.unmount();
    expect(speech.stop).toHaveBeenCalledTimes(1);
  });

  it('explains when the lesson has too few words', () => {
    render(<ListeningPractice lessonId="de-a1-1" words={words.slice(0, 3)} />);
    expect(screen.getByText('There are not enough words to practise yet.')).toBeTruthy();
  });
});
