import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import AiTutor from '@/app/(app)/ai-tutor';
import { setUiLocale } from '@/i18n';
import { AIError, getAIProvider, registerAIProvider, type AIProvider, type AIRequest } from '@/services/ai';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';

const SLOW = 60_000;
const session = {
  user: { id: 'u1', name: 'Sara', email: 'sara@example.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

const previous = getAIProvider().id;
beforeEach(async () => {
  registerRepositories(createMockRepositories());
  act(() => {
    useAuthStore.setState({ session: session as never, initialized: true });
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true, progressVersion: 0 });
  });
  await setUiLocale('en');
});
afterEach(() => registerAIProvider(getAIProvider(previous), { makeDefault: true }));

function useProvider(ask: AIProvider['ask']) {
  const provider: AIProvider = { id: 'test', ask };
  registerAIProvider(provider, { makeDefault: true });
  return provider;
}

describe('AI tutor screen', () => {
  it('sends the learner context (languages, level, mode) and shows the reply as AI', async () => {
    const ask = jest.fn(async (_r: AIRequest) => ({ text: 'Ich gehe nach Hause.', source: 'ai' as const }));
    useProvider(ask);
    renderRouter({ 'ai-tutor': AiTutor }, { initialUrl: '/ai-tutor' });

    fireEvent.press(await screen.findByText('Correct'));
    fireEvent.changeText(screen.getByLabelText('Your message'), 'Ich bin gehen nach Hause');
    fireEvent.press(screen.getByText('Ask'));

    expect(await screen.findByText(/Ich gehe nach Hause/)).toBeTruthy();
    expect(screen.getByText('AI tutor')).toBeTruthy();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ mode: 'correct', targetLanguage: 'de', explanationLanguage: 'ar', level: 'A1', message: 'Ich bin gehen nach Hause' }));
  }, SLOW);

  it('a demo reply is labelled as not real AI', async () => {
    useProvider(async () => ({ text: '(demo) hi', source: 'mock' as const }));
    renderRouter({ 'ai-tutor': AiTutor }, { initialUrl: '/ai-tutor' });
    fireEvent.changeText(await screen.findByLabelText('Your message'), 'hi');
    fireEvent.press(screen.getByText('Ask'));
    expect(await screen.findByText('Demo reply (not real AI)')).toBeTruthy();
  }, SLOW);

  it.each([
    ['unavailable', 'The AI tutor is not available right now. Your lessons still work.'],
    ['rate_limited', 'You have reached the usage limit for now. Try again later.'],
    ['network', 'Could not connect. Check your internet and try again.'],
  ] as const)('shows a clear message when the provider fails with %s', async (code, message) => {
    useProvider(async () => {
      throw new AIError(code);
    });
    renderRouter({ 'ai-tutor': AiTutor }, { initialUrl: '/ai-tutor' });
    fireEvent.changeText(await screen.findByLabelText('Your message'), 'hi');
    fireEvent.press(screen.getByText('Ask'));
    expect(await screen.findByText(message)).toBeTruthy();
  }, SLOW);

  it('does not call the provider for an empty message', async () => {
    const ask = jest.fn();
    useProvider(ask);
    renderRouter({ 'ai-tutor': AiTutor }, { initialUrl: '/ai-tutor' });
    fireEvent.press(await screen.findByText('Ask'));
    await waitFor(() => expect(ask).not.toHaveBeenCalled());
  }, SLOW);

  it('works in Arabic (RTL) with the Arabic strings', async () => {
    await setUiLocale('ar');
    useProvider(async () => ({ text: 'مرحبا', source: 'ai' as const }));
    renderRouter({ 'ai-tutor': AiTutor }, { initialUrl: '/ai-tutor' });
    expect(await screen.findByText('رسالتك')).toBeTruthy();
    expect(screen.getByText('اسأل')).toBeTruthy();
  }, SLOW);
});
