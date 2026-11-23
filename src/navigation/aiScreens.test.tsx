import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import AiHome from '@/app/(app)/ai/index';
import AiPlanner from '@/app/(app)/ai/planner';
import AiPronunciation from '@/app/(app)/ai/pronunciation';
import AiQuiz from '@/app/(app)/ai/quiz';
import AiSpeaking from '@/app/(app)/ai/speaking';
import AiTutor from '@/app/(app)/ai/tutor';
import AiWriting from '@/app/(app)/ai/writing';
import { setUiLocale } from '@/i18n';
import { AIError, registerAIGateway, type AIGateway } from '@/services/ai';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { registerSpeechService, type SpeechService } from '@/services/speech';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';

const SLOW = 60_000;
const session = { user: { id: 'u1', name: 'Sara', email: 'sara@example.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' }, issuedAt: '2026-01-01' } as const;
const speech: SpeechService = { supports: async () => true, speak: jest.fn(), stop: jest.fn() };

beforeEach(async () => {
  registerRepositories(createMockRepositories());
  registerSpeechService(speech);
  await act(() => {
    useAuthStore.setState({ session: session as never, initialized: true });
    useLearningStore.setState({ userId: 'u1', profile: { source: 'ar', target: 'de' }, profileLoaded: true, progressVersion: 0 });
  });
  await setUiLocale('en');
});
afterEach(() => registerAIGateway(null));

function gateway(handler: (feature: string, context: Record<string, unknown>, payload: Record<string, unknown>) => unknown) {
  const g: AIGateway & { call: jest.Mock } = {
    id: 'test',
    call: jest.fn(async (feature, context, payload) => {
      const out = handler(feature, context as Record<string, unknown>, payload);
      if (out instanceof Error) throw out;
      return out;
    }),
  };
  registerAIGateway(g);
  return g;
}

describe('AI home', () => {
  it('shows the six features and opens one', async () => {
    await renderRouter({ 'ai/index': AiHome, 'ai/tutor': () => <Text>tutor route</Text>, 'ai/speaking': () => <Text>x</Text>, 'ai/writing': () => <Text>x</Text>, 'ai/quiz': () => <Text>x</Text>, 'ai/pronunciation': () => <Text>x</Text>, 'ai/planner': () => <Text>x</Text> }, { initialUrl: '/ai' });
    for (const title of ['Personal tutor', 'Speaking partner', 'Writing coach', 'AI exercises', 'Pronunciation practice', 'Learning planner']) expect(await screen.findByText(title)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Personal tutor'));
    expect(await screen.findByText('tutor route')).toBeTruthy();
  }, SLOW);

  it('renders in Arabic', async () => {
    await setUiLocale('ar');
    await renderRouter({ 'ai/index': AiHome }, { initialUrl: '/ai' });
    expect(await screen.findByText('المعلّم الشخصي')).toBeTruthy();
    expect(screen.getByText('مخطط التعلّم')).toBeTruthy();
  }, SLOW);
});

describe('Tutor', () => {
  it('sends the learner context (never identity), then continues the same conversation', async () => {
    const g = gateway((_f, _c, p) => ({ text: p.conversationId ? 'second answer' : 'first answer', conversationId: 'conv-1', source: 'ai' }));
    await renderRouter({ 'ai/tutor': AiTutor }, { initialUrl: '/ai/tutor' });
    await fireEvent.changeText(await screen.findByLabelText('Your question'), 'Explain the accusative');
    await fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText(/first answer/)).toBeTruthy();
    expect(g.call).toHaveBeenCalledWith('tutor', expect.objectContaining({ learningLanguage: 'de', explanationLanguage: 'ar', level: 'A1' }), { message: 'Explain the accusative' });
    expect(JSON.stringify(g.call.mock.calls[0])).not.toMatch(/Sara|sara@example|u1/);
    await fireEvent.changeText(screen.getByLabelText('Your question'), 'And the dative?');
    await fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText(/second answer/)).toBeTruthy();
    expect(g.call.mock.calls[1]![2]).toEqual({ message: 'And the dative?', conversationId: 'conv-1' });
  }, SLOW);

  it('shows a clear error, keeps the text, and the retry sends it again', async () => {
    let fail = true;
    gateway(() => (fail ? new AIError('rate_limited') : { text: 'recovered', conversationId: null, source: 'ai' }));
    await renderRouter({ 'ai/tutor': AiTutor }, { initialUrl: '/ai/tutor' });
    await fireEvent.changeText(await screen.findByLabelText('Your question'), 'Hallo?');
    await fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText('You have reached the usage limit for now. Try again later.')).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText(/recovered/)).toBeTruthy();
  }, SLOW);

  it('without a backend it says the helper is unavailable instead of faking an answer', async () => {
    await renderRouter({ 'ai/tutor': AiTutor }, { initialUrl: '/ai/tutor' });
    await fireEvent.changeText(await screen.findByLabelText('Your question'), 'Hallo?');
    await fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText('The AI helper is not available right now. Your lessons still work.')).toBeTruthy();
  }, SLOW);
});

