import type { SupabaseClient } from '@supabase/supabase-js';

import { AIError, type AIProvider, type AIRequest, type AIResult } from './types';
import { validateAIRequest } from './validate';

const TIMEOUT_MS = 25_000;

/**
 * Talks to the `ai-tutor` Edge Function. The model provider's API key lives only in that function's
 * secrets; the app sends the signed-in user's token and receives text. Only the learner's message,
 * a few recent turns, languages and level are sent: never a name, e-mail or user id.
 */
export class RemoteAIProvider implements AIProvider {
  readonly id = 'remote';

  constructor(private readonly client: SupabaseClient) {}

  async ask(request: AIRequest): Promise<AIResult> {
    const body = validateAIRequest(request);
    const call = this.client.functions.invoke('ai-tutor', { body });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AIError('timeout')), TIMEOUT_MS);
    });
    try {
      const { data, error } = await Promise.race([call, timeout]);
      if (error) throw await mapInvokeError(error);
      const parsed: unknown = data;
      if (typeof parsed !== 'object' || parsed === null) throw new AIError('unknown');
      const { text, model } = parsed as { text?: unknown; model?: unknown };
      if (typeof text !== 'string' || text.trim() === '') throw new AIError('unknown');
      return { text, source: 'ai', model: typeof model === 'string' ? model : undefined };
    } catch (error) {
      throw error instanceof AIError ? error : new AIError('network');
    } finally {
      clearTimeout(timer);
    }
  }
}

async function mapInvokeError(error: unknown): Promise<AIError> {
  const e = error as { name?: string; context?: { status?: number; json?: () => Promise<unknown> } };
  if (e?.name === 'FunctionsFetchError') return new AIError('network');
  const status = e?.context?.status;
  if (status === 401 || status === 403) return new AIError('auth');
  if (status === 429) return new AIError('rate_limited');
  if (status === 400) return new AIError('invalid');
  if (status === 503) return new AIError('unavailable');
  if (status === 504) return new AIError('timeout');
  return new AIError(status && status >= 500 ? 'unavailable' : 'unknown');
}
