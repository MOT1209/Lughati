import { isolate, isolateLtr } from './bidi';
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
});
