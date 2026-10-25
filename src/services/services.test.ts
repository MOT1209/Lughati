import { getAIProvider, registerAIProvider } from './ai';
import { AuthError, MockAuthService, type Session } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/app';

import { getRepositories } from './repositories';
import { createMockRepositories } from './repositories/mock';
import { createMemoryStorage } from './storage';

describe('MockAuthService', () => {
  const credentials = { method: 'password' as const, email: 'Sara@Example.com', password: 'password1' };

  it('signs in, exposes the session and notifies listeners', async () => {
    const auth = new MockAuthService(0, createMemoryStorage());
    const seen: (Session | null)[] = [];
    auth.onAuthStateChange((s) => seen.push(s));

    const session = await auth.signIn(credentials);

    expect(session.user.email).toBe('sara@example.com');
    expect(await auth.getSession()).toEqual(session);
    expect(seen).toEqual([session]);
  });

  it('signOut clears the session and notifies with null', async () => {
    const auth = new MockAuthService(0, createMemoryStorage());
    const seen: (Session | null)[] = [];
    await auth.signIn(credentials);
    auth.onAuthStateChange((s) => seen.push(s));

    await auth.signOut();

    expect(await auth.getSession()).toBeNull();
    expect(seen).toEqual([null]);
  });

  it('stops notifying after unsubscribe', async () => {
    const auth = new MockAuthService(0, createMemoryStorage());
    const listener = jest.fn();
    const unsubscribe = auth.onAuthStateChange(listener);
    unsubscribe();
    await auth.signIn(credentials);
    expect(listener).not.toHaveBeenCalled();
  });

  it('signUp keeps the chosen name', async () => {
    const auth = new MockAuthService(0, createMemoryStorage());
    const session = await auth.signUp({ method: 'password', name: 'سارة', email: 'sara@example.com', password: 'password1' });
    expect(session.user.name).toBe('سارة');
  });

  it.each([
    ['fail@example.com', 'invalid_credentials'],
    ['offline@example.com', 'network'],
  ])('scripted failure %s rejects with %s and creates no session', async (email, code) => {
    const auth = new MockAuthService(0, createMemoryStorage());
    await expect(auth.signIn({ method: 'password', email, password: 'password1' })).rejects.toMatchObject({ code });
    expect(await auth.getSession()).toBeNull();
  });

  it('signUp rejects an email that is already taken', async () => {
    const auth = new MockAuthService(0, createMemoryStorage());
    const attempt = auth.signUp({ method: 'password', name: 'X', email: 'taken@example.com', password: 'password1' });
    await expect(attempt).rejects.toBeInstanceOf(AuthError);
    await expect(attempt).rejects.toMatchObject({ code: 'email_in_use' });
  });
});

