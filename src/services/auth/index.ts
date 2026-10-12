import { MockAuthService } from './MockAuthService';
import type { AuthService } from './types';

export * from './types';
export { MockAuthService } from './MockAuthService';

// Single registration point: swap in a Supabase-backed AuthService here (or via
// registerAuthService at startup). Nothing else in the app knows which one is active.
let current: AuthService = new MockAuthService();

export function getAuthService(): AuthService {
  return current;
}

export function registerAuthService(service: AuthService): void {
  current = service;
}
