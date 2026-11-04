import { baseRules, JSON_ONLY, type BuiltPrompt } from './common.ts';
import { LANG_NAME, type LearnerContext } from '../types.ts';

export function pronunciationPrompt(ctx: LearnerContext, target: string, missing: string[], substituted: { expected: string; heard: string }[]): BuiltPrompt {
  const lang = LANG_NAME[ctx.learningLanguage];
  return {
    system: [
      baseRules(ctx),
      `Task: pronunciation practice advice for ${lang}. The input is a TEXT comparison between the target sentence and what speech recognition heard. You cannot hear the learner: never score or judge their pronunciation, only suggest practice for the listed words and say the recognition may itself be wrong.`,
      'Give 2-4 short, concrete practice tips (mouth position, stress, common confusions for Arabic speakers) in the explanation language, and the words worth repeating.',
      JSON_ONLY,
      'Schema: {"tips": string[], "practiceWords": string[]}',
    ].join('\n'),
    user: JSON.stringify({ target, missingWords: missing.slice(0, 10), substitutedWords: substituted.slice(0, 10) }),
  };
}
