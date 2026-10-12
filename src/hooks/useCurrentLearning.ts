import { useMemo } from 'react';

import { useAsyncData } from '@/hooks/useAsyncData';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useCompletionStore } from '@/store/completionStore';
import { useLearningStore } from '@/store/learningStore';
import type { Language, LanguageCode, LearningPlan, Lesson, Level, Progress, Streak } from '@/types';
import { applyCompletions } from '@/utils/progress';

export interface CurrentLearning {
  language: Language | null;
  level: Level | null;
  progress: Progress | null;
  streak: Streak;
  plan: LearningPlan;
  /** All lessons of the language, ordered. */
  lessons: Lesson[];
  /** The lesson to continue, or null when there is none. */
  lesson: Lesson | null;
}

/** The learner's current target language plus everything Home, Learn and Profile show about it. */
export function useCurrentLearning() {
  const user = useAuthStore((s) => s.session?.user ?? null);
  const selected = useLearningStore((s) => s.selectedTarget);
  const code: LanguageCode = selected ?? user?.targetLanguage ?? 'de';
  const userId = user?.id ?? '';
  const results = useCompletionStore((s) => s.byUser[userId]);

  const loaded = useAsyncData(async () => {
    const repos = getRepositories();
    const [language, progress, streak, plan, lessons] = await Promise.all([
      repos.languages.getByCode(code),
      repos.progress.get(userId, code),
      repos.streaks.get(userId),
      repos.plans.get(userId, code),
      repos.lessons.getByLanguage(code),
    ]);
    const level = progress ? await repos.levels.getById(progress.levelId) : null;
    return { language, level, progress, streak, plan, lessons };
  }, [userId, code]);

  // Local results are applied after loading, so finishing a lesson updates screens instantly.
  const data = useMemo<CurrentLearning | null>(() => {
    if (loaded.status !== 'success') return null;
    const { progress, lessons, ...rest } = loaded.data;
    const merged = progress ? applyCompletions(progress, lessons, results ?? {}) : null;
    const lesson = lessons.find((l) => l.id === merged?.currentLessonId) ?? null;
    return { ...rest, progress: merged, lessons, lesson };
  }, [loaded, results]);

  const reload = loaded.reload;
  if (loaded.status === 'success' && data) return { user, code, status: 'success' as const, data, reload };
  if (loaded.status === 'error') return { user, code, status: 'error' as const, reload };
  return { user, code, status: 'loading' as const, reload };
}
