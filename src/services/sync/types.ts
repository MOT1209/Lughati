import type { ActivityDay, LanguageCode, LearningProfile, LessonAttempt, LevelId, ReviewOutcome, VocabularyReviewState } from '@/types';

/** Cloud-relevant part of one language's progress. Derived fields (current lesson, level progress) are rebuilt locally. */
export interface ProgressRecord {
  levelId: LevelId;
  totalXp: number;
  wordsLearned: number;
  minutesLearned: number;
  completedLessonIds: string[];
  dailyGoalMinutes: number;
}

export interface SettingsRecord {
  theme: 'system' | 'light' | 'dark';
  uiLanguage: 'system' | 'ar' | 'en';
}

/** Everything the app stores for one account, in a storage-independent shape. */
export interface Snapshot {
  profile: LearningProfile | null;
  settings: SettingsRecord | null;
  progress: Partial<Record<LanguageCode, ProgressRecord>>;
  /** Append-only; identified by `id`. */
  attempts: LessonAttempt[];
  /** One entry per local calendar day. */
  activity: ActivityDay[];
  reviews: VocabularyReviewState[];
}

export const emptySnapshot = (): Snapshot => ({ profile: null, settings: null, progress: {}, attempts: [], activity: [], reviews: [] });

/** What the last successful sync saw. Lets "did the user change it since?" be answered without timestamps. */
export interface SyncMeta {
  lastSyncedAt: string | null;
  profile: LearningProfile | null;
  settings: SettingsRecord | null;
  goals: Partial<Record<LanguageCode, number>>;
  migration: { status: 'none' | 'started' | 'verified'; verifiedAt?: string };
}

export const emptyMeta = (): SyncMeta => ({ lastSyncedAt: null, profile: null, settings: null, goals: {}, migration: { status: 'none' } });

/** The remote side. Implemented over Supabase; an in-memory fake is used in tests. */
export interface CloudStore {
  fetch(userId: string): Promise<Snapshot>;
  /** Idempotent: pushing the same data twice leaves the same remote state. */
  push(userId: string, delta: Snapshot): Promise<void>;
  /** Optional derived cache (learning_streaks). */
  pushStreak?(userId: string, streak: { current: number; best: number; lastDay: string | null }): Promise<void>;
  recordMigration(userId: string, deviceId: string, status: 'started' | 'verified', counts: Record<string, number>): Promise<void>;
}

/** The local side, implemented by the repositories (which own device storage). */
export interface LocalStore {
  exportSnapshot(userId: string): Promise<Snapshot>;
  importSnapshot(userId: string, snapshot: Snapshot): Promise<void>;
}

export type { ReviewOutcome };
