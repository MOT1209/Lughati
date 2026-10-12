import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/components/ui';

// Placeholder: lessons and exercises are out of scope for Phase 1.
export default function Learn() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState icon="book-outline" title={t('learn.emptyTitle')} message={t('learn.emptyMessage')} />
    </Screen>
  );
}