describe('mock repositories', () => {
  const repos = createMockRepositories();

  it('offers the five required target languages plus Arabic', async () => {
    const codes = (await repos.languages.getTargets()).map((l) => l.code).sort();
    expect(codes).toEqual(['ar', 'de', 'en', 'es', 'fr', 'tr']);
  });

  it('Arabic is both a source and a target language', async () => {
    const arabic = await repos.languages.getByCode('ar');
    expect(arabic?.roles).toEqual(['source', 'target']);
    expect(arabic?.direction).toBe('rtl');
  });

  it.each(['ar', 'de'] as const)('returns lessons in order for %s', async (code) => {
    const lessons = await repos.lessons.getByLanguage(code);
    // Taken by level, then position: A1 1–10, then A2 1–10 (never interleaved).
    const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(lessons.map((l) => `${l.levelId}-${l.order}`)).toEqual([...positions.map((n) => `A1-${n}`), ...positions.map((n) => `A2-${n}`)]);
    expect(lessons.every((l) => l.targetLanguage === code)).toBe(true);
  });

  it('progress points at an existing lesson of the same language', async () => {
    const progress = await repos.progress.get('u1', 'de');
    const lesson = progress?.currentLessonId ? await repos.lessons.getById(progress.currentLessonId) : null;
    expect(lesson?.targetLanguage).toBe('de');
    expect(progress?.levelProgress).toBeGreaterThanOrEqual(0);
    expect(progress?.levelProgress).toBeLessThanOrEqual(1);
  });

  it('returns one streak per user, independent of the language', async () => {
    const streak = await repos.progress.getStreak('u1');
    expect(streak.userId).toBe('u1');
    expect(streak.days).toBeGreaterThanOrEqual(0);
    expect(await repos.progress.getStreak('u1')).toEqual(streak);
  });

  it('has a daily goal for every target language', async () => {
    for (const code of ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const) {
      const plan = await repos.plans.get('u1', code);
      expect(plan.dailyGoalMinutes).toBeGreaterThan(0);
      expect(plan.minutesToday).toBeGreaterThanOrEqual(0);
    }
  });

  it('every target language has a progress record', async () => {
    for (const language of await repos.languages.getTargets()) {
      expect((await repos.progress.get('u1', language.code))?.targetLanguage).toBe(language.code);
    }
  });

  it('every level referenced by progress exists', async () => {
    for (const code of ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const) {
      const progress = await repos.progress.get('u1', code);
      expect(await repos.levels.getById(progress!.levelId)).not.toBeNull();
    }
  });
});

describe('lesson content and completion', () => {
  it('serves vocabulary and exercises for a lesson and none for an unknown one', async () => {
    const repos = createMockRepositories();
    expect((await repos.lessons.getVocabulary('fr-a1-3')).length).toBeGreaterThanOrEqual(4);
    expect((await repos.lessons.getExercises('fr-a1-3')).length).toBeGreaterThan(0);
    expect(await repos.lessons.getExercises('nope')).toEqual([]);
  });

  it('completeLesson updates progress and study time, and is isolated per repository instance', async () => {
    const repos = createMockRepositories();
    const other = createMockRepositories();
    const planBefore = await repos.plans.get('u1', 'de');

    const updated = await repos.progress.completeLesson('u1', 'de-a1-3', { correct: 8, total: 10 });

    expect(updated.completedLessonIds).toContain('de-a1-3');
    expect(await repos.progress.get('u1', 'de')).toEqual(updated);
    expect((await repos.plans.get('u1', 'de')).minutesToday).toBeGreaterThan(planBefore.minutesToday);
    expect((await other.progress.get('u1', 'de'))!.completedLessonIds).not.toContain('de-a1-3');
  });

  it('rejects an unknown lesson', async () => {
    const repos = createMockRepositories();
    await expect(repos.progress.completeLesson('u1', 'nope', { correct: 1, total: 1 })).rejects.toThrow();
  });
});

