/**
 * Public client configuration only. The anon/publishable key is designed to ship inside the app
 * (access is limited by Row Level Security); the service-role key must never be set here.
 */
export interface BackendConfig {
  url: string;
  anonKey: string;
}

/** A key that decodes as a JWT with role "service_role" is a privileged secret: refuse it. */
export function isServiceRoleKey(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function readBackendConfig(
  env: Record<string, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
): BackendConfig | null {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  if (!/^https:\/\/[^\s/]+$/.test(url.replace(/\/+$/, ''))) return null;
  if (isServiceRoleKey(anonKey)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY holds a service-role key. Never ship privileged keys in the app.');
  }
  return { url: url.replace(/\/+$/, ''), anonKey };
}

export function isBackendConfigured(): boolean {
  return readBackendConfig() !== null;
}
