import { useAsyncData } from '@/hooks/useAsyncData';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { Language, LanguageCode, LearningPlan, Lesson, Level, Progress } from '@/types';

export interface CurrentLearning {
  language: Language | null;
  level: Level | null;
  progress: Progress | null;
  plan: LearningPlan;
  lesson: Lesson | null;
}

/** The learner's current target language plus everything Home and Profile show about it. */
export function useCurrentLearning() {
  const user = useAuthStore((s) => s.session?.user ?? null);
  const selected = useLearningStore((s) => s.selectedTarget);
  const code: LanguageCode = selected ?? user?.targetLanguage ?? 'de';
  const userId = user?.id ?? '';

  const result = useAsyncData<CurrentLearning>(async () => {
    const repos = getRepositories();
    const [language, progress, plan] = await Promise.all([
      repos.languages.getByCode(code),
      repos.progress.get(userId, code),
      repos.plans.get(userId, code),
    ]);
    const [level, lesson] = await Promise.all([
      progress ? repos.levels.getById(progress.levelId) : null,
      progress?.currentLessonId ? repos.lessons.getById(progress.currentLessonId) : null,
    ]);
    return { language, level, progress, plan, lesson };
  }, [userId, code]);

  return { user, code, ...result };
}
