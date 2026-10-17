import { isolate, isolateLtr, isolateNative } from './bidi';
import { dayOf } from './day';
import { validateEmail, validateLogin, validatePassword, validateRegister } from './validation';

describe('validation', () => {
  it.each(['', '   ', 'not-an-email', 'a@b', 'a@b.c'])('rejects email "%s"', (value) => {
    expect(validateEmail(value)).not.toBeNull();
  });

  it('accepts a normal email, ignoring surrounding spaces', () => {
    expect(validateEmail(' sara@example.com ')).toBeNull();
  });

  it('requires a minimum password length and reports the number', () => {
    expect(validatePassword('1234567')).toEqual({ key: 'auth.validation.passwordMin', params: { count: 8 } });
    expect(validatePassword('12345678')).toBeNull();
  });

  it('login flags both empty fields', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' })).sort()).toEqual(['email', 'password']);
  });

  it('register flags a mismatched confirmation only', () => {
    const errors = validateRegister({ name: 'Sara', email: 'sara@example.com', password: 'password1', confirmPassword: 'password2' });
    expect(Object.keys(errors)).toEqual(['confirmPassword']);
    expect(errors.confirmPassword?.key).toBe('auth.validation.passwordMismatch');
  });

  it('register passes with valid values', () => {
    expect(validateRegister({ name: 'Sara', email: 'sara@example.com', password: 'password1', confirmPassword: 'password1' })).toEqual({});
  });
});

describe('bidi isolation', () => {
  it('wraps text in matching isolate/pop characters', () => {
    expect(isolate('Sara')).toBe('⁨Sara⁩');
    expect(isolateLtr('Deutsch')).toBe('⁦Deutsch⁩');
  });

  it('isolates a native name by its language direction', () => {
    expect(isolateNative('العربية', 'rtl')).toBe('⁨العربية⁩');
    expect(isolateNative('Deutsch', 'ltr')).toBe('⁦Deutsch⁩');
  });
});

describe('dayOf (local calendar day)', () => {
  it('tests run in UTC+3 (jest.global-setup.js), so UTC/local mix-ups show up', () => {
    expect(new Date('2026-10-16T22:30:00Z').getTimezoneOffset()).toBe(-180);
  });

  it("uses the learner's time zone, not UTC", () => {
    // 22:30 UTC on the 16th is already 01:30 on the 17th in Riyadh; slicing the ISO string gave the 16th.
    expect(dayOf(new Date('2026-10-16T22:30:00Z'))).toBe('2026-10-17');
    expect(dayOf(new Date('2026-10-16T20:59:00Z'))).toBe('2026-10-16');
  });

  it('crosses month and year boundaries and pads single digits', () => {
    expect(dayOf(new Date('2026-01-31T21:00:00Z'))).toBe('2026-02-01');
    expect(dayOf(new Date('2026-12-31T21:30:00Z'))).toBe('2027-01-01');
    expect(dayOf(new Date(2026, 2, 5, 12))).toBe('2026-03-05');
  });
});
