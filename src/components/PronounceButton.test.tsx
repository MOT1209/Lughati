import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { setUiLocale } from '@/i18n';
import { getSpeechService, registerSpeechService, type SpeakCallbacks, type SpeechService } from '@/services/speech';
import type { LanguageCode } from '@/types';

import { PronounceButton } from './PronounceButton';

function fakeSpeech(support: boolean | null = null) {
  const calls: { text: string; language: LanguageCode; callbacks?: SpeakCallbacks }[] = [];
  const service: SpeechService & { calls: typeof calls; stop: jest.Mock } = {
    calls,
    supports: () => Promise.resolve(support),
    speak: (text, language, callbacks) => {
      calls.push({ text, language, callbacks });
    },
    stop: jest.fn(),
  };
  return service;
}

const original = getSpeechService();
beforeAll(() => setUiLocale('en'));
afterEach(() => registerSpeechService(original));

describe('PronounceButton', () => {
  it('reads the word in its own language and shows that it is speaking until the end', async () => {
    const speech = fakeSpeech(true);
    registerSpeechService(speech);
    render(<PronounceButton text="Hallo" language="de" />);
    const button = await screen.findByRole('button', { name: 'Listen to Hallo' });

    fireEvent.press(button);
    expect(speech.calls).toEqual([expect.objectContaining({ text: 'Hallo', language: 'de' })]);
    expect(screen.getByRole('button', { name: 'Listen to Hallo' })).toHaveProp('accessibilityState', { busy: true });

    act(() => speech.calls[0]!.callbacks?.onEnd?.());
    expect(screen.getByRole('button', { name: 'Listen to Hallo' })).toHaveProp('accessibilityState', { busy: false });
  });

  it('is hidden when the device has no voice for the language', async () => {
    registerSpeechService(fakeSpeech(false));
    render(<PronounceButton text="Merhaba" language="tr" />);
    await act(async () => {});
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is shown when the device cannot tell which voices it has', async () => {
    registerSpeechService(fakeSpeech(null));
    render(<PronounceButton text="Hola" language="es" />);
    expect(await screen.findByRole('button', { name: 'Listen to Hola' })).toBeTruthy();
  });

  it('stops its word when it leaves the screen, but not a word it did not start', async () => {
    const speech = fakeSpeech(true);
    registerSpeechService(speech);
    const view = render(<PronounceButton text="Hallo" language="de" />);
    fireEvent.press(await screen.findByRole('button', { name: 'Listen to Hallo' }));
    view.unmount();
    expect(speech.stop).toHaveBeenCalledTimes(1);

    const quiet = render(<PronounceButton text="Danke" language="de" />);
    await screen.findByRole('button', { name: 'Listen to Danke' });
    quiet.unmount();
    expect(speech.stop).toHaveBeenCalledTimes(1);
  });
});
