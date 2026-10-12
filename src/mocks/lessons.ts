import type { Lesson, LanguageCode, Localized } from '@/types';

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

const targetCodes: LanguageCode[] = ['de', 'en', 'es', 'fr', 'tr'];

export const lessons: Lesson[] = targetCodes.flatMap((code) =>
  a1Templates.map((template, index) => ({
    id: `${code}-a1-${index + 1}`,
    targetLanguage: code,
    levelId: 'A1' as const,
    title: template.title,
    summary: template.summary,
    order: index + 1,
    estimatedMinutes: template.estimatedMinutes,
  })),
);
