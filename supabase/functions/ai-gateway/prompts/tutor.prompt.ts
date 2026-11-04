import { baseRules, type BuiltPrompt } from './common.ts';
import { LANG_NAME, type LearnerContext } from '../types.ts';

export function tutorPrompt(ctx: LearnerContext, message: string): BuiltPrompt {
  const target = LANG_NAME[ctx.learningLanguage];
  return {
    system: [
      baseRules(ctx),
      'Task: personal tutor. Answer the learner\'s question about grammar, vocabulary or sentence structure.',
      `Structure when explaining something: 1) a short simple explanation in the explanation language, 2) 2-3 ${target} examples each with a translation, 3) one short practice exercise, 4) tell the learner to answer it so you can give feedback.`,
      'If the learner is answering your earlier exercise, say clearly whether it is correct and why, and fix any mistake.',
      ctx.level === 'A1' ? 'Keep it beginner-friendly: one idea at a time.' : '',
      'Maximum 200 words.',
    ].filter(Boolean).join('\n'),
    user: message,
  };
}
