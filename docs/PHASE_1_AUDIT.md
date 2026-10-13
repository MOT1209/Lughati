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
- **Dependencies:** `npm audit --omit=dev` reports 61 findings (16 moderate, 45 high) that trace to 5 advisories. Fully analysed in [`docs/audit/DEPENDENCY_AUDIT.md`](./audit/DEPENDENCY_AUDIT.md) (raw output in `docs/audit/npm-audit-omit-dev.json`); summary in §9.
- At the time of the first audit no CI existed; `.github/workflows/ci.yml` was added in the final verification (§9).

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


---

## 9. Final verification (branch `fix/phase-1-final-verification`)

Results below were produced in the same container as §5 (Node 22.22.0, npm 10.9.4). **No physical device or emulator was used.**

### 9.1 Changes
| Area | Change | Verified by |
|---|---|---|
| Persisted learning data | New `services/repositories/savedData.ts`: every stored progress/plan record is validated individually and dropped if invalid: unknown language/level/lesson ids, lessons of another language, duplicate or already-completed current lessons, a level above A1 without the lower levels finished, negative/fractional/absurd XP, minutes and word counts (word count capped by the course size), `levelProgress` outside 0..1, bad goal/minutes/day, and records stored under a key that does not match their own user and language (also blocks `__proto__` keys). Valid records survive and the app starts. | `savedData.test.ts` (50 cases incl. integration with the repositories and a full-course round trip proving app-written data always validates) |
| Stored session | `isSession` now also requires a normalized email, an id consistent with that email, supported languages and a parsable timestamp. | `services.test.ts` › "ignores a stored session with …" |
| Sign-out | If the stored session cannot be removed, `signOut()` still ends the session for this run but **rejects with `sign_out_not_persisted`**; Settings shows an alert saying the saved session may return after a restart (previously the failure was swallowed and sign-out looked durable). Other sign-out errors leave the button usable. | `services.test.ts`, `settingsAndLayout.test.tsx` |
| Language change | `Settings.onLanguageChange` had an unhandled rejection when applying the language failed. It now reverts the preference and shows `settings.languageChangeFailed`. | `settingsAndLayout.test.tsx` (fails when the fix is reverted: checked) |
| Mock labelling | Login and register screens now show a `auth.demoNotice` caption: sign-in is simulated, verifies no identity and sends nothing to a server. | typecheck + i18n key parity test |
| Root layout / Settings tests | New `navigation/settingsAndLayout.test.tsx`: layout starts and hides the splash; starts if applying the language fails; starts signed out if reading the session fails; keeps the splash while preferences load; Settings sign-out and language-change failures. Reverting the layout/Settings fixes makes the corresponding tests fail (mutation check done by hand). | itself |
| CI | `.github/workflows/ci.yml`: `npm ci` → typecheck → lint → `npm test -- --runInBand` → `npx expo export --platform android`; Node 22, npm cache, `permissions: contents: read`, no secrets, concurrency group, 20 min timeout. | Each step was run locally with the same commands. **The workflow itself has not run on GitHub yet** (it needs a push/PR to execute). |
| Dependencies | **No change** to `package.json` / `package-lock.json`. | `DEPENDENCY_AUDIT.md` |

### 9.2 Dependency audit summary
61 findings = 5 advisories (`decode-uri-component`, `braces`, `node-forge`, `sprintf-js`, `uuid`). A source-map export of the Android bundle shows that only `decode-uri-component` (via `expo-router` → `query-string@7`) ships in the app, with a theoretical deep-link availability impact. Its only patched release (0.5.0) is ESM-only and returns an object when `require()`d (checked), which would break `query-string@7`; `braces`, `node-forge` and `sprintf-js` have no patched release; `uuid@7` is used by prebuild tooling with an unused vulnerable path. `npm audit`'s suggested "fixes" are downgrades/major jumps (e.g. `expo@44`) and were not applied. Nothing was fixed; everything is documented with reasons in `docs/audit/DEPENDENCY_AUDIT.md`.

### 9.3 Test results
| Command | Result | Output / reason | Existed before? |
|---|---|---|---|
| `npm ci` | PASS | exit 0 | – |
| `npm run typecheck` | PASS | exit 0 | – |
| `npm run lint` | PASS | exit 0, no warnings or errors | – |
| `npm test -- --runInBand` | PASS | 16 suites, **319 tests** (254 at the end of §5) | – |
| `CI=1 npx expo export --platform android` | PASS | Hermes bundle written, exit 0 | – |
| `npx expo-doctor` | **BLOCKED (partial)** | 19/21 checks passed; the 2 failures (config schema, React Native Directory) need network (`getaddrinfo ENOTFOUND exp.host`) | environment |
| `npm audit --omit=dev` | 61 findings, unresolved | see 9.2 | yes |
| GitHub Actions workflow run | **NOT RUN** | cannot execute GitHub runners from this container | – |
| Android/iOS device or emulator | **NOT RUN** | no device available | – |

### 9.4 Remaining risks and limitations
- **High:** nothing has been run on a device (auth flow, protected routes, RTL/LTR switching with reload, keyboard behaviour). The new CI workflow has never executed on GitHub.
- **Medium:** 61 audit findings remain (analysed; 1 advisory reaches the bundle, low practical impact); `expo-doctor` network checks unrun; other accounts' local progress remains on the device after sign-out (by design, to be revisited with a real backend).
- **Low:** the mock auth/ID model (`user-<email>`) offers no ownership proof (clearly labelled as a demo in UI and docs); streak and seeded progress for `de`/`fr` are fabricated mock data; the persisted-session validation is mock-specific and must be replaced with real token handling later.
- **Deferred:** real backend/auth, real AI, notifications, persisted target-language choice.

### 9.5 Readiness
**Stable at the code/test level but not yet device-verified.** Recommendation: Phase 1 can be closed *as a code-level phase* once the CI workflow has run green on GitHub; closing it as "device-verified" requires the TESTING.md checklist on a real Android device.
