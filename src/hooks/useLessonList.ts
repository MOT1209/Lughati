import { useAsyncData } from '@/hooks/useAsyncData';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { LanguageCode, Language, Lesson, Level, Progress } from '@/types';

export interface LessonList {
  language: Language | null;
  /** In the order they are taken: by level, then position. */
  lessons: Lesson[];
  progress: Progress | null;
  levels: Level[];
}

/** Lessons of the learner's current target language together with their progress. */
export function useLessonList() {
  const user = useAuthStore((s) => s.session?.user ?? null);
  const chosen = useLearningStore((s) => s.profile?.target);
  const progressVersion = useLearningStore((s) => s.progressVersion);
  const code: LanguageCode = chosen ?? user?.targetLanguage ?? 'de';
  const userId = user?.id ?? '';

  return useAsyncData<LessonList>(async () => {
    const repos = getRepositories();
    const [language, lessons, progress, levels] = await Promise.all([
      repos.languages.getByCode(code),
      repos.lessons.getByLanguage(code),
      repos.progress.get(userId, code),
      repos.levels.getAll(),
    ]);
    return { language, lessons, progress, levels };
  }, [userId, code, progressVersion]);
}
