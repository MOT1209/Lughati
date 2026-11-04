export type ProviderErrorKind = 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_model' | 'auth' | 'bad_response';

export class ProviderError extends Error {
  constructor(readonly kind: ProviderErrorKind, readonly status = 0) {
    super(kind);
    this.name = 'ProviderError';
  }
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/**
 * One call to an OpenAI-compatible chat/completions endpoint (OpenCode Zen exposes such an endpoint
 * for its non-Claude, non-GPT models; the base URL comes from configuration, never from the client).
 * Provider error bodies are never returned or logged: only a fixed error kind.
 */
export async function chat(
  fetchFn: FetchFn,
  cfg: ProviderConfig,
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature = 0.3,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetchFn(`${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature, stream: false }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new ProviderError('rate_limited', 429);
      if (res.status === 401 || res.status === 403) throw new ProviderError('auth', res.status);
      if (res.status === 404 || res.status === 400 || res.status === 422) throw new ProviderError('invalid_model', res.status);
      throw new ProviderError('unavailable', res.status);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') throw new ProviderError('bad_response');
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    return { text: content.trim(), inputTokens: n(data.usage?.prompt_tokens), outputTokens: n(data.usage?.completion_tokens) };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as Error)?.name === 'AbortError') throw new ProviderError('timeout');
    throw new ProviderError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}

/** Only these are worth a second attempt on the same model; everything else moves to the fallback or stops. */
export const isTransient = (kind: ProviderErrorKind) => kind === 'timeout' || kind === 'unavailable';
