import { STORAGE_KEYS } from '@/constants/app';
import type { ActivityDay, LessonAttempt, VocabularyReviewState } from '@/types';

import { createMockRepositories } from '../repositories/mock';
import { createMemoryStorage } from '../storage';
import { createSyncEngine } from './engine';
import { diffSnapshots, mergeScalar, mergeSnapshots } from './merge';
import { CloudError, rowsToSnapshot, snapshotToRows } from './SupabaseCloudStore';
import { emptyMeta, emptySnapshot, type CloudStore, type Snapshot } from './types';

const USER = 'user-1';
const T = (s: string) => `2026-03-0${s}T10:00:00.000Z`;

const attempt = (id: string, over: Partial<LessonAttempt> = {}): LessonAttempt => ({
  id,
  userId: USER,
  lessonId: 'de-a1-1',
  targetLanguage: 'de',
  attemptedAt: T('1'),
  result: { correct: 5, total: 6 },
  completed: true,
  kind: 'lesson',
  ...over,
});
const review = (wordId: string, last: string | null, step = 1): VocabularyReviewState => ({
  userId: USER, targetLanguage: 'de', wordId, step, correctCount: 1, wrongCount: 0, lastReviewedAt: last, nextReviewAt: T('9'),
});
const day = (d: string, over: Partial<ActivityDay> = {}): ActivityDay => ({ userId: USER, day: d, minutes: 5, xp: 10, lessonsCompleted: 0, correctAnswers: 1, ...over });

/** In-memory server with RLS-like isolation per user and the same idempotent semantics as the real upserts. */
function fakeCloud() {
  const db = new Map<string, Snapshot>();
  const state = { online: true, failPushAfter: -1, pushes: 0, migrations: [] as string[] };
  const get = (u: string) => db.get(u) ?? emptySnapshot();
  const cloud: CloudStore = {
    async fetch(u) {
      if (!state.online) throw new CloudError('network');
      return structuredClone(get(u));
    },
    async push(u, d) {
      if (!state.online) throw new CloudError('network');
      state.pushes += 1;
      if (state.failPushAfter === 0) throw new CloudError('network');
      const cur = get(u);
      const next: Snapshot = {
        profile: d.profile ?? cur.profile,
        settings: d.settings ?? cur.settings,
        progress: { ...cur.progress, ...d.progress },
        attempts: [...cur.attempts, ...d.attempts.filter((a) => !cur.attempts.some((c) => c.id === a.id))],
        activity: [...cur.activity.filter((c) => !d.activity.some((a) => a.day === c.day)), ...d.activity],
        reviews: [...cur.reviews.filter((c) => !d.reviews.some((r) => r.wordId === c.wordId)), ...d.reviews],
      };
      db.set(u, next);
    },
    async recordMigration(_u, _d, status) {
      if (!state.online) throw new CloudError('network');
      state.migrations.push(status);
    },
  };
  return { cloud, db, state };
}

