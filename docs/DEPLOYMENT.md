# النشر والإعداد

## 1) Supabase
1. أنشئ مشروعاً (أو استخدم الحالي) وانسخ **Project URL** و**publishable/anon key** فقط. لا تنسخ `service_role` إلى التطبيق أبداً.
2. طبّق الهجرات بالترتيب: `supabase link --project-ref <ref>` ثم `supabase db push`. (أو الصق كل ملف من `supabase/migrations/` في SQL Editor بالترتيب.)
3. ابذر الكتالوج: نفّذ `supabase/seed/catalog.sql` (يُعاد توليده بـ `npm run seed:generate` بعد تغيير `src/mocks`).
4. تحقق: نفّذ `supabase/tests/rls.sql` (يجب أن يطبع `RLS TESTS PASSED` ثم يتراجع عن كل شيء).
5. Authentication → Providers → Email: فعّل **Confirm email**. أضف **Site URL**/Redirect URLs وقالب بريد عربي إن أردت. بدون SMTP مخصص لدى Supabase حدّ إرسال منخفض: اضبط SMTP قبل الإطلاق.
6. Authentication → Policies: فعّل حماية كلمات المرور المسرّبة وحدّد الحد الأدنى للطول.

## 2) الذكاء الاصطناعي
النظام الموحّد (بوابة + سجل نماذج + ست ميزات) موثّق في `docs/AI_DEPLOYMENT.md` و`docs/AI_ARCHITECTURE.md`. الدالة `ai-gateway` تحتاج `OPENCODE_ZEN_API_KEY` و`OPENCODE_ZEN_BASE_URL` (من التوثيق الرسمي) ونموذجاً موثَّقاً ومفعّلاً بيد مشرف؛ وإلا يعرض التطبيق «غير متاح». لا يوجد أي مفتاح ذكاء اصطناعي في التطبيق.

## 3) متغيرات التطبيق
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (انظر `.env.example`). للتطوير: ملف `.env.local` (مُتجاهَل في git). لبناء EAS: `eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value ... --environment production --visibility plaintext` وكذلك المفتاح. **بناء الإنتاج دون هذين المتغيرين لا يسجّل دخولاً** (`not_configured`) — هذا مقصود حتى لا تُشحن مصادقة وهمية.

## 4) بناء Android
```bash
npm ci && npm run typecheck && npm run lint && npm test -- --runInBand
npx expo export --platform android      # تحقق الحزمة
eas build --platform android --profile preview      # APK داخلي للاختبار
eas build --platform android --profile production   # AAB لـ Play (يزيد versionCode تلقائياً)
```
المعرّف `com.lughati.app` دائم بعد أول رفع. الإذونات: لا إذونات خطرة؛ الصوت عبر TTS النظام. الصور والـ splash جاهزة (`assets/`). الخطوات الكاملة للمتجر: `docs/store/RELEASE_ANDROID.md`. **لا يُنشر على Google Play دون إذن صريح من المالك.**

## 5) قبل النشر العام
- نشر سياسة الخصوصية على رابط عام وربطها في Play (بعد مراجعتها).
- حساب اختبار مفعّل البريد لمراجعي Play.
- مراجعة متحدث أصلي لمحتوى كل لغة.
- تجربة على جهاز Android حقيقي حسب `TESTING.md` (جلسة، لوحة المفاتيح، RTL، الصوت، انقطاع الشبكة).
