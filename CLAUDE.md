# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lughati (لغتي) is a language-learning app for Arabic speakers: Expo SDK 57 + React Native 0.86 + TypeScript (`strict`), targeting Android first via **Expo Go** (no custom native code). Phase 1 foundation plus local, offline A1 lessons: no network, no real AI. The README and TESTING.md are written in Arabic.

## Commands

```bash
npm install
npx expo start --lan            # scan the QR in Expo Go (same Wi-Fi), or enter exp://<LAN-IP>:8081
npm run typecheck               # tsc --noEmit (see the typed-routes caveat below)
npm run lint                    # expo lint (ESLint 9 flat config, eslint-config-expo)
npm test                        # jest (jest-expo preset); the full suite takes ~2.5 min
npx jest src/utils/routing.test.ts          # one file
npx jest -t "meets WCAG AA"                 # one test by name
npx expo-doctor                 # dependency/config check (the schema check needs network)
npx expo export --platform android          # proves the bundle builds
```

Always add packages with `npx expo install <pkg>` (resolves SDK-compatible versions). Run typecheck + lint + tests before calling work done.

Expo SDK 57 postdates most model knowledge: before touching an Expo/RN API, check `https://docs.expo.dev/versions/v57.0.0/` (index: `https://docs.expo.dev/llms.txt`). Some doc pages (RTL, `Stack.Protected` `redirectTo`) describe "SDK 58+" behaviour that is not available on 57.

## Gotchas
- **Typed routes vs `tsc`.** `experiments.typedRoutes` is on. `tsc` passes on a fresh checkout, but once `expo start` has generated the git-ignored `.expo/types/router.d.ts`, `router.push(`/lesson/${id}`)` in `(tabs)/home.tsx` and `(tabs)/learn.tsx` fails (dynamic hrefs must be `{ pathname: '/lesson/[id]', params: { id } }`). Use the object form for new dynamic links.
- `@testing-library/react-native` is pinned to **13.3.3** and `react-test-renderer` to **19.2.3**: RNTL 14 needs React 19.3 while Expo pins 19.2.3.
- `tsconfig.json` sets `"types": ["jest"]` because TypeScript 6 no longer auto-loads `@types/*`.
- `jest.setup.ts` mocks AsyncStorage and the Ionicons font (async glyph loading causes `act()` noise).
- Jest runs in **`Asia/Riyadh` (UTC+3)**, set by `jest.global-setup.js` (setting `process.env.TZ` inside a test file has no effect). Calendar days come from `utils/day.ts` `dayOf` (local), never `toISOString().slice(0, 10)` (UTC).
- Cairo fonts are imported per weight (`@expo-google-fonts/cairo/400Regular`, …) so the bundle does not carry every weight.

## Architecture

Routes live in `src/app/` (Expo Router; `@/*` → `src/*`) and stay thin; logic lives in `services/`, `store/`, `hooks/`, `utils/`.

**Navigation / auth guard.** `app/_layout.tsx` renders `null` (native splash held) until fonts (or a font error), persisted preferences, auth init and locale are all ready, then renders `navigation/RootNavigator.tsx`: `Stack.Protected` groups driven only by `getRouteAccess(hasSession)` (`utils/routing.ts`), `(auth)` when signed out and `(app)` when signed in. `app/index.tsx` is the Splash decision (`resolveInitialRoute`: session → home, else onboarding-seen → login, else onboarding); after sign-in/out, screens `router.replace('/')` so Splash re-resolves. `(app)` is a Stack over `(tabs)` (home/learn/review/progress/profile) with `language-selection`, `settings` and `lesson/[id]` on top. Route strings come from `ROUTES`.

**Swappable service seams (mock today, real backend later).** Each has one registration point so screens never import a concrete implementation:
- `services/auth`: `AuthService` (+ `MockAuthService`, `registerAuthService`). `store/authStore.ts` derives session state **only** from `onAuthStateChange`. Request types are a union keyed on `method` for future Google/Apple. The mock persists the session (user + timestamp, never a password) under `STORAGE_KEYS.session`, so restarts restore it. Test hooks: any valid email + 8+ char password signs in; emails starting `fail@` → invalid credentials, `offline@` → network error, `taken@` → email in use (sign-up).
- `services/repositories`: `Repositories` interfaces + `createMockRepositories({ storage, now })` over `src/mocks/*`; `getRepositories()`/`registerRepositories()`. The default instance uses device storage, so finished lessons and study minutes persist per `userId:language` (study minutes reset per calendar day); tests get isolated in-memory storage. `completeLesson` is serialized and saves before publishing state. Screens read data via `hooks/useCurrentLearning`, `useLessonList`, `useAsyncData`.
- `services/ai`: `AIProvider` + `MockAIProvider`, `registerAIProvider`/`getAIProvider`. Nothing beyond the mock.
- `services/storage.ts`: the `KeyValueStorage` seam (`deviceStorage` = AsyncStorage, `createMemoryStorage()` for tests).

