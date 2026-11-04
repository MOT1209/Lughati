import { getSupabase } from '../backend/client';
import { MockAuthService } from './MockAuthService';
import { SupabaseAuthService } from './SupabaseAuthService';
import { AuthError, type AuthService, type Session, type SignInRequest, type SignUpOutcome, type SignUpRequest, type AuthListener } from './types';

export * from './types';
export { MockAuthService } from './MockAuthService';
export { SupabaseAuthService } from './SupabaseAuthService';

/**
 * Used when the build has no backend configuration and is not a development build. Every action
 * fails with `not_configured`: a release must never fall back to the simulated sign-in.
 */
class UnconfiguredAuthService implements AuthService {
  async signIn(_request: SignInRequest): Promise<Session> {
    throw new AuthError('not_configured');
  }
  async signUp(_request: SignUpRequest): Promise<SignUpOutcome> {
    throw new AuthError('not_configured');
  }
  async signOut(): Promise<void> {}
  async getSession(): Promise<Session | null> {
    return null;
  }
  async requestPasswordReset(): Promise<void> {
    throw new AuthError('not_configured');
  }
  async resendVerification(): Promise<void> {
    throw new AuthError('not_configured');
  }
  async deleteAccount(): Promise<void> {
    throw new AuthError('not_configured');
  }
  onAuthStateChange(_listener: AuthListener): () => void {
    return () => undefined;
  }
}

/** True when the real backend is in use (drives UI copy such as the demo notice). */
export function isRealAuth(): boolean {
  return current instanceof SupabaseAuthService;
}

function createDefault(): AuthService {
  const client = getSupabase();
  if (client) return new SupabaseAuthService(client);
  // The simulated service exists only for development builds and tests.
  return __DEV__ ? new MockAuthService() : new UnconfiguredAuthService();
}

let current: AuthService = createDefault();

export function getAuthService(): AuthService {
  return current;
}

export function registerAuthService(service: AuthService): void {
  current = service;
}
