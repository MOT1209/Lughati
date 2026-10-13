import type {
  Exercise,
  Language,
  LanguageCode,
  LearningPlan,
  LearningProfile,
  Lesson,
  LessonResult,
  Level,
  LevelId,
  Progress,
  Streak,
  Vocabulary,
} from '@/types';

export interface LanguageRepository {
  getAll(): Promise<Language[]>;
  /** Languages that can currently be learned (role 'target'). */
  getTargets(): Promise<Language[]>;
  /** Languages a learner can name as their own (role 'source'); meanings are shown in it. */
  getSources(): Promise<Language[]>;
  getByCode(code: LanguageCode): Promise<Language | null>;
}

export interface LevelRepository {
  getAll(): Promise<Level[]>;
  getById(id: LevelId): Promise<Level | null>;
}

export interface LessonRepository {
  getByLanguage(language: LanguageCode): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
  getVocabulary(lessonId: string): Promise<Vocabulary[]>;
  getExercises(lessonId: string): Promise<Exercise[]>;
}

export interface ProgressRepository {
  get(userId: string, language: LanguageCode): Promise<Progress | null>;
  /** The streak belongs to the user and is shared by every language they learn. */
  getStreak(userId: string): Promise<Streak>;
  /** Records a finished lesson run and returns the updated progress (also adds study time to the plan). */
  completeLesson(userId: string, lessonId: string, result: LessonResult): Promise<Progress>;
}

export interface LearningPlanRepository {
  get(userId: string, language: LanguageCode): Promise<LearningPlan>;
}

/** The learner's chosen own and target language, per account. Null until they chose. */
export interface LearningProfileRepository {
  get(userId: string): Promise<LearningProfile | null>;
  set(userId: string, profile: LearningProfile): Promise<void>;
}

export interface Repositories {
  languages: LanguageRepository;
  levels: LevelRepository;
  lessons: LessonRepository;
  progress: ProgressRepository;
  plans: LearningPlanRepository;
  profiles: LearningProfileRepository;
}
