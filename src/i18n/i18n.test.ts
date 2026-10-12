import i18n, { setUiLocale } from './index';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { SUPPORTED_LOCALES, isRtlLocale, resolveLocale } from './resolveLocale';

function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? flattenKeys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('locale files', () => {
  it('define exactly the same keys in Arabic and English', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(ar).sort());
  });

  it('support only Arabic and English', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['ar', 'en']);
  });
});

describe('resolveLocale', () => {
  it('uses the manual choice over the device language', () => {
    expect(resolveLocale('en', 'ar')).toBe('en');
    expect(resolveLocale('ar', 'en')).toBe('ar');
  });

  it('follows the device language when it is supported', () => {
    expect(resolveLocale('system', 'en')).toBe('en');
    expect(resolveLocale('system', 'ar')).toBe('ar');
  });

  it('falls back to Arabic for unsupported or missing device languages', () => {
    expect(resolveLocale('system', 'de')).toBe('ar');
    expect(resolveLocale('system', null)).toBe('ar');
    expect(resolveLocale('system', undefined)).toBe('ar');
  });

  it('marks only Arabic as right-to-left', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
  });
});

describe('translations at runtime', () => {
  afterAll(async () => {
    await setUiLocale('ar');
  });

  it('renders the Arabic plural forms for the streak counter', async () => {
    await setUiLocale('ar');
    const t = (count: number) => i18n.t('home.streakDays', { count });
    expect(t(0)).toBe('لا أيام بعد');
    expect(t(1)).toBe('يوم واحد');
    expect(t(2)).toBe('يومان');
    expect(t(5)).toBe('5 أيام');
    expect(t(11)).toBe('11 يوماً');
    expect(t(100)).toBe('100 يوم');
  });

  it('renders the English plural forms for the streak counter', async () => {
    await setUiLocale('en');
    const t = (count: number) => i18n.t('home.streakDays', { count });
    expect(t(0)).toBe('No days yet');
    expect(t(1)).toBe('1 day');
    expect(t(7)).toBe('7 days');
  });

  it('shows the product name from the locale files, never a literal', async () => {
    await setUiLocale('ar');
    expect(i18n.t('app.name')).toBe('لغتي');
    await setUiLocale('en');
    expect(i18n.t('app.name')).toBe('Lughati');
  });
});
