# مخطط قاعدة البيانات (Supabase / Postgres 17)

المصدر الوحيد للحقيقة: `supabase/migrations/*.sql` (لا تغييرات يدوية من اللوحة). البذر: `supabase/seed/catalog.sql` (مولَّد بـ `npm run seed:generate` من `src/mocks/*`).

## الكتالوج العام (قراءة فقط للعملاء؛ لا سياسات كتابة، وصلاحيات الكتابة مسحوبة)
| الجدول | المفتاح | ملاحظات |
|---|---|---|
| `languages` | `code` (ar,de,en,es,fr,tr) | الاتجاه، أدوار المصدر/الهدف |
| `levels` | `id` (A1…C2) | `position` فريد |
| `courses` | `language_code` → languages | دورة لكل لغة هدف |
| `lessons` | `id` (مثل `de-a1-3`) | فريد على `(language_code, level_id, position)`؛ فهرس للقراءة |
| `vocabulary` | `id` | `lesson_id` → lessons (cascade)، `translations` jsonb، فريد `(lesson_id, position)` |

لا يُكرَّر محتوى الدروس داخل سجلات المستخدم: السجلات تشير إلى `lessons.id` / `vocabulary.id` فقط.

## بيانات المستخدم (RLS: المالك فقط لكل العمليات)
| الجدول | المفتاح | الغرض |
|---|---|---|
| `profiles` | `id` = `auth.users.id` | الاسم، لغة المتعلم المصدر والهدف (CHECK: مختلفتان) |
| `user_settings` | `user_id` | المظهر، لغة الواجهة |
| `user_progress` | `(user_id, language_code)` | المستوى، XP، الكلمات، الدقائق، الهدف اليومي |
| `lesson_completions` | `(user_id, lesson_id)` | دروس نُجحت (تحاكي اتحاد المجموعات) |
| `quiz_attempts` | `(user_id, id)` | محاولات؛ `id` يولّده العميل فيكون الرفع متماثل القدرة (idempotent). CHECK: `correct ≤ total` |
| `vocabulary_reviews` | `(user_id, word_id)` | حالة التكرار المتباعد؛ فهرس الاستحقاق `(user_id, language_code, next_review_at)` |
| `learning_activity` | `(user_id, day)` | يوم نشاط؛ السلسلة تُحسب منه |
| `learning_streaks` | `user_id` | لقطة مشتقة (ذاكرة مؤقتة) |
| `sync_migrations` | `(user_id, device_id)` | حالة ترحيل بيانات الجهاز: `started` → `verified` |
| `ai_usage` | `id` identity | استخدام المعلّم الذكي؛ **قراءة للمالك فقط، والكتابة لدالة الخادم (service role)** |

كل المفاتيح الأجنبية للمستخدم `on delete cascade` من `auth.users`، فيحذف `delete_my_account()` كل شيء. المحفّز `touch_updated_at` يحدّث `updated_at`. الفهارس تغطي الاستعلامات الفعلية (آخر المحاولات، المراجعات المستحقة، دروس اللغة).

## الدوال
- `handle_new_user()` (security definer, search_path فارغ): ينشئ `profiles` و`user_settings` عند التسجيل؛ التنفيذ مسحوب من `anon`/`authenticated`.
- `delete_my_account()` (security definer): تحذف `auth.uid()` فقط؛ التنفيذ للمسجَّلين فقط.

## جداول لم تُنشأ ولماذا
`exercises`/`questions`/`lesson_content` (تُولَّد حتمياً من المفردات داخل التطبيق)، `achievements` (لا نظام إنجازات في المنتج)، `subscriptions` (لا اشتراكات في خريطة المنتج). تُضاف بهجرة عند الحاجة.

## التحقق
`supabase/tests/rls.sql` يتحقق من: إنشاء الملف عند التسجيل، عزل المستخدمين (قراءة/إدراج/تعديل/حذف/نقل صف)، حظر كتابة الكتالوج و`ai_usage`، قيود البيانات، منع المجهول، الحذف المتتابع. يُشغَّل في CI (وظيفة `database`) وعلى المشروع الحي.

## جداول الذكاء الاصطناعي (`20261104000001_ai_platform.sql`)
| الجدول | وصول العميل | ملاحظات |
|---|---|---|
| `ai_model_registry`, `ai_task_routing`, `ai_explanation_cache` | **لا شيء** (service role فقط) | السجل: `pricing_tier`, `enabled`, `verified_at`, الصحة؛ التوجيه: أساسي/احتياطي/`allow_paid`/سقف المخرجات |
| `ai_usage_logs` | قراءة صفوفه فقط | النموذج، فئة السعر، الرموز، المدة، الحالة؛ يكتبه الخادم |
| `ai_user_limits` | قراءة صفه | تجاوز الحد اليومي لكل مستخدم (يكتبه المشرف فقط) |
| `ai_conversations`, `ai_messages`, `ai_writing_feedback`, `ai_learning_recommendations` | قراءة صفوفه (وحذف المحادثات/الكتابة) | يكتبها الخادم فقط فلا تُزوَّر |
| `ai_generated_exercises` | قراءة للمسجّلين | مشتركة وبلا بيانات شخصية؛ تكرارها يُمنع بـ `content_hash` |
| `ai_practice_sessions` | قراءة/إدراج/حذف صفوفه | نتائج المتعلم (`score ≤ total`) |
الدالة `ai_reserve(user, feature, daily, minute)` تفحص الحدود وتحجز صفاً ذرّياً (قفل استشاري)؛ للخدمة فقط. الجدول القديم `ai_usage` (من الهجرة 3) لم يعد مستخدماً.
