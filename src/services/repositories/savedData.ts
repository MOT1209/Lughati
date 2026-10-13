import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { vocabulary } from '@/mocks/vocabulary';
import type { LanguageCode, LearningPlan, LearningProfile, Progress } from '@/types';

/**
 * Validation of what was read back from device storage. Stored data is untrusted input (older
 * builds, manual edits, partial writes): each record is checked on its own against the data the
 * app actually supports, and a bad record is dropped without affecting the valid ones.
 */

export const progressKey = (userId: string, language: LanguageCode) => `${userId}:${language}`;

export interface SavedPlan {
  plan: LearningPlan;
  /** Calendar day (device time zone) the minutes belong to, `YYYY-MM-DD`. */
  day: string;
}

export interface SavedLearning {
  progress: Record<string, Progress>;
  plans: Record<string, SavedPlan>;
}

/** Generous sanity ceilings: they only exist to reject absurd values, not to limit real use. */
export const MAX_DAILY_GOAL_MINUTES = 24 * 60;
export const MAX_COUNTER = 10_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown, max = MAX_COUNTER): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

const languageCodes = new Set<string>(languages.map((l) => l.code));
const levelRank = new Map<string, number>(levels.map((l, index) => [l.id, index]));
const lessonById = new Map(lessons.map((l) => [l.id, l]));

const lessonsOfLanguage = (language: string) => lessons.filter((l) => l.targetLanguage === language);
const wordsOfLanguage = (language: string) => {
  const ids = new Set(lessonsOfLanguage(language).map((l) => l.id));
  return vocabulary.filter((w) => ids.has(w.lessonId)).length;
};

function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * A progress record is accepted only if it is self-consistent and matches the app's data:
 * known language and level; every finished lesson exists and belongs to that language (no
 * duplicates); the current lesson exists, belongs to that language and is not already done;
 * a level above the first implies every lesson of the lower levels is done (that is the only
 * way the level can rise); counters are non-negative whole numbers; levelProgress is in 0..1.
 */
export function isSavedProgress(value: unknown): value is Progress {
  if (!isRecord(value)) return false;
  const { userId, targetLanguage, levelId, completedLessonIds, currentLessonId } = value;
  if (typeof userId !== 'string' || userId.length === 0) return false;
  if (typeof targetLanguage !== 'string' || !languageCodes.has(targetLanguage)) return false;
  if (typeof levelId !== 'string' || !levelRank.has(levelId)) return false;

  if (!Array.isArray(completedLessonIds) || !completedLessonIds.every((id) => typeof id === 'string')) return false;
  const completed = new Set<string>(completedLessonIds);
  if (completed.size !== completedLessonIds.length) return false;
  for (const id of completed) if (lessonById.get(id)?.targetLanguage !== targetLanguage) return false;

  if (currentLessonId !== null) {
    if (typeof currentLessonId !== 'string') return false;
    if (lessonById.get(currentLessonId)?.targetLanguage !== targetLanguage || completed.has(currentLessonId)) return false;
  }

  const rank = levelRank.get(levelId)!;
  const ownLessons = lessonsOfLanguage(targetLanguage);
  const lowerLevelsDone = ownLessons
    .filter((l) => (levelRank.get(l.levelId) ?? Infinity) < rank)
    .every((l) => completed.has(l.id));
  if (!lowerLevelsDone) return false;

  const { levelProgress, totalXp, wordsLearned, minutesLearned } = value;
  return (
    typeof levelProgress === 'number' &&
    Number.isFinite(levelProgress) &&
    levelProgress >= 0 &&
    levelProgress <= 1 &&
    isCount(totalXp) &&
    isCount(wordsLearned, wordsOfLanguage(targetLanguage)) &&
    isCount(minutesLearned)
  );
}

/** A plan needs a known language, a sane goal, non-negative minutes and a real calendar day. */
export function isSavedPlan(value: unknown): value is SavedPlan {
  if (!isRecord(value) || !isValidDay(value.day) || !isRecord(value.plan)) return false;
  const { userId, targetLanguage, dailyGoalMinutes, minutesToday } = value.plan;
  return (
    typeof userId === 'string' &&
    userId.length > 0 &&
    typeof targetLanguage === 'string' &&
    languageCodes.has(targetLanguage) &&
    isCount(dailyGoalMinutes, MAX_DAILY_GOAL_MINUTES) &&
    dailyGoalMinutes > 0 &&
    isCount(minutesToday)
  );
}

/** Keeps only valid records whose storage key matches the user and language inside the record. */
function pickValid<T>(
  source: Record<string, unknown>,
  isValid: (value: unknown) => value is T,
  keyOf: (value: T) => string,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [name, value] of Object.entries(source)) {
    if (isValid(value) && keyOf(value) === name) out[name] = value;
  }
  return out;
}

/** Parses the stored blob. Anything unreadable or foreign is "nothing saved". */
export function parseSavedLearning(raw: string | null): SavedLearning {
  const empty: SavedLearning = { progress: {}, plans: {} };
  if (!raw) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.progress) || !isRecord(parsed.plans)) return empty;
    return {
      progress: pickValid(parsed.progress, isSavedProgress, (p) => progressKey(p.userId, p.targetLanguage)),
      plans: pickValid(parsed.plans, isSavedPlan, (p) => progressKey(p.plan.userId, p.plan.targetLanguage)),
    };
  } catch {
    return empty;
  }
}

/** A learner's own and target language: both supported, never the same. */
export function isSavedProfile(value: unknown): value is LearningProfile {
  return (
    isRecord(value) &&
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    languageCodes.has(value.source) &&
    languageCodes.has(value.target) &&
    value.source !== value.target
  );
}

/** Parses the stored language choices (keyed by user id). Anything unreadable is "nothing saved". */
export function parseSavedProfiles(raw: string | null): Record<string, LearningProfile> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const out: Record<string, LearningProfile> = {};
    for (const [userId, value] of Object.entries(parsed)) if (isSavedProfile(value)) out[userId] = value;
    return out;
  } catch {
    return {};
  }
}
