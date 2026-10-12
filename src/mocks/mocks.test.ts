import { languages } from './languages';
import { lessons } from './lessons';
import { levels } from './levels';
import { getMockPlan, getMockProgress, getMockStreak } from './progress';

const rank = (id: string) => levels.findIndex((level) => level.id === id);
const targets = languages.filter((l) => l.roles.includes('target')).map((l) => l.code);

describe('mock progress consistency', () => {
  it.each(targets)('%s: the learner starts at the first level', (code) => {
    expect(getMockProgress('u1', code)!.levelId).toBe('A1');
  });

  it.each(targets)('%s: level, completed lessons and current lesson agree', (code) => {
    const progress = getMockProgress('u1', code)!;
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const learnerRank = rank(progress.levelId);

    for (const id of progress.completedLessonIds) {
      const lesson = byId.get(id)!;
      expect(lesson.targetLanguage).toBe(code);
      expect(rank(lesson.levelId)).toBeLessThanOrEqual(learnerRank);
    }

    if (progress.currentLessonId !== null) {
      const current = byId.get(progress.currentLessonId)!;
      expect(current.targetLanguage).toBe(code);
      expect(rank(current.levelId)).toBeLessThanOrEqual(learnerRank);
      expect(progress.completedLessonIds).not.toContain(current.id);
    }
  });

  it.each(targets)('%s: a level above the lessons that exist means all of them are done', (code) => {
    const progress = getMockProgress('u1', code)!;
    const own = lessons.filter((lesson) => lesson.targetLanguage === code);
    const highest = Math.max(...own.map((lesson) => rank(lesson.levelId)));
    if (rank(progress.levelId) > highest) {
      expect(progress.completedLessonIds.sort()).toEqual(own.map((lesson) => lesson.id).sort());
      expect(progress.currentLessonId).toBeNull();
    }
  });

  it.each(targets)('%s: level progress matches completed lessons of that level', (code) => {
    const progress = getMockProgress('u1', code)!;
    const atLevel = lessons.filter((l) => l.targetLanguage === code && l.levelId === progress.levelId);
    const done = atLevel.filter((l) => progress.completedLessonIds.includes(l.id)).length;
    const expected = atLevel.length === 0 ? 0 : done / atLevel.length;
    expect(progress.levelProgress).toBeCloseTo(expected, 2);
  });

});

describe('streak', () => {
  it('belongs to the user, not to a language', () => {
    expect(getMockStreak('u1')).toEqual({ userId: 'u1', days: expect.any(Number) });
    for (const code of targets) {
      expect(getMockProgress('u1', code)).not.toHaveProperty('streakDays');
    }
  });
});

describe('language data', () => {
  it('has a plan for every target language', () => {
    for (const code of targets) expect(getMockPlan('u1', code).dailyGoalMinutes).toBeGreaterThan(0);
  });

  it('carries no country flags (a flag is a country, not a language)', () => {
    for (const language of languages) expect(language).not.toHaveProperty('flag');
  });
});
