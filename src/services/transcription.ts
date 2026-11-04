/**
 * Speech-to-text seam. Expo Go has no on-device recognizer and the project has no paid speech
 * service configured, so the default says "unavailable" and the screens fall back to typed text.
 * Register a real implementation (a gateway-backed STT, or a native recognizer in a dev build) later.
 */
export interface TranscriptionService {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  /** Records a short clip and returns the recognized text. */
  recordAndTranscribe(language: string): Promise<string>;
}

class UnavailableTranscription implements TranscriptionService {
  readonly id = 'unavailable';
  async isAvailable() {
    return false;
  }
  async recordAndTranscribe(): Promise<string> {
    throw new Error('transcription_unavailable');
  }
}

let service: TranscriptionService = new UnavailableTranscription();
export const getTranscriptionService = () => service;
export const registerTranscriptionService = (next: TranscriptionService) => {
  service = next;
};
