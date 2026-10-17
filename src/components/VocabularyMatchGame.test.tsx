import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { buildMatchSession, MIN_MATCH_WORDS, VocabularyMatchGame } from '@/components/VocabularyMatchGame';
import { setUiLocale } from '@/i18n'; // also initialises i18n for the translated strings
import { vocabulary } from '@/mocks/vocabulary';
import type { Vocabulary } from '@/types';
import { isolateLtr } from '@/utils/bidi';

// A fixed RNG keeps every shuffle deterministic, so the test can predict the session exactly.
const rng = () => 0;

const words = vocabulary.filter((word) => word.lessonId === 'de-a1-1');
const byId = new Map(words.map((word) => [word.id, word]));

beforeEach(async () => {
  await setUiLocale('en');
});

describe('buildMatchSession', () => {
  it('builds one question per playable word with the answer among the options', () => {
    const questions = buildMatchSession(words, 'ar', rng);
    expect(questions).toHaveLength(words.length);
    for (const question of questions) {
      expect(question.optionIds).toHaveLength(4);
      expect(question.optionIds).toContain(question.wordId);
      expect(new Set(question.optionIds).size).toBe(4); // no duplicate options
    }
  });

  it('skips words with no meaning in the learner language', () => {
    const blanked: Vocabulary[] = words.map((word, index) =>
      index === 0 ? { ...word, translations: {} } : word,
    );
    const questions = buildMatchSession(blanked, 'ar', rng);
    expect(questions).toHaveLength(words.length - 1);
    expect(questions.map((q) => q.wordId)).not.toContain(words[0].id);
  });

  it('returns no questions when fewer than MIN_MATCH_WORDS words are playable', () => {
    const one: Vocabulary[] = [{ ...words[0] }, { ...words[1], translations: {} }];
    expect(buildMatchSession(one, 'ar', rng)).toEqual([]);
    expect(buildMatchSession(words.slice(0, MIN_MATCH_WORDS - 1), 'ar', rng)).toEqual([]);
  });

  it('always offers a full set of options once enough words are playable', () => {
    const questions = buildMatchSession(words.slice(0, MIN_MATCH_WORDS), 'ar', rng);
    expect(questions).toHaveLength(MIN_MATCH_WORDS);
    for (const question of questions) expect(question.optionIds).toHaveLength(MIN_MATCH_WORDS);
  });
});

describe('VocabularyMatchGame', () => {
  it('runs every question, saves the attempt and shows a summary', async () => {
    const onFinish = jest.fn().mockResolvedValue(undefined);
    const onExit = jest.fn();
    const questions = buildMatchSession(words, 'ar', rng);

    render(<VocabularyMatchGame words={words} source="ar" random={rng} onFinish={onFinish} onExit={onExit} />);

    for (const [index, question] of questions.entries()) {
      const answer = byId.get(question.wordId)!;
      fireEvent.press(screen.getByRole('button', { name: `Option: ${answer.translations.ar}` }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: index === questions.length - 1 ? 'Finish' : 'Next' }));
      });
    }

    expect(onFinish).toHaveBeenCalledWith({ correct: words.length, total: words.length });
    expect(await screen.findByText('Practice complete')).toBeTruthy();
    expect(screen.getByText(`You matched ${words.length} of ${words.length}`)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onExit).toHaveBeenCalled();
  }, 30_000);

  it('keeps the last question and offers a retry when saving fails', async () => {
    let attempts = 0;
    const onFinish = jest.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('disk full');
    });
    const questions = buildMatchSession(words, 'ar', rng);

    render(<VocabularyMatchGame words={words} source="ar" random={rng} onFinish={onFinish} />);

    for (const [index, question] of questions.entries()) {
      const answer = byId.get(question.wordId)!;
      fireEvent.press(screen.getByRole('button', { name: `Option: ${answer.translations.ar}` }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: index === questions.length - 1 ? 'Finish' : 'Next' }));
      });
    }

    expect(await screen.findByText('We could not save your progress.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByText('Practice complete')).toBeTruthy();
    expect(attempts).toBe(2);
  }, 30_000);

  it('shows a helpful message when there are not enough playable words', () => {
    const empty = words.map((word) => ({ ...word, translations: {} }));
    render(<VocabularyMatchGame words={empty} source="ar" random={rng} />);
    expect(screen.getByText('There are not enough words to practise yet.')).toBeTruthy();
  });

  it('renders the word being learned isolated for correct direction', () => {
    const first = byId.get(buildMatchSession(words, 'ar', rng)[0].wordId)!;
    render(<VocabularyMatchGame words={words} source="ar" random={rng} />);
    expect(screen.getByText(isolateLtr(first.term))).toBeTruthy();
  });
});
