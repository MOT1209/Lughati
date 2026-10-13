import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { AuthError } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/routing';
import { validateLogin, type FieldError } from '@/utils/validation';

export default function Login() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password', FieldError>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fieldText = (error?: FieldError) => (error ? t(error.key, error.params) : undefined);

  const onSubmit = async () => {
    const found = validateLogin({ email, password });
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await signIn({ method: 'password', email: email.trim(), password });
      router.replace(ROUTES.splash); // splash re-resolves the destination from the new session
    } catch (error) {
      setSubmitError(t(`auth.errors.${error instanceof AuthError ? error.code : 'unknown'}`));
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{t('auth.login.title')}</Text>
        <Text color="textSecondary">{t('auth.login.subtitle')}</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label={t('auth.fields.email')}
          value={email}
          onChangeText={setEmail}
          error={fieldText(errors.email)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <Input
          label={t('auth.fields.password')}
          value={password}
          onChangeText={setPassword}
          error={fieldText(errors.password)}
          password
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>

      {submitError ? (
        <Text color="error" accessibilityLiveRegion="polite">
          {submitError}
        </Text>
      ) : null}

      <Text variant="caption" color="textSecondary">
        {t('auth.demoNotice')}
      </Text>

      <Button title={t('auth.login.submit')} onPress={onSubmit} loading={loading} />

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text color="textSecondary">{t('auth.login.noAccount')}</Text>
        <Link href={ROUTES.register} accessibilityRole="link" style={{ minHeight: 48, paddingVertical: 10 }}>
          <Text color="primary" variant="bodyStrong">
            {t('auth.login.createAccount')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
