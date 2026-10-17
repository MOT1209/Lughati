This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## This project (Lughati / لغتي)

Read `CLAUDE.md` first: it has the commands, gotchas and the architecture (service seams, i18n/RTL rules, theme, lessons, persistence, brand/release/website, git workflow). Short version for any agent:

- **Language:** replies to the owner in Arabic first, then German. UI strings only through `t()`; add keys to `src/i18n/locales/ar.ts` first, then `en.ts` (Arabic plurals need all six suffixes).
- **Theme:** use `useTheme()` tokens and avoid literal colours in screens (the few translucent white overlays on the hero are the exception). New colour tokens go in `src/theme/colors.ts` together with a contrast pair in `src/theme/theme.test.ts` (≥ 4.5:1 for text).
- **Layout:** logical style props (`marginStart`, `start/end`), `Icon directional` for arrows, `utils/bidi.ts` around mixed-script text. Verify nothing depends on LTR.
- **Design:** reuse `ScreenHero`, `BrandHero`, `HeroProgress`, `StreakChip`, `Button variant="gold"` and the `components/home/*` parts instead of new one-off styles.
- **Seams:** screens never import a concrete auth/repository/AI implementation; register replacements via `registerAuthService` / `registerRepositories` / `registerAIProvider`.
- **Honesty:** the app is offline with a mock sign-in; do not claim real accounts, sync, store availability or device-verified behaviour that was not verified. Say what was and was not tested.
- **Git:** work on the branch the session names, never force-push, merge to `main` (PR) only when the owner asks.
- **Generated files:** `site/*.html` (from `scripts/build-site.py`) and the icon/store PNGs (from `scripts/render-icons.js`) are generated; edit the sources.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint, typecheck and the jest suite before declaring any task done (`npx expo lint --max-warnings 0`, `npx tsc --noEmit`, `npx jest`).

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
