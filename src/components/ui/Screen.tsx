import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
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
      {edges.includes('top') ? <ThemedStatusBar /> : null}
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

/**
 * Status bar icons for a screen whose own background reaches the top edge (a loading, error or
 * empty state). The app default is light icons for the hero colour (app/_layout.tsx). Only while
 * focused: tabs stay mounted, and an unfocused one must not override the screen in front.
 */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return useIsFocused() ? <StatusBar style={isDark ? 'light' : 'dark'} /> : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
});
