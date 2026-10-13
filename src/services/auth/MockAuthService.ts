import { STORAGE_KEYS } from '@/constants/app';
import { languages } from '@/mocks/languages';
import { createMockUser } from '@/mocks/users';

import { deviceStorage, type KeyValueStorage } from '../storage';

import {
  AuthError,
  type AuthListener,
  type AuthService,
  type Session,
  type SignInRequest,
  type SignUpRequest,
} from './types';

const languageCodes = new Set<string>(languages.map((l) => l.code));

// A stored session is untrusted input: it must be well-formed and internally consistent (the mock
// derives the user id from the email, and progress is keyed by that id), otherwise it is ignored.
function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const { user, issuedAt } = value as Partial<Session>;
  if (typeof issuedAt !== 'string' || Number.isNaN(Date.parse(issuedAt))) return false;
  if (typeof user !== 'object' || user === null) return false;
  if (typeof user.email !== 'string' || user.email.trim() === '' || user.email !== user.email.trim().toLowerCase()) return false;
  return (
    user.id === createMockUser({ email: user.email }).id &&
    typeof user.name === 'string' &&
    typeof user.sourceLanguage === 'string' &&
    languageCodes.has(user.sourceLanguage) &&
    typeof user.targetLanguage === 'string' &&
    languageCodes.has(user.targetLanguage)
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Stand-in for a real backend. No network. The session (user + timestamp, never a password)
 * is persisted so an app restart restores it, like a real token-based session would.
 * Test hooks for the error states: emails starting with "fail@" (invalid credentials),
 * "taken@" (email in use, sign-up) and "offline@" (network error).
 */
export class MockAuthService implements AuthService {
  private session: Session | null = null;
  private loaded = false;
  private listeners = new Set<AuthListener>();

  constructor(
    private readonly latencyMs = 600,
    private readonly storage: KeyValueStorage = deviceStorage,
  ) {}

  async signIn(request: SignInRequest): Promise<Session> {
    await wait(this.latencyMs);
    this.failIfScripted(request.email);
    return await this.start(createMockUser({ email: request.email }));
  }

  async signUp(request: SignUpRequest): Promise<Session> {
    await wait(this.latencyMs);
    this.failIfScripted(request.email);
    if (request.email.trim().toLowerCase().startsWith('taken@')) {
      throw new AuthError('email_in_use');
    }
    return await this.start(createMockUser({ name: request.name, email: request.email }));
  }

  async signOut(): Promise<void> {
    await wait(this.latencyMs / 3);
    const removed = await this.setSession(null);
    // Signed out for this run either way (listeners were told), but never report the stored
    // session as removed when it was not: it could be restored after a restart.
    if (!removed) throw new AuthError('sign_out_not_persisted');
  }

  async getSession(): Promise<Session | null> {
    if (!this.loaded) {
      this.session = await this.readStored();
      this.loaded = true;
    }
    return this.session;
  }

  onAuthStateChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private failIfScripted(email: string): void {
    const value = email.trim().toLowerCase();
    if (value.startsWith('fail@')) throw new AuthError('invalid_credentials');
    if (value.startsWith('offline@')) throw new AuthError('network');
  }

  private async start(user: Session['user']): Promise<Session> {
    const session: Session = { user, issuedAt: new Date().toISOString() };
    await this.setSession(session);
    return session;
  }

  /** Resolves true when the stored copy now matches `session`, false when storage refused. */
  private async setSession(session: Session | null): Promise<boolean> {
    this.session = session;
    this.loaded = true;
    this.listeners.forEach((listener) => listener(session));
    // Persisting is awaited so a resolved sign-out is durable. A storage failure never blocks signing
    // in or out for this run; sign-out reports it (see signOut) while sign-in just won't be restored.
    try {
      if (session) await this.storage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
      else await this.storage.removeItem(STORAGE_KEYS.session);
      return true;
    } catch {
      return false;
    }
  }

  private async readStored(): Promise<Session | null> {
    try {
      const raw = await this.storage.getItem(STORAGE_KEYS.session);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return isSession(parsed) ? parsed : null;
    } catch {
      return null; // unreadable or corrupt: behave as signed out
    }
  }
}
