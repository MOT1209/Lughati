import type { LanguageCode, LevelId } from '@/types';

export const AI_MODES = ['chat', 'grammar', 'vocabulary', 'correct', 'translate', 'write', 'exercises', 'recommend'] as const;
export type AIMode = (typeof AI_MODES)[number];

export const AI_LIMITS = { message: 800, history: 10, historyItem: 800 } as const;

export interface AIHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  mode: AIMode;
  message: string;
  /** Language being learned. */
  targetLanguage: LanguageCode;
  /** Language the explanations are written in (the learner's own language). */
  explanationLanguage: LanguageCode;
  level: LevelId;
  /** Recent turns for chat; trimmed to AI_LIMITS.history. Never includes names or e-mails. */
  history?: AIHistoryItem[];
}

export interface AIResult {
  text: string;
  /** 'ai' = produced by a real model through the server. 'mock' = canned dev reply, shown as a demo. */
  source: 'ai' | 'mock';
  model?: string;
}

export type AIErrorCode = 'unavailable' | 'rate_limited' | 'timeout' | 'network' | 'invalid' | 'auth' | 'unknown';

export class AIError extends Error {
  constructor(readonly code: AIErrorCode) {
    super(code);
    this.name = 'AIError';
  }
}

export interface AIProvider {
  readonly id: string;
  ask(request: AIRequest): Promise<AIResult>;
}
