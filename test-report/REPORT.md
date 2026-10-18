# تقرير اختبار Lughati (لغتي) — 2026-10-18

**الجهاز:** OPPO A52 (CPH2069)، Android 11، Expo Go 57.0.9. **الكود:** `main` عند `7f4bef6`. **ملاحظة:** لم يُعدَّل أي كود.
**النتيجة العامة:** الاختبار على الجهاز **غير مكتمل** (انقطع تصحيح USB والهاتف صار `offline`). الموقع فُحص بالكامل تقريباً. كل ما لم أره مكتوب «غير متحقَّق».

## 1) الجدول
| المجال | النتيجة | الدليل |
|---|---|---|
| `npm run typecheck` | FAIL (TS1149: `GoalRing.ts` مقابل `goalRing.ts`) | مخرجات الأمر |
| `npm run lint` | FAIL (خطأ واحد: `import/no-unresolved` في HomeHero.tsx:15) | مخرجات الأمر |
| `npm test` | FAIL: 5 من 490 فشلت (485 نجحت) | jest-summary.txt، jest-failures.txt |
| الرئيسية: رأس متدرّج، زر ذهبي مقروء، شارة السلسلة بإطار ذهبي | PASS (مرئي) | 01-launch.png |
| الرئيسية: لا نص مقطوع (خط عادي) | PASS (مرئي) | 01-launch.png |
| حلقة الهدف اليومي (اتجاه الامتلاء) | غير متحقَّق (التقدم 0%) | 01-launch.png |
| شاشة الدرس: لون الشريط الأصلي مقابل الرأس | FAIL شكلي (فرق لون واضح عند الالتقاء) | 06-lesson.png |
| شاشة الاختبار: بطاقة السؤال وخيارات الإجابة | PASS (مرئي، السؤال 1 من 12) | 07-quiz-q1.png |
| تظليل صح/خطأ والأيقونة | غير متحقَّق | — |
| التبويبات: تعلّم، مراجعة، تقدّم، حسابي | غير متحقَّق | — |
| الإعدادات، اختيار اللغة، إعداد اللغات | غير متحقَّق | — |
| الترحيب، التسجيل، تسجيل الدخول | غير متحقَّق (الحساب كان مسجّلاً مسبقاً) | — |
| درس ناجح / درس راسب (XP، سلسلة، مراجعة) | غير متحقَّق | — |
| لوحة المفاتيح | غير متحقَّق | — |
| الوضع الداكن (النظام) وخط 1.5 | غير متحقَّق (الشاشات المرئية كانت داكنة، لم أغيّر الإعداد) | — |
| تبديل ar/en وإعادة التحميل | غير متحقَّق | — |
| إغلاق وإعادة فتح (حفظ الجلسة والتقدم) | غير متحقَّق (أعاد التطبيق التحميل بعد ضغطي على Reload والجلسة بقيت، لكنه ليس اختباراً كاملاً) | — |
| logcat | جزئي: تحذير «Require cycle: src/components/ui/inde…» ظهر على الشاشة؛ «Cannot connect to Expo CLI» ظهر لاحقاً | 01-launch.png |
| الموقع: 200 لـ `/`, `/en`, `/privacy`, `/en/privacy`, robots, sitemap | PASS | curl |
| الموقع: صفحة 404 مخصصة | PASS (404 + صفحة مخصصة) | curl |
| canonical، hreflang، og:image روابط مطلقة https | PASS | curl |
| الاتجاه: العربي `rtl` والإنجليزي `ltr` | PASS | curl + Playwright |
| لا طلبات خارجية ولا كوكيز | PASS (0 طلب خارجي، 0 كوكيز) | Playwright |
| الروابط الداخلية والأصول | PASS (كلها 200) | curl |
| لا تمرير أفقي عند 390 و1280 | PASS | web-*.png |
| نص الخصوصية الإنجليزي بحروف كبيرة في بداية الجمل | PASS (فحص بصري للنص) | web-1280_en_privacy.png |
| البريد zwnt45602@gmail.com | PASS | curl |
| آخر نشر production من main | PASS: `7f4bef6`، READY | Vercel MCP |

