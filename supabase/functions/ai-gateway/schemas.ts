import { EXERCISE_TYPES, type ExerciseType } from './types.ts';

/** Extracts the first JSON value from model text (handles ``` fences and chatter around it). */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.search(/[{[]/);
  if (start < 0) return null;
  const open = candidate[start]!;
  const close = open === '{' ? '}' : ']';
  const end = candidate.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number, min = 1): string | null => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);
const strList = (v: unknown, maxItems: number, maxLen: number): string[] | null => {
  if (!Array.isArray(v) || v.length > maxItems) return null;
  const out: string[] = [];
  for (const item of v) {
    const s = str(item, maxLen);
    if (!s) return null;
    out.push(s);
  }
  return out;
};

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}
export interface WritingResult {
  originalText: string;
  correctedText: string;
  language: string;
  level: string;
  corrections: Correction[];
  improvedVersion: string;
}

/** Request values win over whatever the model claims about language/level/original text. */
export function validateWriting(raw: unknown, req: { text: string; language: string; level: string }): WritingResult | null {
  if (!isObj(raw)) return null;
  const correctedText = str(raw.correctedText, 4000);
  if (!correctedText || !Array.isArray(raw.corrections) || raw.corrections.length > 20) return null;
  const corrections: Correction[] = [];
  for (const c of raw.corrections) {
    if (!isObj(c)) return null;
    const original = str(c.original, 300);
    const corrected = str(c.corrected, 300);
    const explanation = str(c.explanation, 500);
    if (!original || !corrected || !explanation) return null;
    corrections.push({ original, corrected, explanation });
  }
  const improved = raw.improvedVersion === undefined ? correctedText : str(raw.improvedVersion, 4000);
  if (!improved) return null;
  return { originalText: req.text, correctedText, language: req.language, level: req.level, corrections, improvedVersion: improved };
}

export interface ExerciseItem {
  type: ExerciseType;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  language: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function validateExercises(raw: unknown, req: { type: ExerciseType; topic: string; language: string; count: number }): ExerciseItem[] | null {
  const list = isObj(raw) && Array.isArray(raw.exercises) ? raw.exercises : Array.isArray(raw) ? raw : null;
  if (!list || list.length === 0 || list.length > 10) return null;
  const out: ExerciseItem[] = [];
  const seen = new Set<string>();
  for (const e of list) {
    if (!isObj(e)) return null;
    const question = str(e.question, 600);
    const answer = str(e.answer, 300);
    const explanation = str(e.explanation, 600);
    if (!question || !answer || !explanation) return null;
    const difficulty = e.difficulty === 'easy' || e.difficulty === 'medium' || e.difficulty === 'hard' ? e.difficulty : 'easy';
    let options: string[] | null = null;
    if (e.options !== undefined && e.options !== null) {
      options = strList(e.options, 6, 200);
      if (!options || options.length < 2) return null;
      if (new Set(options.map(norm)).size !== options.length) return null; // repeated option = ambiguous
      if (options.filter((o) => norm(o) === norm(answer)).length !== 1) return null; // exactly one correct option
    }
    if (req.type === 'multiple_choice' && (!options || options.length < 3)) return null;
    if (req.type === 'fill_blank' && !/_{2,}|\[\s*\]|\.{3}/.test(question)) return null;
    if (req.type === 'sentence_order' && (!options || options.length < 3)) return null;
    const key = norm(question) + '|' + norm(answer);
    if (seen.has(key)) continue; // duplicate inside the batch
    seen.add(key);
    out.push({ type: req.type, question, options, answer, explanation, difficulty, topic: req.topic, language: req.language });
  }
  return out.length > 0 ? out.slice(0, req.count) : null;
}

export async function exerciseHash(item: ExerciseItem, level: string, sha256: (s: string) => Promise<string>): Promise<string> {
  return sha256([item.language, level, item.type, norm(item.question), norm(item.answer)].join('|'));
}

export interface SpeakingResult {
  reply: string;
  correction: Correction | null;
  vocabulary: { term: string; meaning: string }[];
}

export function validateSpeaking(raw: unknown): SpeakingResult | null {
  if (!isObj(raw)) return null;
  const reply = str(raw.reply, 1200);
  if (!reply) return null;
  let correction: Correction | null = null;
  if (isObj(raw.correction)) {
    const original = str(raw.correction.original, 300);
    const corrected = str(raw.correction.corrected, 300);
    const explanation = str(raw.correction.explanation, 500);
    if (!original || !corrected || !explanation) return null;
    correction = { original, corrected, explanation };
  }
  const vocabulary: { term: string; meaning: string }[] = [];
  if (Array.isArray(raw.vocabulary)) {
    if (raw.vocabulary.length > 8) return null;
    for (const v of raw.vocabulary) {
      if (!isObj(v)) return null;
      const term = str(v.term, 80);
      const meaning = str(v.meaning, 120);
      if (!term || !meaning) return null;
      vocabulary.push({ term, meaning });
    }
  }
  return { reply, correction, vocabulary };
}

export interface PronunciationTips {
  tips: string[];
  practiceWords: string[];
}
export function validateTips(raw: unknown): PronunciationTips | null {
  if (!isObj(raw)) return null;
  const tips = strList(raw.tips, 6, 400);
  if (!tips || tips.length === 0) return null;
  const practiceWords = raw.practiceWords === undefined ? [] : strList(raw.practiceWords, 8, 60);
  return practiceWords ? { tips, practiceWords } : null;
}

export interface PlannerResult {
  summary: string;
  dailyTips: string[];
  weeklyPlan: { day: string; focus: string; minutes: number }[];
}
export function validatePlanner(raw: unknown): PlannerResult | null {
  if (!isObj(raw)) return null;
  const summary = str(raw.summary, 800);
  const dailyTips = strList(raw.dailyTips, 6, 300);
  if (!summary || !dailyTips) return null;
  const weeklyPlan: PlannerResult['weeklyPlan'] = [];
  if (raw.weeklyPlan !== undefined) {
    if (!Array.isArray(raw.weeklyPlan) || raw.weeklyPlan.length > 7) return null;
    for (const d of raw.weeklyPlan) {
      if (!isObj(d)) return null;
      const day = str(d.day, 30);
      const focus = str(d.focus, 200);
      const minutes = typeof d.minutes === 'number' && Number.isFinite(d.minutes) ? Math.round(d.minutes) : NaN;
      if (!day || !focus || !(minutes >= 5 && minutes <= 180)) return null;
      weeklyPlan.push({ day, focus, minutes });
    }
  }
  return { summary, dailyTips, weeklyPlan };
}

export const isExerciseType = (v: unknown): v is ExerciseType => EXERCISE_TYPES.includes(v as ExerciseType);
