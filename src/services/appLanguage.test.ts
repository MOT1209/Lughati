import { I18nManager } from 'react-native';

import i18n from 'i18next';

import '@/i18n';

import { applyLanguagePreference } from './appLanguage';

describe('applyLanguagePreference', () => {
  let forceRTL: jest.SpyInstance;
  let allowRTL: jest.SpyInstance;

  beforeEach(() => {
    forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
    allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('applies an explicit English choice to i18n and asks for LTR when the layout is RTL', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const result = await applyLanguagePreference('en', 'ar');
    expect(result).toEqual({ locale: 'en', direction: 'restart-required' });
    expect(i18n.language).toBe('en');
    expect(allowRTL).toHaveBeenCalledWith(false);
    expect(forceRTL).toHaveBeenCalledWith(false);
  });

  it('applies an explicit Arabic choice and asks for RTL when the layout is LTR', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', false);
    const result = await applyLanguagePreference('ar', 'en');
    expect(result).toEqual({ locale: 'ar', direction: 'restart-required' });
    expect(i18n.language).toBe('ar');
    expect(forceRTL).toHaveBeenCalledWith(true);
  });

  it('follows the device language for "system" and needs no restart when already aligned', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', false);
    const result = await applyLanguagePreference('system', 'en');
    expect(result).toEqual({ locale: 'en', direction: 'none' });
    // The direction is always stored (see direction.ts), but no restart is needed.
    expect(forceRTL).toHaveBeenCalledWith(false);
  });

  it('falls back to Arabic (RTL) for an unsupported device language', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const result = await applyLanguagePreference('system', 'de');
    expect(result).toEqual({ locale: 'ar', direction: 'none' });
    expect(i18n.language).toBe('ar');
  });
});
