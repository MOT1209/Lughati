import { createInstance } from 'i18next';

import { ar } from './locales/ar';
import { en } from './locales/en';
import { isRtlLocale, resolveLocale } from './resolveLocale';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key));
}

const baseKeys = (tree: unknown) => [...new Set(flatten(tree).map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();

describe('translations', () => {
  it('Arabic and English define the same keys', () => {
    expect(baseKeys(en)).toEqual(baseKeys(ar));
  });

  it('has no empty strings', () => {
    for (const tree of [ar, en]) {
      const empty = flatten(tree).filter((key) => key.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)[k], tree) === '');
      expect(empty).toEqual([]);
    }
  });

  it('renders the app name per locale from a single key', () => {
    expect(ar.app.name).toBe('لغتي');
    expect(en.app.name).toBe('Lughati');
  });

  it('uses Arabic plural categories for the streak', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'ar', resources: { ar: { translation: ar } }, interpolation: { escapeValue: false } });
    expect(i18n.t('home.streakDays', { count: 0 })).toBe('لا أيام بعد');
    expect(i18n.t('home.streakDays', { count: 1 })).toBe('يوم واحد');
    expect(i18n.t('home.streakDays', { count: 2 })).toBe('يومان');
    expect(i18n.t('home.streakDays', { count: 7 })).toBe('7 أيام');
    expect(i18n.t('home.streakDays', { count: 11 })).toBe('11 يوماً');
    expect(i18n.t('home.streakDays', { count: 100 })).toBe('100 يوم');
  });
});

describe('resolveLocale', () => {
  it('follows a supported device language', () => {
    expect(resolveLocale('system', 'en')).toBe('en');
    expect(resolveLocale('system', 'ar')).toBe('ar');
  });

  it('falls back to Arabic for unsupported or missing device language', () => {
    expect(resolveLocale('system', 'de')).toBe('ar');
    expect(resolveLocale('system', null)).toBe('ar');
  });

  it('lets a manual choice win over the device language', () => {
    expect(resolveLocale('en', 'ar')).toBe('en');
    expect(resolveLocale('ar', 'en')).toBe('ar');
  });
});

describe('direction', () => {
  it('Arabic is RTL and English is LTR', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
  });
});

describe('Arabic plurals without a native Intl.PluralRules (Hermes)', () => {
  it('still picks the right plural form, e.g. "8 دقائق" and "يومان"', () => {
    const native = Intl.PluralRules;
    // Hermes (the engine in Expo Go) ships no Intl.PluralRules; i18next then falls back to `_other`.
    delete (Intl as { PluralRules?: unknown }).PluralRules;
    try {
      jest.isolateModules(() => {
        // A fresh i18next and i18n setup, loaded while Intl.PluralRules is missing.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { t } = require('i18next') as typeof import('i18next');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./index');
        expect(t('home.lessonMeta', { lng: 'ar', level: 'A1', count: 8 })).toBe('A1 · 8 دقائق');
        expect(t('home.streakDays', { lng: 'ar', count: 2 })).toBe('يومان');
        expect(t('home.streakDays', { lng: 'ar', count: 11 })).toBe('11 يوماً');
      });
    } finally {
      (Intl as { PluralRules?: unknown }).PluralRules = native;
    }
  });
});
