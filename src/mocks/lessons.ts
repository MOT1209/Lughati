import type { Lesson, LanguageCode, LevelId, Localized } from '@/types';

interface LessonTemplate {
  title: Localized;
  summary: Localized;
  estimatedMinutes: number;
}

// One CEFR A1 course outline, shared by every target language. The words of each lesson live in
// mocks/vocabulary.ts at the same index, so the outline and the content cannot drift apart.
export const a1Templates: LessonTemplate[] = [
  {
    title: { ar: 'التحيات واللباقة', en: 'Greetings and politeness' },
    summary: { ar: 'قل مرحباً واشكر واعتذر بأدب.', en: 'Say hello, thank people and apologise politely.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'التعريف بالنفس', en: 'Introducing yourself' },
    summary: { ar: 'قدّم نفسك واسأل عن حال الآخرين.', en: 'Introduce yourself and ask how others are.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'الأرقام', en: 'Numbers' },
    summary: { ar: 'عدّ من 1 إلى 5 وقل 10.', en: 'Count from 1 to 5 and say 10.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الألوان', en: 'Colours' },
    summary: { ar: 'سمِّ الألوان الأساسية.', en: 'Name the basic colours.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'العائلة والأصدقاء', en: 'Family and friends' },
    summary: { ar: 'تحدّث عن أفراد عائلتك وأصدقائك.', en: 'Talk about your family and friends.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الطعام', en: 'Food' },
    summary: { ar: 'تعرّف على أسماء الأطعمة اليومية.', en: 'Learn the names of everyday foods.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'في المقهى', en: 'At the café' },
    summary: { ar: 'اطلب مشروباً واطلب الحساب بأدب.', en: 'Order a drink and ask for the bill politely.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'الوقت', en: 'Time' },
    summary: { ar: 'تحدّث عن اليوم وغداً وأمس.', en: 'Talk about today, tomorrow and yesterday.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الأماكن', en: 'Places' },
    summary: { ar: 'سمِّ الأماكن التي تراها في المدينة.', en: 'Name the places you see in a city.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'التنقل', en: 'Getting around' },
    summary: { ar: 'اسأل عن الاتجاهات وتذكرة السفر.', en: 'Ask for directions and a ticket.' },
    estimatedMinutes: 10,
  },
];

// The A2 outline, built the same way: words in mocks/vocabulary.ts (`a2` lists) at the same index.
export const a2Templates: LessonTemplate[] = [
  {
    title: { ar: 'أيام الأسبوع', en: 'Days of the week' },
    summary: { ar: 'سمِّ أيام العمل وعطلة نهاية الأسبوع.', en: 'Name the weekdays and the weekend.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الطقس', en: 'The weather' },
    summary: { ar: 'صِف الطقس: شمس ومطر وحرّ وبرد.', en: 'Describe the weather: sun, rain, heat and cold.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الجسم والصحة', en: 'Body and health' },
    summary: { ar: 'سمِّ أجزاء الجسم وتحدّث مع الطبيب.', en: 'Name parts of the body and talk to a doctor.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'الملابس والتسوّق', en: 'Clothes and shopping' },
    summary: { ar: 'اسأل عن السعر وقل إن كان رخيصاً أو غالياً.', en: 'Ask the price and say whether it is cheap or expensive.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'في البيت', en: 'At home' },
    summary: { ar: 'سمِّ غرف البيت وما فيها.', en: 'Name the rooms of a home and what is in them.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'العمل والدراسة', en: 'Work and study' },
    summary: { ar: 'تحدّث عن عملك ودراستك.', en: 'Talk about your work and your studies.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'وقت الفراغ', en: 'Free time' },
    summary: { ar: 'قل ما تحب أن تفعله في وقت فراغك.', en: 'Say what you like doing in your free time.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'السفر', en: 'Travel' },
    summary: { ar: 'استعد لرحلة: المطار والفندق والقطار.', en: 'Get ready for a trip: airport, hotel and train.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'أفعال يومية', en: 'Everyday verbs' },
    summary: { ar: 'تعلّم أفعالاً تستخدمها كل يوم.', en: 'Learn verbs you use every day.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'المشاعر والصفات', en: 'Feelings and descriptions' },
    summary: { ar: 'قل كيف تشعر وصِف الأشياء.', en: 'Say how you feel and describe things.' },
    estimatedMinutes: 8,
  },
];

const targetCodes: LanguageCode[] = ['ar', 'de', 'en', 'es', 'fr', 'tr'];

/** Course outlines in the order they are taken; lesson ids are `<language>-<level>-<n>`. */
const courses: { levelId: LevelId; templates: LessonTemplate[] }[] = [
  { levelId: 'A1', templates: a1Templates },
  { levelId: 'A2', templates: a2Templates },
];

export const lessons: Lesson[] = targetCodes.flatMap((code) =>
  courses.flatMap(({ levelId, templates }) =>
    templates.map((template, index) => ({
      id: `${code}-${levelId.toLowerCase()}-${index + 1}`,
      targetLanguage: code,
      levelId,
      title: template.title,
      summary: template.summary,
      order: index + 1,
      estimatedMinutes: template.estimatedMinutes,
    })),
  ),
);
