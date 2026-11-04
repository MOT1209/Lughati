import { getAIGateway } from './gateway';
import {
  AI_LIMITS,
  AIError,
  type AIContext,
  type Correction,
  type GeneratedExercise,
  type LearningPlan,
  type PlannerStats,
  type PronunciationAdvice,
  type SpeakingReply,
  type TutorReply,
  type WritingFeedback,
} from './types';
import type { ExerciseType } from './exerciseTypes';
import { EXERCISE_TYPES } from './exerciseTypes';

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trims and bounds user text before it leaves the device; the server validates again. */
export function cleanInput(text: string, max: number): string {
  const s = text.replace(CONTROL, '').trim();
  if (s.length === 0 || s.length > max) throw new AIError('invalid');
  return s;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const bad = (): never => {
  throw new AIError('invalid_output');
};

function asCorrection(v: unknown): Correction | null {
  if (v === null || v === undefined) return null;
  if (!isObj(v) || !isStr(v.original) || !isStr(v.corrected) || !isStr(v.explanation)) return bad();
  return { original: v.original, corrected: v.corrected, explanation: v.explanation };
}

// The gateway validates model output; these checks guard the app against a malformed response anyway.

export async function askTutor(ctx: AIContext, message: string, conversationId?: string | null): Promise<TutorReply> {
  const data = await getAIGateway().call('tutor', ctx, { message: cleanInput(message, AI_LIMITS.message), ...(conversationId ? { conversationId } : {}) });
  if (!isObj(data) || !isStr(data.text)) return bad();
  return { text: data.text, conversationId: isStr(data.conversationId) ? data.conversationId : null, source: data.source === 'cache' ? 'cache' : 'ai' };
}

export type SpeakingMode = 'beginner' | 'normal' | 'guided';
export async function sendSpeakingTurn(ctx: AIContext, message: string, scenario: string, mode: SpeakingMode, conversationId?: string | null): Promise<SpeakingReply> {
  const data = await getAIGateway().call('speaking', ctx, { message: cleanInput(message, AI_LIMITS.message), scenario: cleanInput(scenario, 120), mode, ...(conversationId ? { conversationId } : {}) });
  if (!isObj(data) || !isStr(data.reply)) return bad();
  const vocabulary = Array.isArray(data.vocabulary) ? data.vocabulary.filter((v): v is { term: string; meaning: string } => isObj(v) && isStr(v.term) && isStr(v.meaning)) : [];
  return { reply: data.reply, correction: asCorrection(data.correction), vocabulary, conversationId: isStr(data.conversationId) ? data.conversationId : null };
}

export async function correctWriting(ctx: AIContext, text: string): Promise<WritingFeedback> {
  const data = await getAIGateway().call('writing', ctx, { text: cleanInput(text, AI_LIMITS.text) });
  if (!isObj(data) || !isStr(data.correctedText) || !Array.isArray(data.corrections)) return bad();
  const corrections = data.corrections.map((c) => asCorrection(c) ?? bad());
  return {
    originalText: isStr(data.originalText) ? data.originalText : text,
    correctedText: data.correctedText,
    language: isStr(data.language) ? data.language : ctx.learningLanguage,
    level: isStr(data.level) ? data.level : ctx.level,
    corrections,
    improvedVersion: isStr(data.improvedVersion) ? data.improvedVersion : data.correctedText,
  };
}

export async function generateExercises(ctx: AIContext, topic: string, exerciseType: ExerciseType, count = 3): Promise<{ exercises: GeneratedExercise[]; source: 'ai' | 'cache' }> {
  const data = await getAIGateway().call('quiz', ctx, { topic: cleanInput(topic, AI_LIMITS.topic), exerciseType, count: Math.min(Math.max(Math.round(count), 1), 5) });
  if (!isObj(data) || !Array.isArray(data.exercises)) return bad();
  const exercises = data.exercises.map((e): GeneratedExercise => {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.question) || !isStr(e.answer) || !isStr(e.explanation)) return bad();
    const options = Array.isArray(e.options) && e.options.every(isStr) ? (e.options as string[]) : null;
    // An exercise whose answer is not among its options would be unanswerable: refuse it.
    if (options && !options.includes(e.answer)) return bad();
    const type = EXERCISE_TYPES.includes(e.type as ExerciseType) ? (e.type as ExerciseType) : exerciseType;
    const difficulty = e.difficulty === 'medium' || e.difficulty === 'hard' ? e.difficulty : 'easy';
    return { id: e.id, type, question: e.question, options, answer: e.answer, explanation: e.explanation, difficulty, topic: isStr(e.topic) ? e.topic : topic };
  });
  if (exercises.length === 0) return bad();
  return { exercises, source: data.source === 'cache' ? 'cache' : 'ai' };
}

export async function coachPronunciation(ctx: AIContext, target: string, transcript: string): Promise<PronunciationAdvice> {
  const data = await getAIGateway().call('pronunciation', ctx, { target: cleanInput(target, AI_LIMITS.transcript), transcript: cleanInput(transcript, AI_LIMITS.transcript) });
  if (!isObj(data) || !isObj(data.diff) || !Array.isArray(data.diff.missing) || !Array.isArray(data.diff.substituted)) return bad();
  const diff = data.diff as unknown as PronunciationAdvice['diff'];
  const tips = Array.isArray(data.tips) ? data.tips.filter(isStr) : [];
  const practiceWords = Array.isArray(data.practiceWords) ? data.practiceWords.filter(isStr) : [];
  return { diff, tips, practiceWords, limitation: 'text_comparison_only', adviceUnavailable: data.adviceUnavailable === true };
}

export async function planLearning(ctx: AIContext, stats: PlannerStats, horizon: 'daily' | 'weekly'): Promise<LearningPlan> {
  const data = await getAIGateway().call('planner', ctx, { stats, horizon });
  if (!isObj(data) || !isStr(data.summary) || !Array.isArray(data.dailyTips)) return bad();
  const weeklyPlan = Array.isArray(data.weeklyPlan)
    ? data.weeklyPlan.map((d) => {
        if (!isObj(d) || !isStr(d.day) || !isStr(d.focus) || typeof d.minutes !== 'number') return bad();
        return { day: d.day, focus: d.focus, minutes: d.minutes };
      })
    : [];
  return { summary: data.summary, dailyTips: data.dailyTips.filter(isStr), weeklyPlan };
}