describe('progress persistence', () => {
  const day1 = () => new Date('2026-10-12T10:00:00Z');
  const day2 = () => new Date('2026-10-13T10:00:00Z');
  const result = { correct: 10, total: 12 };

  it('survives an app restart: a new repository on the same storage sees the finished lesson', async () => {
    const storage = createMemoryStorage();
    await createMockRepositories({ storage, now: day1 }).progress.completeLesson('u1', 'de-a1-3', result);

    const restarted = createMockRepositories({ storage, now: day1 });
    const progress = await restarted.progress.get('u1', 'de');
    expect(progress?.completedLessonIds).toContain('de-a1-3');
    expect(progress?.totalXp).toBeGreaterThan(0);
    expect((await restarted.plans.get('u1', 'de')).minutesToday).toBeGreaterThan(0);
  });

  it('keeps users separate', async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage });
    await repos.progress.completeLesson('u1', 'de-a1-3', result);
    expect((await repos.progress.get('u2', 'de'))!.completedLessonIds).not.toContain('de-a1-3');
  });

  it('keeps progress but resets today\'s study minutes on a new day', async () => {
    const storage = createMemoryStorage();
    await createMockRepositories({ storage, now: day1 }).progress.completeLesson('u1', 'de-a1-3', result);

    const nextDay = createMockRepositories({ storage, now: day2 });
    expect((await nextDay.progress.get('u1', 'de'))!.completedLessonIds).toContain('de-a1-3');
    expect((await nextDay.plans.get('u1', 'de')).minutesToday).toBe(0);
  });

  it('resumes at the first new lesson when content is added after the learner finished everything', async () => {
    // Saved before A2 shipped: all of A1 done, level already A2, nothing left to take back then.
    const a1 = Array.from({ length: 10 }, (_, i) => `de-a1-${i + 1}`);
    const saved = {
      userId: 'u1', targetLanguage: 'de', levelId: 'A2', completedLessonIds: a1, currentLessonId: null,
      levelProgress: 0, totalXp: 900, wordsLearned: 60, minutesLearned: 50,
    };
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify({ progress: { 'u1:de': saved }, plans: {} }));

    const progress = await createMockRepositories({ storage }).progress.get('u1', 'de');
    expect(progress?.currentLessonId).toBe('de-a2-1');
    expect(progress?.completedLessonIds).toEqual(a1);
  });

  it('ignores a corrupt or foreign saved blob and falls back to the seed data', async () => {
    for (const blob of ['{not json', '[]', '"text"', '{"progress":1,"plans":{}}']) {
      const storage = createMemoryStorage();
      await storage.setItem(STORAGE_KEYS.learningProgress, blob);
      const progress = await createMockRepositories({ storage }).progress.get('u1', 'de');
      expect(progress?.completedLessonIds).toEqual([]);
      expect(progress?.currentLessonId).toBe('de-a1-1');
    }
  });

  it('does not change anything when the write fails, so a retry starts from the same state', async () => {
    const storage = createMemoryStorage();
    let fail = true;
    const flaky = {
      getItem: storage.getItem,
      removeItem: storage.removeItem,
      setItem: async (k: string, v: string) => {
        if (fail) throw new Error('disk full');
        return storage.setItem(k, v);
      },
    };
    const repos = createMockRepositories({ storage: flaky });

    await expect(repos.progress.completeLesson('u1', 'de-a1-3', result)).rejects.toThrow('disk full');
    expect((await repos.progress.get('u1', 'de'))!.completedLessonIds).not.toContain('de-a1-3');

    fail = false;
    await expect(repos.progress.completeLesson('u1', 'de-a1-3', result)).resolves.toBeTruthy();
    expect((await repos.progress.get('u1', 'de'))!.completedLessonIds).toContain('de-a1-3');
  });

  it('keeps both results when two lessons finish at the same time', async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage });
    await Promise.all([
      repos.progress.completeLesson('u1', 'de-a1-3', result),
      repos.progress.completeLesson('u1', 'de-a1-4', result),
    ]);
    const restarted = await createMockRepositories({ storage }).progress.get('u1', 'de');
    expect(restarted!.completedLessonIds).toEqual(expect.arrayContaining(['de-a1-3', 'de-a1-4']));
  });
});

describe('app wiring', () => {
  it('the registered repositories save to device storage (AsyncStorage)', async () => {
    await getRepositories().progress.completeLesson('wired-user', 'es-a1-1', { correct: 12, total: 12 });
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.learningProgress);
    expect(JSON.parse(raw!).progress['wired-user:es'].completedLessonIds).toContain('es-a1-1');
  });
});

