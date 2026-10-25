import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { getSpeechService } from '@/services/speech';
import type { LanguageCode } from '@/types';

interface PronounceButtonProps {
  /** The word as written in the language being learned (not bidi-isolated). */
  text: string;
  language: LanguageCode;
}

/**
 * Speaks a word with the device's voice for its language. Hidden when the device reports that it
 * has no voice for the language (a wrong-language voice would teach a wrong pronunciation).
 */
export function PronounceButton({ text, language }: PronounceButtonProps) {
  const { t } = useTranslation();
  const { colors, radius } = useTheme();
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);
  const ownsSpeech = useRef(false); // this button started the word being read right now
  const supported = useAsyncData(() => getSpeechService().supports(language), [language]);

  // Leaving the screen (or the word) stops a word this button is still reading.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (ownsSpeech.current) getSpeechService().stop();
    };
  }, []);

  if (supported.status === 'success' && supported.data === false) return null;

  const onPress = () => {
    ownsSpeech.current = true;
    setSpeaking(true);
    getSpeechService().speak(text, language, {
      onEnd: () => {
        ownsSpeech.current = false;
        if (mounted.current) setSpeaking(false);
      },
    });
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('speech.listen', { term: text })}
      accessibilityState={{ busy: speaking }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryMuted,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={speaking ? 'volume-high' : 'volume-high-outline'} color="onPrimaryMuted" />
    </Pressable>
  );
}
