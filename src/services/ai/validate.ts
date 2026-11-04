import { languages } from '@/mocks/languages';
import { levels } from '@/mocks/levels';

import { AI_LIMITS, AI_MODES, AIError, type AIRequest } from './types';

const langs = new Set<string>(languages.map((l) => l.code));
const lvls = new Set<string>(levels.map((l) => l.id));
// Control characters other than newline/tab have no place in a learner's sentence.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Returns a cleaned copy of the request, or throws AIError('invalid'). The server validates again. */
export function validateAIRequest(request: AIRequest): AIRequest {
  if (!AI_MODES.includes(request.mode)) throw new AIError('invalid');
  if (!langs.has(request.targetLanguage) || !langs.has(request.explanationLanguage) || !lvls.has(request.level)) throw new AIError('invalid');
  const message = request.message.replace(CONTROL, '').trim();
  if (message.length === 0 || message.length > AI_LIMITS.message) throw new AIError('invalid');
  const history = (request.history ?? [])
    .slice(-AI_LIMITS.history)
    .map((h) => ({ role: h.role, content: h.content.replace(CONTROL, '').trim().slice(0, AI_LIMITS.historyItem) }))
    .filter((h) => (h.role === 'user' || h.role === 'assistant') && h.content.length > 0);
  return { ...request, message, history };
}
