import { baseRules, JSON_ONLY, type BuiltPrompt } from './common.ts';
import type { LearnerContext } from '../types.ts';

export function writingPrompt(ctx: LearnerContext, text: string): BuiltPrompt {
  return {
    system: [
      baseRules(ctx),
      'Task: writing coach. Correct grammar and spelling in the learner text (written in the target language) and explain each correction in the explanation language.',
      'Keep the learner\'s meaning. Prefer simple, natural wording at their level. List only real mistakes in "corrections".',
      JSON_ONLY,
      'Schema: {"correctedText": string, "corrections": [{"original": string, "corrected": string, "explanation": string}], "improvedVersion": string}',
    ].join('\n'),
    user: text,
  };
}
