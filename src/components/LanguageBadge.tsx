import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { Language } from '@/types';

/**
 * Flag shown next to a language name. It is decorative: the language name is always rendered
 * beside it and is what screen readers announce.
 */
export function LanguageBadge({ language }: { language: Pick<Language, 'flag'> }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', justifyContent: 'center', minWidth: 48 }}
    >
      <Text variant="heading">{language.flag}</Text>
    </View>
  );
}
