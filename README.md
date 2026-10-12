# Lughati (لغتي)

Mobile app for Arabic speakers who learn several languages (German, English, Spanish, French,
Turkish). Built with Expo, React Native and TypeScript (`strict`). Android first, iOS later.

Status: Phase 1 foundation in progress. The app currently shows a placeholder entry screen;
navigation, screens and the design-system components are still to be built.

## Commands

```bash
npm install
npx expo start      # dev server; open on a real device with Expo Go
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest
```

Install packages with `npx expo install <package>` so versions match the installed Expo SDK.

## Structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router routes only (thin) |
| `src/types/` | Domain model (User, Language, Lesson, Progress, ...) |
| `src/theme/` | Colors (light/dark), spacing, radius, shadows, typography |
| `src/i18n/` | i18next setup, `ar` and `en` locale files, locale resolution |
| `src/store/` | Zustand stores (persisted preferences) |
| `src/services/` | Service interfaces and implementations (auth, layout direction) |
| `src/mocks/` | Mock data used instead of a backend |
| `src/utils/` | Pure helpers (validation, bidi isolation) |
| `src/constants/` | App constants, including `APP_NAME` |

## Conventions

- UI language and layout direction (RTL/LTR) follow the device language, Arabic by default;
  the user can override it in Settings. No literal UI strings in screens: use the locale files.
- The product name lives in `app.json`, `APP_NAME` and the `app.name` locale key only.
- Run `npm run typecheck`, `npm run lint` and `npm test` before committing.
