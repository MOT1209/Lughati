import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/components/ui';

// Placeholder: full statistics are out of scope for Phase 1.
export default function Progress() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState icon="stats-chart-outline" title={t('progress.emptyTitle')} message={t('progress.emptyMessage')} />
    </Screen>
  );
}