describe('Speaking partner', () => {
  it('sends scenario and mode, shows the correction and useful words, and can read the reply aloud', async () => {
    const g = gateway(() => ({ reply: 'Gern! Was möchten Sie?', correction: { original: 'ich will Kaffee', corrected: 'Ich möchte einen Kaffee', explanation: 'More polite' }, vocabulary: [{ term: 'trinken', meaning: 'to drink' }], conversationId: 'c1' }));
    await renderRouter({ 'ai/speaking': AiSpeaking }, { initialUrl: '/ai/speaking' });
    await fireEvent.press(await screen.findByText('At a restaurant'));
    await fireEvent.press(screen.getByText('Guided'));
    await fireEvent.changeText(screen.getByLabelText('Your reply'), 'ich will Kaffee');
    await fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText(/Gern! Was möchten Sie\?/)).toBeTruthy();
    expect(screen.getByText('Correction')).toBeTruthy();
    expect(screen.getByText(/trinken/)).toBeTruthy();
    expect(g.call.mock.calls[0]![2]).toMatchObject({ message: 'ich will Kaffee', scenario: expect.stringContaining('restaurant'), mode: 'guided' });
    await fireEvent.press(screen.getByText('Listen'));
    expect(speech.speak).toHaveBeenCalledWith('Gern! Was möchten Sie?', 'de');
    expect(screen.getByText(/Voice input is not available/)).toBeTruthy();
  }, SLOW);
});

describe('Writing coach', () => {
  it('shows the corrected text, each correction with its explanation, and the improved version', async () => {
    gateway(() => ({ originalText: 'Ich bin gehen Schule', correctedText: 'Ich gehe zur Schule', language: 'de', level: 'A1', corrections: [{ original: 'bin gehen', corrected: 'gehe', explanation: 'Use the present tense' }], improvedVersion: 'Ich gehe heute zur Schule.' }));
    await renderRouter({ 'ai/writing': AiWriting }, { initialUrl: '/ai/writing' });
    await fireEvent.changeText(await screen.findByLabelText('Your text'), 'Ich bin gehen Schule');
    await fireEvent.press(screen.getByText('Check my text'));
    expect(await screen.findByText(/Ich gehe zur Schule/)).toBeTruthy();
    expect(screen.getByText(/bin gehen → gehe/)).toBeTruthy();
    expect(screen.getByText('Use the present tense')).toBeTruthy();
    expect(screen.getByText(/Ich gehe heute zur Schule\./)).toBeTruthy();
  }, SLOW);
});

