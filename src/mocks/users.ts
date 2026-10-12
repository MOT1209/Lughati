import type { User } from '@/types';

/** Builds the learner the mock backend "returns" for any accepted email. */
export function createMockUser(input: { name?: string; email: string }): User {
  const email = input.email.trim().toLowerCase();
  const localPart = email.split('@')[0] ?? 'learner';
  return {
    id: `user-${email}`,
    name: input.name?.trim() || localPart,
    email,
    sourceLanguage: 'ar',
    targetLanguage: 'de',
    joinedAt: '2026-09-01T09:00:00.000Z',
  };
}
