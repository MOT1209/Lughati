import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

interface ScreenProps {
  children: ReactNode;
  /** Scrolls the content (default). Turn off for screens that manage their own list. */
  scroll?: boolean;
  /** Safe-area edges to pad; tab screens pass ['top'] because the tab bar handles the bottom. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

// SafeArea + keyboard avoidance + optional scroll. No fixed heights, so larger system font
// sizes make the screen scroll instead of clipping text.
export function Screen({ children, scroll = true, edges = ['top', 'bottom'], contentStyle }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padded = { padding: spacing.lg, gap: spacing.lg };

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.grow, padded, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, padded, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
});
