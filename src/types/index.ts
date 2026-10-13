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
  days: number;
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
