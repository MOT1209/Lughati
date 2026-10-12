import { PASSWORD_MIN_LENGTH } from '@/constants/app';

export type FieldErrorKey =
  | 'auth.validation.required'
  | 'auth.validation.email'
  | 'auth.validation.passwordMin'
  | 'auth.validation.passwordMismatch';

export interface FieldError {
  key: FieldErrorKey;
  params?: { count: number };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRequired(value: string): FieldError | null {
  return value.trim().length === 0 ? { key: 'auth.validation.required' } : null;
}

export function validateEmail(value: string): FieldError | null {
  const required = validateRequired(value);
  if (required) return required;
  return EMAIL_PATTERN.test(value.trim()) ? null : { key: 'auth.validation.email' };
}

export function validatePassword(value: string): FieldError | null {
  if (value.length === 0) return { key: 'auth.validation.required' };
  return value.length < PASSWORD_MIN_LENGTH
    ? { key: 'auth.validation.passwordMin', params: { count: PASSWORD_MIN_LENGTH } }
    : null;
}

export function validatePasswordMatch(password: string, confirmation: string): FieldError | null {
  if (confirmation.length === 0) return { key: 'auth.validation.required' };
  return password === confirmation ? null : { key: 'auth.validation.passwordMismatch' };
}

export type FormErrors<T extends string> = Partial<Record<T, FieldError>>;

function collect<T extends string>(entries: [T, FieldError | null][]): FormErrors<T> {
  const errors: FormErrors<T> = {};
  for (const [field, error] of entries) if (error) errors[field] = error;
  return errors;
}

export function validateLogin(values: { email: string; password: string }) {
  return collect<'email' | 'password'>([
    ['email', validateEmail(values.email)],
    ['password', values.password.length === 0 ? { key: 'auth.validation.required' } : null],
  ]);
}

export function validateRegister(values: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  return collect<'name' | 'email' | 'password' | 'confirmPassword'>([
    ['name', validateRequired(values.name)],
    ['email', validateEmail(values.email)],
    ['password', validatePassword(values.password)],
    ['confirmPassword', validatePasswordMatch(values.password, values.confirmPassword)],
  ]);
}
