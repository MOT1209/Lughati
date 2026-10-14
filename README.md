# لغتي — Lughati

<div align="center">

**تطبيق موبايل لتعلّم اللغات للناطقين بالعربية**

React Native · Expo SDK 57 · TypeScript

</div>

> **Phase 1** — الأساس فقط: بنية، ثيم، i18n/RTL، تنقّل، مكونات، بيانات وهمية. لا شبكة ولا AI حقيقي بعد.

---

## ✨ ما الذي يعمل الآن؟

| الميزة | الوصف |
|---|---|
| 📚 **الدروس** | 10 دروس A1 لكل لغة (60 كلمة/عبارة)، 12 تمريناً مولَّداً تلقائياً لكل درس |
| 🏠 **التبويبات** | الرئيسية (الهدف اليومي + «واصل التعلّم») · الدروس · التقدم · حسابي |
| 🔐 **الجلسة الوهمية** | مستخدم + وقت، دون كلمة مرور — محفوظة محلياً وتُستعاد عند إعادة التشغيل |
| ✍️ **اختيار اللغات** | تُختار لغتك ولغة التعلّم بعد الدخول (خطوة أولى ثم ثانية) ويُعدَّل الاختيار من الإعدادات |
| 💾 **التقدم** | محفوظ محلياً على الجهاز (AsyncStorage) لكل مستخدم |
| 🌐 **i18n + RTL** | واجهة عربية/إنجليزية، اتجاه تخطيط يُغيَّر بضبط لغة التطبيق (يتطلب إعادة تشغيل)، جمع عربي صحيح على Hermes عبر `@formatjs/intl-pluralrules` |
| ♿ **إمكانية الوصول** | تسميات شاشة للقرّاء، تلميحات أزرار الضغط، تأكيد قبل إنهاء الدرس، حماية من قيم NaN في شريط التقدم، التعامل مع زر الرجوع في Android |

## 🚀 التشغيل

```bash
npm install
npx expo start      # افتح Expo Go على Android وامسح QR
```

## 🧪 الأوامر

| الأمر | الغرض |
|---|---|
| `npm run typecheck` | فحص الأنواع (`strict`) |
| `npm run lint` | ESLint |
| `npm test` | اختبارات Jest (16 suite عبر `jest-expo`) |
| `npx expo-doctor` | فحص الاعتماديات والإعدادات |
| `npx expo export --platform android` | التأكد أن الحزمة تُبنى |

> ملاحظة: إن كنت تستخدم Bun، استبدل `npx` بـ `bunx`.

الاختبار اليدوي على الجهاز: [TESTING.md](./TESTING.md).

## 📂 البنية (`src/`)

```
src/
├── app/              # مسارات Expo Router رفيعة
│   ├── (auth)/       # Onboarding / Login / Register
│   └── (app)/        # تبويبات + setup-languages + language-selection + settings + lesson/[id]
├── components/
│   ├── ui/           # مكونات التصميم الأساسية
│   └── *.tsx         # مكونات مركّبة (LessonQuiz، StatTile، OptionButton…)
├── theme/            # ألوان Light/Dark و tokens وطباعة (Cairo)
├── i18n/             # ترجمة ar/en وتحديد اللغة والاتجاه
├── services/
│   ├── auth/         # واجهة + Mock للمصادقة
│   ├── ai/           # واجهة + Mock + سجل
│   ├── repositories/ # واجهات + Mock للبيانات
│   ├── direction.ts / appLanguage.ts # ربط التفضيل المحفوظ بـ i18n والاتجاه
│   └── storage.ts    # غلاف AsyncStorage
├── navigation/       # RootNavigator — حارس المسارات (حسب الجلسة)
├── store/            # Zustand: التفضيلات + الجلسة + بروفيل اللغات
├── mocks/            # بيانات وهمية بالعربية
├── types/            # نموذج البيانات
└── utils/ + hooks/   # أدوات مساعدة و hooks
```

## 🔁 استبدال Mock بالحقيقي لاحقاً

الشاشات لا تعرف شيئاً عن تنفيذ الخدمات — استبدل عبر المُسجِّلات فقط:

```ts
registerAuthService(...)   // مصادقة حقيقية
registerRepositories(...)  // قاعدة بيانات/API
registerAIProvider(...)    // مخصص AI
```

## 📝 التوثيق

- [TESTING.md](./TESTING.md) — سيناريوهات الاختبار اليدوي على الجهاز
- [docs/PHASE_1_AUDIT.md](./docs/PHASE_1_AUDIT.md) — نتائج مراجعة المرحلة الأولى
- [docs/audit/DEPENDENCY_AUDIT.md](./docs/audit/DEPENDENCY_AUDIT.md) — مراجعة الاعتماديات
