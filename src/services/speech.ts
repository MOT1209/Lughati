import * as Speech from 'expo-speech';

import type { LanguageCode } from '@/types';

/** BCP 47 tags handed to the device's text-to-speech engine, one per course language. */
export const SPEECH_LANGUAGE_TAGS: Record<LanguageCode, string> = {
  ar: 'ar',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  tr: 'tr-TR',
};

/** Slightly slower than normal: the learner hears a word they do not know yet. */
export const SPEECH_RATE = 0.85;

export interface SpeakCallbacks {
  /** Called once when this utterance ends: finished, stopped, replaced or failed. */
  onEnd?: () => void;
}

/**
 * Pronunciation seam. Screens call getSpeechService() and never import expo-speech, so tests
 * (and a recorded-audio implementation later) register their own service.
 */
export interface SpeechService {
  /** True/false when the device reports its voices; null when it cannot tell (show the control). */
  supports(language: LanguageCode): Promise<boolean | null>;
  /** Speaks `text` in `language`, stopping whatever was being spoken before. */
  speak(text: string, language: LanguageCode, callbacks?: SpeakCallbacks): void;
  stop(): void;
}

/** "de-DE", "de_DE" and "de" all name German: compare the primary language subtag only. */
export function voiceMatches(voiceLanguage: string, language: LanguageCode): boolean {
  return voiceLanguage.toLowerCase().split(/[-_]/)[0] === language;
}

/**
 * The device's own text-to-speech (expo-speech: Android TextToSpeech, iOS AVSpeechSynthesizer).
 * The app sends no request of its own; the system engine reads lesson words, nothing else.
 */
export class DeviceSpeechService implements SpeechService {
  private voices: Promise<string[] | null> | null = null;
  private ending: (() => void) | null = null;

  supports(language: LanguageCode): Promise<boolean | null> {
    // An empty or failed list means "unknown" (some engines report voices late), never "no".
    this.voices ??= Speech.getAvailableVoicesAsync().then(
      (voices) => (voices.length > 0 ? voices.map((v) => v.language) : null),
      () => null,
    );
    return this.voices.then((list) => (list ? list.some((tag) => voiceMatches(tag, language)) : null));
  }

  speak(text: string, language: LanguageCode, callbacks?: SpeakCallbacks): void {
    this.finishCurrent();
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      if (this.ending === end) this.ending = null;
      callbacks?.onEnd?.();
    };
    this.ending = end;
    Speech.stop().catch(() => undefined);
    Speech.speak(text, {
      language: SPEECH_LANGUAGE_TAGS[language],
      rate: SPEECH_RATE,
      onDone: end,
      onStopped: end,
      onError: end,
    });
  }

  stop(): void {
    this.finishCurrent();
    Speech.stop().catch(() => undefined);
  }

  /** The engine does not always report a replaced utterance as stopped: end it here. */
  private finishCurrent() {
    this.ending?.();
  }
}

let service: SpeechService = new DeviceSpeechService();

export function registerSpeechService(next: SpeechService): void {
  service = next;
}

export function getSpeechService(): SpeechService {
  return service;
}
