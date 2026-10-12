import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { AuthError } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/routing';
import { validateRegister, type FieldError } from '@/utils/validation';

type Field = 'name' | 'email' | 'password' | 'confirmPassword';

export default function Register() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, FieldError>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: Field) => (text: string) => setValues((prev) => ({ ...prev, [field]: text }));
  const fieldText = (field: Field) => {
    const error = errors[field];
    return error ? t(error.key, error.params) : undefined;
  };

  const onSubmit = async () => {
    const found = validateRegister(values);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await signUp({ method: 'password', name: values.name.trim(), email: values.email.trim(), password: values.password });
      router.replace(ROUTES.splash);
    } catch (error) {
      setSubmitError(t(`auth.errors.${error instanceof AuthError ? error.code : 'unknown'}`));
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{t('auth.register.title')}</Text>
        <Text color="textSecondary">{t('auth.register.subtitle')}</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input label={t('auth.fields.name')} value={values.name} onChangeText={set('name')} error={fieldText('name')} autoComplete="name" textContentType="name" />
        <Input
          label={t('auth.fields.email')}
          value={values.email}
          onChangeText={set('email')}
          error={fieldText('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <Input label={t('auth.fields.password')} value={values.password} onChangeText={set('password')} error={fieldText('password')} password autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
        <Input label={t('auth.fields.confirmPassword')} value={values.confirmPassword} onChangeText={set('confirmPassword')} error={fieldText('confirmPassword')} password autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
      </View>

      {submitError ? (
        <Text color="error" accessibilityLiveRegion="polite">
          {submitError}
        </Text>
      ) : null}

      <Button title={t('auth.register.submit')} onPress={onSubmit} loading={loading} />

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text color="textSecondary">{t('auth.register.haveAccount')}</Text>
        <Link href={ROUTES.login} accessibilityRole="link" style={{ minHeight: 48, paddingVertical: 10 }}>
          <Text color="primary" variant="bodyStrong">
            {t('auth.register.signIn')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
