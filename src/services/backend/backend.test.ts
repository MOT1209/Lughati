import { isServiceRoleKey, readBackendConfig } from './config';
import { createSecureStorage } from './secureStorage';

const jwt = (role: string) => `h.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.s`;

describe('readBackendConfig', () => {
  it('returns null when nothing is configured', () => {
    expect(readBackendConfig({})).toBeNull();
  });
  it('accepts an https URL + anon key and strips trailing slashes', () => {
    expect(readBackendConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_x' })).toEqual({
      url: 'https://abc.supabase.co',
      anonKey: 'sb_publishable_x',
    });
  });
  it('rejects a non-https URL', () => {
    expect(readBackendConfig({ EXPO_PUBLIC_SUPABASE_URL: 'http://abc.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBeNull();
  });
  it('refuses a service-role key outright', () => {
    expect(isServiceRoleKey(jwt('service_role'))).toBe(true);
    expect(isServiceRoleKey(jwt('anon'))).toBe(false);
    expect(() => readBackendConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') })).toThrow(/service-role/);
  });
});

describe('createSecureStorage', () => {
  function fakeStore() {
    const m = new Map<string, string>();
    return {
      m,
      getItemAsync: async (k: string) => m.get(k) ?? null,
      setItemAsync: async (k: string, v: string) => void m.set(k, v),
      deleteItemAsync: async (k: string) => void m.delete(k),
    };
  }
  it('round-trips a value larger than the SecureStore limit in several chunks', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    const big = 'x'.repeat(5000) + 'é';
    await storage.setItem('sb-token', big);
    expect([...store.m.keys()].filter((k) => !k.endsWith('.n')).length).toBeGreaterThan(2);
    expect(await storage.getItem('sb-token')).toBe(big);
  });
  it('shrinking a value leaves no stale chunks, and remove clears everything', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem('k', 'y'.repeat(5000));
    await storage.setItem('k', 'small');
    expect(store.m.size).toBe(2);
    await storage.removeItem('k');
    expect(store.m.size).toBe(0);
    expect(await storage.getItem('k')).toBeNull();
  });
  it('a torn write reads as empty (signed out), not as corrupt data', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem('k', 'z'.repeat(4000));
    store.m.delete('k.1');
    expect(await storage.getItem('k')).toBeNull();
  });
});
