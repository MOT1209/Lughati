# Dependency audit (`npm audit --omit=dev`)

- Date: 2026-10-13 · npm 10.9.4 · Node 22.22.0 · lockfile at the time of the audit: `package-lock.json` of branch `fix/phase-1-final-verification`.
- Full raw output (preserved, unedited): [`npm-audit-omit-dev.json`](./npm-audit-omit-dev.json).
- Result: **61 findings (16 moderate, 45 high, 0 critical)**. Only **5 distinct advisories** exist; the other 56 entries are packages that merely *depend on* a vulnerable package.
- Note: `--omit=dev` still lists `jest` because `expo-router` declares `@testing-library/react-native` (→ `jest`) as a peer; Jest is test-only and is never shipped.

## 1. The five root advisories

| Package | Installed | Advisory | Severity | Affected | Patched version exists? | Dependency path |
|---|---|---|---|---|---|---|
| `decode-uri-component` | 0.2.2 | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) DoS via exponential decoding of malformed percent-encoded input | moderate | <=0.4.2 | 0.5.0 only | `expo-router` → `query-string@7.1.3` → `decode-uri-component` |
| `braces` | 3.0.3 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) stack-exhaustion DoS on deeply nested patterns | high | <=3.0.3 | none (3.0.3 is the latest release) | `jest` → `@jest/core` → `micromatch` → `braces` |
| `node-forge` | 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements | high | <=1.4.0 | none (1.4.0 is the latest release) | `expo` → `@expo/cli` → `node-forge` (and `@expo/code-signing-certificates`) |
| `sprintf-js` | 1.0.3 | [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) DoS via unbounded precision specifiers | moderate | <=1.1.3 | none (1.1.3 is the latest release) | `jest` → `babel-plugin-istanbul` → … → `js-yaml@3` → `argparse@1` → `sprintf-js` |
| `uuid` | 7.0.3 | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) missing buffer bounds check in v3/v5/v6 when `buf` is provided | moderate | <11.1.1 | 11.1.1+ | `expo-splash-screen` → `@expo/config-plugins` → `xcode@3.0.1` → `uuid@7` |

## 2. Build-time versus runtime exposure

I exported the Android bundle with a source map and listed the `node_modules` packages Metro actually put into the app (68 packages, 1359 modules). Of the five vulnerable packages, **only `decode-uri-component` is in the shipped app**; the other four are not in the bundle.

