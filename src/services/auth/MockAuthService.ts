import { createMockUser } from '@/mocks/users';

import {
  AuthError,
  type AuthListener,
  type AuthService,
  type Session,
  type SignInRequest,
  type SignUpRequest,
} from './types';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * In-memory stand-in for a real backend. No network, session lost on app restart.
 * Test hooks for the error states: emails starting with "fail@" (invalid credentials),
 * "taken@" (email in use, sign-up) and "offline@" (network error).
 */
export class MockAuthService implements AuthService {
  private session: Session | null = null;
  private listeners = new Set<AuthListener>();

  constructor(private readonly latencyMs = 600) {}

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
    this.listeners.forEach((listener) => listener(session));
  }
}
