import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandHero } from '@/components/BrandHero';
import { Button, Input, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { AuthError } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/routing';
import { validateEmail, type FieldError } from '@/utils/validation';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const requestReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<FieldError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const found = validateEmail(email);
    setError(found);
    setSubmitError(null);
    if (found) return;
    setLoading(true);
    try {
      await requestReset(email.trim());
      setSent(true);
    } catch (e) {
      setSubmitError(t(`auth.errors.${e instanceof AuthError ? e.code : 'unknown'}`));
    }
    setLoading(false);
  };

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
      <BrandHero title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Input
          label={t('auth.fields.email')}
          value={email}
          onChangeText={setEmail}
          error={error ? t(error.key, error.params) : undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        {sent ? (
          <Text accessibilityLiveRegion="polite">{t('auth.forgot.sent')}</Text>
        ) : null}
        {submitError ? (
          <Text color="error" accessibilityLiveRegion="polite">
            {submitError}
          </Text>
        ) : null}
        <Button title={t('auth.forgot.submit')} onPress={onSubmit} loading={loading} />
        <Link href={ROUTES.login} accessibilityRole="link" style={{ minHeight: 48, paddingVertical: 10, alignSelf: 'center' }}>
          <Text color="primary" variant="bodyStrong">
            {t('auth.forgot.back')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
