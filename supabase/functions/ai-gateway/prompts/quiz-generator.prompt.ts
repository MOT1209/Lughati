import { baseRules, JSON_ONLY, type BuiltPrompt } from './common.ts';
import { LANG_NAME, type ExerciseType, type LearnerContext } from '../types.ts';

const TYPE_RULES: Record<ExerciseType, string> = {
  multiple_choice: 'Each item has exactly 4 distinct "options" and exactly one correct answer, which is one of the options.',
  fill_blank: 'The question is a sentence containing "___" for the missing word; optionally give 3-4 options.',
  translation: 'The question is a short sentence to translate between the target and explanation language; "answer" is the translation.',
  vocabulary: 'Test one word: meaning, or choosing the right word; give 4 distinct options.',
  grammar: 'Test one grammar point suitable for the level; give 3-4 distinct options.',
  sentence_order: '"options" are the shuffled words of ONE sentence; "answer" is the correct sentence.',
  reading: 'The question contains a 2-3 sentence passage followed by one comprehension question; give 3-4 distinct options.',
  short_writing: 'The question is a writing task of 1-2 sentences; "answer" is a model answer.',
};

export function quizPrompt(ctx: LearnerContext, topic: string, type: ExerciseType, count: number): BuiltPrompt {
  const target = LANG_NAME[ctx.learningLanguage];
  return {
    system: [
      baseRules(ctx),
      `Task: create ${count} ${type.replace('_', ' ')} exercise(s) in ${target} about "${topic}" at level ${ctx.level}.`,
      TYPE_RULES[type],
      'Every exercise must have an unambiguous correct answer, a short explanation in the explanation language, and a difficulty of easy, medium or hard. No duplicate questions.',
      JSON_ONLY,
      'Schema: {"exercises": [{"question": string, "options": string[] | null, "answer": string, "explanation": string, "difficulty": "easy"|"medium"|"hard"}]}',
    ].join('\n'),
    user: `Topic: ${topic}`,
  };
}
