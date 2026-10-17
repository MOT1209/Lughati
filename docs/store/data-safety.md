# Play Console — Data safety و Content rating (إجابات مقترحة)

مبنية على الشيفرة الحالية (لا توجد أي طلبات شبكة في `src/`؛ كل البيانات في AsyncStorage على الجهاز). **إذا أضيفت خلفية أو تحليلات، يجب تعديل هذه الإجابات قبل التحديث.**

## Data safety
- Does your app collect or share any of the required user data types? **No**
  (Google defines "collect" as transmitting data off the device. Data that stays on the device is not "collected".)
- Is all user data encrypted in transit? **Not applicable** (no data leaves the device).
- Do you provide a way for users to request deletion? Data is on-device only; uninstalling or clearing app storage deletes it (state this in the privacy policy, which already does).

## App content
- Privacy policy URL: a public link to `docs/store/privacy-policy.md` (see RELEASE_ANDROID.md).
- Ads: **No**
- App access: **All functionality is available without special access** (any email + 8-character password signs in; nothing is verified). Add a note for reviewers.
- Target audience: **13+** (not directed at children).
- Content rating questionnaire: Education/Reference category; no violence, sexual content, gambling, user-generated content, or sharing of location → expected rating **Everyone / PEGI 3**.
- Government app / financial / health features: **No**.
