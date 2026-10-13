# Lughati — Phase 1 Audit & Stabilization Report

Branch: `fix/phase-1-stabilization` (from `claude/stoic-knuth-n2cfsd` @ `64f8bb5`, identical to `origin/main`). Environment: Linux container, Node 22.22.0, npm 10.9.4, **no device or emulator**.

## 1. Architecture summary
Expo SDK 57 / RN 0.86 / TypeScript strict / Expo Router (typed routes, React Compiler). Routes in `src/app` are thin; logic is in `services/`, `store/`, `hooks/`, `utils/`. Swappable seams: `AuthService`, `Repositories`, `AIProvider`, `KeyValueStorage`. Zustand stores: preferences (persisted via AsyncStorage), auth (driven only by `onAuthStateChange`), learning (memory only). i18n: `ar` (source of truth) + `en`, key parity enforced by test. No CI workflow, no `.env*` files, no backend.

## 2. Implementation status (verified against code, not README)
| Area | Status |
|---|---|
| Auth (register/login/logout/restore) | **Mock.** Any valid email + 8+ chars signs in; the password is never stored or checked. Provides **no** identity verification or security. Session (user + timestamp) persisted in AsyncStorage. |
| Route protection | Real logic (`Stack.Protected` driven by session presence); covered by tests. Not exercised on a device. |
| Lessons / exercises / quiz / progression | Real local logic over mock data: 10 A1 lessons × 6 languages, deterministic exercises, XP/level rules, tested. |
| Progress persistence | Real (AsyncStorage), per `userId:language`. |
| Streak (7 days) and seeded progress for `de`/`fr` (XP, words, minutes) | **Fabricated mock data** shown as the user's own. Intentional for Phase 1 but not real tracking. |
| Daily reminder switch | UI only; no permission requested, no notification scheduled. |
| AI service | Mock only (`MockAIProvider`); no screen presents real AI. |
| Language / RTL switching | Logic implemented and unit-tested; **runtime behaviour in Expo Go is unverified** (Expo Go resets runtime RTL overrides). |
| Theme | Implemented; WCAG contrast asserted by tests. |

## 3. Verified defects (each reproduced by a failing test before the fix)
| # | Severity | Defect | File |
|---|---|---|---|
| D1 | Medium | "Minutes studied today" reset at **UTC** midnight (`toISOString`), i.e. at 03:00 for Arabia/UTC+3 users. | `services/repositories/mock.ts` |
| D2 | Medium | Saved progress entries were cast, not validated. One entry with an unknown `levelId` made every later `completeLesson` throw (`levels[-1]!`), so the lesson could never be saved ("save failed" forever). | `services/repositories/mock.ts` |
| D3 | Medium | Unknown persisted `languagePreference` (e.g. `"xx"`) was accepted: text falls back to Arabic but layout direction is computed as LTR → Arabic UI in LTR. Same for theme/onboarding values. | `store/preferencesStore.ts` |
| D4 | Medium | Session persistence was fire-and-forget: `signOut()` resolved before the stored session was removed, so a kill right after sign-out could restore the session. | `services/auth/MockAuthService.ts` |
| D5 | Medium | If reading the session threw, `initialized` never became true → permanent splash. Similarly, a rejected `applyLanguagePreference` kept `localeApplied` false forever. | `store/authStore.ts`, `app/_layout.tsx` |
| D6 | Low | Settings: a failing `signOut` left the button in loading state with an unhandled rejection. (Fix only; no UI test exists for this screen.) | `app/(app)/settings.tsx` |
| D7 | Low (docs) | README said the session is memory-only; it is persisted. | `README.md` |

