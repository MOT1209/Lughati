// Domain model. Source language (what the learner already speaks) and target language
// (what they learn) are separate concepts: every learning record carries both.

export type UiLocale = 'ar' | 'en';

export type LanguageCode = 'ar' | 'de' | 'en' | 'es' | 'fr' | 'tr';

export type LanguageRole = 'source' | 'target';

/** Text that exists in every UI locale. Used for data-driven content (not UI chrome). */
export type Localized = Record<UiLocale, string>;

export interface Language {
  code: LanguageCode;
  /** Name of the language in each UI locale. */
  name: Localized;
  /** Name of the language in itself (e.g. "Deutsch"). Rendered LTR-isolated. */
  nativeName: string;
  direction: 'ltr' | 'rtl';
  /** Flag emoji shown next to the name. Decorative: the name is what screen readers announce. */
  flag: string;
  /** 'source': can be the learner's own language (meanings); 'target': can be learned. */
  roles: LanguageRole[];
}

/** What the learner chose after signing in: their own language and the one they learn. Never equal. */
export interface LearningProfile {
  source: LanguageCode;
  target: LanguageCode;
}

export type LevelId = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Level {
  id: LevelId;
  title: Localized;
}

export interface User {
  id: string;
  name: string;
  email: string;
  sourceLanguage: LanguageCode;
  /** Default learning language; the learner can switch it at runtime. */
  targetLanguage: LanguageCode;
  joinedAt: string; // ISO date
}

export interface Lesson {
  id: string;
  targetLanguage: LanguageCode;
  levelId: LevelId;
  title: Localized;
  summary: Localized;
  order: number;
  estimatedMinutes: number;
  /** Optional grouping into a unit; absent means the lesson stands alone in its level. */
  unitId?: string;
  /** What to do, shown before the words. Data-driven so it follows the app locale. */
  instructions?: Localized;
}

/** A named group of lessons inside one level. Not used by the current mock course yet. */
export interface Unit {
  id: string;
  levelId: LevelId;
  order: number;
  title: Localized;
}

// 'multiple-choice': see the target word, pick its meaning. 'translate': see the meaning, pick the
// target word. 'listen' and 'match' are reserved for later phases.
export type ExerciseType = 'multiple-choice' | 'translate' | 'listen' | 'match';

export interface Exercise {
  id: string;
  lessonId: string;
  type: ExerciseType;
  /** The vocabulary item being asked about. */
  subjectId: string;
  /** Vocabulary ids offered as answers, in display order. Includes `answer`. */
  options: string[];
  /** Vocabulary id of the correct option. */
  answer: string;
}

export interface Vocabulary {
  id: string;
  lessonId: string;
  targetLanguage: LanguageCode;
  /** The word in the language being learned. Render it isolated with that language's direction. */
  term: string;
  /** Meaning in every other course language, keyed by language; shown in the learner's source language. */
  translations: Partial<Record<LanguageCode, string>>;
  /** Example sentence in the target language, optional. */
  exampleSentence?: string;
  /** Optional short, data-driven explanation shown with the word. */
  note?: Localized;
}

/** What the learner did in one lesson run. */
export interface LessonResult {
  correct: number;
  total: number;
}

export interface Progress {
  userId: string;
  targetLanguage: LanguageCode;
  /** The learner's level is per target language. XP is per language too; the streak is not. */
  levelId: LevelId;
  completedLessonIds: string[];
  currentLessonId: string | null;
  /** 0..1 progress inside the current level. */
  levelProgress: number;
  totalXp: number;
  wordsLearned: number;
  minutesLearned: number;
}

/** Consecutive days with learning activity. Per user, not per language. */
export interface Streak {
  userId: string;
  /** Current streak: consecutive activity days ending today or yesterday. 0 when cold. */
  days: number;
  /** Longest streak ever seen in the activity history. Same as `days` when that is the record. */
  best?: number;
}

export interface Achievement {
  id: string;
  title: Localized;
  description: Localized;
  icon: string;
  unlocked: boolean;
}

export interface LearningPlan {
  userId: string;
  targetLanguage: LanguageCode;
  dailyGoalMinutes: number;
  minutesToday: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  targetLanguage: LanguageCode;
  messages: AIMessage[];
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | UiLocale;

// ------------------------------------------------------------------
// Learning-progress domain (Agent 1): attempts, activity, reviews.
// Everything below is additive; existing types above are unchanged.
// ------------------------------------------------------------------

/** One recorded lesson run. Recorded even when the lesson stayed incomplete. */
export interface LessonAttempt {
  /** Stable id: userId:language:lessonId:timestamp:sequence. */
  id: string;
  userId: string;
  lessonId: string;
  targetLanguage: LanguageCode;
  /** ISO timestamp of the run. */
  attemptedAt: string;
  result: LessonResult;
  /** True only when this run completed the lesson (the progression recorded it). */
  completed: boolean;
}

/** What the learner did on one local calendar day, across all languages they learn. */
export interface ActivityDay {
  userId: string;
  /** Calendar day in the device time zone, `YYYY-MM-DD`. */
  day: string;
  minutes: number;
  xp: number;
  lessonsCompleted: number;
  correctAnswers: number;
}

/** How the answer went in a vocabulary review. */
export type ReviewOutcome = 'again' | 'difficult' | 'good' | 'easy';

/** One word's spaced-repetition state, per user. Scheduled by src/utils/srs.ts only. */
export interface VocabularyReviewState {
  userId: string;
  targetLanguage: LanguageCode;
  wordId: string;
  /** 0-based position on the SRS interval ladder. 0 = new / relearning. */
  step: number;
  correctCount: number;
  wrongCount: number;
  /** ISO timestamp of the last review; null until reviewed at least once. */
  lastReviewedAt: string | null;
  /** ISO timestamp of when the word is due next. */
  nextReviewAt: string;
}

/** What the app recommends the learner does next; computed by src/utils/recommendations.ts. */
export type RecommendationKind = 'daily-goal' | 'review-due' | 'retry-lesson' | 'continue-lesson' | 'continue-unit';

export interface Recommendation {
  kind: RecommendationKind;
  /** The lesson this points at, when there is one. */
  lessonId?: string;
  /** Deterministic ordering weight; callers sort by this descending. */
  score: number;
  /**
   * Numbers behind the rule, so a UI can write its own localized copy instead of parsing `reason`.
   * `minutes` (daily-goal), `count` (review-due), `percent` (retry-lesson).
   */
  params?: Record<string, number>;
  /** Plain-English why, for debugging or as an accessible fallback. UIs may render their own copy. */
  reason: string;
}
