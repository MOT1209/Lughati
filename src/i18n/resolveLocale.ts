import type { LanguagePreference, UiLocale } from '@/types';

export const SUPPORTED_LOCALES: readonly UiLocale[] = ['ar', 'en'];

/** Used when the device language is unsupported. Owner assumption: confirm in the report. */
export const FALLBACK_LOCALE: UiLocale = 'ar';

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === 'ar' || value === 'en';
}

/** Manual choice wins; otherwise follow the device; otherwise fall back to Arabic. */
export function resolveLocale(
  preference: LanguagePreference,
  deviceLanguageCode: string | null | undefined,
): UiLocale {
  if (preference !== 'system') return preference;
  return isUiLocale(deviceLanguageCode) ? deviceLanguageCode : FALLBACK_LOCALE;
}

export function isRtlLocale(locale: UiLocale): boolean {
  return locale === 'ar';
}
