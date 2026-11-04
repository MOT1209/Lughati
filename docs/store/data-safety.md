# Play Console — Data safety و Content rating (إجابات مقترحة)

مبنية على الشيفرة الحالية بعد إضافة الحساب السحابي (Supabase) والمعلّم الذكي. **راجعها قبل التقديم وتأكد أنها تطابق الإصدار المنشور.** أي أداة تحليلات أو إعلانات جديدة تتطلب تعديلها أولاً.

## Data safety
- Does your app collect or share any of the required user data types? **Yes (collected; not shared with third parties for their own use)**
- Is all user data encrypted in transit? **Yes** (HTTPS/TLS to Supabase; the AI request goes over HTTPS to our server function).
- Do you provide a way for users to request that their data be deleted? **Yes**: in-app Settings → Delete account (deletes the account and all cloud data); also by e-mail.

| Data type | Collected | Purpose | Optional | Notes |
|---|---|---|---|---|
| Personal info → Name | Yes | Account management | No | Entered at sign-up |
| Personal info → Email address | Yes | Account management, authentication | No | Verification and password-reset e-mails |
| Personal info → User IDs | Yes | Account management, app functionality | No | Internal account id |
| App activity → App interactions | Yes | App functionality | No | Lesson completions, quiz results, review schedule, streak |
| App info and performance | No | n/a | n/a | No crash reporting or analytics SDK |
| Messages / user content | **Yes (collected and stored)** | App functionality | Yes (AI helpers are optional) | Conversations with the tutor / speaking partner and writing submitted for correction are sent to an AI model provider (service provider acting for us) and **stored** in the user's account so they can be shown again; deleted with the conversation or the account |
| Location, contacts, photos, files, audio, health, financial | No | n/a | n/a | Pronunciation uses the system TTS and records nothing |

- Data shared with third parties: **No** for advertising/marketing. The AI provider and Supabase are service providers (processors); declare them according to Google's "service provider" exemption only after confirming with the provider's terms.
- Security practices: data encrypted in transit; users can request deletion; row-level security isolates accounts.
- Pronunciation (`expo-speech`) hands lesson words to the device's TTS engine; no user data is passed.

## App content
- Privacy policy URL: a public link to the hosted `docs/store/privacy-policy.md` (see RELEASE_ANDROID.md). **Must be live before submission.**
- Ads: **No**
- App access: provide Play reviewers a test account (create one in Supabase and give the e-mail/password in the Play Console "App access" form). E-mail verification must be completed for that account beforehand.
- Target audience: **13+** (not directed at children).
- Content rating questionnaire: Education/Reference. The AI tutor produces generated text: answer the user-generated/AI-content questions honestly in the form (AI output is filtered by the system prompt but not guaranteed).
- Government app / financial / health features: **No**.
