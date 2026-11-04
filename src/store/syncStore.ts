import { create } from 'zustand';

import { syncUser } from '@/services/sync';

import { useLearningStore } from './learningStore';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'denied' | 'unavailable';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  /** True when local changes were made since the last successful sync. */
  pending: boolean;
  syncNow: (userId: string) => Promise<void>;
  markPending: () => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  pending: false,
  syncNow: async (userId) => {
    if (get().status === 'syncing') return;
    set({ status: 'syncing' });
    const result = await syncUser(userId);
    if (result.status === 'synced') {
      set({ status: 'synced', lastSyncedAt: result.at, pending: false });
      // Data pulled from another device: screens showing progress reload.
      if (result.pulled > 0) useLearningStore.getState().notifyProgressChanged();
    }
    else set({ status: result.status });
  },
  markPending: () => set({ pending: true }),
  reset: () => set({ status: 'idle', lastSyncedAt: null, pending: false }),
}));
