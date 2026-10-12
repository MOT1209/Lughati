import { STORAGE_KEYS } from '@/constants/app';
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

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const { user, issuedAt } = value as Partial<Session>;
  return typeof issuedAt === 'string' && typeof user?.id === 'string' && typeof user.email === 'string';
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
    return this.start(createMockUser({ email: request.email }));
  }

  async signUp(request: SignUpRequest): Promise<Session> {
    await wait(this.latencyMs);
    this.failIfScripted(request.email);
    if (request.email.trim().toLowerCase().startsWith('taken@')) {
      throw new AuthError('email_in_use');
    }
    return this.start(createMockUser({ name: request.name, email: request.email }));
  }

  async signOut(): Promise<void> {
    await wait(this.latencyMs / 3);
    this.setSession(null);
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

  private start(user: Session['user']): Session {
    const session: Session = { user, issuedAt: new Date().toISOString() };
    this.setSession(session);
    return session;
  }

  private setSession(session: Session | null): void {
    this.session = session;
    this.loaded = true;
    // Persisting is best effort: a storage failure must not break sign-in or sign-out.
    const write = session
      ? this.storage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
      : this.storage.removeItem(STORAGE_KEYS.session);
    write.catch(() => undefined);
    this.listeners.forEach((listener) => listener(session));
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
