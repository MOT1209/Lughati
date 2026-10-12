import { reloadAppAsync } from 'expo';

import { reloadApp } from './direction';

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
