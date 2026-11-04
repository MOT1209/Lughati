import { getSupabase } from '../backend/client';
import { RemoteAIProvider } from './RemoteAIProvider';
import { AIError, type AIProvider, type AIRequest, type AIResult } from './types';

export * from './types';
export { validateAIRequest } from './validate';
export { RemoteAIProvider } from './RemoteAIProvider';

/** Development-only stand-in. Its result says `source: 'mock'` so a screen can never pass it off as AI. */
export class MockAIProvider implements AIProvider {
  readonly id = 'mock';
  async ask(request: AIRequest): Promise<AIResult> {
    return { text: `(demo) ${request.message}`, source: 'mock' };
  }
}

/** Used when no AI backend exists (release build without configuration): always honest about it. */
export class UnavailableAIProvider implements AIProvider {
  readonly id = 'unavailable';
  async ask(_request: AIRequest): Promise<AIResult> {
    throw new AIError('unavailable');
  }
}

const providers = new Map<string, AIProvider>();
let defaultId = 'unavailable';

export function registerAIProvider(provider: AIProvider, options?: { makeDefault?: boolean }): void {
  providers.set(provider.id, provider);
  if (options?.makeDefault) defaultId = provider.id;
}

/** Screens call this and never import a concrete provider. */
export function getAIProvider(id: string = defaultId): AIProvider {
  const provider = providers.get(id);
  if (!provider) throw new Error(`AI provider "${id}" is not registered`);
  return provider;
}

registerAIProvider(new UnavailableAIProvider());
registerAIProvider(new MockAIProvider());
const client = getSupabase();
if (client) {
  registerAIProvider(new RemoteAIProvider(client), { makeDefault: true });
} else if (__DEV__) {
  defaultId = 'mock';
}
