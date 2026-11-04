import { levels } from '@/mocks/levels';
import type { ActivityDay, LessonAttempt, VocabularyReviewState } from '@/types';

import { emptyMeta, type ProgressRecord, type SettingsRecord, type Snapshot, type SyncMeta } from './types';

/**
 * Conflict rules (documented in docs/SYNC.md):
 *  - attempts: union by id (append-only history, never lost).
 *  - completed lessons: union (a lesson once passed stays passed).
 *  - XP / words / minutes: max of both sides (counters only grow; max never loses progress).
 *  - level: the higher of the two.
 *  - activity days: per-field max for the same day (streak = union of days).
 *  - vocabulary reviews: the state with the newer `lastReviewedAt` wins; never-reviewed loses to reviewed.
 *  - single values (learning profile, settings, daily goal): if only one side has a value it is used;
 *    if both differ, the side the user changed since the last sync wins, else the server's value.
 */

const rank = (id: string) => levels.findIndex((l) => l.id === id);

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function mergeScalar<T>(local: T | null, remote: T | null, lastSynced: T | null): T | null {
  if (local === null) return remote;
  if (remote === null) return local;
  if (sameJson(local, remote)) return local;
  if (lastSynced === null) return remote; // never synced before: the server's value is the reference
  return sameJson(local, lastSynced) ? remote : local; // the user changed it here since the last sync: keep their change
}

const isDefaultSettings = (s: SettingsRecord | null) => s === null || (s.theme === 'system' && s.uiLanguage === 'system');

export function mergeProgress(local: ProgressRecord | undefined, remote: ProgressRecord | undefined, lastGoal: number | null): ProgressRecord | undefined {
  if (!local) return remote;
  if (!remote) return local;
  return {
    levelId: rank(local.levelId) >= rank(remote.levelId) ? local.levelId : remote.levelId,
    totalXp: Math.max(local.totalXp, remote.totalXp),
    wordsLearned: Math.max(local.wordsLearned, remote.wordsLearned),
    minutesLearned: Math.max(local.minutesLearned, remote.minutesLearned),
    completedLessonIds: [...new Set([...local.completedLessonIds, ...remote.completedLessonIds])],
    dailyGoalMinutes: mergeScalar(local.dailyGoalMinutes, remote.dailyGoalMinutes, lastGoal) ?? local.dailyGoalMinutes,
  };
}

export function mergeActivity(a: ActivityDay[], b: ActivityDay[]): ActivityDay[] {
  const byDay = new Map<string, ActivityDay>();
  for (const d of [...a, ...b]) {
    const have = byDay.get(d.day);
    byDay.set(
      d.day,
      have
        ? {
            ...have,
            minutes: Math.max(have.minutes, d.minutes),
            xp: Math.max(have.xp, d.xp),
            lessonsCompleted: Math.max(have.lessonsCompleted, d.lessonsCompleted),
            correctAnswers: Math.max(have.correctAnswers, d.correctAnswers),
          }
        : d,
    );
  }
  return [...byDay.values()].sort((x, y) => x.day.localeCompare(y.day));
}

export function mergeReviews(a: VocabularyReviewState[], b: VocabularyReviewState[]): VocabularyReviewState[] {
  const byWord = new Map<string, VocabularyReviewState>();
  for (const s of [...a, ...b]) {
    const have = byWord.get(s.wordId);
    if (!have) {
      byWord.set(s.wordId, s);
      continue;
    }
    const ta = have.lastReviewedAt ? Date.parse(have.lastReviewedAt) : -1;
    const tb = s.lastReviewedAt ? Date.parse(s.lastReviewedAt) : -1;
    if (tb > ta) byWord.set(s.wordId, s);
  }
  return [...byWord.values()];
}

export function mergeAttempts(a: LessonAttempt[], b: LessonAttempt[]): LessonAttempt[] {
  const byId = new Map<string, LessonAttempt>();
  for (const x of [...a, ...b]) if (!byId.has(x.id)) byId.set(x.id, x);
  return [...byId.values()].sort((x, y) => x.attemptedAt.localeCompare(y.attemptedAt));
}

export function mergeSnapshots(local: Snapshot, remote: Snapshot, meta: SyncMeta = emptyMeta()): Snapshot {
  const progress: Snapshot['progress'] = {};
  for (const code of new Set([...Object.keys(local.progress), ...Object.keys(remote.progress)]) as Set<keyof Snapshot['progress'] & string>) {
    const merged = mergeProgress(local.progress[code], remote.progress[code], meta.goals[code] ?? null);
    if (merged) progress[code] = merged;
  }
  return {
    profile: mergeScalar(local.profile, remote.profile, meta.profile),
    // A server row holding only the defaults means "never chosen": it must not overwrite a real local choice.
    settings: mergeScalar(local.settings, isDefaultSettings(remote.settings) ? null : remote.settings, meta.settings) ?? remote.settings,
    progress,
    attempts: mergeAttempts(local.attempts, remote.attempts),
    activity: mergeActivity(local.activity, remote.activity),
    reviews: mergeReviews(local.reviews, remote.reviews),
  };
}

/** Items of `merged` that `base` does not already hold identically: what has to be pushed or written. */
export function diffSnapshots(base: Snapshot, merged: Snapshot): Snapshot {
  const baseAttempts = new Set(base.attempts.map((a) => a.id));
  const baseActivity = new Map(base.activity.map((d) => [d.day, d]));
  const baseReviews = new Map(base.reviews.map((r) => [r.wordId, r]));
  const progress: Snapshot['progress'] = {};
  for (const [code, rec] of Object.entries(merged.progress) as [keyof Snapshot['progress'] & string, ProgressRecord][]) {
    if (!sameJson(normalizeProgress(base.progress[code]), normalizeProgress(rec))) progress[code] = rec;
  }
  return {
    profile: sameJson(base.profile, merged.profile) ? null : merged.profile,
    settings: sameJson(base.settings, merged.settings) ? null : merged.settings,
    progress,
    attempts: merged.attempts.filter((a) => !baseAttempts.has(a.id)),
    activity: merged.activity.filter((d) => !sameJson(baseActivity.get(d.day), d)),
    reviews: merged.reviews.filter((r) => !sameJson(baseReviews.get(r.wordId), r)),
  };
}

function normalizeProgress(p: ProgressRecord | undefined) {
  return p ? { ...p, completedLessonIds: [...p.completedLessonIds].sort() } : undefined;
}

export const isEmptyDelta = (d: Snapshot) =>
  d.profile === null && d.settings === null && Object.keys(d.progress).length === 0 && d.attempts.length === 0 && d.activity.length === 0 && d.reviews.length === 0;
