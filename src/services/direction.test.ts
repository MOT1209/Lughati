import { reloadAppAsync } from 'expo';
import { I18nManager } from 'react-native';

import { applyLayoutDirection, reloadApp } from './direction';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));

const mockedReload = reloadAppAsync as jest.MockedFunction<typeof reloadAppAsync>;

describe('reloadApp', () => {
  it('uses expo reloadAppAsync (works in release builds) and reports success', async () => {
    mockedReload.mockResolvedValueOnce(undefined);
    await expect(reloadApp()).resolves.toBe(true);
    expect(mockedReload).toHaveBeenCalledTimes(1);
  });

  it('reports failure instead of throwing when the reload is refused', async () => {
    mockedReload.mockRejectedValueOnce(new Error('no runtime'));
    await expect(reloadApp()).resolves.toBe(false);
  });
});

describe('applyLayoutDirection', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stores RTL again when switching ar -> en -> ar before any reload', () => {
    jest.replaceProperty(I18nManager, 'isRTL', true); // the running app is RTL until it reloads
    const forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);

    expect(applyLayoutDirection(false)).toBe('restart-required');
    expect(applyLayoutDirection(true)).toBe('none');
    expect(forceRTL).toHaveBeenLastCalledWith(true);
  });
});
