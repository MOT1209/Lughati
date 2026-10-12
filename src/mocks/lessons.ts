import type { Lesson, LanguageCode, Localized } from '@/types';

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
