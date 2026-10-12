import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';

import { Icon } from './Icon';
import { Text } from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Adds the show/hide toggle; implies secureTextEntry while hidden. */
  password?: boolean;
}

export function Input({ label, error, password = false, ...rest }: InputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TextInput
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={password && hidden}
          placeholderTextColor={colors.textSecondary}
          style={[typography.body, styles.input, { color: colors.text }]}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={t(hidden ? 'auth.fields.showPassword' : 'auth.fields.hidePassword')}
            style={styles.toggle}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: MIN_TOUCH_TARGET },
  input: { flex: 1, paddingVertical: 8 },
  toggle: { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
