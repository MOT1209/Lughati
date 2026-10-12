import type { LanguageCode, Lesson, LevelId, Localized } from '@/types';

interface LessonTemplate {
  title: Localized;
  summary: Localized;
  estimatedMinutes: number;
}

// The same beginner curriculum outline for each target language, so every language has data.
const a1Templates: LessonTemplate[] = [
  {
    title: { ar: 'التحيات والتعارف', en: 'Greetings and introductions' },
    summary: { ar: 'قل مرحباً وعرّف بنفسك.', en: 'Say hello and introduce yourself.' },
    estimatedMinutes: 8,
  },
  {
    title: { ar: 'الأرقام من 1 إلى 20', en: 'Numbers 1–20' },
    summary: { ar: 'عدّ واسأل عن الأسعار البسيطة.', en: 'Count and ask simple prices.' },
    estimatedMinutes: 10,
  },
  {
    title: { ar: 'في المقهى', en: 'At the café' },
    summary: { ar: 'اطلب مشروباً بأدب.', en: 'Order a drink politely.' },
    estimatedMinutes: 12,
  },
];

const a2Templates: LessonTemplate[] = [
  {
    title: { ar: 'الأسرة والأصدقاء', en: 'Family and friends' },
    summary: { ar: 'تحدّث عن أسرتك وأصدقائك.', en: 'Talk about your family and friends.' },
    estimatedMinutes: 12,
  },
  {
    title: { ar: 'الروتين اليومي', en: 'Daily routine' },
    summary: { ar: 'صف يومك من الصباح إلى المساء.', en: 'Describe your day from morning to evening.' },
    estimatedMinutes: 14,
  },
];

const targetCodes: LanguageCode[] = ['de', 'en', 'es', 'fr', 'tr'];

/** `firstOrder` keeps lesson order continuous across levels inside one language. */
function buildLessons(code: LanguageCode, levelId: LevelId, templates: LessonTemplate[], firstOrder = 1): Lesson[] {
  return templates.map((template, index) => ({
    id: `${code}-${levelId.toLowerCase()}-${index + 1}`,
    targetLanguage: code,
    levelId,
    title: template.title,
    summary: template.summary,
    order: firstOrder + index,
    estimatedMinutes: template.estimatedMinutes,
  }));
}

// A1 for every target language; A2 only for German so far (more levels = more data, no code).
export const lessons: Lesson[] = [
  ...targetCodes.flatMap((code) => buildLessons(code, 'A1', a1Templates)),
  ...buildLessons('de', 'A2', a2Templates, a1Templates.length + 1),
];
