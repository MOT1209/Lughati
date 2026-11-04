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

// 'sign_out_not_persisted': the session is gone for this run, but the stored copy could not be
// removed, so it may come back after a restart. Callers must tell the user instead of hiding it.
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_in_use'
  | 'network'
  | 'sign_out_not_persisted'
  // Real backend only:
  | 'email_not_confirmed' // sign-in before the verification link was opened
  | 'weak_password'
  | 'rate_limited'
  | 'not_configured' // the build has no backend configuration
  | 'delete_failed'
  | 'unknown';

/** Sign-up succeeded but the account must be verified by e-mail before it has a session. */
export interface SignUpOutcome {
  session: Session | null;
  needsEmailVerification: boolean;
}

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
  /** Resolves with `session: null` + `needsEmailVerification` when the backend requires e-mail confirmation. */
  signUp(request: SignUpRequest): Promise<SignUpOutcome>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  /** Sends a password-reset e-mail. Never reveals whether the address has an account. */
  requestPasswordReset(email: string): Promise<void>;
  /** Re-sends the verification e-mail for a not-yet-verified address. */
  resendVerification(email: string): Promise<void>;
  /** Permanently deletes the signed-in account and its server data, then signs out. */
  deleteAccount(): Promise<void>;
  /** Returns an unsubscribe function. */
  onAuthStateChange(listener: AuthListener): () => void;
}
