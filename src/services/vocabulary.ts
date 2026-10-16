import { getRepositories } from '@/services/repositories';
import type { LanguageCode, Vocabulary } from '@/types';

/**
 * Every word of one language, keyed by id.
 *
 * Review states only carry a `wordId`, and the repository contract has no "vocabulary by id"
 * lookup, so screens resolve word ids through this map (built from the language's lessons).
 */
export async function getVocabularyById(language: LanguageCode): Promise<Map<string, Vocabulary>> {
  const repos = getRepositories();
  const lessons = await repos.lessons.getByLanguage(language);
  const lists = await Promise.all(lessons.map((lesson) => repos.lessons.getVocabulary(lesson.id)));
  return new Map(lists.flat().map((word) => [word.id, word]));
}
