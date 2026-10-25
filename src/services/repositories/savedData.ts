import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { vocabulary } from '@/mocks/vocabulary';
import type {
  ActivityDay,
  LanguageCode,
  LearningPlan,
  LearningProfile,
  LessonAttempt,
  Progress,
  VocabularyReviewState,
} from '@/types';

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
  /** Keyed `userId:language`; optional so blobs written by older builds still parse. */
  attempts?: Record<string, LessonAttempt[]>;
  /** Keyed `userId:day`; local calendar days with recorded study activity. */
  activity?: Record<string, ActivityDay>;
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

/** Local calendar day of a date (see utils/day.ts); re-exported because activity is keyed by it. */
export { dayOf } from '@/utils/day';

/** Exposed so activity records and streak logic agree on what a real calendar day is. */
export { isValidDay };

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
      attempts: isRecord(parsed.attempts) ? pickValid(parsed.attempts, isSavedAttemptList, attemptListKey) : undefined,
      activity: isRecord(parsed.activity) ? pickValid(parsed.activity, isSavedActivity, (a) => activityKey(a.userId, a.day)) : undefined,
    };
  } catch {
    return empty;
  }
}

// ------------------------------------------------------------------
// Attempts, activity days and vocabulary review states. Each record class adds fields to what
// older builds stored, so every check below tolerates records without the newer fields
// (backwards compatibility) and rejects nonsensical newer values.
// ------------------------------------------------------------------

export const MAX_ATTEMPTS_PER_RECORD = 500;

/** Storage key of one user/language attempt list; every listed attempt shares it. */
export function attemptListKey(attempts: LessonAttempt[]): string {
  const first = attempts[0];
  return progressKey(first.userId, first.targetLanguage);
}

/**
 * An attempt list for one user/language: unique stable ids, every lesson of that language, real
 * timestamps, and 0 <= correct <= total within sane bounds.
 */
export function isSavedAttemptList(value: unknown): value is LessonAttempt[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ATTEMPTS_PER_RECORD) return false;
  const seenIds = new Set<string>();
  let userId: string | null = null;
  let language: string | null = null;
  for (const entry of value) {
    if (!isRecord(entry)) return false;
    const { id, lessonId } = entry;
    const entryUserId = entry.userId;
    const entryLanguage = entry.targetLanguage;
    const attemptUserId = typeof entryUserId === 'string' ? entryUserId : '';
    const attemptLanguage = typeof entryLanguage === 'string' && languageCodes.has(entryLanguage) ? entryLanguage : null;
    if (attemptUserId.length === 0 || attemptLanguage === null) return false;
    if (typeof lessonId !== 'string' || lessonById.get(lessonId)?.targetLanguage !== attemptLanguage) return false;
    if (userId === null) {
      userId = attemptUserId;
      language = attemptLanguage;
    } else if (userId !== attemptUserId || language !== attemptLanguage) {
      return false; // one record belongs to exactly one user/language pair
    }
    if (typeof id !== 'string' || id.length === 0 || seenIds.has(id)) return false;
    seenIds.add(id);
    const { attemptedAt, result, completed } = entry;
    if (typeof attemptedAt !== 'string' || Number.isNaN(new Date(attemptedAt).getTime())) return false;
    if (!isRecord(result)) return false;
    const { correct, total } = result as Record<string, unknown>;
    if (!isCount(correct) || !isCount(total) || correct > total) return false;
    if (completed !== true && completed !== false) return false;
    if (entry.kind !== undefined && entry.kind !== 'lesson' && entry.kind !== 'practice') return false;
  }
  return true;
}

export const activityKey = (userId: string, day: string) => `${userId}:${day}`;

/** One day's activity: a real calendar day and non-negative counters of sane magnitude. */
export function isSavedActivity(value: unknown): value is ActivityDay {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    value.userId.length > 0 &&
    isValidDay(value.day) &&
    isCount(value.minutes, MAX_COUNTER) &&
    isCount(value.xp) &&
    isCount(value.lessonsCompleted) &&
    isCount(value.correctAnswers)
  );
}

const reviewStateKeyOf = (state: VocabularyReviewState) => `${state.userId}:${state.wordId}`;

/** One word's review state: known language, whole counters, real timestamps, sane step. */
export function isSavedReviewState(value: unknown): value is VocabularyReviewState {
  if (!isRecord(value)) return false;
  const { userId, targetLanguage, wordId, step, correctCount, wrongCount, lastReviewedAt, nextReviewAt } = value;
  if (typeof userId !== 'string' || userId.length === 0) return false;
  if (typeof targetLanguage !== 'string' || !languageCodes.has(targetLanguage)) return false;
  if (typeof wordId !== 'string' || wordId.length === 0) return false;
  const word = vocabulary.find((w) => w.id === wordId);
  if (!word || word.targetLanguage !== targetLanguage) return false;
  if (!isCount(step, MAX_COUNTER)) return false;
  if (!isCount(correctCount) || !isCount(wrongCount)) return false;
  if (lastReviewedAt !== null && (typeof lastReviewedAt !== 'string' || Number.isNaN(new Date(lastReviewedAt).getTime()))) return false;
  if (typeof nextReviewAt !== 'string' || Number.isNaN(new Date(nextReviewAt).getTime())) return false;
  return true;
}

export { reviewStateKeyOf as reviewStateKey };

/** Parses the stored review-state blob (keyed `userId:wordId`). Unreadable is "nothing saved". */
export function parseSavedReviews(raw: string | null): Record<string, VocabularyReviewState> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.reviews)) return {};
    return pickValid(parsed.reviews, isSavedReviewState, reviewStateKeyOf);
  } catch {
    return {};
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