describe('AI provider registry', () => {
  it('registers an additional provider and lets it become the default', async () => {
    const custom = { id: 'custom', reply: jest.fn() };
    registerAIProvider(custom);
    expect(getAIProvider('custom')).toBe(custom);
    expect(getAIProvider().id).toBe('mock'); // registering does not change the default
    registerAIProvider(custom, { makeDefault: true });
    expect(getAIProvider()).toBe(custom);
    registerAIProvider(getAIProvider('mock'), { makeDefault: true }); // restore for other tests
  });

  it('resolves the default mock provider without screens importing it', async () => {
    const provider = getAIProvider();
    expect(provider.id).toBe('mock');
    const reply = await provider.reply({ id: 'c1', userId: 'u1', targetLanguage: 'de', messages: [] }, 'Hallo');
    expect(reply.role).toBe('assistant');
  });

  it('throws for an unknown provider', () => {
    expect(() => getAIProvider('nope')).toThrow(/not registered/);
  });
});

describe('MockAuthService session persistence', () => {
  const credentials = { method: 'password' as const, email: 'sara@example.com', password: 'password1' };

  it('restores the saved session in a new instance (app restart)', async () => {
    const storage = createMemoryStorage();
    await new MockAuthService(0, storage).signIn(credentials);

    const restored = await new MockAuthService(0, storage).getSession();
    expect(restored?.user.email).toBe('sara@example.com');
  });

  it('forgets the session after sign out', async () => {
    const storage = createMemoryStorage();
    const auth = new MockAuthService(0, storage);
    await auth.signIn(credentials);
    await auth.signOut();

    await expect(new MockAuthService(0, storage).getSession()).resolves.toBeNull();
  });

  it.each(['not json', '{"user":1}', 'null'])('treats corrupt stored data (%s) as signed out', async (raw) => {
    const storage = createMemoryStorage();
    await storage.setItem('lughati.session.v1', raw);
    await expect(new MockAuthService(0, storage).getSession()).resolves.toBeNull();
  });

  it('survives a storage that throws', async () => {
    const fail = async () => {
      throw new Error('disk');
    };
    const broken = { getItem: fail, setItem: fail, removeItem: fail };
    const auth = new MockAuthService(0, broken);
    await expect(auth.getSession()).resolves.toBeNull();
    await expect(auth.signIn(credentials)).resolves.toMatchObject({ user: { email: 'sara@example.com' } });
    await expect(auth.getSession()).resolves.not.toBeNull();
  });
});

