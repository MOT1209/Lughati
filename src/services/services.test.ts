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
    expect(lessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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
    expect(progress?.currentLessonId).toBe('de-a1-4');
    expect((await restarted.plans.get('u1', 'de')).minutesToday).toBeGreaterThan(9);
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

  it('ignores a corrupt or foreign saved blob and falls back to the seed data', async () => {
    for (const blob of ['{not json', '[]', '"text"', '{"progress":1,"plans":{}}']) {
      const storage = createMemoryStorage();
      await storage.setItem(STORAGE_KEYS.learningProgress, blob);
      const progress = await createMockRepositories({ storage }).progress.get('u1', 'de');
      expect(progress?.completedLessonIds).toEqual(['de-a1-1', 'de-a1-2']);
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

    expect((await createMockRepositories({ storage, now: evening }).plans.get('u1', 'de')).minutesToday).toBeGreaterThan(9);
    expect((await createMockRepositories({ storage, now: afterMidnight }).plans.get('u1', 'de')).minutesToday).toBe(0);
  });

  it('discards a saved progress entry with an unknown level instead of failing every later save', async () => {
    const storage = createMemoryStorage();
    const bad = { userId: 'u1', targetLanguage: 'de', levelId: 'Z9', completedLessonIds: [], currentLessonId: null, levelProgress: 0, totalXp: 0, wordsLearned: 0, minutesLearned: 0 };
    await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify({ progress: { 'u1:de': bad, 'u1:fr': 'junk' }, plans: { 'u1:de': 5 } }));

    const repos = createMockRepositories({ storage });
    expect((await repos.progress.get('u1', 'de'))?.levelId).toBe('A1');
    expect((await repos.progress.get('u1', 'fr'))?.completedLessonIds).toEqual(['fr-a1-1']);
    expect((await repos.plans.get('u1', 'de')).dailyGoalMinutes).toBe(15);
    await expect(repos.progress.completeLesson('u1', 'de-a1-3', result)).resolves.toBeDefined();
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
