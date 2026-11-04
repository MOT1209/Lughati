import type { SupabaseClient } from '@supabase/supabase-js';

import { languages } from '@/mocks/languages';
import { levels } from '@/mocks/levels';
import type { ActivityDay, LanguageCode, LessonAttempt, LevelId, VocabularyReviewState } from '@/types';

import { emptySnapshot, type CloudStore, type ProgressRecord, type SettingsRecord, type Snapshot } from './types';

const CHUNK = 200;
const MAX_ATTEMPT_ROWS = 500;
const PAGE = 1000;

const langs = new Set<string>(languages.map((l) => l.code));
const levelIds = new Set<string>(levels.map((l) => l.id));
const isLang = (v: unknown): v is LanguageCode => typeof v === 'string' && langs.has(v);
const isLevel = (v: unknown): v is LevelId => typeof v === 'string' && levelIds.has(v);
const isRow = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const iso = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

export class CloudError extends Error {
  constructor(readonly kind: 'network' | 'denied' | 'server') {
    super(kind);
    this.name = 'CloudError';
  }
}

function fail(error: { code?: string; status?: number; message?: string } | null | undefined): never {
  const status = error?.status ?? 0;
  const text = (error?.message ?? '').toLowerCase();
  if (status === 401 || status === 403 || error?.code === '42501' || error?.code === 'PGRST301') throw new CloudError('denied');
  if (status === 0 && /fetch|network|failed/.test(text)) throw new CloudError('network');
  throw new CloudError('server');
}

// ---- Row mapping (pure, tested). Unknown or malformed remote rows are dropped, never trusted. ----

export function rowsToSnapshot(rows: {
  profile?: unknown;
  settings?: unknown;
  progress?: unknown[];
  completions?: unknown[];
  attempts?: unknown[];
  activity?: unknown[];
  reviews?: unknown[];
}): Snapshot {
  const snap = emptySnapshot();

  const p = rows.profile;
  if (isRow(p) && isLang(p.source_language) && isLang(p.target_language) && p.source_language !== p.target_language) {
    snap.profile = { source: p.source_language, target: p.target_language };
  }
  const s = rows.settings;
  if (isRow(s) && ['system', 'light', 'dark'].includes(String(s.theme)) && ['system', 'ar', 'en'].includes(String(s.ui_language))) {
    snap.settings = { theme: s.theme as SettingsRecord['theme'], uiLanguage: s.ui_language as SettingsRecord['uiLanguage'] };
  }
  for (const r of rows.progress ?? []) {
    if (!isRow(r) || !isLang(r.language_code) || !isLevel(r.level_id)) continue;
    const rec: ProgressRecord = {
      levelId: r.level_id,
      totalXp: num(r.total_xp),
      wordsLearned: num(r.words_learned),
      minutesLearned: num(r.minutes_learned),
      completedLessonIds: [],
      dailyGoalMinutes: Math.max(5, num(r.daily_goal_minutes, 15)),
    };
    snap.progress[r.language_code] = rec;
  }
  for (const c of rows.completions ?? []) {
    if (!isRow(c) || !isLang(c.language_code) || typeof c.lesson_id !== 'string') continue;
    const rec = snap.progress[c.language_code];
    if (rec) rec.completedLessonIds.push(c.lesson_id);
  }
  for (const a of rows.attempts ?? []) {
    const at = isRow(a) ? iso(a.attempted_at) : null;
    if (!isRow(a) || !at || typeof a.id !== 'string' || typeof a.lesson_id !== 'string' || !isLang(a.language_code) || typeof a.user_id !== 'string') continue;
    const attempt: LessonAttempt = {
      id: a.id,
      userId: a.user_id,
      lessonId: a.lesson_id,
      targetLanguage: a.language_code,
      attemptedAt: at,
      result: { correct: num(a.correct), total: num(a.total) },
      completed: a.completed === true,
      kind: a.kind === 'practice' ? 'practice' : 'lesson',
    };
    snap.attempts.push(attempt);
  }
  for (const d of rows.activity ?? []) {
    if (!isRow(d) || typeof d.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.day) || typeof d.user_id !== 'string') continue;
    const day: ActivityDay = {
      userId: d.user_id,
      day: d.day,
      minutes: num(d.minutes),
      xp: num(d.xp),
      lessonsCompleted: num(d.lessons_completed),
      correctAnswers: num(d.correct_answers),
    };
    snap.activity.push(day);
  }
  for (const r of rows.reviews ?? []) {
    const next = isRow(r) ? iso(r.next_review_at) : null;
    if (!isRow(r) || !next || typeof r.word_id !== 'string' || !isLang(r.language_code) || typeof r.user_id !== 'string') continue;
    const state: VocabularyReviewState = {
      userId: r.user_id,
      targetLanguage: r.language_code,
      wordId: r.word_id,
      step: num(r.step),
      correctCount: num(r.correct_count),
      wrongCount: num(r.wrong_count),
      lastReviewedAt: iso(r.last_reviewed_at),
      nextReviewAt: next,
    };
    snap.reviews.push(state);
  }
  return snap;
}

