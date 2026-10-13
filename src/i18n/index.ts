// Hermes (the engine in Expo Go and release builds) has no Intl.PluralRules, so i18next would
// always fall back to `_other` ("8 دقيقة" instead of "8 دقائق"). Installed only where missing.
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import { getLocales } from 'expo-localization';
import { changeLanguage, use as registerPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { UiLocale } from '@/types';

import { ar } from './locales/ar';
import { en } from './locales/en';
import { resolveLocale } from './resolveLocale';

export function getDeviceLanguageCode(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}

void registerPlugin(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: resolveLocale('system', getDeviceLanguageCode()),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false }, // React Native does not render HTML
  initAsync: false, // resources are bundled; keep init synchronous so first render has text
});

export function setUiLocale(locale: UiLocale): Promise<unknown> {
  return changeLanguage(locale);
}