describe('Phase 1 stabilization regressions', () => {
  const result = { correct: 10, total: 12 };

  it('study minutes reset at local midnight, not at UTC midnight', async () => {
    // Simulates a device in UTC+3 (the process time zone cannot be changed from inside a test).
    class RiyadhDate extends Date {
      private shifted = () => new Date(this.getTime() + 3 * 3600_000);
      getFullYear = () => this.shifted().getUTCFullYear();
      getMonth = () => this.shifted().getUTCMonth();
      getDate = () => this.shifted().getUTCDate();
    }
    const storage = createMemoryStorage();
    const evening = () => new RiyadhDate('2026-10-12T20:00:00Z'); // 23:00 local on the 12th
    const afterMidnight = () => new RiyadhDate('2026-10-12T22:00:00Z'); // 01:00 local on the 13th, still the 12th in UTC
    await createMockRepositories({ storage, now: evening }).progress.completeLesson('u1', 'de-a1-3', result);

    expect((await createMockRepositories({ storage, now: evening }).plans.get('u1', 'de')).minutesToday).toBeGreaterThan(0);
    expect((await createMockRepositories({ storage, now: afterMidnight }).plans.get('u1', 'de')).minutesToday).toBe(0);
  });

  it('discards a saved progress entry with an unknown level instead of failing every later save', async () => {
    const storage = createMemoryStorage();
    const bad = { userId: 'u1', targetLanguage: 'de', levelId: 'Z9', completedLessonIds: [], currentLessonId: null, levelProgress: 0, totalXp: 0, wordsLearned: 0, minutesLearned: 0 };
    await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify({ progress: { 'u1:de': bad, 'u1:fr': 'junk' }, plans: { 'u1:de': 5 } }));

    const repos = createMockRepositories({ storage });
    expect((await repos.progress.get('u1', 'de'))?.levelId).toBe('A1');
    expect((await repos.progress.get('u1', 'fr'))?.completedLessonIds).toEqual([]);
    expect((await repos.plans.get('u1', 'de')).dailyGoalMinutes).toBe(15);
    await expect(repos.progress.completeLesson('u1', 'de-a1-3', result)).resolves.toBeDefined();
  });

  it('starts a new account with honest, empty progress: no invented XP, minutes or streak', async () => {
    const repos = createMockRepositories();
    for (const code of ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const) {
      expect(await repos.progress.get('new', code)).toMatchObject({ completedLessonIds: [], currentLessonId: `${code}-a1-1`, totalXp: 0, minutesLearned: 0 });
      expect((await repos.plans.get('new', code)).minutesToday).toBe(0);
    }
    expect((await repos.progress.getStreak('new')).days).toBe(0);
  });

  it("remembers each account's own and target language and ignores corrupt saved choices", async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage });
    expect(await repos.profiles.get('u1')).toBeNull();
    await repos.profiles.set('u1', { source: 'de', target: 'es' });
    expect(await createMockRepositories({ storage }).profiles.get('u1')).toEqual({ source: 'de', target: 'es' });
    expect(await repos.profiles.get('u2')).toBeNull();
    await expect(repos.profiles.set('u1', { source: 'de', target: 'de' })).rejects.toThrow();

    await storage.setItem(STORAGE_KEYS.learningProfile, JSON.stringify({ u1: { source: 'xx', target: 'de' }, u2: { source: 'tr', target: 'ar' } }));
    expect(await repos.profiles.get('u1')).toBeNull();
    expect(await repos.profiles.get('u2')).toEqual({ source: 'tr', target: 'ar' });
    await storage.setItem(STORAGE_KEYS.learningProfile, '{not json');
    expect(await repos.profiles.get('u2')).toBeNull();
  });

  it("offers every language as the learner's own language", async () => {
    const codes = (await createMockRepositories().languages.getSources()).map((l) => l.code).sort();
    expect(codes).toEqual(['ar', 'de', 'en', 'es', 'fr', 'tr']);
  });

  it('signOut resolves only after the stored session is gone', async () => {
    const inner = createMemoryStorage();
    let removed = false;
    const slow = {
      ...inner,
      removeItem: async (key: string) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await inner.removeItem(key);
        removed = true;
      },
    };
    const auth = new MockAuthService(0, slow);
    await auth.signIn({ method: 'password', email: 'sara@example.com', password: 'password1' });
    await auth.signOut();
    expect(removed).toBe(true);
    await expect(new MockAuthService(0, inner).getSession()).resolves.toBeNull();
  });
});

describe('Phase 1 final verification: auth persistence', () => {
  const credentials = { method: 'password' as const, email: 'sara@example.com', password: 'password1' };
  const storedSession = (patch: Record<string, unknown> = {}, userPatch: Record<string, unknown> = {}) =>
    JSON.stringify({
      user: { id: 'user-sara@example.com', name: 'Sara', email: 'sara@example.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-09-01T09:00:00.000Z', ...userPatch },
      issuedAt: '2026-10-01T10:00:00.000Z',
      ...patch,
    });

  it('signOut ends the session for this run but REJECTS when the stored copy could not be removed', async () => {
    const inner = createMemoryStorage();
    const broken = { ...inner, removeItem: async () => { throw new Error('disk'); } };
    const auth = new MockAuthService(0, broken);
    const seen: (Session | null)[] = [];
    auth.onAuthStateChange((s) => seen.push(s));
    await auth.signIn(credentials);

    await expect(auth.signOut()).rejects.toMatchObject({ code: 'sign_out_not_persisted' });
    await expect(auth.getSession()).resolves.toBeNull(); // protected routes close right away
    expect(seen.at(-1)).toBeNull();
    // ...and the stored session really is still there, which is exactly what the error reports.
    await expect(new MockAuthService(0, inner).getSession()).resolves.not.toBeNull();
  });

  it('accepts a well-formed stored session', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.session, storedSession());
    await expect(new MockAuthService(0, storage).getSession()).resolves.toMatchObject({ user: { email: 'sara@example.com' } });
  });

  it.each([
    ['an id that does not belong to the email', {}, { id: 'user-someone-else@example.com' }],
    ['an unsupported language', {}, { targetLanguage: 'xx' }],
    ['an empty email', {}, { email: '', id: 'user-' }],
    ['a non-normalized email', {}, { email: 'Sara@Example.com' }],
    ['a missing name', {}, { name: undefined }],
    ['an unparsable timestamp', { issuedAt: 'yesterday' }, {}],
  ])('ignores a stored session with %s', async (_name, patch, userPatch) => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.session, storedSession(patch, userPatch));
    await expect(new MockAuthService(0, storage).getSession()).resolves.toBeNull();
  });
});