## 2) الأخطاء بحسب الخطورة
1. **عالية — فشل typecheck وlint وJest على ويندوز:** يوجد `src/components/home/goalRing.ts` و`GoalRing.tsx` في المجلد نفسه، وكلاهما متتبَّع في git. `HomeHero.tsx` يستورد `./GoalRing`. النتيجة: `TS1149` وخطأ lint، وفي Jest تظهر «Element type is invalid» داخل `HomeHero` (5 اختبارات في `src/navigation/learningScreens.test.tsx`).
   - **خطوات التكرار:** على ويندوز: `git checkout main && npm install && npm run typecheck`.
   - **مرئي:** الرسائل أعلاه. **تخمين:** السبب أن `./GoalRing` يُحل إلى `goalRing.ts`، ولم أختبره على Linux/macOS. على الجهاز عرض Metro الحلقة بشكل سليم.
2. **متوسطة — لون شريط الرأس الأصلي في الدرس:** أفتح من بداية الرأس المتدرّج، فيظهر فاصل لوني (06-lesson.png). مخالف لبند «بنفس لون الرأس» في TESTING.md §9. خطوات: الرئيسية ← «تابع التعلّم».
3. **متوسطة — سهم الرجوع في الدرس يظهر يساراً ويشير لليسار** داخل واجهة RTL (06-lesson.png). **تخمين:** قد يكون من إعادة ضبط RTL في Expo Go. غير مؤكد.
4. **منخفضة — تحذير «Require cycle» يظهر في LogBox** عند فتح التطبيق، ويخص `src/components/ui/index`. لم أقرأ المسار الكامل.
5. **للعلم (ليس خطأ مؤكداً):** أول فتح للتبويب أظهر «جارٍ التحميل…»، وتبويبات لم تستجب لنقراتي من adb. لا أعرف إن كان السبب بطء الجهاز أو تداخل المستخدم أو خطأ في التطبيق. لا أحكم عليه.

## 3) حقائق مقابل تخمينات
- **حقائق (رأيتها):** كل الصفوف المعلَّمة PASS/FAIL أعلاه.
- **تخمينات:** سبب أخطاء Jest/tsc، وسبب اتجاه السهم، وسبب بطء التبويبات.
- **غير متحقَّق:** كل ما كُتب «غير متحقَّق». لا أدّعي أنها تعمل.

## 4) ما يلزم لإكمال الاختبار
إعادة تفعيل تصحيح USB في الهاتف، وقرار: تسجيل الخروج أو مسح بيانات Expo Go لاختبار الترحيب والتسجيل.

---

# Testbericht Lughati (لغتي) — 18.10.2026

**Gerät:** OPPO A52 (CPH2069), Android 11, Expo Go 57.0.9. **Code:** `main` bei `7f4bef6`. **Hinweis:** Es wurde kein Code geändert.
**Gesamtergebnis:** Der Test auf dem Gerät ist **unvollständig** (USB-Debugging brach ab, das Telefon ist `offline`). Die Website wurde weitgehend vollständig geprüft. Was ich nicht gesehen habe, steht als „nicht verifiziert“.

