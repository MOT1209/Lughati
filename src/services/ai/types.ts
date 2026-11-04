import type { ExerciseType } from './exerciseTypes';

export const AI_FEATURES = ['tutor', 'speaking', 'writing', 'quiz', 'pronunciation', 'planner'] as const;
export type AIFeature = (typeof AI_FEATURES)[number];

/** Limits mirrored from supabase/functions/ai-gateway/types.ts (the server validates again). */
export const AI_LIMITS = { message: 800, text: 1200, topic: 80, transcript: 300 } as const;

export type AIErrorCode =
  | 'unavailable' // no usable model, not configured, provider down
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'invalid' // our own validation or HTTP 400
  | 'invalid_output' // the model answered with something unusable
  | 'auth'
  | 'not_found'
  | 'unknown';

export class AIError extends Error {
  constructor(readonly code: AIErrorCode) {
    super(code);
    this.name = 'AIError';
  }
}

/** The only learner data sent to the model: languages, level and a few learning hints. Never identity. */
export interface AIContext {
  learningLanguage: string;
  explanationLanguage: string;
  level: string;
  weakTopics?: string[];
  goal?: string;
}

export type { ExerciseType };

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}
export interface TutorReply {
  text: string;
  conversationId: string | null;
  source: 'ai' | 'cache';
}
export interface SpeakingReply {
  reply: string;
  correction: Correction | null;
  vocabulary: { term: string; meaning: string }[];
  conversationId: string | null;
}
export interface WritingFeedback {
  originalText: string;
  correctedText: string;
  language: string;
  level: string;
  corrections: Correction[];
  improvedVersion: string;
}
export interface GeneratedExercise {
  id: string;
  type: ExerciseType;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}
export interface WordDiff {
  matched: string[];
  missing: string[];
  substituted: { expected: string; heard: string }[];
  extra: string[];
  matchRatio: number;
}
export interface PronunciationAdvice {
  diff: WordDiff;
  tips: string[];
  practiceWords: string[];
  /** Always 'text_comparison_only': a transcript cannot measure how a word sounded. */
  limitation: 'text_comparison_only';
  adviceUnavailable: boolean;
}
export interface LearningPlan {
  summary: string;
  dailyTips: string[];
  weeklyPlan: { day: string; focus: string; minutes: number }[];
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
