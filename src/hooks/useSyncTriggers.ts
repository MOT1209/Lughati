import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import { useSyncStore } from '@/store/syncStore';

const DEBOUNCE_MS = 2500;

/**
 * Starts a sync when: the user is signed in, the app returns to the foreground, connectivity comes
 * back, or progress changed (debounced). Every trigger is safe to repeat; the engine dedupes.
 */
export function useSyncTriggers(): void {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const progressVersion = useLearningStore((s) => s.progressVersion);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstVersion = useRef(progressVersion);

  useEffect(() => {
    if (!userId) {
      useSyncStore.getState().reset();
      return;
    }
    const run = () => void useSyncStore.getState().syncNow(userId);
    run();
    const appSub = AppState.addEventListener('change', (state) => state === 'active' && run());
    let wasOnline: boolean | null = null;
    const netUnsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online && wasOnline === false) run();
      wasOnline = online;
    });
    return () => {
      appSub.remove();
      netUnsub();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || progressVersion === firstVersion.current) return;
    useSyncStore.getState().markPending();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void useSyncStore.getState().syncNow(userId), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [progressVersion, userId]);
}
