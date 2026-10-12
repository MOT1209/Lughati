import type { Localized, UiLocale } from '@/types';

export function localize(text: Localized, locale: UiLocale): string {
  return text[locale];
}