**Data model** (`src/types`): source and target language are separate concepts; `Language.roles` controls what is selectable (`languages.getSources()`/`getTargets()`; every language has both roles). The learner level lives on `Progress` (per target language); the streak is per user (`Streak`), not per language. Adding a language = an entry in `mocks/languages.ts` plus lessons/vocabulary/progress seeds.

**Lessons (offline).** Ten A1 lessons per language: outline in `mocks/lessons.ts` (`a1Templates`), words in `mocks/vocabulary.ts` at the same index, exercises generated deterministically from the vocabulary (`utils/exercises.ts`: distractors and answer position come from a generator seeded by the exercise id, never `Math.random`). Pure rules: `utils/progression.ts` (a run completes its lesson only at `PASS_RATIO` = 70% correct; a failed run keeps the lesson current but still earns XP without the bonus (`lessonXp`) and minutes; level rises when all lessons of the level are done; XP/study time count on replay, new words don't), `utils/lessonSession.ts` (quiz state machine). After sign-in every account chooses its own (source) language and the language to learn (`(app)/setup-languages`, persisted per user by `repositories.profiles` under `STORAGE_KEYS.learningProfile`); the splash sends accounts without a choice there. `store/learningStore.ts` holds that `profile` and `progressVersion`, which screens use to reload after a lesson. Meanings are shown in the source language (`meaningOf(word, source)`); every word carries meanings in all other course languages. New accounts start with empty progress and a streak of 0; the streak is computed from recorded activity days (`utils/streaks.ts`); a lesson run or a vocabulary review records the day, a practice-game run does not. A passed lesson puts each of its words that has no review state yet on the review schedule (`repositories.reviews`, `STORAGE_KEYS.vocabReviews`, first due one day later via `initialReviewState`); all scheduling lives in `utils/srs.ts`, and the Review tab shows the due words.

**i18n and RTL.**
- `i18n/locales/ar.ts` is the source of truth: it types `Translation` (`i18n/types.ts`) and the i18next key typing (`i18n/i18next.d.ts`). `en.ts` must match; `i18n.test.ts` enforces key parity (ignoring plural suffixes). Arabic plurals need all six suffixes (`_zero…_other`). No literal UI strings in screens; the app name is `t('app.name')` (it appears only in `app.json` and the locale files).
- `services/appLanguage.ts` `applyLanguagePreference` is the single path from the stored preference to i18n **and** native layout direction (startup and Settings both call it). Locale = manual preference, else device language, else Arabic (`i18n/resolveLocale.ts`). A changed direction needs a reload via `reloadApp()` (`reloadAppAsync` from `expo`; `DevSettings.reload` is a no-op outside `__DEV__`). **Expo Go resets runtime RTL overrides**, so manual language switching on a device is unverified (see TESTING.md).
- Use logical style props (`marginStart`, `start/end`), `Icon directional` for arrows, and `utils/bidi.ts` (`isolate`, `isolateLtr`, `isolateNative`) around mixed-script text. Languages are shown with a decorative flag (`LanguageBadge`, `Language.flag`) next to the name, which is what screen readers announce.

**Theme.** `useTheme()` combines the persisted preference with the OS scheme (`theme/resolveScheme.ts`). Palettes are in `theme/colors.ts`; `theme.test.ts` asserts text/background pairs are ≥ 4.5:1, interactive borders (`borderStrong`) ≥ 3:1, and that light/dark define identical tokens, so change colors together with that test. Cairo is used via explicit per-weight font families (`theme/typography.ts`), not `fontWeight`.

**Persistence.** AsyncStorage keys are in `STORAGE_KEYS`: preferences (`store/preferencesStore.ts`, zustand `persist` with `partialize`: theme, UI language, `onboardingSeen`), the mock session, and learning progress. Reads of stored blobs are defensive: corrupt data is treated as "nothing saved".

## Git
This folder is its own git repo (remote `origin` → `https://github.com/MOT1209/Lughati.git`, branch `main`) nested inside a larger monorepo whose root is two levels up with unrelated remotes; run git from this directory and never push the parent repo here. `origin/main` also receives pull-request merges from other sessions (`claude/*`, `fix/*` branches), so `git fetch` and rebase before pushing, and never force-push.
