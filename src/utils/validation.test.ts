import { PASSWORD_MIN_LENGTH } from '@/constants/app';

import {
  validateEmail,
  validateLogin,
  validatePassword,
  validatePasswordMatch,
  validateRegister,
  validateRequired,
} from './validation';

describe('field validators', () => {
  it('requires non-blank values', () => {
    expect(validateRequired('')?.key).toBe('auth.validation.required');
    expect(validateRequired('   ')?.key).toBe('auth.validation.required');
    expect(validateRequired('Hamad')).toBeNull();
  });

  it('accepts well-formed emails and rejects malformed ones', () => {
    expect(validateEmail('')?.key).toBe('auth.validation.required');
    expect(validateEmail('not-an-email')?.key).toBe('auth.validation.email');
    expect(validateEmail('a@b')?.key).toBe('auth.validation.email');
    expect(validateEmail('a b@c.de')?.key).toBe('auth.validation.email');
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });

  it('enforces the minimum password length and reports it as a parameter', () => {
    expect(validatePassword('')?.key).toBe('auth.validation.required');
    const short = validatePassword('x'.repeat(PASSWORD_MIN_LENGTH - 1));
    expect(short?.key).toBe('auth.validation.passwordMin');
    expect(short?.params).toEqual({ count: PASSWORD_MIN_LENGTH });
    expect(validatePassword('x'.repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('does not trim passwords', () => {
    expect(validatePassword(' '.repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('checks that the confirmation matches', () => {
    expect(validatePasswordMatch('secret123', '')?.key).toBe('auth.validation.required');
    expect(validatePasswordMatch('secret123', 'secret124')?.key).toBe(
      'auth.validation.passwordMismatch',
    );
    expect(validatePasswordMatch('secret123', 'secret123')).toBeNull();
  });
});

describe('form validators', () => {
  it('login reports only the failing fields', () => {
    expect(validateLogin({ email: 'a@b.de', password: 'x' })).toEqual({});
    expect(Object.keys(validateLogin({ email: '', password: '' })).sort()).toEqual([
      'email',
      'password',
    ]);
  });

  it('login does not apply the minimum length to an existing password', () => {
    expect(validateLogin({ email: 'a@b.de', password: 'x' }).password).toBeUndefined();
  });

  it('register validates every field', () => {
    const valid = {
      name: 'Hamad',
      email: 'hamad@example.com',
      password: 'longenough1',
      confirmPassword: 'longenough1',
    };
    expect(validateRegister(valid)).toEqual({});
    expect(Object.keys(validateRegister({ ...valid, name: '', confirmPassword: 'other' })).sort()).toEqual([
      'confirmPassword',
      'name',
    ]);
  });
});