describe('merge rules', () => {
  it('attempts are a union by id (duplicates collapse, nothing is lost)', () => {
    const a = { ...emptySnapshot(), attempts: [attempt('a'), attempt('b')] };
    const b = { ...emptySnapshot(), attempts: [attempt('b'), attempt('c')] };
    expect(mergeSnapshots(a, b).attempts.map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('progress: union of lessons, max counters, higher level', () => {
    const rec = (ids: string[], xp: number, level: 'A1' | 'A2') => ({ levelId: level, totalXp: xp, wordsLearned: ids.length * 6, minutesLearned: xp, completedLessonIds: ids, dailyGoalMinutes: 15 });
    const merged = mergeSnapshots({ ...emptySnapshot(), progress: { de: rec(['de-a1-1', 'de-a1-2'], 100, 'A1') } }, { ...emptySnapshot(), progress: { de: rec(['de-a1-2', 'de-a1-3'], 80, 'A2') } });
    expect(merged.progress.de).toMatchObject({ levelId: 'A2', totalXp: 100 });
    expect(merged.progress.de!.completedLessonIds.sort()).toEqual(['de-a1-1', 'de-a1-2', 'de-a1-3']);
  });

  it('activity days take the per-field max; reviews keep the newest review', () => {
    const m = mergeSnapshots(
      { ...emptySnapshot(), activity: [day('2026-03-01', { minutes: 5, xp: 30 })], reviews: [review('w1', T('2'), 2)] },
      { ...emptySnapshot(), activity: [day('2026-03-01', { minutes: 9, xp: 10 }), day('2026-03-02')], reviews: [review('w1', T('3'), 3), review('w2', null, 0)] },
    );
    expect(m.activity.map((d) => d.day)).toEqual(['2026-03-01', '2026-03-02']);
    expect(m.activity[0]).toMatchObject({ minutes: 9, xp: 30 });
    expect(m.reviews.find((r) => r.wordId === 'w1')!.step).toBe(3);
    expect(m.reviews).toHaveLength(2);
  });

  describe('single values', () => {
    it('only one side has a value: that value is used', () => {
      expect(mergeScalar(null, 'x', null)).toBe('x');
      expect(mergeScalar('y', null, null)).toBe('y');
    });
    it('changed here since the last sync: local wins; unchanged here: the server wins', () => {
      expect(mergeScalar('mine', 'theirs', 'old')).toBe('mine');
      expect(mergeScalar('old', 'theirs', 'old')).toBe('theirs');
    });
    it('never synced and both differ: the server is the reference', () => {
      expect(mergeScalar('a', 'b', null)).toBe('b');
    });
    it('a server row with default settings does not overwrite a real local choice', () => {
      const local = { ...emptySnapshot(), settings: { theme: 'dark' as const, uiLanguage: 'ar' as const } };
      const remote = { ...emptySnapshot(), settings: { theme: 'system' as const, uiLanguage: 'system' as const } };
      expect(mergeSnapshots(local, remote, emptyMeta()).settings).toEqual(local.settings);
    });
    it('daily goal: a local change since the last sync survives a stale server value', () => {
      const rec = (g: number) => ({ levelId: 'A1' as const, totalXp: 0, wordsLearned: 0, minutesLearned: 0, completedLessonIds: [], dailyGoalMinutes: g });
      const meta = { ...emptyMeta(), goals: { de: 15 } };
      expect(mergeSnapshots({ ...emptySnapshot(), progress: { de: rec(30) } }, { ...emptySnapshot(), progress: { de: rec(15) } }, meta).progress.de!.dailyGoalMinutes).toBe(30);
    });
  });

  it('diff returns only what the base lacks', () => {
    const base = { ...emptySnapshot(), attempts: [attempt('a')] };
    const merged = { ...emptySnapshot(), attempts: [attempt('a'), attempt('b')] };
    expect(diffSnapshots(base, merged).attempts.map((a) => a.id)).toEqual(['b']);
    expect(diffSnapshots(merged, merged).attempts).toEqual([]);
  });
});

describe('Supabase row mapping', () => {
  it('round-trips a snapshot through rows', () => {
    const snap: Snapshot = {
      profile: { source: 'ar', target: 'de' },
      settings: { theme: 'dark', uiLanguage: 'ar' },
      progress: { de: { levelId: 'A1', totalXp: 50, wordsLearned: 6, minutesLearned: 8, completedLessonIds: ['de-a1-1'], dailyGoalMinutes: 20 } },
      attempts: [attempt('a1')],
      activity: [day('2026-03-01')],
      reviews: [review('w1', T('2'))],
    };
    const rows = snapshotToRows(USER, snap);
    expect(rows.completions).toEqual([{ user_id: USER, lesson_id: 'de-a1-1', language_code: 'de' }]);
    const back = rowsToSnapshot({
      profile: rows.profile && { source_language: 'ar', target_language: 'de' },
      settings: rows.settings,
      progress: rows.progress,
      completions: rows.completions,
      attempts: rows.attempts,
      activity: rows.activity,
      reviews: rows.reviews,
    });
    expect(back).toEqual(snap);
  });

  it('drops malformed or foreign remote rows instead of trusting them', () => {
    const snap = rowsToSnapshot({
      profile: { source_language: 'xx', target_language: 'de' },
      progress: [{ language_code: 'klingon', level_id: 'A1' }, { language_code: 'de', level_id: 'Z9' }],
      attempts: [{ id: 'x', user_id: USER, lesson_id: 'l', language_code: 'de', attempted_at: 'not a date', correct: 1, total: 2 }],
      activity: [{ user_id: USER, day: '03/01/2026' }],
      reviews: [{ user_id: USER, word_id: 'w', language_code: 'de', next_review_at: null }],
    });
    expect(snap).toEqual(emptySnapshot());
  });
});

describe('sync engine', () => {
  async function setup() {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage, now: () => new Date('2026-03-05T09:00:00Z') });
    const { cloud, db, state } = fakeCloud();
    const engine = createSyncEngine({ local: repos.snapshots, cloud, storage, deviceId: 'dev-A', now: () => new Date('2026-03-05T09:00:00Z') });
    return { storage, repos, cloud, db, state, engine };
  }

  async function doLessonWork(repos: ReturnType<typeof createMockRepositories>) {
    await repos.profiles.set(USER, { source: 'ar', target: 'de' });
    await repos.progress.completeLesson(USER, 'de-a1-1', { correct: 6, total: 6 });
    await repos.progress.completeLesson(USER, 'de-a1-2', { correct: 3, total: 6 }); // failed run: attempt but no completion
    await repos.reviews.recordReview(USER, 'de', (await repos.reviews.getDue(USER, 'de', new Date('2026-04-01')))[0]!.wordId, 'good');
  }

  it('migration: existing local data is uploaded, verified, recorded, and kept locally', async () => {
    const { repos, engine, db, state, storage } = await setup();
    await doLessonWork(repos);
    const before = await storage.getItem(STORAGE_KEYS.learningProgress);

    const result = await engine.sync(USER);
    expect(result.status).toBe('synced');
    const remote = db.get(USER)!;
    expect(remote.profile).toEqual({ source: 'ar', target: 'de' });
    expect(remote.progress.de!.completedLessonIds).toEqual(['de-a1-1']);
    expect(remote.attempts).toHaveLength(2);
    expect(remote.reviews.length).toBeGreaterThan(0);
    expect(state.migrations).toEqual(['started', 'verified']);
    expect((await engine.getMeta(USER)).migration.status).toBe('verified');
    // Local data is not deleted or rewritten by the upload.
    expect(await storage.getItem(STORAGE_KEYS.learningProgress)).toBe(before);
  });

  it('running twice (or concurrently) creates no duplicates and pushes nothing the second time', async () => {
    const { repos, engine, db, state } = await setup();
    await doLessonWork(repos);
    const [a, b] = await Promise.all([engine.sync(USER), engine.sync(USER)]);
    expect(a).toEqual(b); // one shared run
    const pushesAfterFirst = state.pushes;
    const second = await engine.sync(USER);
    expect(second).toMatchObject({ status: 'synced', pushed: 0 });
    expect(state.pushes).toBe(pushesAfterFirst);
    expect(db.get(USER)!.attempts).toHaveLength(2);
  });

  it('offline: reports offline, keeps local data, and the next online run uploads everything', async () => {
    const { repos, engine, db, state } = await setup();
    await doLessonWork(repos);
    state.online = false;
    expect(await engine.sync(USER)).toEqual({ status: 'offline' });
    expect(db.get(USER)).toBeUndefined();
    expect((await repos.progress.get(USER, 'de'))!.completedLessonIds).toEqual(['de-a1-1']);

    state.online = true;
    expect((await engine.sync(USER)).status).toBe('synced');
    expect(db.get(USER)!.attempts).toHaveLength(2);
  });

  it('interrupted migration: a failed push leaves it "started", the retry completes and verifies', async () => {
    const { repos, engine, db, state } = await setup();
    await doLessonWork(repos);
    state.failPushAfter = 0;
    expect((await engine.sync(USER)).status).toBe('offline');
    expect((await engine.getMeta(USER)).migration.status).toBe('started');

    state.failPushAfter = -1;
    expect((await engine.sync(USER)).status).toBe('synced');
    expect((await engine.getMeta(USER)).migration.status).toBe('verified');
    expect(db.get(USER)!.attempts).toHaveLength(2);
  });

  it('a second device restores the account: profile, progress, history and reviews arrive', async () => {
    const a = await setup();
    await doLessonWork(a.repos);
    await a.engine.sync(USER);

    const storageB = createMemoryStorage();
    const reposB = createMockRepositories({ storage: storageB, now: () => new Date('2026-03-05T09:00:00Z') });
    const engineB = createSyncEngine({ local: reposB.snapshots, cloud: a.cloud, storage: storageB, deviceId: 'dev-B' });
    expect((await engineB.sync(USER)).status).toBe('synced');

    expect(await reposB.profiles.get(USER)).toEqual({ source: 'ar', target: 'de' });
    const progress = await reposB.progress.get(USER, 'de');
    expect(progress!.completedLessonIds).toEqual(['de-a1-1']);
    expect(progress!.currentLessonId).toBe('de-a1-2');
    expect(await reposB.progress.getAttempts(USER, 'de')).toHaveLength(2);
    expect((await reposB.reviews.getDue(USER, 'de', new Date('2026-06-01'))).length).toBeGreaterThan(0);
  });

  it('two devices that worked offline converge without losing either side', async () => {
    const a = await setup();
    await a.repos.profiles.set(USER, { source: 'ar', target: 'de' });
    await a.repos.progress.completeLesson(USER, 'de-a1-1', { correct: 6, total: 6 });
    await a.engine.sync(USER);

    const storageB = createMemoryStorage();
    const reposB = createMockRepositories({ storage: storageB, now: () => new Date('2026-03-06T09:00:00Z') });
    const engineB = createSyncEngine({ local: reposB.snapshots, cloud: a.cloud, storage: storageB, deviceId: 'dev-B' });
    await engineB.sync(USER);

    // Both go offline and finish different lessons.
    await a.repos.progress.completeLesson(USER, 'de-a1-2', { correct: 6, total: 6 });
    await reposB.progress.completeLesson(USER, 'de-a1-3', { correct: 6, total: 6 });
    await a.engine.sync(USER);
    await engineB.sync(USER);
    await a.engine.sync(USER);

    for (const repos of [a.repos, reposB]) {
      const p = await repos.progress.get(USER, 'de');
      expect(p!.completedLessonIds.sort()).toEqual(['de-a1-1', 'de-a1-2', 'de-a1-3']);
      expect(await repos.progress.getAttempts(USER, 'de')).toHaveLength(3);
    }
  });

  it("another account's data on the same device is never uploaded under this account", async () => {
    const { repos, engine, db } = await setup();
    await repos.profiles.set('other-user', { source: 'ar', target: 'fr' });
    await repos.progress.completeLesson('other-user', 'fr-a1-1', { correct: 6, total: 6 });
    await repos.progress.completeLesson(USER, 'de-a1-1', { correct: 6, total: 6 });
    await engine.sync(USER);
    const remote = db.get(USER)!;
    expect(remote.attempts.every((x) => x.userId === USER)).toBe(true);
    expect(remote.progress.fr).toBeUndefined();
    expect(db.get('other-user')).toBeUndefined();
  });

  it('a denied (expired/unauthorized) session is reported, not retried as success', async () => {
    const { repos, db } = await setup();
    await repos.progress.completeLesson(USER, 'de-a1-1', { correct: 6, total: 6 });
    void db;
    const storage = createMemoryStorage();
    const denied: CloudStore = { fetch: async () => { throw new CloudError('denied'); }, push: async () => undefined, recordMigration: async () => undefined };
    const engine = createSyncEngine({ local: repos.snapshots, cloud: denied, storage, deviceId: 'd' });
    expect(await engine.sync(USER)).toEqual({ status: 'denied' });
  });

  it('unknown lessons from a newer app version are ignored on import, not crashed on', async () => {
    const { repos } = await setup();
    const snap: Snapshot = { ...emptySnapshot(), attempts: [attempt('future', { lessonId: 'de-z9-99' })], reviews: [review('ghost-word', T('2'))] };
    await repos.snapshots.importSnapshot(USER, snap);
    expect(await repos.progress.getAttempts(USER, 'de')).toEqual([]);
    expect(await repos.reviews.get(USER, 'ghost-word')).toBeNull();
  });
});
