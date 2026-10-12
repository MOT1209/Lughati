import { getAIProvider } from './ai';
import { AuthError, MockAuthService, type Session } from './auth';
import { createMockRepositories } from './repositories/mock';

describe('MockAuthService', () => {
  const credentials = { method: 'password' as const, email: 'Sara@Example.com', password: 'password1' };

  it('signs in, exposes the session and notifies listeners', async () => {
    const auth = new MockAuthService(0);
    const seen: (Session | null)[] = [];
    auth.onAuthStateChange((s) => seen.push(s));

    const session = await auth.signIn(credentials);

    expect(session.user.email).toBe('sara@example.com');
    expect(await auth.getSession()).toEqual(session);
    expect(seen).toEqual([session]);
  });

  it('signOut clears the session and notifies with null', async () => {
    const auth = new MockAuthService(0);
    const seen: (Session | null)[] = [];
    await auth.signIn(credentials);
    auth.onAuthStateChange((s) => seen.push(s));

    await auth.signOut();

    expect(await auth.getSession()).toBeNull();
    expect(seen).toEqual([null]);
  });

  it('stops notifying after unsubscribe', async () => {
    const auth = new MockAuthService(0);
    const listener = jest.fn();
    const unsubscribe = auth.onAuthStateChange(listener);
    unsubscribe();
    await auth.signIn(credentials);
    expect(listener).not.toHaveBeenCalled();
  });

  it('signUp keeps the chosen name', async () => {
    const auth = new MockAuthService(0);
    const session = await auth.signUp({ method: 'password', name: 'سارة', email: 'sara@example.com', password: 'password1' });
    expect(session.user.name).toBe('سارة');
  });

  it.each([
    ['fail@example.com', 'invalid_credentials'],
    ['offline@example.com', 'network'],
  ])('scripted failure %s rejects with %s and creates no session', async (email, code) => {
    const auth = new MockAuthService(0);
    await expect(auth.signIn({ method: 'password', email, password: 'password1' })).rejects.toMatchObject({ code });
    expect(await auth.getSession()).toBeNull();
  });

  it('signUp rejects an email that is already taken', async () => {
    const auth = new MockAuthService(0);
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
    expect(lessons.map((l) => l.order)).toEqual([1, 2, 3]);
    expect(lessons.every((l) => l.targetLanguage === code)).toBe(true);
  });

  it('progress points at an existing lesson of the same language', async () => {
    const progress = await repos.progress.get('u1', 'de');
    const lesson = progress?.currentLessonId ? await repos.lessons.getById(progress.currentLessonId) : null;
    expect(lesson?.targetLanguage).toBe('de');
    expect(progress?.levelProgress).toBeGreaterThanOrEqual(0);
    expect(progress?.levelProgress).toBeLessThanOrEqual(1);
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

describe('AI provider registry', () => {
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
