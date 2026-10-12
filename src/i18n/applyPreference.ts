import { applyLayoutDirection, type DirectionAction } from '@/services/direction';
import type { LanguagePreference, UiLocale } from '@/types';

import { getDeviceLanguageCode, setUiLocale } from './index';
import { isRtlLocale, resolveLocale } from './resolveLocale';

export interface AppliedLanguage {
  locale: UiLocale;
  /** 'restart-required' when the native layout direction differs and only a reload applies it. */
  direction: DirectionAction;
}

/**
 * The single place where the saved language preference becomes behaviour: it resolves the
 * locale (manual choice > device > Arabic), switches i18n text, and asks RN for the matching
 * layout direction. Used at startup and when the user changes the setting.
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