| Package | In the shipped app? | Where it runs | Realistic exposure in Lughati |
|---|---|---|---|
| `decode-uri-component` | **Yes** (via `expo-router`'s `query-string`) | On device, when router URLs / deep links are parsed (`lughati://…`) | A crafted deep link with a very long malformed percent-sequence could stall the JS thread (**availability only**, no data exposure, no code execution). Another app on the same phone would have to send the link. Not exploitable remotely. Severity in practice: low. **Potential, not a demonstrated issue in this app.** |
| `braces` | No | Developer machine / CI (Jest, Metro file matching) | Needs attacker-controlled glob patterns in the build tooling; none exist. |
| `node-forge` | No | Developer machine (`@expo/cli` code-signing helper) | Only matters when verifying RSA signatures from untrusted parties in the CLI; the app never calls it. |
| `sprintf-js` | No | Developer machine (Jest coverage / YAML parsing in tooling) | Needs attacker-controlled format strings; none exist. |
| `uuid@7` | No | Developer machine (`expo prebuild`, config plugins via `xcode`) | The vulnerable code path is `v3/v5/v6` with a `buf` argument; `xcode` uses `v4()` only. Not used by Expo Go or `expo export`. |

## 3. Remedies evaluated (SDK 57 / RN 0.86 compatibility)

`npm audit` proposes `expo@44.0.6`, `react-native@0.72.17`, `jest@30.5.2` and `expo-router@58.0.18`. These are **downgrades or major jumps** that are incompatible with Expo SDK 57 / React Native 0.86.3 (the Expo packages are pinned by the SDK to `~57.x`; `expo-doctor`/`expo install --check` rely on that). None of them was applied. `npm audit fix --force` was **not** run.

| Candidate fix | Verified outcome | Decision |
|---|---|---|
| Override `decode-uri-component` to 0.5.0 | 0.5.0 is **ESM-only** (`"type": "module"`, default export). `query-string@7` loads it with `require()`. Checked in Node 22: `require()` returns `{ __esModule, default }` (an object), while the installed 0.2.2 returns a function. `query-string` would call an object as a function and throw while parsing URLs, i.e. the override would turn a theoretical DoS into broken routing. `query-string@9.5.1` already depends on the patched `decode-uri-component@^0.5.0`, but it is a different major version that `expo-router@57` does not use, and swapping it in is not a supported change inside SDK 57. | **Not applied.** Wait for an `expo-router` release that moves off `query-string@7`. |
| Override `uuid` to 11.1.1 | `xcode@3` pins `^7.0.3`; the vulnerable code path is unused; the module only runs in prebuild, which this project does not use (Expo Go, no custom native code). Overriding a transitive dependency of Expo's config plugins would diverge from the SDK-tested tree for no runtime benefit. | **Not applied** (no verified benefit; deferred). |
| `braces`, `node-forge`, `sprintf-js` | No patched release exists. | **Cannot fix** until upstream publishes one. |
| Upgrade the Expo SDK | Forbidden in this phase without a demonstrated need; no evidence of runtime impact. | **Deferred.** |

**Net change to dependencies in this phase: none** (`package.json` and `package-lock.json` untouched).

## 4. Recommended follow-ups
1. When a newer SDK 57 patch release of `expo-router` / `expo` is published, re-run `npm audit --omit=dev` and `npx expo install --check`.
2. Re-evaluate `decode-uri-component` when `query-string` is replaced upstream; until then deep links are the only theoretical path.
3. CI (`.github/workflows/ci.yml`) does not run `npm audit` because it would fail on unfixable upstream findings; review it manually each release.

## 5. All 61 entries

Column "Kind": *advisory* = the package itself has the advisory; *transitive* = flagged only because it depends on a vulnerable package. "Root cause" lists the advisory packages behind it. "Audit fix" is what `npm audit` proposes (see §3 for why none was applied). "In app" = vulnerable code shipped in the Android bundle.

| Package | Severity | Kind | Root cause | Affected range | Audit fix | In app |
|---|---|---|---|---|---|---|
| @expo/cli | high | transitive | braces, node-forge, uuid | <=0.0.0-canary-20231123-1b19f96-4 \|\| >=0.0.1-canary-20231125-d600e44 | expo@44.0.6 (semver-major) | no |
| @expo/code-signing-certificates | high | transitive | node-forge | * | yes (no change) | no |
| @expo/config | moderate | transitive | uuid | <=0.0.1-canary-20240418-8d74597 \|\| >=3.3.23-alpha.0 | expo@44.0.6 (semver-major) | no |
| @expo/config-plugins | moderate | transitive | uuid | * | expo@44.0.6 (semver-major) | no |
| @expo/inline-modules | moderate | transitive | uuid | >=0.0.2-canary-20260409-6fc2991 | expo@44.0.6 (semver-major) | no |
| @expo/local-build-cache-provider | moderate | transitive | uuid | * | expo@44.0.6 (semver-major) | no |
| @expo/metro | high | transitive | braces | * | expo@44.0.6 (semver-major) | no |
| @expo/metro-config | high | transitive | braces, uuid | <=0.0.1-canary-20240418-8d74597 \|\| >=0.1.49-alpha.0 | expo@44.0.6 (semver-major) | no |
| @expo/prebuild-config | moderate | transitive | uuid | * | yes (no change) | no |
| @istanbuljs/load-nyc-config | moderate | transitive | sprintf-js | * | jest@30.5.2 (semver-major) | no |
| @jest/console | high | transitive | braces | 25.4.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/core | high | transitive | braces, sprintf-js | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/environment | high | transitive | braces | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/expect | high | transitive | braces, sprintf-js | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/fake-timers | high | transitive | braces | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/globals | high | transitive | braces, sprintf-js | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/reporters | high | transitive | braces, sprintf-js | <=30.2.0 | yes (no change) | no |
| @jest/test-result | high | transitive | braces | 25.4.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/test-sequencer | high | transitive | braces | <=30.2.0 | jest@30.5.2 (semver-major) | no |
| @jest/transform | high | transitive | braces, sprintf-js | * | jest@30.5.2 (semver-major) | no |
| @react-native/community-cli-plugin | high | transitive | braces | * | react-native@0.72.17 (semver-major) | no |
| @react-native/jest-preset | high | transitive | braces, sprintf-js | * | react-native@0.72.17 (semver-major) | no |
| @react-native/metro-config | high | transitive | braces | * | react-native@0.72.17 (semver-major) | no |
| @react-native/virtualized-lists | high | transitive | braces, sprintf-js | >=0.85.0-nightly-20260108-1236b6be4 | react-native@0.72.17 (semver-major) | no |
| argparse | moderate | transitive | sprintf-js | 1.0.0 - 1.0.10 | jest@30.5.2 (semver-major) | no |
| babel-jest | high | transitive | braces, sprintf-js | >=24.2.0-alpha.0 | jest@30.5.2 (semver-major) | no |
| babel-plugin-istanbul | moderate | transitive | sprintf-js | >=6.0.0-beta.0 | jest@30.5.2 (semver-major) | no |
| braces | high | advisory | braces | * | jest@30.5.2 (semver-major) | no |
| create-jest | high | transitive | braces, sprintf-js | 29.7.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| decode-uri-component | moderate | advisory | decode-uri-component | <=0.4.2 | expo-router@58.0.18 (semver-major) | yes |
| expect | high | transitive | braces | 21.0.0-beta.1 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| expo | high | transitive | braces, node-forge, uuid | >=45.0.0-beta.1 | expo@44.0.6 (semver-major) | no |
| expo-router | moderate | transitive | decode-uri-component | 1.2.2 - 3.1.2 \|\| 5.2.0-canary-20250611-f0afe80 - 58.0.12 | expo-router@58.0.18 (semver-major) | no |
| expo-splash-screen | moderate | transitive | uuid | 55.0.10-canary-20260424-7bedc9d - 55.0.10-canary-20260429-a5e59cf \|\| >=56.0.0-canary-20260212-4f61309 | expo-splash-screen@55.0.25 (semver-major) | no |
| jest | high | transitive | braces, sprintf-js | 23.5.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-circus | high | transitive | braces, sprintf-js | 20.1.0-alpha.1 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-cli | high | transitive | braces, sprintf-js | 23.5.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-config | high | transitive | braces, sprintf-js | 18.1.0 - 19.0.4 \|\| 23.5.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-environment-node | high | transitive | braces | 24.2.0-alpha.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-haste-map | high | transitive | braces | 18.1.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-message-util | high | transitive | braces | 18.5.0-alpha.7da3df39 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-resolve | high | transitive | braces | 18.1.0 - 19.0.2 \|\| 24.2.0-alpha.0 - 24.5.0 \|\| 27.1.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-resolve-dependencies | high | transitive | braces, sprintf-js | 27.0.0-next.0 - 30.2.0 | yes (no change) | no |
| jest-runner | high | transitive | braces, sprintf-js | 21.0.0-alpha.1 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-runtime | high | transitive | braces, sprintf-js | 18.1.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-snapshot | high | transitive | braces, sprintf-js | 23.3.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| jest-watcher | high | transitive | braces | 25.4.0 - 30.2.0 | jest@30.5.2 (semver-major) | no |
| js-yaml | moderate | transitive | sprintf-js | 3.2.7 - 3.15.2 | jest@30.5.2 (semver-major) | no |
| metro | high | transitive | braces | >=0.71.0 | react-native@0.72.17 (semver-major) | no |
| metro-config | high | transitive | braces | >=0.71.0 | react-native@0.72.17 (semver-major) | no |
| metro-file-map | high | transitive | braces | * | expo@44.0.6 (semver-major) | no |
| metro-transform-worker | high | transitive | braces | >=0.71.0 | yes (no change) | no |
| micromatch | high | transitive | braces | >=0.2.0 | jest@30.5.2 (semver-major) | no |
| node-forge | high | advisory | node-forge | * | expo@44.0.6 (semver-major) | no |
| query-string | moderate | transitive | decode-uri-component | 5.0.0 - 9.4.1 | expo-router@58.0.18 (semver-major) | no |
| react-native | high | transitive | braces, sprintf-js | >=0.73.0-nightly-20230506-1af868c52 | react-native@0.72.17 (semver-major) | no |
| react-native-reanimated | high | transitive | braces, sprintf-js | 3.20.0-nightly-20250722-b6c8b9a3c - 4.0.0-nightly-20250309-9ce9085cb \|\| 4.1.7 - 4.2.0-nightly-20251017-235c127fd \|\| >=4.2.3 | yes (no change) | no |
| react-native-worklets | high | transitive | braces, sprintf-js | >=0.8.0-bundle-mode-preview-1 | yes (no change) | no |
| sprintf-js | moderate | advisory | sprintf-js | * | jest@30.5.2 (semver-major) | no |
| uuid | moderate | advisory | uuid | <11.1.1 | expo@44.0.6 (semver-major) | no |
| xcode | moderate | transitive | uuid | >=0.9.2 | expo@44.0.6 (semver-major) | no |
