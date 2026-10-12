import { useAsyncData } from '@/hooks/useAsyncData';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { LanguageCode, Language, Lesson, Progress } from '@/types';

export interface LessonList {
  language: Language | null;
  lessons: Lesson[];
  progress: Progress | null;
}

/** Lessons of the learner's current target language together with their progress. */
export function useLessonList() {
  const user = useAuthStore((s) => s.session?.user ?? null);
  const selected = useLearningStore((s) => s.selectedTarget);
  const progressVersion = useLearningStore((s) => s.progressVersion);
  const code: LanguageCode = selected ?? user?.targetLanguage ?? 'de';
  const userId = user?.id ?? '';

  return useAsyncData<LessonList>(async () => {
    const repos = getRepositories();
    const [language, lessons, progress] = await Promise.all([
      repos.languages.getByCode(code),
      repos.lessons.getByLanguage(code),
      repos.progress.get(userId, code),
    ]);
    return { language, lessons, progress };
  }, [userId, code, progressVersion]);
}