describe('pass mark in the repositories', () => {
  const day = () => new Date(2026, 9, 15, 12, 0);

  it('a failed run is recorded as an attempt that did not complete the lesson', async () => {
    const repos = createMockRepositories({ now: day });
    const after = await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 3, total: 12 });

    expect(after.completedLessonIds).toEqual([]);
    expect(after.currentLessonId).toBe('de-a1-1');
    const [attempt] = await repos.progress.getAttempts('u1', 'de');
    expect(attempt).toMatchObject({ lessonId: 'de-a1-1', completed: false, result: { correct: 3, total: 12 } });
    const today = await repos.activity.getDay('u1', '2026-10-15');
    expect(today).toMatchObject({ lessonsCompleted: 0, xp: 30, correctAnswers: 3 });
  });

  it('a passed run completes the lesson once and counts it in the day', async () => {
    const repos = createMockRepositories({ now: day });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 3, total: 12 });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 10, total: 12 });

    expect((await repos.progress.get('u1', 'de'))?.completedLessonIds).toEqual(['de-a1-1']);
    const attempts = await repos.progress.getAttempts('u1', 'de');
    expect(attempts.map((a) => a.completed)).toEqual([false, true]);
    expect(await repos.activity.getDay('u1', '2026-10-15')).toMatchObject({ lessonsCompleted: 1, xp: 30 + 120 });
  });
});

