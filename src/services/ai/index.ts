import type { AIConversation, AIMessage } from '@/types';

export interface AIProvider {
  readonly id: string;
  /** Produces the assistant's reply to the latest user message of the conversation. */
  reply(conversation: AIConversation, userMessage: string): Promise<AIMessage>;
}

export class MockAIProvider implements AIProvider {
  readonly id = 'mock';

  async reply(_conversation: AIConversation, userMessage: string): Promise<AIMessage> {
    return {
      id: `mock-${Date.now()}`,
      role: 'assistant',
      content: `(mock) ${userMessage}`,
      createdAt: new Date().toISOString(),
    };
  }
}

const providers = new Map<string, AIProvider>();
let defaultId = 'mock';

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

registerAIProvider(new MockAIProvider());
