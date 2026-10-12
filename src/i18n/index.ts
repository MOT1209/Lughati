import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { UiLocale } from '@/types';

import { ar } from './locales/ar';
import { en } from './locales/en';
import { resolveLocale } from './resolveLocale';

export function getDeviceLanguageCode(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: resolveLocale('system', getDeviceLanguageCode()),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false }, // React Native does not render HTML
  initAsync: false, // resources are bundled; keep init synchronous so first render has text
});

export function setUiLocale(locale: UiLocale): Promise<unknown> {
  return i18n.changeLanguage(locale);
}

export default i18n;
