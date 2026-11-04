export const FEATURES = ['tutor', 'speaking', 'writing', 'quiz', 'pronunciation', 'planner'] as const;
export type Feature = (typeof FEATURES)[number];
export const LANGS = ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const;
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const LANG_NAME: Record<string, string> = { ar: 'Arabic', de: 'German', en: 'English', es: 'Spanish', fr: 'French', tr: 'Turkish' };
export const EXERCISE_TYPES = ['multiple_choice', 'fill_blank', 'translation', 'vocabulary', 'grammar', 'sentence_order', 'reading', 'short_writing'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export const SPEAKING_MODES = ['beginner', 'normal', 'guided'] as const;
export type SpeakingMode = (typeof SPEAKING_MODES)[number];

export const LIMITS = { message: 800, text: 1200, topic: 80, scenario: 120, transcript: 300, history: 6, historyItem: 500, body: 24_000 } as const;

/** Only what the task needs; no name, e-mail or user id ever goes to the model. */
export interface LearnerContext {
  learningLanguage: string;
  explanationLanguage: string;
  level: string;
  topic?: string;
  weakTopics?: string[];
  goal?: string;
}

export interface PlannerStats {
  completedLessons: number;
  totalLessons: number;
  accuracyPercent: number | null;
  streakDays: number;
  dueReviews: number;
  minutesToday: number;
  dailyGoalMinutes: number;
  weakTopics: string[];
}

export type Payload =
  | { feature: 'tutor'; message: string; conversationId?: string }
  | { feature: 'speaking'; message: string; scenario: string; mode: SpeakingMode; conversationId?: string }
  | { feature: 'writing'; text: string }
  | { feature: 'quiz'; topic: string; exerciseType: ExerciseType; count: number }
  | { feature: 'pronunciation'; target: string; transcript: string }
  | { feature: 'planner'; stats: PlannerStats; horizon: 'daily' | 'weekly' };

export interface Envelope {
  context: LearnerContext;
  payload: Payload;
}

export interface RegistryModel {
  id: string;
  provider: string;
  modelId: string;
  pricingTier: 'free' | 'paid' | 'unknown';
  enabled: boolean;
  verifiedAt: string | null;
  healthStatus: 'ok' | 'degraded' | 'down' | 'unknown';
  healthCheckedAt: string | null;
  consecutiveFailures: number;
  capabilities: Record<string, unknown>;
}

export interface TaskRoute {
  task: Feature;
  primaryModel: string | null;
  fallbackModel: string | null;
  allowPaid: boolean;
  maxOutputTokens: number;
}
