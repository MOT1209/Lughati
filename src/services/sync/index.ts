import { STORAGE_KEYS } from '@/constants/app';
import { usePreferencesStore } from '@/store/preferencesStore';

import { getSupabase } from '../backend/client';
import { getRepositories } from '../repositories';
import { deviceStorage, type KeyValueStorage } from '../storage';
import { createSyncEngine, type SyncEngine, type SyncResult } from './engine';
import { SupabaseCloudStore } from './SupabaseCloudStore';
import type { LocalStore, Snapshot } from './types';

export * from './types';
export type { SyncResult } from './engine';

/** Repositories own progress; preferences (theme, UI language) live in the preferences store. */
export function withPreferences(base: LocalStore): LocalStore {
  return {
    async exportSnapshot(userId) {
      const snap = await base.exportSnapshot(userId);
      const { themePreference, languagePreference } = usePreferencesStore.getState();
      return { ...snap, settings: { theme: themePreference, uiLanguage: languagePreference } };
    },
    async importSnapshot(userId, snapshot: Snapshot) {
      await base.importSnapshot(userId, snapshot);
      const s = snapshot.settings;
      if (s) {
        const prefs = usePreferencesStore.getState();
        if (prefs.themePreference !== s.theme) prefs.setThemePreference(s.theme);
        // The UI language also flips layout direction and needs a reload, so a pulled language
        // is applied only when nothing was chosen here yet; an explicit local choice is never overridden.
        if (prefs.languagePreference === 'system' && s.uiLanguage !== 'system') prefs.setLanguagePreference(s.uiLanguage);
      }
    },
  };
}

export async function getDeviceId(storage: KeyValueStorage = deviceStorage): Promise<string> {
  try {
    const existing = await storage.getItem(STORAGE_KEYS.deviceId);
    if (existing) return existing;
  } catch {
    // fall through: a fresh id still works for this run
  }
  const id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await storage.setItem(STORAGE_KEYS.deviceId, id).catch(() => undefined);
  return id;
}

let engine: SyncEngine | null = null;
let override: SyncEngine | null = null;

/** Null when the build has no backend: the app then works purely on the device. */
export async function getSyncEngine(): Promise<SyncEngine | null> {
  if (override) return override;
  if (engine) return engine;
  const client = getSupabase();
  if (!client) return null;
  engine = createSyncEngine({
    local: withPreferences(getRepositories().snapshots),
    cloud: new SupabaseCloudStore(client),
    storage: deviceStorage,
    deviceId: await getDeviceId(),
  });
  return engine;
}

export function registerSyncEngine(next: SyncEngine | null): void {
  override = next;
  engine = null;
}

/** Runs one sync for the user, or reports `unavailable` when there is no backend. */
export async function syncUser(userId: string): Promise<SyncResult | { status: 'unavailable' }> {
  const e = await getSyncEngine();
  if (!e) return { status: 'unavailable' };
  return e.sync(userId);
}

/**
 * Right after sign-in, give the cloud a short chance to restore this account's data before the
 * app decides where to go (a second device must not ask for the language choice again).
 */
export async function restoreBeforeLoad(userId: string, timeoutMs = 6000): Promise<void> {
  try {
    await Promise.race([syncUser(userId), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
  } catch {
    // offline or failing: continue with local data; the background sync retries later
  }
}