## 4. Security & reliability findings
- **No hardcoded secrets, no `console.*` logging, no `.env` files** (grep over `src`). `.gitignore` covers `.env*.local`, keys and certificates.
- **Passwords are not persisted** (session = user + timestamp). Confirmed by existing and new tests.
- **Account isolation:** progress keys are `userId:language` with `userId = user-<normalized email>`; no cross-account leakage found (existing test "keeps users separate"). On logout the learning store is reset; progress of other accounts intentionally stays on the device (not wiped on logout) — a privacy decision to revisit before a real backend.
- **Not a vulnerability but a limitation:** the mock `userId` is derived from an email without any proof of ownership; anyone typing an email gets that "account"'s local data. Only acceptable because auth is a mock.
- **Dependencies:** `npm audit --omit=dev` reports 61 findings (16 moderate, 45 high), all in the Expo build/config tooling chain (`@expo/config*`, `expo-splash-screen` plugin dependencies). Not assessed for exploitability in this app's threat model; **not fixed** (a forced upgrade would change the SDK tree, which this phase forbids without demonstrated need).
- No CI exists, so nothing enforces the checks below on pull requests.

## 5. Test results
Executed in this container. "Pre-existing" = same result on the untouched baseline.

| Command | Result | Output / reason | Pre-existing? |
|---|---|---|---|
| `npm ci` | PASS | Installed; lockfile consistent. 61 audit findings (see §4). | n/a |
| `npm run typecheck` | PASS | exit 0 (baseline and after) | – |
| `npm run lint` | PASS | exit 0 (baseline and after) | – |
| `npm test -- --runInBand` (baseline) | PASS | 14 suites, 249 tests | – |
| New regression tests, before fixes | FAIL (5) | D1–D5 reproduced | yes (defects pre-existed) |
| `npm test -- --runInBand` (after) | PASS | 14 suites, **254 tests** | – |
| `npx expo export --platform android` | PASS | Android Hermes bundle (~3 MB) built, before and after changes | – |
| `npx expo-doctor` | **BLOCKED / FAIL (2 of 21)** | 19/21 passed. "Config schema" failed (`getaddrinfo ENOTFOUND exp.host`) and "React Native Directory" check failed (unexpected server response): both need network access this sandbox lacks. No project-level problem reported by the other 19 checks. | environment |
| Android/iOS device or emulator run | **NOT RUN** | No device available | – |

## 6. Fix summary
| File | Change | Verified by |
|---|---|---|
| `src/services/repositories/mock.ts` | Day key uses local calendar day; stored progress/plan entries are validated individually, bad ones dropped (D1, D2) | `services.test.ts` › "reset at local midnight", "discards a saved progress entry…" |
| `src/store/preferencesStore.ts` | `merge` sanitizes theme/language/onboarding values (D3) | `stores.test.ts` › "invalid saved values" |
| `src/services/auth/MockAuthService.ts` | Persistence awaited (still best-effort on failure) (D4) | `services.test.ts` › "signOut resolves only after…" + existing "survives a storage that throws" |
| `src/store/authStore.ts` | `init` tolerates a failing `getSession` (D5) | `stores.test.ts` › "finishes initialization even if reading the session fails" |
| `src/app/_layout.tsx` | Locale gate always opens (D5) | typecheck/lint only — no root-layout test exists |
| `src/app/(app)/settings.tsx` | `signOut` errors handled (D6) | typecheck/lint only — no test for this screen |
| `README.md` | Session persistence statement corrected (D7) | review |
| `docs/PHASE_1_AUDIT.md` | This report | – |

## 7. Remaining work
- **Critical:** none confirmed.
- **High:** (a) verify on a real Android device/emulator: auth flow, protected routes, lesson flow, keyboard/safe areas, RTL↔LTR switching with reload (TESTING.md checklist); (b) add CI (typecheck, lint, tests, export) — none exists.
- **Medium:** triage the 61 `npm audit` findings against the Expo SDK 57 patch releases; decide whether to wipe or keep other accounts' local progress on logout; add UI tests for Settings and the root layout (D5/D6 are untested at screen level); `expo-doctor` re-run with network access.
- **Low:** `AsyncStorage` `partialize`d preference writes are not validated beyond the three fields; accessibility audit with TalkBack/VoiceOver; manual check of small screens/large fonts.
- **Deferred:** real backend/auth, real AI, notification scheduling, real streak/XP tracking, persisted target-language choice.

## 8. Final readiness assessment
**Stable at the code/test level but not yet device-verified.** The project installs, type-checks, lints, passes 254 tests and produces an Android bundle. No physical-device or emulator testing happened, and `expo-doctor` could only partially run.
