import { getDeviceLanguageCode, setUiLocale } from '@/i18n';
import { isRtlLocale, resolveLocale } from '@/i18n/resolveLocale';
import type { LanguagePreference, UiLocale } from '@/types';

import { applyLayoutDirection, type DirectionAction } from './direction';

export interface AppliedLanguage {
  locale: UiLocale;
  direction: DirectionAction;
}

/**
 * The single place where the stored language preference reaches i18n and the native layout
 * direction. Startup and Settings both call it, so they cannot drift apart.
 */
export async function applyLanguagePreference(
  preference: LanguagePreference,
  deviceLanguageCode: string | null = getDeviceLanguageCode(),
): Promise<AppliedLanguage> {
  const locale = resolveLocale(preference, deviceLanguageCode);
  const direction = applyLayoutDirection(isRtlLocale(locale));
  await setUiLocale(locale);
  return { locale, direction };
}