## 1) Tabelle
| Bereich | Ergebnis | Beleg |
|---|---|---|
| `npm run typecheck` | FAIL (TS1149: `GoalRing.ts` vs. `goalRing.ts`) | Befehlsausgabe |
| `npm run lint` | FAIL (1 Fehler: `import/no-unresolved`, HomeHero.tsx:15) | Befehlsausgabe |
| `npm test` | FAIL: 5 von 490 fehlgeschlagen (485 bestanden) | jest-summary.txt, jest-failures.txt |
| Home: Verlaufs-Header, goldener Button lesbar, Streak-Badge mit goldenem Rand | PASS (gesehen) | 01-launch.png |
| Home: kein abgeschnittener Text (normale Schrift) | PASS (gesehen) | 01-launch.png |
| Tagesziel-Ring (Füllrichtung) | nicht verifiziert (Fortschritt 0 %) | 01-launch.png |
| Lektion: Farbe der nativen Kopfleiste vs. Header | FAIL optisch (sichtbarer Farbsprung an der Naht) | 06-lesson.png |
| Quiz: Fragekarte und Antwortoptionen | PASS (gesehen, Frage 1 von 12) | 07-quiz-q1.png |
| Richtig/Falsch-Färbung mit Icon | nicht verifiziert | — |
| Tabs: Lernen, Wiederholen, Fortschritt, Profil | nicht verifiziert | — |
| Einstellungen, Sprachauswahl, Sprach-Setup | nicht verifiziert | — |
| Onboarding, Registrierung, Anmeldung | nicht verifiziert (Konto war bereits angemeldet) | — |
| Bestandene / nicht bestandene Lektion (XP, Streak, Wiederholung) | nicht verifiziert | — |
| Tastatur | nicht verifiziert | — |
| Dark Mode (System) und Schrift 1,5 | nicht verifiziert (sichtbare Screens waren dunkel, Einstellung nicht geändert) | — |
| Sprachwechsel ar/en und Neuladen | nicht verifiziert | — |
| Beenden und Neustart (Session/Fortschritt) | nicht verifiziert (App lud nach meinem Druck auf Reload neu, Session blieb erhalten, aber kein vollständiger Test) | — |
| logcat | teilweise: Warnung „Require cycle: src/components/ui/inde…“ sichtbar; später „Cannot connect to Expo CLI“ | 01-launch.png |
| Website: 200 für `/`, `/en`, `/privacy`, `/en/privacy`, robots, sitemap | PASS | curl |
| Website: eigene 404-Seite | PASS (404 + eigene Seite) | curl |
| canonical, hreflang, og:image als absolute https-URLs | PASS | curl |
| Richtung: Arabisch `rtl`, Englisch `ltr` | PASS | curl + Playwright |
| Keine Drittanbieter-Anfragen, keine Cookies | PASS (0 Anfragen, 0 Cookies) | Playwright |
| Interne Links und Assets | PASS (alle 200) | curl |
| Kein horizontales Scrollen bei 390 und 1280 | PASS | web-*.png |
| Englischer Datenschutztext: Satzanfänge groß | PASS (Sichtprüfung des Textes) | web-1280_en_privacy.png |
| E-Mail zwnt45602@gmail.com | PASS | curl |
| Letztes Production-Deployment von main | PASS: `7f4bef6`, READY | Vercel MCP |

## 2) Fehler nach Schweregrad
1. **Hoch — typecheck, lint und Jest scheitern unter Windows:** `src/components/home/goalRing.ts` und `GoalRing.tsx` liegen im selben Ordner und sind beide in git. `HomeHero.tsx` importiert `./GoalRing`. Folge: `TS1149`, ein Lint-Fehler, und in Jest „Element type is invalid“ in `HomeHero` (5 Tests in `src/navigation/learningScreens.test.tsx`).
   - **Reproduktion:** unter Windows: `git checkout main && npm install && npm run typecheck`.
   - **Gesehen:** die obigen Meldungen. **Vermutung:** `./GoalRing` wird zu `goalRing.ts` aufgelöst; unter Linux/macOS nicht geprüft. Auf dem Gerät zeigte Metro den Ring korrekt.
2. **Mittel — Farbe der nativen Kopfleiste in der Lektion:** heller als der Beginn des Verlaufs, sichtbarer Farbsprung (06-lesson.png). Widerspricht „gleiche Farbe wie der Header“ in TESTING.md §9. Schritte: Home → „Weiterlernen“.
3. **Mittel — Zurück-Pfeil in der Lektion steht links und zeigt nach links** in einer RTL-Oberfläche (06-lesson.png). **Vermutung:** evtl. setzt Expo Go RTL zurück. Nicht bestätigt.
4. **Niedrig — Warnung „Require cycle“ in der LogBox** beim Start, betrifft `src/components/ui/index`. Den vollen Pfad habe ich nicht gelesen.
5. **Zur Kenntnis (kein bestätigter Fehler):** Beim ersten Öffnen eines Tabs erschien „جارٍ التحميل…“, und einige Tabs reagierten nicht auf meine adb-Taps. Ich weiß nicht, ob Gerätelangsamkeit, Eingriffe des Nutzers oder ein Fehler die Ursache ist, und urteile nicht darüber.

## 3) Fakten und Vermutungen
- **Fakten (gesehen):** alle PASS/FAIL-Zeilen oben.
- **Vermutungen:** Ursache der tsc/Jest-Fehler, Pfeilrichtung, langsame Tabs.
- **Nicht verifiziert:** alles, was so markiert ist. Ich behaupte nicht, dass es funktioniert.

## 4) Zum Abschluss nötig
USB-Debugging am Telefon wieder aktivieren und entscheiden: Abmelden oder Expo-Go-Daten löschen, um Onboarding und Registrierung zu testen.
