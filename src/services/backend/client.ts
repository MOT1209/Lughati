import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { readBackendConfig } from './config';
import { createSecureStorage } from './secureStorage';

let client: SupabaseClient | null = null;
let appStateHooked = false;

/** The shared Supabase client, or null when the app was built without backend configuration. */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const config = readBackendConfig();
  if (!config) return null;
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: createSecureStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  if (!appStateHooked) {
    appStateHooked = true;
    // Refresh tokens only while the app is in the foreground (Supabase React Native guidance).
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
  }
  return client;
}

export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new Error('backend_not_configured');
  return supabase;
}

/** Test hook. */
export function resetSupabaseForTests(): void {
  client = null;
}
