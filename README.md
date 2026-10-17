<div align="center">

# لغتي · Lughati

**تطبيق لتعلّم اللغات، مبنيٌّ للناطقين بالعربية**
*Learn languages, purpose-built for Arabic speakers*

<br/>

<a href="#-التقنيات"><img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white"></a>
<a href="#-التقنيات"><img alt="React Native 0.86" src="https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black"></a>
<a href="#-التقنيات"><img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white"></a>
<a href="#-الجودة"><img alt="Tests" src="https://img.shields.io/badge/Jest-28_suites_·_431_tests-99425B?logo=jest&logoColor=white"></a>
<a href="#-التقنيات"><img alt="i18n ar · en" src="https://img.shields.io/badge/i18n-ar_·_en-EA580C"></a>
<a href="#-الميزات"><img alt="RTL" src="https://img.shields.io/badge/واجهة-RTL-0F766E"></a>

</div>

> [!NOTE]
> **المرحلة الحالية — الأساس (Phase 1).** بنية، ثيم، تدويل/RTL، تنقّل، مكوّنات، وبيانات وهمية.
> لا شبكة ولا ذكاء اصطناعي حقيقي بعد — والاستبدال بالحقيقي جاهز عبر المُسجِّلات (انظر [المعمارية](#-المعمارية)).
> **حدود معروفة:** مفتاح التذكير اليومي يحفظ التفضيل فقط (بلا إشعار مجدول — يحتاج `expo-notifications` وبناء تطوير)،
> ولا توجد إنجازات (Achievements) بعد؛ التقدّم يشمل XP والكلمات والدقائق والسلسلة.

---

## 📖 نظرة عامة

**لغتي** تطبيق تعلّم لغات مصمَّم من الأساس لمتحدّثي العربية: واجهة عربية مع دعم كامل للاتجاه من
اليمين إلى اليسار (RTL)، وجمع عربي صحيح، وخط Cairo. المحتوى بيانات-أوّلاً: إضافة لغة أو درس لا
تتطلّب لمس أي شاشة.

- 🎯 **موجَّه للمتعلّم العربي** — الواجهة والمحتوى بالعربية، مع تبديل كامل للإنجليزية.
- 🧩 **قابل للاستبدال** — كل بيانات وهمية خلف واجهات ثابتة (`Repositories` / `Services`).
- ✅ **مبنيّ بمعايير الجودة** — TypeScript صارم، اختبارات، وفحص آلي في CI.

## ✨ الميزات

| الميزة | الوصف |
| :--- | :--- |
| 📚 **مناهج A1** | 10 دروس لكل لغة (تحيات، أرقام، ألوان، طعام، أماكن…) — **60 كلمة/عبارة** لكل لغة |
| ✍️ **تمارين تفاعلية** | **12 تمريناً** يُولَّد تلقائياً لكل درس (اختيار المعنى + اختيار الكلمة) بلا عشوائية قابلة للكسر |
| 🎮 **لعبة المطابقة** | تمرين عملي داخل الدرس يقارن الكلمة بمعناها، مع نتيجة ومراجعة وإعادة — دون التأثير على إكمال الدرس |
| 🔁 **مراجعة بالتكرار المتباعد (SRS)** | محرّك جدولة (١، ٣، ٧، ١٤، ٣٠، ٩٠ يوماً) + شاشة مراجعة للكلمات المستحقّة |
| 🏠 **لوحة التعلّم** | الرئيسية (الهدف اليومي + «واصل التعلّم») · الدروس · المراجعة · التقدّم · الحساب |
| 📈 **التقدّم والسلاسل** | XP، الكلمات، الدقائق، والسلسلة اليومية — محفوظة لكل مستخدم |
| 🌐 **تدويل + RTL** | عربي/إنجليزي مع تبديل الاتجاه، وجمع عربي صحيح على Hermes عبر `@formatjs/intl-pluralrules` |
| 🎨 **ثيم Light/Dark** | ألوان ورموز وطباعة (خط Cairo) متّسقة، مع `useTheme` موحّد |
| 🔐 **جلسة محلية** | جلسة وهمية (مستخدم + تاريخ، بلا كلمة مرور) تُحفظ وتُستعاد عند إعادة التشغيل |
| ♿ **إمكانية وصول** | تسميات لقارئ الشاشة، أهداف لمس ≥ 48px، تأكيد قبل إنهاء الدرس، حماية من قيم `NaN`، ومعالجة زر الرجوع في Android |

## 🧱 التقنيات

| الطبقة | المستخدَم |
| :--- | :--- |
| المنصّة | Expo SDK **57** · React Native **0.86** · React **19.2** |
| التنقّل | expo-router **57** (مسارات مُنمَّطة + React Compiler) |
| اللغة | TypeScript **~6.0** (إعداد `strict`) |
| الحالة | Zustand **5** (الجلسة · التفضيلات · ملفّ التعلّم) |
| التدويل | i18next **26** + react-i18next **17** + `@formatjs/intl-pluralrules` |
| التخزين | `@react-native-async-storage/async-storage` |
| الطباعة | `@expo-google-fonts/cairo` |
| الاختبار | Jest **29** + `jest-expo` **57** + `@testing-library/react-native` **13** |
| الجودة | ESLint (إعداد Expo) + `tsc --noEmit` + GitHub Actions |

## 🚀 التشغيل السريع

**المتطلّبات:** Node.js `22+` ومدير حزم (npm). للاختبار على الجهاز: تطبيق **Expo Go**.

```bash
# 1) تثبيت الاعتماديات
npm install

# 2) تشغيل خادم التطوير
npx expo start

# 3) امسح رمز QR بتطبيق Expo Go على Android
```

<details>
<summary>مستخدم Bun؟ (وجود <code>bun.lock</code>)</summary>

```bash
bunx expo start
```

</details>

## 🧪 أوامر التطوير

| الأمر | الغرض |
| :--- | :--- |
| `npm run typecheck` | فحص الأنواع (`tsc --noEmit`) |
| `npm run lint` | ESLint بإعداد Expo |
| `npm test` | اختبارات Jest (28 suite · 431 اختبار عبر `jest-expo`) |
| `npx expo-doctor` | فحص سليم الاعتماديات والإعدادات |
| `npx expo export --platform android` | التأكد أن الحزمة تُبنى |

> [!TIP]
> الاختبار اليدوي على الجهاز مغطّى بالتفصيل في [TESTING.md](./TESTING.md).

## 📂 بنية المشروع

```text
src/
├── app/                       # مسارات Expo Router (كل ملف = شاشة)
│   ├── (auth)/                # Onboarding · Login · Register
│   └── (app)/                 # التبويبات + setup-languages · language-selection · settings · lesson/[id]
├── components/
│   ├── ui/                    # الأساسيات: Button · Card · Text · Icon · Screen · States · StatTile · Input
│   └── *.tsx                  # مركّبة: LessonQuiz · VocabularyMatchGame · OptionButton · ProgressBar · …
├── theme/                     # ألوان Light/Dark · tokens · طباعة Cairo · resolveScheme
├── i18n/                      # ترجمة ar/en · resolveLocale · أنواع الترجمة
├── services/
│   ├── auth/                  # واجهة + Mock للمصادقة
│   ├── ai/                    # واجهة + Mock + سجلّ
│   ├── repositories/          # واجهات + Mock + طبقة الحفظ (savedData)
│   ├── vocabulary.ts          # فهرسة المفردات حسب المعرّف
│   ├── direction.ts           # ربط التفضيل المحفوظ بالاتجاه
│   └── appLanguage.ts         # ربط التفضيل المحفوظ بـ i18n
├── navigation/                # RootNavigator — حراسة المسارات حسب الجلسة وملفّ اللغة
├── store/                     # Zustand: authStore · learningStore · preferencesStore
├── mocks/                     # بيانات وهمية (لغات · دروس · مفردات · مستويات · تقدّم · مستخدمون)
├── hooks/                     # useAsyncData · useCurrentLearning · useLessonList · useTheme · useUiLocale
├── utils/                     # srs · recommendations · streaks · progression · exercises · bidi · meaning · routing …
└── types/                     # نموذج البيانات
```

## 🏗️ المعمارية

الشاشات **لا تعرف شيئاً** عن تنفيذ الخدمات؛ الاستبدال يتم عبر المُسجِّلات فقط — ما يجعل الانتقال من
الوهمي إلى الحقيقي تغييراً في مكان واحد:

```ts
registerAuthService(service)     // مصادقة حقيقية
registerRepositories(repos)      // قاعدة بيانات / API
registerAIProvider(provider)     // مزوّد ذكاء اصطناعي
```

**مسار البيانات:** `Screen → Hook (useAsyncData) → Repository → Storage`.
المفاتيح محفوظة في `src/constants/app.ts` (مثل `lughati.session.v1`, `lughati.learning-progress.v1`).

## ✅ الجودة

| الفحص | الحالة |
| :--- | :--- |
| الأنواع (`tsc --noEmit`) | نظيف |
| ESLint | 0 أخطاء |
| الاختبارات | 28 ملف · 431 اختبار ناجح |
| CI | typecheck + lint + test + `expo export` على `main` وعند كل PR |

سُلاسل الاختبار تغطّي: التنقّل والحراسة، شاشات التعلّم، الاختبارات واللعبة، التدويل (تكافؤ المفاتيح
وعدم الفراغ)، المواعيد (SRS/السلاسل)، والمخازن.

## 🗺️ خارطة الطريق

- [x] **المرحلة 1 — الأساس:** بنية · ثيم · i18n/RTL · تنقّل · مكوّنات · بيانات وهمية
- [ ] **المرحلة 2 — الشبكة:** ربط مصادقة وتخزين وبيانات حقيقية عبر المُسجِّلات
- [ ] **المرحلة 3 — الذكاء الاصطناعي:** مزوّد AI للتوليد والتقييم والتصحيح
- [ ] **المرحلة 4 — أصوات ومحتوى:** نطق، استماع، ومحتوى أوسع (A2 وما بعدها)

## 📝 التوثيق الإضافي

| الملف | المحتوى |
| :--- | :--- |
| [TESTING.md](./TESTING.md) | سيناريوهات الاختبار اليدوي على الجهاز |
| [docs/INTEGRATION_AGENT2.md](./docs/INTEGRATION_AGENT2.md) | دليل تكامل طبقة التعلّم والتقدّم (واجهات النماذج) |
| [docs/PHASE_1_AUDIT.md](./docs/PHASE_1_AUDIT.md) | نتائج مراجعة المرحلة الأولى |
| [docs/audit/DEPENDENCY_AUDIT.md](./docs/audit/DEPENDENCY_AUDIT.md) | مراجعة الاعتماديات وسجلّ `npm audit` |

---

<div align="center">

صُنع بـ ❤️ — **لغتي · Lughati**

</div>
