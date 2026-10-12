import { languages } from './languages';
import { lessons } from './lessons';
import { createMockUser } from './users';
import { getMockPlan, getMockProgress } from './progress';

const targetCodes = languages.filter((l) => l.roles.includes('target')).map((l) => l.code);

describe('mock data', () => {
  it('gives every target language lessons and progress', () => {
    for (const code of targetCodes) {
      expect(lessons.some((lesson) => lesson.targetLanguage === code)).toBe(true);
      expect(getMockProgress('u1', code)).not.toBeNull();
    }
  });

  it('only references lessons that exist', () => {
    const ids = new Set(lessons.map((lesson) => lesson.id));
    for (const code of targetCodes) {
      const progress = getMockProgress('u1', code);
      for (const id of progress?.completedLessonIds ?? []) expect(ids.has(id)).toBe(true);
      if (progress?.currentLessonId) expect(ids.has(progress.currentLessonId)).toBe(true);
    }
  });

  it('has unique lesson ids', () => {
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length);
  });

  it('does not offer Arabic as a target language yet', () => {
    expect(targetCodes).not.toContain('ar');
    expect(getMockProgress('u1', 'ar')).toBeNull();
  });

  it('builds a learner from an email and falls back to the local part as the name', () => {
    const user = createMockUser({ email: '  Sara@Example.COM ' });
    expect(user.email).toBe('sara@example.com');
    expect(user.name).toBe('sara');
    expect(user.sourceLanguage).toBe('ar');
  });

  it('plans a daily goal for any language', () => {
    expect(getMockPlan('u1', 'de').dailyGoalMinutes).toBeGreaterThan(0);
  });
});
