# Lughati (لغتي)

تطبيق موبايل لتعلّم اللغات للناطقين بالعربية — React Native + Expo (SDK 57) + TypeScript. هذه **Phase 1**: الأساس فقط (بنية، ثيم، i18n/RTL، تنقل، مكونات، بيانات وهمية). لا شبكة ولا AI حقيقي ولا دروس.

## التشغيل
```bash
npm install
npx expo start      # افتح Expo Go على Android وامسح QR
```

## الأوامر
| الأمر | الغرض |
|---|---|
| `npm run typecheck` | فحص الأنواع (`strict`) |
| `npm run lint` | ESLint |
| `npm test` | اختبارات Jest |
| `npx expo-doctor` | فحص الاعتماديات والإعدادات |
| `npx expo export --platform android` | التأكد أن الحزمة تُبنى |

الاختبار اليدوي على الجهاز: [TESTING.md](./TESTING.md).

## البنية (`src/`)
- `app/` مسارات Expo Router رفيعة: `(auth)` (Onboarding/Login/Register) و`(app)` (تبويبات + Language Selection + Settings). الحماية تعتمد على وجود جلسة فقط.
- `components/ui` مكونات التصميم، و`components` مكونات مركّبة.
- `theme/` ألوان Light/Dark وtokens وطباعة (Cairo).
- `i18n/` ترجمة `ar`/`en` وتحديد اللغة والاتجاه.
- `services/` `auth` (واجهة + Mock)، `ai` (واجهة + Mock + سجل)، `repositories` (واجهات + Mock)، `direction` و`appLanguage` (ربط التفضيل المحفوظ بـ i18n والاتجاه).
- `navigation/RootNavigator` حارس المسارات (جلسة فقط).
- `store/` Zustand: التفضيلات (محفوظة)، الجلسة، اللغة المختارة.
- `mocks/` بيانات وهمية بالعربية، و`types/` نموذج البيانات، و`utils/`، و`hooks/`.

استبدال Mock بالحقيقي لاحقاً: `registerAuthService(...)` و`registerRepositories(...)` و`registerAIProvider(...)` دون لمس الشاشات.
