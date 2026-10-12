import type { User } from '@/types';

// Add 'google' | 'apple' here later and extend the request unions; the router never changes
// because route protection depends only on whether a Session exists.
export type AuthMethod = 'password';

export interface PasswordSignInRequest {
  method: 'password';
  email: string;
  password: string;
}
export type SignInRequest = PasswordSignInRequest;

export interface PasswordSignUpRequest {
  method: 'password';
  name: string;
  email: string;
  password: string;
}
export type SignUpRequest = PasswordSignUpRequest;

export interface Session {
  user: User;
  issuedAt: string; // ISO date
}

export type AuthErrorCode = 'invalid_credentials' | 'email_in_use' | 'network' | 'unknown';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type AuthListener = (session: Session | null) => void;

export interface AuthService {
  signIn(request: SignInRequest): Promise<Session>;
  signUp(request: SignUpRequest): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  /** Returns an unsubscribe function. */
  onAuthStateChange(listener: AuthListener): () => void;
}
