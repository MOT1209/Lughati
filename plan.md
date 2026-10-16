# خطة العمل المتبقية — Lughati / لغتي

> خطة مختصرة لما بقي بعد جولة الإصلاحات الحالية (توصيات الرئيسية + معالجة نتائج التدقيق).
> كل بند مكتوب كي ينفَّذه وكيل جديد دون سياق سابق.

## الحالة الحالية (مُنجز ومتحقَّق منه)

- المراجعة (`/review`) أصبحت تبويبًا صريحًا خامسًا في `src/app/(app)/(tabs)/_layout.tsx`.
- **M10**: إعادة كتابة `src/hooks/useAsyncData.ts` (stale-while-revalidate) + `src/hooks/useAsyncData.test.ts` (6 اختبارات).
- **M11**: `ErrorState` يفرّق بين انقطاع الشبكة والخطأ العام (`src/components/ui/States.tsx`) + مفاتيح `common.offlineMessage` + اختباران في `ui.test.tsx`.
- **M13**: تسميات الحكم الصحيح/الخطأ لقارئ الشاشة عبر `lesson.optionCorrect` / `lesson.optionWrong` في `src/components/OptionButton.tsx` + اختبار في `LessonQuiz.test.tsx`.
- **M14**: تغذية راجعة عند الضغط على بطاقات الدروس في `learn.tsx`.
- **M15**: تبويب التقدّم يعرض بياناتًا حقيقية (اختبارات `learningScreens.test.tsx`).
- **M7**: تطبيق اللغة في الإعدادات مع معالجة الفشل + حارس `hasHydrated` في `_layout.tsx` (مغطّى في `settingsAndLayout.test.tsx`).
- **L19** (معظمه): مفاتيح مُدمجة `learn.lessonMeta` و`profile.levelValue` و`settings.version` في `ar.ts`/`en.ts`.
- **التوصيات**: `Recommendation.params` + قواعد `recommendations.ts` + `useCurrentLearning` تُعيد `attempts`/`dueVocabulary`/`lessons` + بطاقة «مقترح لك» في `home.tsx` + `notifyProgressChanged()` في `review.tsx`.

**نتائج التحقق:** `npx tsc --noEmit` = 0 أخطاء · وحدات 18/18 ناجحة · تكامل `learningScreens` 8/8 ناجحة · `npx expo lint --max-warnings 0` = نظيف.

## المهام المتبقية

### 1. توسيع اختبارات الشاشات — بند M16 الناقص
- [ ] اختبار شاشة **Profile** (`src/app/(app)/(tabs)/profile.tsx`): المستوى، `profile.levelValue`، تقدّم اللغة، الإحصاءات، وحالة «لا لغة بعد».
  - ملف جديد مقترح: `src/navigation/profileScreen.test.tsx` (اتبع نمط `learningScreens.test.tsx`: `renderRouter` + `SLOW_TEST_TIMEOUT`).
- [ ] اختبارات **Login/Register** و**Onboarding** (غير مغطّاة حاليًا؛ `RootNavigator.test.tsx` يغطّي الحماية لا النماذج).

### 2. M6 — مفتاح التذكير اليومي بلا وظيفة
- [ ] إما حفظ التفضيل فعليًا (في `preferencesStore` + AsyncStorage) وإزالة `notificationsNote` (نص المطوّر)، أو حذف المفتاح من `settings.tsx` واللغتين.
  - ملاحظة: `expo-notifications` غير متاح في Expo Go — لا تضف حزمة إشعارات.

### 3. L17 — فقدان إجابات الاختبار عند المغادرة
- [ ] تأكيد قبل مغادرة اختبار قيد التقدّم في `src/app/(app)/lesson/[id].tsx`.

### 4. تحديث مستند التدقيق
- [ ] `docs/PHASE_1_AUDIT.md`: وسم الحالة لكل بند — منتهي: M7, M10, M11, M13, M14, M15, L19 · متبقٍّ: M6, L17, M16 (جزئي).

### 5. لوحة README
- [ ] تحديث شارة الاختبارات («25 suites / 408 tests») بالأرقام الفعلية بعد تشغيل المجموعة كاملة.

### 6. (منخفض الأولوية) L19 المتبقّي
- [ ] `src/app/(app)/lesson/[id].tsx:146` — دمج تسمية `accessibilityLabel` (`${word.term}: ${meaning}`). الدمج هنا لبيانات المفردات لا لنصّ واجهة، لذا أولويته منخفضة.

## أوامر التحقق

```bash
npx tsc --noEmit                                  # الأنواع
npx jest src/utils src/i18n src/hooks src/components --silent   # وحدات سريعة
npx jest src/navigation --silent                  # تكامل (بطيء جدًا: ~8-15 دقيقة)
npx expo lint --max-warnings 0                    # بأمر منفصل وبوقت طويل
```

قيود معروفة: مجموعات `src/navigation` بطيئة جدًا (~130-450 ثانية للمجموعة) فامنحها مهلة كبيرة؛
لا تشغّل `tsc` و`lint` في أمر واحد (ينتهي بالمهلة).
