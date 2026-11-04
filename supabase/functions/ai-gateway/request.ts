import { EXERCISE_TYPES, FEATURES, LANGS, LEVELS, LIMITS, SPEAKING_MODES, type Envelope, type ExerciseType, type Feature, type LearnerContext, type Payload, type PlannerStats, type SpeakingMode } from './types.ts';

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(CONTROL, '').trim();
  return s.length > 0 && s.length <= max ? s : null;
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseContext(raw: unknown): LearnerContext | null {
  if (!isObj(raw)) return null;
  const { learningLanguage, explanationLanguage, level } = raw;
  if (!LANGS.includes(learningLanguage as never) || !LANGS.includes(explanationLanguage as never) || !LEVELS.includes(level as never)) return null;
  const weak = Array.isArray(raw.weakTopics) ? raw.weakTopics.map((t) => clean(t, 60)).filter((t): t is string => !!t).slice(0, 5) : [];
  const goal = raw.goal === undefined ? undefined : clean(raw.goal, 120) ?? undefined;
  return { learningLanguage: learningLanguage as string, explanationLanguage: explanationLanguage as string, level: level as string, weakTopics: weak, goal };
}

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null;

function parseStats(raw: unknown): PlannerStats | null {
  if (!isObj(raw)) return null;
  const completedLessons = int(raw.completedLessons, 0, 10_000);
  const totalLessons = int(raw.totalLessons, 0, 10_000);
  const streakDays = int(raw.streakDays, 0, 10_000);
  const dueReviews = int(raw.dueReviews, 0, 100_000);
  const minutesToday = int(raw.minutesToday, 0, 1440);
  const dailyGoalMinutes = int(raw.dailyGoalMinutes, 5, 1440);
  const accuracy = raw.accuracyPercent === null || raw.accuracyPercent === undefined ? null : int(raw.accuracyPercent, 0, 100);
  if ([completedLessons, totalLessons, streakDays, dueReviews, minutesToday, dailyGoalMinutes].some((v) => v === null)) return null;
  if (raw.accuracyPercent !== null && raw.accuracyPercent !== undefined && accuracy === null) return null;
  const weakTopics = Array.isArray(raw.weakTopics) ? raw.weakTopics.map((t) => clean(t, 60)).filter((t): t is string => !!t).slice(0, 5) : [];
  return { completedLessons: completedLessons!, totalLessons: totalLessons!, accuracyPercent: accuracy, streakDays: streakDays!, dueReviews: dueReviews!, minutesToday: minutesToday!, dailyGoalMinutes: dailyGoalMinutes!, weakTopics };
}

/** Validates the whole client envelope. Anything unexpected → null (HTTP 400). Never trusts the client. */
export function parseEnvelope(body: unknown): { feature: Feature; envelope: Envelope } | null {
  if (!isObj(body)) return null;
  const feature = body.feature;
  if (!FEATURES.includes(feature as Feature)) return null;
  const context = parseContext(body.context);
  const p = body.payload;
  if (!context || !isObj(p)) return null;
  const f = feature as Feature;
  let payload: Payload | null = null;
  const conversationId = p.conversationId === undefined || p.conversationId === null ? undefined : typeof p.conversationId === 'string' && UUID.test(p.conversationId) ? p.conversationId : null;
  if (conversationId === null) return null;

  if (f === 'tutor') {
    const message = clean(p.message, LIMITS.message);
    if (message) payload = { feature: 'tutor', message, conversationId };
  } else if (f === 'speaking') {
    const message = clean(p.message, LIMITS.message);
    const scenario = clean(p.scenario, LIMITS.scenario);
    if (message && scenario && SPEAKING_MODES.includes(p.mode as SpeakingMode)) payload = { feature: 'speaking', message, scenario, mode: p.mode as SpeakingMode, conversationId };
  } else if (f === 'writing') {
    const text = clean(p.text, LIMITS.text);
    if (text) payload = { feature: 'writing', text };
  } else if (f === 'quiz') {
    const topic = clean(p.topic, LIMITS.topic);
    const count = int(p.count, 1, 5);
    if (topic && count && EXERCISE_TYPES.includes(p.exerciseType as ExerciseType)) payload = { feature: 'quiz', topic, exerciseType: p.exerciseType as ExerciseType, count };
  } else if (f === 'pronunciation') {
    const target = clean(p.target, LIMITS.transcript);
    const transcript = clean(p.transcript, LIMITS.transcript);
    if (target && transcript) payload = { feature: 'pronunciation', target, transcript };
  } else if (f === 'planner') {
    const stats = parseStats(p.stats);
    if (stats && (p.horizon === 'daily' || p.horizon === 'weekly')) payload = { feature: 'planner', stats, horizon: p.horizon };
  }
  return payload ? { feature: f, envelope: { context, payload } } : null;
}
