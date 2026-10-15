<div align="center">

# لغتي — Lughati

**تطبيق لتعلّم اللغات للناطقين بالعربية** · A language-learning app for Arabic speakers

<a href="#-ما-الذي-يعمل-الآن"><img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo_SDK-57-blue?logo=expo"></a>
<a href="#-ما-الذي-يعمل-الآن"><img alt="React Native" src="https://img.shields.io/badge/React_Native-0.86-skyblue?logo=react"></a>
<a href="#-ما-الذي-يعمل-الآن"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript"></a>
<a href="#-أوامر-التطوير"><img alt="Tests" src="https://img.shields.io/badge/Jest-18_suites-green?logo=jest"></a>
<a href="#-ما-الذي-يعمل-الآن"><img alt="i18n" src="https://img.shields.io/badge/i18n-ar_·_en-orange"></a>

</div>

> [!NOTE]
> **المرحلة الأولى (Phase 1)** — الأساس فقط: بنية، ثيم، i18n/RTL، تنقّل، مكونات، بيانات وهمية. لا شبكة ولا AI حقيقي بعد.

## المحتويات

| | القسم |
|---|---|
| 1️⃣ | [ما الذي يعمل الآن؟](#-ما-الذي-يعمل-الآن) |
| 2️⃣ | [التشغيل السريع](#-التشغيل-السريع) |
| 3️⃣ | [أوامر التطوير](#-أوامر-التطوير) |
| 4️⃣ | [بنية المشروع](#-بنية-المشروع) |
| 5️⃣ | [استبدال الوهمي بالحقيقي](#-استبدال-الوهمي-بالحقيقي) |
| 6️⃣ | [التوثيق الإضافي](#-التوثيق-الإضافي) |

## ✨ ما الذي يعمل الآن؟

| الميزة | الوصف |
| :--- | :--- |
| 📚 **الدروس** | 10 دروس A1 لكل لغة (60 كلمة/عبارة)، و12 تمريناً مولَّداً تلقائياً لكل درس |
| 🏠 **التبويبات** | الرئيسية (الهدف اليومي + «واصل التعلّم») · الدروس · التقدم · حسابي |
| 🔐 **الجلسة** | جلسة وهمية (مستخدم + وقت، دون كلمة مرور) — محفوظة محلياً وتُستعاد عند إعادة التشغيل |
| ✍️ **اختيار اللغات** | تُختار لغتك ولغة التعلّم بعد الدخول (خطوتان)، ويُعدَّل الاختيار من الإعدادات |
| 💾 **التقدم** | محفوظ محلياً على الجهاز (AsyncStorage) لكل مستخدم |
| 🌐 **i18n + RTL** | واجهة عربية/إنجليزية مع تبديل الاتجاه (يتطلب إعادة تشغيل)، وجمع عربي صحيح على Hermes عبر `@formatjs/intl-pluralrules` |
| ♿ **إمكانية الوصول** | تسميات شاشة للقرّاء، تلميحات أزرار الضغط، تأكيد قبل إنهاء الدرس، حماية من قيم NaN في شريط التقدم، والتعامل مع زر الرجوع في Android |

## 🚀 التشغيل السريع

```bash
# 1) تثبيت الاعتماديات
npm install

# 2) تشغيل خادم التطوير
npx expo start

# 3) افتح تطبيق Expo Go على Android وامسح رمز QR
```

## 🧪 أوامر التطوير

| الأمر | الغرض |
| :--- | :--- |
| `npm run typecheck` | فحص الأنواع (`strict`) |
| `npm run lint` | ESLint (إعداد Expo) |
| `npm test` | اختبارات Jest (16 suite عبر `jest-expo`) |
| `npx expo-doctor` | فحص الاعتماديات والإعدادات |
| `npx expo export --platform android` | التأكد أن الحزمة تُبنى |

```bash
# إن كنت تستخدم Bun (وجود bun.lock)، استبدل npx بـ bunx
bunx expo start
```

الاختبار اليدوي على الجهاز مغطى في [TESTING.md](./TESTING.md).

## 📂 بنية المشروع

```
src/
├── app/                      # مسارات Expo Router
│   ├── (auth)/               # Onboarding / Login / Register
│   └── (app)/                # تبويبات + setup-languages + language-selection
│                             # + settings + lesson/[id]
├── components/
│   ├── ui/                   # مكونات التصميم الأساسية
│   └── *.tsx                 # مكونات مركّبة (LessonQuiz، StatTile، OptionButton…)
├── theme/                    # ألوان Light/Dark و tokens وطباعة (Cairo)
├── i18n/                     # ترجمة ar/en وتحديد اللغة والاتجاه
├── services/
│   ├── auth/                 # واجهة + Mock للمصادقة
│   ├── ai/                   # واجهة + Mock + سجل
│   ├── repositories/         # واجهات + Mock للبيانات
│   ├── direction.ts          # ربط التفضيل المحفوظ بالاتجاه
│   ├── appLanguage.ts        # ربط التفضيل المحفوظ بـ i18n
│   └── storage.ts            # غلاف AsyncStorage
├── navigation/               # RootNavigator — حارس المسارات حسب الجلسة
├── store/                    # Zustand: التفضيلات + الجلسة + بروفيل اللغات
├── mocks/                    # بيانات وهمية بالعربية
├── types/                    # نموذج البيانات
└── utils/ + hooks/           # أدوات مساعدة و hooks
```

## 🔁 استبدال الوهمي بالحقيقي

الشاشات لا تعرف شيئاً عن تنفيذ الخدمات — الاستبدال يتم عبر المُسجِّلات فقط:

```ts
registerAuthService(...)   // مصادقة حقيقية
registerRepositories(...)  // قاعدة بيانات / API
registerAIProvider(...)    // مزوّد AI
```

## 📝 التوثيق الإضافي

| الملف | المحتوى |
| :--- | :--- |
| [TESTING.md](./TESTING.md) | سيناريوهات الاختبار اليدوي على الجهاز |
| [docs/PHASE_1_AUDIT.md](./docs/PHASE_1_AUDIT.md) | نتائج مراجعة المرحلة الأولى |
| [docs/audit/DEPENDENCY_AUDIT.md](./docs/audit/DEPENDENCY_AUDIT.md) | مراجعة الاعتماديات |

---

<div align="center">

صُنع بـ ❤️ — **لغتي**

</div>
