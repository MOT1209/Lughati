import type { Language, LanguageCode, LearningPlan, Lesson, Level, LevelId, Progress, Streak } from '@/types';

export interface LanguageRepository {
  getAll(): Promise<Language[]>;
  /** Languages that can currently be learned (role 'target'). */
  getTargets(): Promise<Language[]>;
  getByCode(code: LanguageCode): Promise<Language | null>;
}

export interface LevelRepository {
  getAll(): Promise<Level[]>;
  getById(id: LevelId): Promise<Level | null>;
}

export interface LessonRepository {
  getByLanguage(language: LanguageCode): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
}

export interface ProgressRepository {
  get(userId: string, language: LanguageCode): Promise<Progress | null>;
  /** The streak belongs to the user and is shared by every language they learn. */
  getStreak(userId: string): Promise<Streak>;
}

export interface LearningPlanRepository {
  get(userId: string, language: LanguageCode): Promise<LearningPlan>;
}

export interface Repositories {
  languages: LanguageRepository;
  levels: LevelRepository;
  lessons: LessonRepository;
  progress: ProgressRepository;
  plans: LearningPlanRepository;
}
