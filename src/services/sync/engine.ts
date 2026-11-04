import { STORAGE_KEYS } from '@/constants/app';
import { dayOf } from '@/utils/day';
import { computeStreakStats } from '@/utils/streaks';

import type { KeyValueStorage } from '../storage';
import { CloudError } from './SupabaseCloudStore';
import { diffSnapshots, isEmptyDelta, mergeSnapshots } from './merge';
import { emptyMeta, type CloudStore, type LocalStore, type Snapshot, type SyncMeta } from './types';

export type SyncResult =
  | { status: 'synced'; pushed: number; pulled: number; at: string }
  | { status: 'offline' }
  | { status: 'denied' }
  | { status: 'error' };

export interface SyncDeps {
  local: LocalStore;
  cloud: CloudStore;
  storage: KeyValueStorage;
  deviceId: string;
  now?: () => Date;
}

const count = (s: Snapshot) =>
  s.attempts.length + s.activity.length + s.reviews.length + Object.keys(s.progress).length + (s.profile ? 1 : 0) + (s.settings ? 1 : 0);

async function readAllMeta(storage: KeyValueStorage): Promise<Record<string, SyncMeta>> {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.syncMeta);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, SyncMeta>) : {};
  } catch {
    return {};
  }
}

/** True when every item of `local` is present remotely (used to verify an upload before trusting it). */
export function isUploaded(local: Snapshot, remote: Snapshot): boolean {
  const attempts = new Set(remote.attempts.map((a) => a.id));
  const days = new Set(remote.activity.map((d) => d.day));
  const words = new Set(remote.reviews.map((r) => r.wordId));
  if (!local.attempts.every((a) => attempts.has(a.id))) return false;
  if (!local.activity.every((d) => days.has(d.day))) return false;
  if (!local.reviews.every((r) => words.has(r.wordId))) return false;
  for (const [code, rec] of Object.entries(local.progress)) {
    const r = remote.progress[code as keyof Snapshot['progress']];
    if (!r || !rec.completedLessonIds.every((id) => r.completedLessonIds.includes(id))) return false;
  }
  return true;
}

/**
 * State-based, idempotent sync: pull the remote state, merge it with the local state under the
 * documented rules, write the merged state locally and push what the server lacks. Because it
 * compares states rather than replaying a log, an interrupted run, a duplicate run or a run after
 * hours offline all converge to the same result; "queued changes" are simply the local state that
 * the server does not hold yet. Local data is never deleted by a sync.
 */
export function createSyncEngine({ local, cloud, storage, deviceId, now = () => new Date() }: SyncDeps) {
  const inFlight = new Map<string, Promise<SyncResult>>();

  async function run(userId: string): Promise<SyncResult> {
    const metas = await readAllMeta(storage);
    const meta = metas[userId] ?? emptyMeta();
    try {
      const localSnap = await local.exportSnapshot(userId);
      const firstUpload = meta.migration.status !== 'verified' && count(localSnap) > 0;
      const remote = await cloud.fetch(userId);

      if (firstUpload) {
        meta.migration = { status: 'started' };
        await cloud.recordMigration(userId, deviceId, 'started', { attempts: localSnap.attempts.length, activity: localSnap.activity.length, reviews: localSnap.reviews.length });
      }

      const merged = mergeSnapshots(localSnap, remote, meta);
      const toPush = diffSnapshots(remote, merged);
      const toWrite = diffSnapshots(localSnap, merged);

      // Local first (cheap, offline-safe); the cloud push follows. Both are idempotent.
      if (!isEmptyDelta(toWrite)) await local.importSnapshot(userId, merged);
      if (!isEmptyDelta(toPush)) await cloud.push(userId, toPush);

      if (cloud.pushStreak) {
        const stats = computeStreakStats(merged.activity.map((d) => d.day), dayOf(now()));
        const lastDay = merged.activity.length ? merged.activity[merged.activity.length - 1]!.day : null;
        await cloud.pushStreak(userId, { current: stats.current, best: stats.best, lastDay });
      }

      // Verify before recording success: re-read the server and check that nothing local is missing.
      if (firstUpload || !isEmptyDelta(toPush)) {
        const check = await cloud.fetch(userId);
        if (!isUploaded(merged, check)) throw new CloudError('server');
        if (firstUpload) {
          await cloud.recordMigration(userId, deviceId, 'verified', { attempts: merged.attempts.length, activity: merged.activity.length, reviews: merged.reviews.length });
          meta.migration = { status: 'verified', verifiedAt: now().toISOString() };
        }
      }

      const at = now().toISOString();
      const next: SyncMeta = {
        ...meta,
        lastSyncedAt: at,
        profile: merged.profile,
        settings: merged.settings,
        goals: Object.fromEntries(Object.entries(merged.progress).map(([code, p]) => [code, p.dailyGoalMinutes])),
      };
      await storage.setItem(STORAGE_KEYS.syncMeta, JSON.stringify({ ...(await readAllMeta(storage)), [userId]: next }));
      return { status: 'synced', pushed: count(toPush), pulled: count(toWrite), at };
    } catch (error) {
      // Keep the "started" marker so the next run knows the upload was interrupted and re-verifies.
      await storage
        .setItem(STORAGE_KEYS.syncMeta, JSON.stringify({ ...(await readAllMeta(storage)), [userId]: meta }))
        .catch(() => undefined);
      if (error instanceof CloudError) return error.kind === 'network' ? { status: 'offline' } : error.kind === 'denied' ? { status: 'denied' } : { status: 'error' };
      return { status: 'error' };
    }
  }

  return {
    /** Concurrent calls share one run (duplicate triggers cost nothing). */
    sync(userId: string): Promise<SyncResult> {
      const running = inFlight.get(userId);
      if (running) return running;
      const next = run(userId).finally(() => inFlight.delete(userId));
      inFlight.set(userId, next);
      return next;
    },
    async getMeta(userId: string): Promise<SyncMeta> {
      return (await readAllMeta(storage))[userId] ?? emptyMeta();
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
