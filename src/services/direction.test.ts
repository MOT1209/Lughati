import { getDirectionAction } from './direction';

describe('getDirectionAction', () => {
  it('needs no restart when the native direction already matches', () => {
    expect(getDirectionAction(true, true)).toBe('none');
    expect(getDirectionAction(false, false)).toBe('none');
  });

  it('requires a restart when the native direction differs', () => {
    expect(getDirectionAction(false, true)).toBe('restart-required');
    expect(getDirectionAction(true, false)).toBe('restart-required');
  });
});