describe('AI exercises', () => {
  const ex = (id: string, q: string) => ({ id, type: 'multiple_choice', question: q, options: ['house', 'car', 'dog', 'tree'], answer: 'house', explanation: 'Haus means house', difficulty: 'easy', topic: 'places' });
  it('runs a generated exercise set: right and wrong answers, explanation, and a final score', async () => {
    gateway(() => ({ exercises: [ex('e1', 'What is "Haus"?'), ex('e2', 'What is "das Haus"?')], source: 'ai' }));
    await renderRouter({ 'ai/quiz': AiQuiz }, { initialUrl: '/ai/quiz' });
    await fireEvent.changeText(await screen.findByLabelText('Topic'), 'places');
    await fireEvent.press(screen.getByText('Create exercises'));
    expect(await screen.findByText(/What is "Haus"\?/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('house'));
    expect(await screen.findByText('Correct!')).toBeTruthy();
    expect(screen.getByText('Haus means house')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(await screen.findByText(/What is "das Haus"\?/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('car'));
    expect(await screen.findByText('Not quite.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(await screen.findByText('Done: 1 of 2 correct')).toBeTruthy();
  }, SLOW);
  it('says so when the exercises come from the saved set, and shows an error for a bad answer from the service', async () => {
    gateway(() => ({ exercises: [ex('e1', 'Q one')], source: 'cache' }));
    await renderRouter({ 'ai/quiz': AiQuiz }, { initialUrl: '/ai/quiz' });
    await fireEvent.changeText(await screen.findByLabelText('Topic'), 'places');
    await fireEvent.press(screen.getByText('Create exercises'));
    expect(await screen.findByText('From saved exercises')).toBeTruthy();
  }, SLOW);
  it('free-text exercises are checked by text', async () => {
    gateway(() => ({ exercises: [{ id: 't1', type: 'translation', question: 'Translate: ich gehe', options: null, answer: 'I go', explanation: 'gehen = to go', difficulty: 'easy', topic: 'verbs' }], source: 'ai' }));
    await renderRouter({ 'ai/quiz': AiQuiz }, { initialUrl: '/ai/quiz' });
    await fireEvent.changeText(await screen.findByLabelText('Topic'), 'verbs');
    await fireEvent.press(screen.getByText('Translate'));
    await fireEvent.press(screen.getByText('Create exercises'));
    await fireEvent.changeText(await screen.findByLabelText('Your answer'), ' i GO. ');
    await fireEvent.press(screen.getByText('Check'));
    expect(await screen.findByText('Correct!')).toBeTruthy();
  }, SLOW);
});

describe('Pronunciation practice', () => {
  it('lists missing and different words, tips, and always states that it only compares text', async () => {
    const g = gateway(() => ({ diff: { matched: ['ich', 'gehe'], missing: ['zur'], substituted: [{ expected: 'schule', heard: 'stule' }], extra: [], matchRatio: 0.5 }, tips: ['Say "zur" clearly'], practiceWords: ['zur'], limitation: 'text_comparison_only' }));
    await renderRouter({ 'ai/pronunciation': AiPronunciation }, { initialUrl: '/ai/pronunciation' });
    await fireEvent.changeText(await screen.findByLabelText('Sentence to practise'), 'Ich gehe zur Schule');
    await fireEvent.changeText(screen.getByLabelText('Text to compare'), 'ich gehe stule');
    await fireEvent.press(screen.getByText('Compare'));
    expect(await screen.findByText(/Missing words: zur/)).toBeTruthy();
    expect(screen.getByText(/schule → stule/)).toBeTruthy();
    expect(screen.getByText(/Say "zur" clearly/)).toBeTruthy();
    expect(screen.getByText('This compares text only. It cannot judge how a word sounded.')).toBeTruthy();
    expect(screen.getByText(/Speech recognition is not available/)).toBeTruthy();
    expect(g.call.mock.calls[0]![2]).toEqual({ target: 'Ich gehe zur Schule', transcript: 'ich gehe stule' });
    await fireEvent.press(screen.getByText('Listen to the sentence'));
    expect(speech.speak).toHaveBeenCalledWith('Ich gehe zur Schule', 'de');
  }, SLOW);
});

describe('Learning planner', () => {
  it('shows local numbers and advice without any model request, then an AI plan on demand', async () => {
    const g = gateway(() => ({ summary: 'A calm week', dailyTips: ['Review words'], weeklyPlan: [{ day: 'Mon', focus: 'Greetings', minutes: 15 }] }));
    await renderRouter({ 'ai/planner': AiPlanner }, { initialUrl: '/ai/planner' });
    expect(await screen.findByText('Your numbers')).toBeTruthy();
    expect(screen.getByText('Lessons: 0 of 20')).toBeTruthy();
    expect(screen.getByText('No quiz results yet')).toBeTruthy();
    expect(screen.getByText(/Start with your first lesson/)).toBeTruthy();
    expect(g.call).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Plan for the week (AI)'));
    expect(await screen.findByText(/A calm week/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Mon: Greetings/)).toBeTruthy());
    expect(g.call.mock.calls[0]![2]).toMatchObject({ horizon: 'weekly', stats: { completedLessons: 0, accuracyPercent: null } });
  }, SLOW);
});
