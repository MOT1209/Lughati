import { useAsyncData } from '@/hooks/useAsyncData';
import { getSpeechService } from '@/services/speech';
import type { LanguageCode } from '@/types';

/**
 * False only when the device reported that it has no voice for `language`: then speech controls
 * are hidden, since a wrong-language voice would teach a wrong pronunciation. While the answer is
 * pending, when the device cannot tell, or without a language, controls stay available (true).
 */
export function useSpeechSupport(language: LanguageCode | null): boolean {
  const supported = useAsyncData(async () => (language ? getSpeechService().supports(language) : null), [language]);
  return !(supported.status === 'success' && supported.data === false);
}
