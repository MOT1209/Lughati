import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { UiLocale } from '@/types';

/** Current UI locale from i18next, plus the layout direction React Native is actually using. */
export function useUiLocale() {
  const { i18n } = useTranslation();
  const locale: UiLocale = i18n.language === 'en' ? 'en' : 'ar';
  return { locale, isRTL: I18nManager.isRTL };
}
