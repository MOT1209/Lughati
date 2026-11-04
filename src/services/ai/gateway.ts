import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '../backend/client';
import { AIError, type AIContext, type AIFeature } from './types';

/** One door for every AI feature. The app never talks to a model provider; the gateway does, with server-side keys. */
export interface AIGateway {
  readonly id: string;
  call(feature: AIFeature, context: AIContext, payload: Record<string, unknown>): Promise<unknown>;
}

const TIMEOUT_MS = 30_000;

export class RemoteAIGateway implements AIGateway {
  readonly id = 'remote';
  constructor(private readonly client: SupabaseClient) {}

  async call(feature: AIFeature, context: AIContext, payload: Record<string, unknown>): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AIError('timeout')), TIMEOUT_MS);
    });
    try {
      const { data, error } = await Promise.race([this.client.functions.invoke('ai-gateway', { body: { feature, context, payload } }), timeout]);
      if (error) throw mapInvokeError(error);
      return data;
    } catch (error) {
      throw error instanceof AIError ? error : new AIError('network');
    } finally {
      clearTimeout(timer);
    }
  }
}

function mapInvokeError(error: unknown): AIError {
  const e = error as { name?: string; context?: { status?: number } };
  if (e?.name === 'FunctionsFetchError') return new AIError('network');
  switch (e?.context?.status) {
    case 400:
      return new AIError('invalid');
    case 401:
    case 403:
      return new AIError('auth');
    case 404:
      return new AIError('not_found');
    case 429:
      return new AIError('rate_limited');
    case 502:
      return new AIError('invalid_output');
    case 503:
      return new AIError('unavailable');
    case 504:
      return new AIError('timeout');
    default:
      return new AIError('unknown');
  }
}

/** Used when the build has no backend: AI features say so instead of pretending. */
export class UnavailableAIGateway implements AIGateway {
  readonly id = 'unavailable';
  async call(): Promise<unknown> {
    throw new AIError('unavailable');
  }
}

let current: AIGateway | null = null;

export function getAIGateway(): AIGateway {
  if (current) return current;
  const client = getSupabase();
  current = client ? new RemoteAIGateway(client) : new UnavailableAIGateway();
  return current;
}

export function registerAIGateway(gateway: AIGateway | null): void {
  current = gateway;
}
