import { useAsyncData } from '@/hooks/useAsyncData';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { Language, LanguageCode, LearningPlan, Lesson, LessonAttempt, Level, Progress, Streak } from '@/types';

export interface CurrentLearning {
  language: Language | null;
  level: Level | null;
  progress: Progress | null;
  plan: LearningPlan;
  /** Null when the learner has no lesson in progress. */
  lesson: Lesson | null;
  streak: Streak;
  /** Recorded runs for the language, oldest first — the input the recommendation rules read. */
  attempts: LessonAttempt[];
  /** Vocabulary items due for review right now. */
  dueVocabulary: number;
  /** Lessons of the language, so the unit rule can fire only when real units exist. */
  lessons: Lesson[];
}

/** The learner's current target language plus everything Home and Profile show about it. */
export function useCurrentLearning() {
  const user = useAuthStore((s) => s.session?.user ?? null);
  const chosen = useLearningStore((s) => s.profile?.target);
  const progressVersion = useLearningStore((s) => s.progressVersion);
  const code: LanguageCode = chosen ?? user?.targetLanguage ?? 'de';
  const userId = user?.id ?? '';

  const result = useAsyncData<CurrentLearning>(async () => {
    const repos = getRepositories();
    const [language, progress, plan, streak] = await Promise.all([
      repos.languages.getByCode(code),
      repos.progress.get(userId, code),
      repos.plans.get(userId, code),
      repos.progress.getStreak(userId),
    ]);
    const [level, lesson] = await Promise.all([
      progress ? repos.levels.getById(progress.levelId) : null,
      progress?.currentLessonId ? repos.lessons.getById(progress.currentLessonId) : null,
    ]);
    const [lessons, attempts, due] = userId
      ? await Promise.all([
          repos.lessons.getByLanguage(code),
          repos.progress.getAttempts(userId, code),
          repos.reviews.getDue(userId, code),
        ])
      : [[], [], []];
    return { language, level, progress, plan, lesson, streak, attempts, dueVocabulary: due.length, lessons };
  }, [userId, code, progressVersion]);

  return { user, code, ...result };
}
