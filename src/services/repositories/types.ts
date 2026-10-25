import type {
  ActivityDay,
  Exercise,
  Language,
  LanguageCode,
  LearningPlan,
  LearningProfile,
  Lesson,
  LessonAttempt,
  LessonResult,
  Level,
  LevelId,
  Progress,
  ReviewOutcome,
  Streak,
  Vocabulary,
  VocabularyReviewState,
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
  /** The streak belongs to the user and is shared by every language they learn; computed from real activity. */
  getStreak(userId: string): Promise<Streak>;
  /**
   * Records a finished lesson run and returns the updated progress (also adds study time to the
   * plan). The lesson only counts as completed when the run passes (PASS_RATIO); a failed run still
   * earns its XP and minutes and leaves the lesson current. `minutes` is the time the run really
   * took (the lesson screen measures it); without it the lesson's estimate is used.
   */
  completeLesson(userId: string, lessonId: string, result: LessonResult, options?: { minutes?: number }): Promise<Progress>;
  /** Every recorded run for the pair, oldest first, even runs that did not complete the lesson. */
  getAttempts(userId: string, language: LanguageCode): Promise<LessonAttempt[]>;
  /**
   * Records a lesson run without touching completion or progression (an aborted or manual run).
   * Attempted runs must be distinguishable from completed ones; `completed: false` is the default.
   */
  recordAttempt(
    userId: string,
    lessonId: string,
    result: LessonResult,
    options?: { completed?: boolean },
  ): Promise<LessonAttempt>;
}

export interface LearningPlanRepository {
  get(userId: string, language: LanguageCode): Promise<LearningPlan>;
  /** Persists a new daily goal for the pair (clamped to a sane range) and returns the updated plan. */
  setDailyGoal(userId: string, language: LanguageCode, minutes: number): Promise<LearningPlan>;
}

/** Per-day study activity, recorded only from events the app actually observes. */
export interface ActivityRepository {
  /** Recorded activity for one local calendar day, or null when nothing was recorded. */
  getDay(userId: string, day: string): Promise<ActivityDay | null>;
  /** Activity of the last `days` local days ending today, oldest first; empty when no history. */
  getRecent(userId: string, days: number): Promise<ActivityDay[]>;
}

/** Vocabulary spaced-repetition states. Scheduling lives in src/utils/srs.ts alone. */
export interface VocabularyReviewRepository {
  get(userId: string, wordId: string): Promise<VocabularyReviewState | null>;
  /** States of the language due at or before `now`, oldest due first. */
  getDue(userId: string, language: LanguageCode, now?: Date): Promise<VocabularyReviewState[]>;
  recordReview(userId: string, language: LanguageCode, wordId: string, outcome: ReviewOutcome): Promise<VocabularyReviewState>;
}

/** The learner's chosen own and target language, per account. Null until they chose. */
export interface LearningProfileRepository {
  get(userId: string): Promise<LearningProfile | null>;
  set(userId: string, profile: LearningProfile): Promise<void>;
}

/**
 * The content half of the data seam: where lessons, languages and levels come from. Bundled mock
 * content today; any other provider later. Screens consume it through `Repositories`/`ContentSource`
 * and are never bound to storage.
 */
export interface ContentSource {
  languages: LanguageRepository;
  levels: LevelRepository;
  lessons: LessonRepository;
}

export interface Repositories extends ContentSource {
  progress: ProgressRepository;
  plans: LearningPlanRepository;
  profiles: LearningProfileRepository;
  activity: ActivityRepository;
  reviews: VocabularyReviewRepository;
}
