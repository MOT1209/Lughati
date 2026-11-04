export const EXERCISE_TYPES = ['multiple_choice', 'fill_blank', 'translation', 'vocabulary', 'grammar', 'sentence_order', 'reading', 'short_writing'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