describe('a passed lesson feeds the vocabulary review', () => {
  let clock = new Date(2026, 9, 15, 12, 0);
  const now = () => clock;
  const tomorrow = () => new Date(2026, 9, 16, 12, 0);
  beforeEach(() => {
    clock = new Date(2026, 9, 15, 12, 0);
  });

  it("schedules the lesson's words for review one day later", async () => {
    const repos = createMockRepositories({ now });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });

    expect(await repos.reviews.getDue('u1', 'de')).toEqual([]); // nothing due on the same day
    const due = await repos.reviews.getDue('u1', 'de', tomorrow());
    expect(due).toHaveLength(6);
    expect(due[0]).toMatchObject({ userId: 'u1', targetLanguage: 'de', step: 0, lastReviewedAt: null, correctCount: 0, wrongCount: 0 });
    expect(due.every((state) => state.wordId.startsWith('de-a1-1'))).toBe(true);
    expect(await repos.reviews.getDue('u2', 'de', tomorrow())).toEqual([]); // per user
  });

  it('a word is due from the start of its local day, not the hour of the lesson', async () => {
    clock = new Date(2026, 9, 15, 22, 0); // lesson late in the evening
    const repos = createMockRepositories({ now });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });

    expect(await repos.reviews.getDue('u1', 'de', new Date(2026, 9, 15, 23, 59))).toEqual([]); // still the same day
    expect(await repos.reviews.getDue('u1', 'de', new Date(2026, 9, 16, 0, 5))).toHaveLength(6); // just after local midnight
    expect(await repos.reviews.getDue('u1', 'de', new Date(2026, 9, 16, 7, 0))).toHaveLength(6); // next morning
  });

  it('getDue follows the injected clock by default', async () => {
    const repos = createMockRepositories({ now });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    clock = tomorrow();
    expect(await repos.reviews.getDue('u1', 'de')).toHaveLength(6);
  });

  it('a failed run schedules nothing', async () => {
    const repos = createMockRepositories({ now });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 2, total: 12 });
    expect(await repos.reviews.getDue('u1', 'de', tomorrow())).toEqual([]);
  });

  it('a replay keeps the review progress of words already scheduled', async () => {
    const repos = createMockRepositories({ now });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    clock = tomorrow();
    const [first] = await repos.reviews.getDue('u1', 'de');
    const reviewed = await repos.reviews.recordReview('u1', 'de', first!.wordId, 'good');

    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    expect(await repos.reviews.get('u1', first!.wordId)).toEqual(reviewed);
  });

  it('the scheduled words survive a restart and validate on read', async () => {
    const storage = createMemoryStorage();
    await createMockRepositories({ storage, now }).progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    expect(await createMockRepositories({ storage, now }).reviews.getDue('u1', 'de', tomorrow())).toHaveLength(6);
  });

  it('a retry after a failed progress write completes the lesson without duplicating reviews', async () => {
    const storage = createMemoryStorage();
    let failProgress = true;
    const flaky = {
      getItem: storage.getItem,
      removeItem: storage.removeItem,
      setItem: async (k: string, v: string) => {
        if (failProgress && k === STORAGE_KEYS.learningProgress) throw new Error('disk full');
        return storage.setItem(k, v);
      },
    };
    const repos = createMockRepositories({ storage: flaky, now });

    await expect(repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 })).rejects.toThrow('disk full');
    failProgress = false;
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });

    expect((await repos.progress.get('u1', 'de'))!.completedLessonIds).toEqual(['de-a1-1']);
    expect(await repos.reviews.getDue('u1', 'de', tomorrow())).toHaveLength(6);
  });
});

describe('streak activity from reviews', () => {
  const day = () => new Date(2026, 9, 18, 10, 0);

  it('a review on a day without a lesson keeps the streak, without inventing minutes, XP or a completion', async () => {
    const repos = createMockRepositories({ now: day });
    await repos.reviews.recordReview('u1', 'de', 'de-a1-1-w1', 'good');

    expect((await repos.progress.getStreak('u1')).days).toBe(1);
    expect(await repos.activity.getDay('u1', '2026-10-18')).toMatchObject({ minutes: 0, xp: 0, lessonsCompleted: 0, correctAnswers: 1 });
  });

  it('a forgotten word still counts as a study day but not as a correct answer', async () => {
    const repos = createMockRepositories({ now: day });
    await repos.reviews.recordReview('u1', 'de', 'de-a1-1-w1', 'again');
    expect(await repos.activity.getDay('u1', '2026-10-18')).toMatchObject({ correctAnswers: 0 });
    expect((await repos.progress.getStreak('u1')).days).toBe(1);
  });

  it('the review activity survives a restart and adds to the same day as a lesson', async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage, now: day });
    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    await repos.reviews.recordReview('u1', 'de', 'de-a1-1-w1', 'easy');

    const restarted = createMockRepositories({ storage, now: day });
    expect(await restarted.activity.getDay('u1', '2026-10-18')).toMatchObject({ lessonsCompleted: 1, correctAnswers: 13 });
    expect((await restarted.progress.get('u1', 'de'))?.completedLessonIds).toEqual(['de-a1-1']);
  });

  it('a practice game run is not a study day for the streak', async () => {
    const repos = createMockRepositories({ now: day });
    await repos.progress.recordAttempt('u1', 'de-a1-1', { correct: 6, total: 6 });
    expect((await repos.progress.getStreak('u1')).days).toBe(0);
  });
});
