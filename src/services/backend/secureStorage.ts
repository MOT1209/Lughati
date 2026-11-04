import * as SecureStore from 'expo-secure-store';

import type { KeyValueStorage } from '../storage';

// SecureStore (Android Keystore) limits a value to ~2 KB; a Supabase session is larger, so it is
// split into chunks. Session tokens therefore never sit in plain AsyncStorage.
const CHUNK = 1800;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function createSecureStorage(store: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> = SecureStore): KeyValueStorage {
  const countKey = (key: string) => `${safeKey(key)}.n`;
  const partKey = (key: string, i: number) => `${safeKey(key)}.${i}`;

  async function removeItem(key: string): Promise<void> {
    const raw = await store.getItemAsync(countKey(key));
    const count = raw ? Number.parseInt(raw, 10) : 0;
    for (let i = 0; i < (Number.isFinite(count) ? count : 0); i += 1) await store.deleteItemAsync(partKey(key, i));
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key) {
      const raw = await store.getItemAsync(countKey(key));
      if (!raw) return null;
      const count = Number.parseInt(raw, 10);
      if (!Number.isInteger(count) || count < 1 || count > 100) return null;
      let out = '';
      for (let i = 0; i < count; i += 1) {
        const part = await store.getItemAsync(partKey(key, i));
        if (part === null) return null; // torn write: behave as signed out
        out += part;
      }
      return out;
    },
    async setItem(key, value) {
      await removeItem(key);
      const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
      for (let i = 0; i < parts.length; i += 1) await store.setItemAsync(partKey(key, i), parts[i] ?? '');
      await store.setItemAsync(countKey(key), String(parts.length));
    },
    removeItem,
  };
}
