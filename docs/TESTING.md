# الاختبار

## الأوامر
```bash
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand        # Jest (jest-expo)، المنطقة الزمنية Asia/Riyadh
npx expo-doctor                # يحتاج شبكة (exp.host)
npx expo export --platform android
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql   # اختبار RLS على قاعدة فيها الهجرات والبذر
```
نتائج آخر تشغيل موثقة في `FINAL_ENGINEERING_REPORT.md` (لا أعدّل أرقاماً هنا يدوياً).

## ما تغطيه الاختبارات الآلية
| المجال | الملفات |
|---|---|
| المصادقة (Supabase مُحاكى، Mock) | `services/auth/SupabaseAuthService.test.ts`، `services/services.test.ts` |
| الإعداد والتخزين الآمن | `services/backend/backend.test.ts` |
| المزامنة، الدمج، الترحيل، بلا اتصال، انقطاع، جهازان | `services/sync/sync.test.ts` |
| الذكاء الاصطناعي: عميل + تحليل الطلب والـ prompt (الخادم) | `services/ai/ai.test.ts`، `navigation/aiTutorScreen.test.tsx` |
| الصوت وحياته | `services/speech.test.ts`، `components/PronounceButton.test.tsx` |
| جودة المحتوى | `utils/contentQuality.test.ts`، `utils/content.test.ts` |
| التقدّم، SRS، السلاسل | `utils/*.test.ts`، `services/repositories/*.test.ts` |
| الواجهة، التنقل، RTL/LTR، الحالات | `navigation/*.test.tsx`، `components/*.test.tsx`، `i18n/i18n.test.ts` |
| RLS على Postgres | `supabase/tests/rls.sql` (CI) |

## ما لا تغطيه (يدوي)
اختبار الجهاز الحقيقي وقوائم الفحص اليدوي في `/TESTING.md` (الجذر): تشغيل التطبيق، لوحة المفاتيح، شريط الحالة، الشاشات الصغيرة، الصوت، انقطاع الشبكة، استعادة الجلسة، RTL.
**§6 جديد — الحساب الحقيقي (يدوي):** (1) سجّل بريداً حقيقياً وتأكد أن الشاشة تطلب التحقق؛ (2) افتح رابط البريد ثم سجّل الدخول؛ (3) أكمل درساً، تحقق من الصف في `quiz_attempts`؛ (4) سجّل الدخول من جهاز آخر وتأكد من وصول التقدم؛ (5) أوقف الشبكة وأكمل درساً ثم أعدها وتأكد من المزامنة؛ (6) «نسيت كلمة المرور»؛ (7) «حذف الحساب» وتأكد أن الصفوف اختفت.