export function snapshotToRows(userId: string, delta: Snapshot) {
  return {
    profile: delta.profile ? { id: userId, source_language: delta.profile.source, target_language: delta.profile.target } : null,
    settings: delta.settings ? { user_id: userId, theme: delta.settings.theme, ui_language: delta.settings.uiLanguage } : null,
    progress: Object.entries(delta.progress).map(([code, p]) => ({
      user_id: userId,
      language_code: code,
      level_id: p.levelId,
      total_xp: p.totalXp,
      words_learned: p.wordsLearned,
      minutes_learned: p.minutesLearned,
      daily_goal_minutes: p.dailyGoalMinutes,
    })),
    completions: Object.entries(delta.progress).flatMap(([code, p]) =>
      p.completedLessonIds.map((lessonId) => ({ user_id: userId, lesson_id: lessonId, language_code: code })),
    ),
    attempts: delta.attempts.map((a) => ({
      user_id: userId,
      id: a.id,
      lesson_id: a.lessonId,
      language_code: a.targetLanguage,
      kind: a.kind === 'practice' ? 'practice' : 'lesson',
      correct: a.result.correct,
      total: a.result.total,
      completed: a.completed,
      attempted_at: a.attemptedAt,
    })),
    activity: delta.activity.map((d) => ({
      user_id: userId,
      day: d.day,
      minutes: d.minutes,
      xp: d.xp,
      lessons_completed: d.lessonsCompleted,
      correct_answers: d.correctAnswers,
    })),
    reviews: delta.reviews.map((r) => ({
      user_id: userId,
      word_id: r.wordId,
      language_code: r.targetLanguage,
      step: r.step,
      correct_count: r.correctCount,
      wrong_count: r.wrongCount,
      last_reviewed_at: r.lastReviewedAt,
      next_review_at: r.nextReviewAt,
    })),
  };
}

const chunks = <T,>(items: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
};

export class SupabaseCloudStore implements CloudStore {
  constructor(private readonly client: SupabaseClient) {}

  private async all(table: string, userId: string, column = 'user_id', order?: string, limit?: number): Promise<unknown[]> {
    const out: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = this.client.from(table).select('*').eq(column, userId);
      if (order) q = q.order(order, { ascending: false });
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) fail(error);
      out.push(...(data ?? []));
      if (!data || data.length < PAGE || (limit !== undefined && out.length >= limit)) break;
    }
    return limit === undefined ? out : out.slice(0, limit);
  }

  async fetch(userId: string): Promise<Snapshot> {
    try {
      const [profile, settings, progress, completions, attempts, activity, reviews] = await Promise.all([
        this.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        this.client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        this.all('user_progress', userId),
        this.all('lesson_completions', userId),
        this.all('quiz_attempts', userId, 'user_id', 'attempted_at', MAX_ATTEMPT_ROWS),
        this.all('learning_activity', userId),
        this.all('vocabulary_reviews', userId),
      ]);
      if (profile.error) fail(profile.error);
      if (settings.error) fail(settings.error);
      return rowsToSnapshot({ profile: profile.data, settings: settings.data, progress, completions, attempts, activity, reviews });
    } catch (error) {
      if (error instanceof CloudError) throw error;
      throw new CloudError('network');
    }
  }

  async push(userId: string, delta: Snapshot): Promise<void> {
    const rows = snapshotToRows(userId, delta);
    try {
      // Order matters for foreign keys: parents first. Every write is an idempotent upsert.
      if (rows.profile) {
        const { error } = await this.client.from('profiles').upsert(rows.profile, { onConflict: 'id' });
        if (error) fail(error);
      }
      if (rows.settings) {
        const { error } = await this.client.from('user_settings').upsert(rows.settings, { onConflict: 'user_id' });
        if (error) fail(error);
      }
      const steps: [string, unknown[], string, boolean][] = [
        ['user_progress', rows.progress, 'user_id,language_code', false],
        ['lesson_completions', rows.completions, 'user_id,lesson_id', true],
        ['quiz_attempts', rows.attempts, 'user_id,id', true],
        ['learning_activity', rows.activity, 'user_id,day', false],
        ['vocabulary_reviews', rows.reviews, 'user_id,word_id', false],
      ];
      for (const [table, items, onConflict, ignoreDuplicates] of steps) {
        for (const part of chunks(items)) {
          const { error } = await this.client.from(table).upsert(part, { onConflict, ignoreDuplicates });
          if (error) fail(error);
        }
      }
    } catch (error) {
      if (error instanceof CloudError) throw error;
      throw new CloudError('network');
    }
  }

  async pushStreak(userId: string, streak: { current: number; best: number; lastDay: string | null }): Promise<void> {
    const { error } = await this.client
      .from('learning_streaks')
      .upsert({ user_id: userId, current_days: streak.current, best_days: streak.best, last_activity_day: streak.lastDay }, { onConflict: 'user_id' });
    if (error) fail(error);
  }

  async recordMigration(userId: string, deviceId: string, status: 'started' | 'verified', counts: Record<string, number>): Promise<void> {
    const { error } = await this.client
      .from('sync_migrations')
      .upsert({ user_id: userId, device_id: deviceId, status, record_counts: counts }, { onConflict: 'user_id,device_id' });
    if (error) fail(error);
  }
}
