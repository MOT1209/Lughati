import { I18nManager } from 'react-native';
import i18n, { t } from 'i18next';

import { applyLanguagePreference } from './applyPreference';

import './index';

describe('applyLanguagePreference', () => {
  const allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
  const forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
  // isRTL is a plain data property on the RN mock, so it is redefined instead of spied.
  const setNativeRtl = (value: boolean) =>
    Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true, writable: true });

  beforeEach(() => {
    allowRTL.mockClear();
    forceRTL.mockClear();
    setNativeRtl(false);
  });

  it('a saved English choice wins over an Arabic device and needs no restart on an LTR layout', async () => {
    const result = await applyLanguagePreference('en', 'ar');
    expect(result).toEqual({ locale: 'en', direction: 'none' });
    expect(i18n.language).toBe('en');
    expect(t('app.name')).toBe('Lughati');
    expect(forceRTL).not.toHaveBeenCalled();
  });

  it('a saved Arabic choice switches the text and asks for RTL, flagging a restart', async () => {
    const result = await applyLanguagePreference('ar', 'en');
    expect(result).toEqual({ locale: 'ar', direction: 'restart-required' });
    expect(i18n.language).toBe('ar');
    expect(forceRTL).toHaveBeenCalledWith(true);
  });

  it('does not touch the native direction when it already matches', async () => {
    setNativeRtl(true);
    const result = await applyLanguagePreference('ar', 'en');
    expect(result.direction).toBe('none');
    expect(forceRTL).not.toHaveBeenCalled();
  });

  it('"system" follows the device language', async () => {
    expect((await applyLanguagePreference('system', 'en')).locale).toBe('en');
    expect(i18n.language).toBe('en');
  });

  it('"system" on an unsupported device language falls back to Arabic', async () => {
    expect((await applyLanguagePreference('system', 'de')).locale).toBe('ar');
    expect(i18n.language).toBe('ar');
  });

  it('leaving RTL asks for LTR and a restart', async () => {
    setNativeRtl(true);
    const result = await applyLanguagePreference('en', null);
    expect(result).toEqual({ locale: 'en', direction: 'restart-required' });
    expect(forceRTL).toHaveBeenCalledWith(false);
  });
});
