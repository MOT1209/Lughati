# Integration Guide — Agent 2 (Learning & Progress Layer)

What Agent 1 added to the learning domain, how to consume it from UI code, and what to avoid. All names below are real exports; signatures are TypeScript-accurate as of this branch. Nothing here is UI work: screens are expected to read only these interfaces.

## 1. Sources of truth

| Concern | Where it lives | Owned by |
|---|---|---|
| Content (languages, levels, lessons, words, exercises) | `Repositories.*` via `services/repositories/index.ts` (`getRepositories()`) | mock today, swappable via `registerRepositories` |
| Lesson completion, attempts, activity, streak | same `Repositories` object (`progress`, `activity`, `plans`) | mock persists to `lughati.learning-progress.v1` |
| Daily goal | `Repositories.plans` | persisted next to progress |
| Vocabulary review states | `Repositories.reviews` | persists to `lughati.vocab-reviews.v1` |
| Progression rules | `utils/progression.ts` (`applyLessonCompletion`) | pure |
| Spaced repetition | `utils/srs.ts` (`scheduleReview`) | pure, the **only** scheduler |
| Streak math | `utils/streaks.ts` (`computeStreakStats`) | pure |
| Recommendations | `utils/recommendations.ts` (`getRecommendations`) | pure, rule based |
| Content validation | `utils/content.ts` (`validateLessonContent`) | pure, returns `ContentIssue[]` |

Screens must not read storage, must not schedule reviews, and must not invent statistics. Everything displayed comes from these calls.

## 2. New `Repositories` surface (additions only)

```ts
progress.getAttempts(userId, language): Promise<LessonAttempt[]>          // oldest first
progress.recordAttempt(userId, lessonId, result, { completed?: boolean }?) // run without completing
plans.setDailyGoal(userId, language, minutes): Promise<LearningPlan>       // clamped to 5..1440
activity.getDay(userId, day): Promise<ActivityDay | null>                  // 'YYYY-MM-DD' local day
activity.getRecent(userId, days): Promise<ActivityDay[]>                   // oldest first, may be []
reviews.get(userId, wordId): Promise<VocabularyReviewState | null>
reviews.getDue(userId, language, now?): Promise<VocabularyReviewState[]>   // due <= now, oldest first
reviews.recordReview(userId, language, wordId, outcome): Promise<VocabularyReviewState>
```

`progress.getStreak(userId)` still returns `Streak` (`{ userId, days }`) and now also carries `best`. It is computed from real activity history — new learners get `{ days: 0, best: 0 }`, nothing is fabricated.

### Error behaviour

- Unknown lesson id in `completeLesson`/`recordAttempt` → rejects with `Unknown lesson "<id>"`.
- Unknown word or word of another language in `recordReview` → rejects with `Unknown "<language>" vocabulary entry "<wordId>"`.
- Storage write failures: `completeLesson` keeps existing behaviour (save first, then publish, so a retry sees the same state; `sign_out_not_persisted`-style handling lives in auth). Reads of corrupted data never throw to the UI: records are validated individually (`services/repositories/savedData.ts`) and bad ones are silently dropped, falling back to seed defaults.
- `setDailyGoal` clamps instead of rejecting (5 minutes..24 h).

## 3. Key models (all in `src/types/index.ts`)

```ts
interface Lesson { unitId?, instructions?: Localized }            // optional content additions
interface Vocabulary { exampleSentence?: string, note?: Localized }
interface Unit { id, levelId, order, title }                       // model ready, unused by data
interface LessonAttempt { id, userId, lessonId, targetLanguage, attemptedAt, result: LessonResult, completed }
interface ActivityDay { userId, day: 'YYYY-MM-DD', minutes, xp, lessonsCompleted, correctAnswers }
interface VocabularyReviewState { userId, targetLanguage, wordId, step, correctCount, wrongCount, lastReviewedAt, nextReviewAt }
type ReviewOutcome = 'again' | 'difficult' | 'good' | 'easy'
interface Recommendation { kind: RecommendationKind, lessonId?, score, reason }
```

`completed: true` only on runs that actually completed the lesson; attempted-but-failed runs are preserved separately. Minutes are lesson estimates (the app cannot measure wall-clock study reliably) — do not present them as precise time.

## 4. The SRS algorithm (documented shortcuts and limits)

Ladder = 1, 3, 7, 14, 30, 90 days. Step 0 is new/relearning.

| Outcome | Step | Interval used |
|---|---|---|
| `again` | reset to 0 | 0 — due immediately |
| `difficult` | −1 (floor 0) | interval of the fallen rung |
| `good` | +1 (cap last) | interval of the current rung |
| `easy` | +1 (cap last) | interval of the **new** rung |

Limits (do not market beyond this): fixed ladder, no ease factor, no per-user tuning, no intraday spacing except `again`, no scientific-effectiveness claim.

## 5. Recommendations

`getRecommendations({ progress, attempts, dueVocabulary, plan, lessons? })` returns rules sorted by `score` descending: `daily-goal` (60) > `review-due` (50+min) > `retry-lesson` (45, latest attempt of the current lesson under 60%) > `continue-lesson` (40; covers the new-user empty state, since `currentLessonId` is the first lesson) > `continue-unit` (30; only when the current lesson really has `unitId` in content). `reason` is plain English for debugging; UI copy is the caller's job. No AI, no randomness.

## 6. Persistence & migration notes

- Same blob `lughati.learning-progress.v1` now may also contain `attempts` (`userId:language → LessonAttempt[]`, newest last, capped at 500) and `activity` (`userId:day → ActivityDay`). Both fields are **optional** and every stored record is validated individually; blobs written by older builds (without these fields) parse unchanged — covered by tests in `src/services/repositories/savedData.test.ts`.
- Review states live in a new key `lughati.vocab-reviews.v1` shaped `{ reviews: { "userId:wordId": VocabularyReviewState } }`, validated per record with the same drop-bad-not-all policy.
- Days are always the learner's **local** calendar day (`savedData.dayOf`), matching the existing plan-reset logic. Do not introduce UTC-day math anywhere else.

## 7. What Agent 2 may not do

- Do not add a second scheduler, streak calculator, or recommendation engine — extend the existing ones.
- Do not read `AsyncStorage` directly from screens.
- Do not treat read failures as "new user" silently discarding visible data (seed fallback inside repositories is the sanctioned path).
- Do not start new per-day counters without a plan reset; reuse `plans` day-reset behaviour.
