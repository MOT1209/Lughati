# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lughati (لغتي) is a language-learning app for Arabic speakers: Expo SDK 57 + React Native 0.86 + TypeScript (`strict`), targeting Android first via **Expo Go** (no custom native code). Phase 1 only: foundation, mock data, no network, no real AI, no lessons. The README and TESTING.md are written in Arabic.

## Commands

```bash
npm install
npx expo start --lan            # then scan the QR in Expo Go (same Wi-Fi), or enter exp://<LAN-IP>:8081
npm run typecheck               # tsc --noEmit
npm run lint                    # expo lint (ESLint 9 flat config, eslint-config-expo)
npm test                        # jest (jest-expo preset)
npx jest src/utils/routing.test.ts          # one file
npx jest -t "meets WCAG AA"                 # one test by name
npx expo-doctor                 # dependency/config check (needs network for the schema check)
npx expo export --platform android          # proves the bundle builds
```

Always add packages with `npx expo install <pkg>` (resolves SDK-compatible versions). Run typecheck + lint + tests before calling work done.

Expo SDK 57 postdates most model knowledge: before touching an Expo/RN API, check `https://docs.expo.dev/versions/v57.0.0/` (index: `https://docs.expo.dev/llms.txt`). Doc pages for RTL and `Stack.Protected` mention "SDK 58+" features; `Stack.Protected`'s `redirectTo` is **not** available on 57.

## Pinned versions that look wrong but aren't
- `@testing-library/react-native` is pinned to **13.3.3** and `react-test-renderer` to **19.2.3**: RNTL 14 pulls `test-renderer`/`react-reconciler` that require React 19.3, but Expo pins React 19.2.3.
- `tsconfig.json` sets `"types": ["jest"]` because TypeScript 6 no longer auto-loads `@types/*`.
- `jest.setup.ts` mocks AsyncStorage and the Ionicons font (async glyph loading causes `act()` noise).

## Architecture

Routes live in `src/app/` (Expo Router; `@/*` → `src/*`). Keep routes thin; logic lives in `services/`, `store/`, `hooks/`, `utils/`.

**Navigation / auth guard.** `src/app/_layout.tsx` renders `null` (native splash held) until fonts, persisted preferences, auth init and locale are all ready. It then mounts `Stack.Protected` groups driven only by `getRouteAccess(hasSession)` (`utils/routing.ts`): `(auth)` when signed out, `(app)` when signed in. `app/index.tsx` is the Splash decision (`resolveInitialRoute`: session → home, else onboarding-seen → login, else onboarding). After sign-in/out, screens `router.replace('/')` so Splash re-resolves. `(app)` is a Stack over `(tabs)` (home/learn/progress/profile) with `language-selection` and `settings` on top. Route strings come from `ROUTES`.

**Swappable service seams (mock today, real backend later).** Each has one registration point so screens never import a concrete implementation:
- `services/auth`: `AuthService` interface (+ `MockAuthService`, in-memory session, `registerAuthService`). `store/authStore.ts` derives session state **only** from `onAuthStateChange`. Sign-in request types are a union keyed on `method` for future Google/Apple.
- `services/repositories`: `Repositories` interfaces + `createMockRepositories()` over `src/mocks/*`; `getRepositories()`/`registerRepositories()`. Screens read data via `hooks/useCurrentLearning` / `useAsyncData`.
- `services/ai`: `AIProvider` + `MockAIProvider`, `registerAIProvider`/`getAIProvider`. No keys, nothing implemented beyond the mock.

Mock auth test hooks: any valid email + 8+ char password signs in; emails starting `fail@` → invalid credentials, `offline@` → network error, `taken@` → email in use (sign-up). Mock sessions are lost on app restart.

**Data model** (`src/types`): source language and target language are separate concepts; `Language.roles` (`'source' | 'target'`) controls what is selectable (the selection screen calls `languages.getTargets()`). Learner level lives on `Progress` (per target language), not on `User`. Adding a language = adding an entry in `mocks/languages.ts` (+ lessons/progress seeds).

**i18n and RTL.**
- `i18n/locales/ar.ts` is the source of truth: its shape types `Translation` (`i18n/types.ts`) and the i18next key typing (`i18n/i18next.d.ts`). `en.ts` must match; `i18n.test.ts` enforces key parity (ignoring plural suffixes). Arabic plurals need all six suffixes (`_zero…_other`). No literal UI strings in screens; the app name is `t('app.name')` (also `app.json` name and `constants/app.ts` `APP_NAME`: the only three places).
- Locale = manual preference, else device language, else Arabic (`i18n/resolveLocale.ts`). Layout direction is applied through `services/direction.ts` (`I18nManager.allowRTL/forceRTL`); a changed direction only takes effect after a reload (`DevSettings.reload`), and **Expo Go resets runtime RTL overrides**, so manual language switching behaviour on device is unverified (see TESTING.md).
- Use logical style props (`marginStart`, `start/end`), `Icon directional` for arrows, and `utils/bidi.ts` (`isolate`, `isolateLtr`, `isolateNative`) around mixed-script text.

**Theme.** `useTheme()` (`hooks/useTheme.ts`) combines the persisted preference with the OS scheme (`theme/resolveScheme.ts`). Palettes are in `theme/colors.ts`; `theme.test.ts` asserts every text/background pair is ≥ 4.5:1 and light/dark define identical tokens, so change colors together with that test. Cairo is used via explicit per-weight font families (`theme/typography.ts`), not `fontWeight`.

**Persistence rule.** AsyncStorage (`store/preferencesStore.ts`, zustand `persist` with `partialize`) holds only theme, UI language and `onboardingSeen`. The selected learning language (`store/learningStore.ts`) and session are memory-only by design in Phase 1.

## Git
This folder is its own git repo (remote `origin` → `https://github.com/MOT1209/Lughati.git`, branch `main`) nested inside a larger monorepo whose root is two levels up with unrelated remotes. Run git commands from this directory and never push the parent repo to this remote.
