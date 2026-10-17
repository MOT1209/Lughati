# نشر «لغتي» على Google Play — خطوة بخطوة

ما هو جاهز في المستودع: الأيقونة ومجموعتها، `eas.json`، صورة الغلاف `assets/store/feature-graphic.png` (1024×500)، نص المتجر (`play-listing.md`)، سياسة الخصوصية (`privacy-policy.md`) وإجابات Data safety (`data-safety.md`).

## 0) قبل أي بناء: اسم الحزمة (قرار نهائي)
`app.json` ← `android.package` = `com.lughati.app` (مؤقت). **بعد أول رفع إلى Play لا يمكن تغييره.** عدّله الآن إن أردت اسماً آخر.

## 1) حساب Expo و EAS (على جهازك، مرة واحدة)
```bash
npm install -g eas-cli
eas login                 # حساب Expo مجاني
eas init                  # يربط المشروع ويضيف extra.eas.projectId إلى app.json — ادفع هذا التغيير
```

## 2) نسخة تجربة APK تثبّتها مباشرة على هاتفك
```bash
eas build --platform android --profile preview
```
يعطيك رابطاً لملف APK. ثبّته على الهاتف وجرّب القائمة في `TESTING.md` (هنا تظهر الأيقونة الحقيقية، وليس في Expo Go).

## 3) نسخة المتجر (AAB)
```bash
eas build --platform android --profile production
```
- أول مرة يسألك عن مفتاح التوقيع: اختر أن يولّده EAS ويحفظه. **لا تحذفه**؛ كل التحديثات اللاحقة تحتاجه.
- رقم الإصدار (`versionCode`) يزيد تلقائياً (`appVersionSource: remote` + `autoIncrement`).

## 4) Play Console
1. أنشئ التطبيق: الاسم «لغتي: تعلّم اللغات بلغتك»، اللغة الافتراضية العربية، تطبيق مجاني.
2. **سياسة الخصوصية:** تحتاج رابطاً عاماً. صفحتها جاهزة في الموقع (`site/privacy.html`، والإنجليزية `site/en/privacy.html`) وتُنشر مع الموقع على Vercel؛ الرابط يكون `https://<نطاق الموقع>/privacy`. ضع بريد تواصل مكان `[CONTACT_EMAIL]` في `docs/store/privacy-policy.md` ثم أعد توليد الموقع: `python3 scripts/build-site.py`.
3. **App content:** املأ الأقسام من `data-safety.md` (لا إعلانات، لا جمع بيانات، 13+، الوصول بأي بريد وكلمة مرور من 8 أحرف).
4. **Store listing:** النصوص من `play-listing.md`، الأيقونة 512×512 (صغّر `assets/images/icon.png`)، صورة الغلاف، و**لقطتان على الأقل** من الهاتف (خذها من نسخة الخطوة 2).
5. **Testing → Internal testing:** ارفع ملف AAB (يدوياً، أو `eas submit --platform android` بعد إعداد Service Account).

## 5) الاختبار المغلق (للحسابات الشخصية)
حسب علمنا، الحسابات **الشخصية** الجديدة تحتاج اختباراً مغلقاً مع **12 مختبِراً على الأقل لمدة 14 يوماً متتالية** قبل طلب النشر العام. حسابات المؤسسات معفاة. تحقق من الشرط الظاهر في Play Console لحسابك.

## 6) قبل النشر العام (مخاطر معروفة)
- تسجيل الدخول وهمي والبيانات على الجهاز فقط.
- المحتوى اللغوي لم يُراجَع من مختص.
- RTL وتبديل اللغة ولوحة المفاتيح لم تُفحص كلها على جهاز حقيقي.
