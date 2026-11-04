import * as Speech from 'expo-speech';

import { DeviceSpeechService, SPEECH_LANGUAGE_TAGS, SPEECH_RATE, voiceMatches } from './speech';

const speak = Speech.speak as jest.Mock;
const voices = Speech.getAvailableVoicesAsync as jest.Mock;

beforeEach(() => {
  speak.mockClear();
  (Speech.stop as jest.Mock).mockClear();
});

/** Options of the n-th Speech.speak call. */
const optionsOf = (call = 0): Speech.SpeechOptions => speak.mock.calls[call]![1];

describe('voiceMatches', () => {
  it('compares the primary language subtag, whatever the separator or region', () => {
    expect(voiceMatches('de-DE', 'de')).toBe(true);
    expect(voiceMatches('de_AT', 'de')).toBe(true);
    expect(voiceMatches('AR', 'ar')).toBe(true);
    expect(voiceMatches('en-US', 'es')).toBe(false);
    expect(voiceMatches('fr', 'fr')).toBe(true);
  });
});

describe('DeviceSpeechService', () => {
  it('speaks in the language tag of the word at the learner rate', () => {
    new DeviceSpeechService().speak('Hallo', 'de');
    expect(speak).toHaveBeenCalledWith('Hallo', expect.objectContaining({ language: 'de-DE', rate: SPEECH_RATE }));
  });

  it('has a tag for every course language', () => {
    expect(Object.keys(SPEECH_LANGUAGE_TAGS).sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'tr']);
  });

  it('ends an utterance once, also when the engine reports both done and stopped', () => {
    const onEnd = jest.fn();
    new DeviceSpeechService().speak('Hallo', 'de', { onEnd });
    optionsOf().onDone?.();
    optionsOf().onStopped?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ends the previous word when a new one starts or speech is stopped', () => {
    const service = new DeviceSpeechService();
    const first = jest.fn();
    const second = jest.fn();
    service.speak('Hallo', 'de', { onEnd: first });
    service.speak('Danke', 'de', { onEnd: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    service.stop();
    expect(second).toHaveBeenCalledTimes(1);
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('ends the word when the engine fails', () => {
    const onEnd = jest.fn();
    new DeviceSpeechService().speak('Merhaba', 'tr', { onEnd });
    optionsOf().onError?.(new Error('no engine'));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('knows which languages have a voice, and asks the device only once', async () => {
    voices.mockClear();
    voices.mockResolvedValueOnce([
      { identifier: 'a', name: 'a', quality: 'Default', language: 'de-DE' },
      { identifier: 'b', name: 'b', quality: 'Default', language: 'en_US' },
    ]);
    const service = new DeviceSpeechService();
    expect(await service.supports('de')).toBe(true);
    expect(await service.supports('en')).toBe(true);
    expect(await service.supports('tr')).toBe(false);
    expect(voices).toHaveBeenCalledTimes(1);
  });

  it('treats an empty or failing voice list as unknown, never as unsupported', async () => {
    voices.mockResolvedValueOnce([]);
    expect(await new DeviceSpeechService().supports('de')).toBeNull();
    voices.mockRejectedValueOnce(new Error('engine not ready'));
    expect(await new DeviceSpeechService().supports('de')).toBeNull();
  });
});
