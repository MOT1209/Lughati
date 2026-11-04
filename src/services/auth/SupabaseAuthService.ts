import type { AuthChangeEvent, Session as SupabaseSession, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

import type { User } from '@/types';

import {
  AuthError,
  type AuthErrorCode,
  type AuthListener,
  type AuthService,
  type Session,
  type SignInRequest,
  type SignUpOutcome,
  type SignUpRequest,
} from './types';

/** Maps any Supabase/network failure to a fixed code. Raw messages are never shown or logged. */
export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const e = (typeof error === 'object' && error !== null ? error : {}) as { code?: unknown; name?: unknown; status?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const name = typeof e.name === 'string' ? e.name : '';
  const status = typeof e.status === 'number' ? e.status : 0;
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  let result: AuthErrorCode = 'unknown';
  if (name === 'AuthRetryableFetchError' || status === 0 && /network|fetch|failed to/.test(message)) result = 'network';
  else if (code === 'invalid_credentials' || /invalid login credentials/.test(message)) result = 'invalid_credentials';
  else if (code === 'user_already_exists' || code === 'email_exists' || /already registered/.test(message)) result = 'email_in_use';
  else if (code === 'email_not_confirmed' || /not confirmed/.test(message)) result = 'email_not_confirmed';
  else if (code === 'weak_password') result = 'weak_password';
  else if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') result = 'rate_limited';
  return new AuthError(result);
}

const SUPPORTED_LOCALE_DEFAULTS = { sourceLanguage: 'ar', targetLanguage: 'en' } as const;

export function toAppUser(user: SupabaseUser): User {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const rawName = meta && typeof meta.name === 'string' ? meta.name.trim() : '';
  const email = (user.email ?? '').toLowerCase();
  return {
    id: user.id,
    name: rawName || email.split('@')[0] || '',
    email,
    ...SUPPORTED_LOCALE_DEFAULTS, // the real choice lives in profiles/learning profile
    joinedAt: user.created_at,
  };
}

function toSession(s: SupabaseSession | null): Session | null {
  if (!s) return null;
  return { user: toAppUser(s.user), issuedAt: new Date((s.user.last_sign_in_at ?? s.user.created_at)).toISOString() };
}

/**
 * Real authentication over Supabase Auth. Passwords go straight to Supabase over TLS and are never
 * stored or logged here; tokens live in the client's SecureStore-backed storage.
 */
export class SupabaseAuthService implements AuthService {
  private readonly listeners = new Set<AuthListener>();
  private hooked = false;

  constructor(private readonly client: SupabaseClient) {}

  private hook(): void {
    if (this.hooked) return;
    this.hooked = true;
    this.client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      // INITIAL_SESSION is answered by getSession(); TOKEN_REFRESHED does not change who is signed in.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      const mapped = toSession(session);
      this.listeners.forEach((listener) => listener(mapped));
    });
  }

  async signIn(request: SignInRequest): Promise<Session> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email: request.email.trim(), password: request.password });
      if (error) throw error;
      const session = toSession(data.session);
      if (!session) throw new AuthError('unknown');
      return session;
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async signUp(request: SignUpRequest): Promise<SignUpOutcome> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email: request.email.trim(),
        password: request.password,
        options: { data: { name: request.name.trim() } },
      });
      if (error) throw error;
      // With "confirm e-mail" on, an already-registered address returns a user with no identities
      // and no error (anti-enumeration). Surface it as email_in_use only when that is detectable.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AuthError('email_in_use');
      }
      const session = toSession(data.session);
      return { session, needsEmailVerification: session === null };
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    // scope "local": end this device's session even when the network is down.
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw new AuthError('sign_out_not_persisted');
  }

  async getSession(): Promise<Session | null> {
    this.hook();
    const { data, error } = await this.client.auth.getSession();
    if (error) return null; // expired/corrupt: behave as signed out
    return toSession(data.session);
  }

  onAuthStateChange(listener: AuthListener): () => void {
    this.hook();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim());
    // Unknown address is not an error for the caller (no account enumeration).
    if (error) throw mapAuthError(error);
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await this.client.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw mapAuthError(error);
  }

  async deleteAccount(): Promise<void> {
    const { error } = await this.client.rpc('delete_my_account');
    if (error) {
      const mapped = mapAuthError(error);
      throw mapped.code === 'network' ? mapped : new AuthError('delete_failed');
    }
    await this.client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    // signOut on a deleted user may emit no event if the server rejects it: tell listeners ourselves.
    this.listeners.forEach((listener) => listener(null));
  }
}
