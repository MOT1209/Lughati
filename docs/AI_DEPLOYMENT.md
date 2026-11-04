# نشر نظام الذكاء الاصطناعي

> الحالة: مخطط القاعدة **مطبَّق** على المشروع الحي، ودالة `ai-gateway` **منشورة** (ACTIVE، v1، `verify_jwt` مفعّل). لا أسرار مضبوطة وكل النماذج معطّلة، فترد الدالة `503 ai_not_configured` ويعرض التطبيق «المساعد الذكي غير متاح». المنشور هو نسخة بلا تعليقات من `supabase/functions/ai-gateway/`؛ أعد النشر من المستودع بـ `supabase functions deploy ai-gateway` متى غيّرت الشيفرة.

1. **الهجرة:** `supabase db push` (الملف `20261104000001_ai_platform.sql`؛ مطبَّق حياً بالفعل).
2. **التوثيق الرسمي لـ OpenCode Zen** (https://opencode.ai/docs/zen/ و https://dev.opencode.ai/console/models): خذ منه عنوان API وطريقة المصادقة وقائمة النماذج المجانية الحالية وحدودها.
3. **الأسرار:**
   ```bash
   supabase secrets set OPENCODE_ZEN_API_KEY=... OPENCODE_ZEN_BASE_URL=...
   supabase secrets set AI_DAILY_REQUEST_LIMIT=40 AI_MINUTE_LIMIT=6 AI_MAX_OUTPUT_TOKENS=700   # اختياري
   ```
4. **النشر:** تم (انظر الحالة أعلاه). للتحديث: `supabase functions deploy ai-gateway` (لا تعطّل `verify_jwt`). الدالة القديمة `ai-tutor` (Anthropic) ما زالت منشورة على المشروع من مرحلة سابقة ولم تعد مستخدمة؛ احذفها من لوحة Supabase.
5. **مشرف:** اجعل حسابك مشرفاً (SQL في `AI_MODEL_REGISTRY.md`).
6. **التحقق من النماذج وتفعيلها:** حسب خطوات `AI_MODEL_REGISTRY.md`، ثم `routing.set` للمهام الست (أساسي مجاني + احتياطي مجاني).
7. **تجربة:** من التطبيق: المعلّم بالعربية («اشرح لي Akkusativ بالعربية») وبالألمانية؛ تحقق من `ai_usage_logs`.
8. **قبل النشر العام:** حدّث سياسة الخصوصية وData Safety (المحادثات تُخزَّن؛ حُدّثت في المستودع)، وأعد توليد `site/` عند الإطلاق.
