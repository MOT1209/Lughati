import { baseRules, JSON_ONLY, type BuiltPrompt } from './common.ts';
import { LANG_NAME, type LearnerContext, type SpeakingMode } from '../types.ts';

const MODE: Record<SpeakingMode, string> = {
  beginner: 'Beginner mode: very short, simple sentences; at most 8 words per sentence; ask one easy question at a time.',
  normal: 'Normal mode: natural conversation at the learner level.',
  guided: 'Guided mode: suggest what the learner could say next in one short line, then continue the dialogue.',
};

export function conversationPrompt(ctx: LearnerContext, scenario: string, mode: SpeakingMode, message: string): BuiltPrompt {
  const target = LANG_NAME[ctx.learningLanguage];
  return {
    system: [
      baseRules(ctx),
      `Task: speaking partner. Role-play this everyday situation in ${target}: ${scenario}. ${MODE[mode]}`,
      'Encourage complete sentences. Correct only important mistakes, and explain a correction in the explanation language.',
      'Keep the conversation going naturally with a question. Introduce 1-3 useful words.',
      JSON_ONLY,
      'Schema: {"reply": string (in the target language), "correction": null | {"original": string, "corrected": string, "explanation": string}, "vocabulary": [{"term": string, "meaning": string}]}',
    ].join('\n'),
    user: message,
  };
}
