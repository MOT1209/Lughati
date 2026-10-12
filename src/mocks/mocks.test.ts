import { createMockRepositories } from '@/services/repositories/mock';
import type { LevelId } from '@/types';

const repos = createMockRepositories();
const levelOrder: LevelId[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const rank = (id: LevelId) => levelOrder.indexOf(id);

describe('mock data consistency', () => {
  it('has progress for every target language and none for Arabic', async () => {
    const targets = await repos.languages.getTargets();
    for (const language of targets) {
      await expect(repos.progress.get('u1', language.code)).resolves.not.toBeNull();
    }
    await expect(repos.progress.get('u1', 'ar')).resolves.toBeNull();
  });

  it('only completes lessons that exist, in the same language', async () => {
    for (const { code } of await repos.languages.getTargets()) {
      const progress = (await repos.progress.get('u1', code))!;
      for (const id of progress.completedLessonIds) {
        const lesson = await repos.lessons.getById(id);
        expect(lesson?.targetLanguage).toBe(code);
      }
    }
  });

  it('a level above A1 means every lesson of the lower levels is completed', async () => {
    for (const { code } of await repos.languages.getTargets()) {
      const progress = (await repos.progress.get('u1', code))!;
      const lower = (await repos.lessons.getByLanguage(code)).filter((l) => rank(l.levelId) < rank(progress.levelId));
      for (const lesson of lower) {
        expect(progress.completedLessonIds).toContain(lesson.id);
      }
    }
  });

  it('never completes a lesson above the learner level', async () => {
    for (const { code } of await repos.languages.getTargets()) {
      const progress = (await repos.progress.get('u1', code))!;
      for (const id of progress.completedLessonIds) {
        const lesson = (await repos.lessons.getById(id))!;
        expect(rank(lesson.levelId)).toBeLessThanOrEqual(rank(progress.levelId));
      }
    }
  });

  it('the current lesson is not completed and is not above the learner level', async () => {
    for (const { code } of await repos.languages.getTargets()) {
      const progress = (await repos.progress.get('u1', code))!;
      if (progress.currentLessonId === null) continue;
      const lesson = (await repos.lessons.getById(progress.currentLessonId))!;
      expect(lesson.targetLanguage).toBe(code);
      expect(rank(lesson.levelId)).toBeLessThanOrEqual(rank(progress.levelId));
      expect(progress.completedLessonIds).not.toContain(lesson.id);
    }
  });

  it('keeps at least one language with no current lesson so Home handles that state', async () => {
    const states = await Promise.all((await repos.languages.getTargets()).map((l) => repos.progress.get('u1', l.code)));
    expect(states.some((p) => p?.currentLessonId === null)).toBe(true);
  });

  it('numbers lessons continuously within a language, across levels', async () => {
    const german = await repos.lessons.getByLanguage('de');
    expect(german.map((l) => l.order)).toEqual(german.map((_, index) => index + 1));
    expect(german.map((l) => l.levelId)).toEqual([...german.map((l) => l.levelId)].sort((a, b) => rank(a) - rank(b)));
  });

  it('keeps the streak at user level, independent of the language', async () => {
    const streak = await repos.streaks.get('u1');
    expect(streak).toEqual({ userId: 'u1', days: expect.any(Number) });
    const progress = (await repos.progress.get('u1', 'de'))!;
    expect(progress).not.toHaveProperty('streakDays');
  });

  it('every level referenced by lessons exists', async () => {
    const ids = (await repos.levels.getAll()).map((l) => l.id);
    for (const { code } of await repos.languages.getTargets()) {
      for (const lesson of await repos.lessons.getByLanguage(code)) expect(ids).toContain(lesson.levelId);
    }
  });
});
