import type { LanguageCode, Vocabulary } from '@/types';

import { isolate, isolateLtr } from './bidi';

/**
 * Language the meanings are shown in: the learner's own (source) language. Without a usable
 * source (none chosen, or equal to the target) it falls back to Arabic, or English for learners
 * of Arabic.
 */
export function meaningLanguage(target: LanguageCode, source?: LanguageCode | null): LanguageCode {
  if (source && source !== target) return source;
  return target === 'ar' ? 'en' : 'ar';
}

export function meaningOf(word: Vocabulary, source?: LanguageCode | null): string {
  return word.translations[meaningLanguage(word.targetLanguage, source)] ?? word.translations[meaningLanguage(word.targetLanguage)] ?? '';
}

/** A word of the language being learned, isolated with that language's own direction. */
export function isolateTerm(word: Vocabulary): string {
  return word.targetLanguage === 'ar' ? isolate(word.term) : isolateLtr(word.term);
}
