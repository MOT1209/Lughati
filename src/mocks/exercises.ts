import type { Exercise } from '@/types';

// Only German A1 has content so far; other lessons show an "exercises coming" state.
// Adding exercises for another lesson = adding entries here, no screen changes.
type Seed = Omit<Exercise, 'id' | 'lessonId'>;

const mc = (ar: string, en: string, options: string[], answer: string): Seed => ({
  type: 'multiple-choice',
  prompt: { ar, en },
  options,
  answer,
});
const tr = (ar: string, en: string, answer: string): Seed => ({ type: 'translate', prompt: { ar, en }, answer });

const byLesson: Record<string, Seed[]> = {
  'de-a1-1': [
    mc('ماذا تعني «Hallo»؟', 'What does “Hallo” mean?', ['مرحباً', 'وداعاً', 'شكراً'], 'مرحباً'),
    mc('كيف تقول «صباح الخير» بالألمانية؟', 'How do you say “good morning” in German?', ['Guten Abend', 'Guten Morgen', 'Gute Nacht'], 'Guten Morgen'),
    tr('اكتب بالألمانية: اسمي سارة', 'Write in German: my name is Sara', 'Ich heiße Sara'),
    tr('اكتب بالألمانية: كيف حالك؟', 'Write in German: how are you?', 'Wie geht es dir'),
  ],
  'de-a1-2': [
    mc('ما الرقم «drei»؟', 'Which number is “drei”?', ['2', '3', '4'], '3'),
    mc('ما الرقم «zwölf»؟', 'Which number is “zwölf”?', ['12', '20', '2'], '12'),
    tr('اكتب بالألمانية: خمسة', 'Write in German: five', 'fünf'),
    tr('اكتب بالألمانية: عشرون', 'Write in German: twenty', 'zwanzig'),
  ],
  'de-a1-3': [
    mc('ماذا تعني «Kaffee»؟', 'What does “Kaffee” mean?', ['شاي', 'قهوة', 'عصير'], 'قهوة'),
    mc('كيف تطلب بأدب؟', 'How do you ask politely?', ['Ich will Wasser', 'Ein Wasser, bitte', 'Wasser jetzt'], 'Ein Wasser, bitte'),
    tr('اكتب بالألمانية: شكراً', 'Write in German: thank you', 'Danke'),
    tr('اكتب بالألمانية: الحساب من فضلك', 'Write in German: the bill, please', 'Die Rechnung, bitte'),
  ],
};

export const exercises: Exercise[] = Object.entries(byLesson).flatMap(([lessonId, seeds]) =>
  seeds.map((seed, index) => ({ ...seed, id: `${lessonId}-e${index + 1}`, lessonId })),
);
