# سجل النماذج والتوجيه

## الحالة الصادقة للنماذج المرشَّحة
لم أتمكن من الوصول إلى `opencode.ai` من بيئة التطوير (حظر شبكي) ولم أجد صفحة Zen الرسمية عبر البحث؛ المصادر الخارجية التي وجدتها **متضاربة** في أي النماذج مجانية الآن، وأسماء بعضها لا تطابق قائمتك. لذلك:

- كل النماذج التسعة في قائمتك (`glm-5.3-flash-free`, `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `flint-40b-free`, `big-pickle`, `beam-free`) أُدرجت في الجدول **معطّلة وغير موثَّقة وبسعر `unknown`**. لم أتحقق من وجود أي منها ولا من كونه مجانياً ولا من حدوده.
- **لا نموذج يُستدعى** إلى أن يتحقق مشرف ويفعّله (القاعدة أدناه). النتيجة الحالية للتطبيق: «المعلّم الذكي غير متاح الآن».
- العنوان الأساسي لـ API وطريقة المصادقة **غير مُتحقَّق منهما رسمياً**. ما قرأته في مصادر خارجية: `https://opencode.ai/zen/v1/chat/completions` بصيغة OpenAI وترويسة `Authorization: Bearer`، مع إشارة في مصدر آخر إلى ترويسات إضافية. لذلك لا يوجد عنوان افتراضي في الشيفرة: يجب ضبط `OPENCODE_ZEN_BASE_URL` من التوثيق الرسمي.

## قاعدة الاستخدام (تُطبَّق في `registry.ts` ويغطيها الاختبار)
يُستدعى النموذج فقط إذا: `enabled` **و** `verified_at` غير فارغ **و** `pricing_tier = 'free'` (أو `paid` والمسار يسمح صراحةً `allow_paid`) **و** ليس `down` خلال آخر 5 دقائق. غير ذلك لا يُستدعى أبداً. لا تحويل صامت إلى نموذج مدفوع.

## الجداول (للمشرفين فقط؛ لا سياسات للعملاء)
- `ai_model_registry`: `model_id`، `pricing_tier`، `enabled`، `verified_at`، `context_tokens`، `capabilities` (jsonb: `multilingual`, `structuredOutput`, `vision`، …)، صحة النموذج، أسعار الإدخال/الإخراج لكل مليون رمز.
- `ai_task_routing`: لكل مهمة: `primary_model`، `fallback_model`، `allow_paid`، `max_output_tokens`.

## الإدارة بلا تحديث للتطبيق
واجهة الإدارة هي نفس الدالة (`ai-gateway`) بحقل `admin`. يتطلب رمز مستخدم دوره `app_metadata.role = 'admin'` (لا يستطيع المستخدم تعديله). جعل مستخدم مشرفاً (مرة واحدة، من SQL Editor):
```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'you@example.com';
```
العمليات (جسم JSON مع `Authorization: Bearer <رمز المشرف>`):
| `admin` | الغرض |
|---|---|
| `models.list` | السجل والتوجيه |
| `models.upsert` | إضافة/تعديل نموذج. **تفعيل نموذج يرفضه الخادم** ما لم يكن `pricingTier` معروفاً (`free`/`paid`) وكان موثَّقاً (`verified: true` أو سبق توثيقه) |
| `routing.set` | تغيير الأساسي/الاحتياطي/السماح بالمدفوع/سقف المخرجات لمهمة |
| `models.refresh` | يسأل المزوّد عن `/models` ويحدّث **الصحة فقط** (موجود/غير موجود). لا يغيّر السعر ولا التوثيق: كون النموذج مدرجاً لا يعني أنه مجاني |

## كيف تتحقق من نموذج قبل تفعيله (يدوياً، بالتوثيق الرسمي)
1. افتح صفحة النماذج/الأسعار الرسمية وتأكد: المعرّف الحرفي، أنه مجاني حالياً، حدود المعدّل، طول السياق.
2. شغّل `models.refresh` وتأكد أنه مُدرج في `/models` وصحته `ok`.
3. اختبر طلباً حقيقياً بالعربية والألمانية، وتأكد أن ردوده JSON صالحة للميزات المنظّمة (وإلا ضع `capabilities.structuredOutput=false` فيُستثنى منها).
4. `models.upsert` مع `pricingTier:'free'`, `verified:true`, `enabled:true`، ثم `routing.set` للمهام.
5. إن تغيّرت شروط نموذج مجاني، عطّله بنفس الواجهة.
