import type { LanguageCode, Vocabulary } from '@/types';

import { isolate, isolateLtr } from './bidi';

/**
 * Language the meanings are shown in. Learners of any language come from Arabic (the source
 * language), except learners of Arabic itself, who get English meanings.
 */
export function meaningLanguage(target: LanguageCode): LanguageCode {
  return target === 'ar' ? 'en' : 'ar';
}

export function meaningOf(word: Vocabulary): string {
  return word.translations[meaningLanguage(word.targetLanguage)] ?? '';
}

/** A word of the language being learned, isolated with that language's own direction. */
export function isolateTerm(word: Vocabulary): string {
  return word.targetLanguage === 'ar' ? isolate(word.term) : isolateLtr(word.term);
}
