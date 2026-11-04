import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_TASKS, AdminError, requireAdminApi, type AdminModel, type AdminRoute, type AdminUser } from '@/services/admin';
import { isolateLtr } from '@/utils/bidi';

type Tab = 'overview' | 'models' | 'users' | 'usage';
const LIMIT_PRESETS = [10, 40, 100] as const;

function describeError(t: TFunction, error: unknown): string {
  if (error instanceof AdminError) {
    if (error.detail === 'cannot_enable_unverified') return t('admin.errors.cannotEnable');
    if (error.detail === 'cannot_ban_self') return t('admin.errors.cannotBanSelf');
    switch (error.code) {
      case 'forbidden':
        return t('admin.errors.forbidden');
      case 'network':
        return t('admin.errors.network');
      case 'unavailable':
        return t('admin.errors.unavailable');
      case 'rejected':
        return t('admin.errors.rejected');
    }
  }
  return t('admin.errors.unknown');
}

function Chip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.borderStrong,
        backgroundColor: selected ? colors.primaryMuted : colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text variant="small" color={selected ? 'primary' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Runs one admin change, then reloads the section; a failure becomes a visible notice (never silent). */
function useAction(reload: () => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const run = async (change: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await change();
      setNotice(null);
      reload();
    } catch (error) {
      setNotice(describeError(t, error));
    } finally {
      setBusy(false);
    }
  };
  return { busy, notice, setNotice, run };
}

function Notice({ message }: { message: string | null }) {
  const { colors, spacing, radius } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: colors.errorMuted, padding: spacing.md, borderRadius: radius.md }}>
      <Text variant="small" color="onErrorMuted">
        {message}
      </Text>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}

// ---------------- overview ----------------
function OverviewTab() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const data = useAsyncData(() => requireAdminApi().overview(), []);
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} message={describeError(t, data.error)} onRetry={data.reload} />;
  const o = data.data;
  const facts: [string, number][] = [
    [t('admin.overview.users'), o.totalUsers],
    [t('admin.overview.active'), o.activeUsers7d],
    [t('admin.overview.requests24h'), o.requests24h],
    [t('admin.overview.requests7d'), o.requests7d],
  ];
  const lines = (title: string, entries: [string, string][]) =>
    entries.length ? (
      <Card style={{ gap: spacing.xs }}>
        <Text variant="bodyStrong">{title}</Text>
        {entries.map(([k, v]) => (
          <Text key={k} variant="small" color="textSecondary">
            {isolateLtr(k)}: {v}
          </Text>
        ))}
      </Card>
    ) : null;
  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.xs }}>
        {facts.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text color="textSecondary">{label}</Text>
            <Text variant="bodyStrong">{value}</Text>
          </View>
        ))}
      </Card>
      {o.truncated ? (
        <Text variant="caption" color="textSecondary">
          {t('admin.overview.truncated')}
        </Text>
      ) : null}
      {lines(t('admin.overview.byFeature'), Object.entries(o.byFeature7d).map(([k, v]): [string, string] => [k, String(v)]))}
      {lines(
        t('admin.overview.byModel'),
        Object.entries(o.byModel7d).map(([k, v]): [string, string] => [k, `${v.requests} (${t('admin.overview.tokens', { input: v.inputTokens, output: v.outputTokens })})`]),
      )}
      {lines(t('admin.overview.byStatus'), Object.entries(o.byStatus24h).map(([k, v]): [string, string] => [k, String(v)]))}
      <Button title={t('admin.refresh')} variant="secondary" icon="refresh-outline" onPress={data.reload} />
    </View>
  );
}

// ---------------- models + routing ----------------
function ModelsTab() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const data = useAsyncData(() => requireAdminApi().models(), []);
  const { busy, notice, setNotice, run } = useAction(data.reload);
  const [info, setInfo] = useState<string | null>(null);
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} message={describeError(t, data.error)} onRetry={data.reload} />;
  const { models, routing } = data.data;
  const usable = models.filter((m) => m.enabled && m.verifiedAt !== null);
  const api = requireAdminApi();

  const confirmFree = (m: AdminModel) =>
    Alert.alert(t('admin.models.confirmTitle', { id: m.id }), t('admin.models.confirmBody'), [
      { text: t('admin.models.cancel'), style: 'cancel' },
      { text: t('admin.models.confirm'), onPress: () => void run(() => api.upsertModel({ id: m.id, pricingTier: 'free', verified: true })) },
    ]);

  const routeFor = (task: string): AdminRoute | undefined => routing.find((r) => r.task === task);

  return (
    <View style={{ gap: spacing.md }}>
      <Notice message={notice} />
      {info ? (
        <Text variant="small" color="textSecondary">
          {info}
        </Text>
      ) : null}
      <Button
        title={t('admin.models.refresh')}
        variant="secondary"
        icon="pulse-outline"
        loading={busy}
        onPress={() =>
          void run(async () => {
            const listed = await api.refreshModels();
            setInfo(t('admin.models.refreshed', { count: listed.length }));
          })
        }
      />
      {models.map((m) => {
        const ready = m.pricingTier !== 'unknown' && m.verifiedAt !== null;
        const summary = [
          m.pricingTier === 'free' ? t('admin.models.tier.free') : m.pricingTier === 'paid' ? t('admin.models.tier.paid') : t('admin.models.tier.unknown'),
          m.verifiedAt ? t('admin.models.verified') : t('admin.models.unverified'),
          m.healthStatus === 'ok' ? t('admin.models.health.ok') : m.healthStatus === 'degraded' ? t('admin.models.health.degraded') : m.healthStatus === 'down' ? t('admin.models.health.down') : t('admin.models.health.unknown'),
          m.enabled ? t('admin.models.enabled') : t('admin.models.disabled'),
        ].join(' · ');
        return (
          <Card key={m.id} style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{isolateLtr(m.id)}</Text>
            <Text variant="caption" color="textSecondary">
              {summary}
            </Text>
            <Row>
              {!ready ? <Button title={t('admin.models.markFree')} variant="secondary" disabled={busy} onPress={() => confirmFree(m)} /> : null}
              <Button
                title={m.enabled ? t('admin.models.disable') : t('admin.models.enable')}
                variant={m.enabled ? 'danger' : 'primary'}
                disabled={busy || (!m.enabled && !ready)}
                onPress={() => void run(() => api.upsertModel({ id: m.id, enabled: !m.enabled }))}
              />
            </Row>
          </Card>
        );
      })}

      <Text variant="subheading">{t('admin.models.routing')}</Text>
      {ADMIN_TASKS.map((task) => {
        const route = routeFor(task);
        const pick = (field: 'primaryModel' | 'fallbackModel', value: string | null) => {
          setNotice(null);
          void run(() => api.setRoute({ task, [field]: value }));
        };
        return (
          <Card key={task} style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{task}</Text>
            {(['primaryModel', 'fallbackModel'] as const).map((field) => (
              <View key={field} style={{ gap: spacing.xs }}>
                <Text variant="caption" color="textSecondary">
                  {field === 'primaryModel' ? t('admin.models.primary') : t('admin.models.fallback')}
                </Text>
                <Row>
                  <Chip label={t('admin.models.none')} selected={!route?.[field]} disabled={busy} onPress={() => pick(field, null)} />
                  {usable.map((m) => (
                    <Chip key={m.id} label={m.id} selected={route?.[field] === m.id} disabled={busy} onPress={() => pick(field, m.id)} />
                  ))}
                </Row>
              </View>
            ))}
            <Row>
              <Chip
                label={route?.allowPaid ? t('admin.models.paidOn') : t('admin.models.paidOff')}
                selected={route?.allowPaid === true}
                disabled={busy}
                onPress={() => void run(() => api.setRoute({ task, allowPaid: !route?.allowPaid }))}
              />
            </Row>
          </Card>
        );
      })}
    </View>
  );
}

// ---------------- users ----------------
function UserCard({ user, busy, onLimit, onBan }: { user: AdminUser; busy: boolean; onLimit: (n: number | null) => void; onBan: () => void }) {
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const last = user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : t('admin.users.never');
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text variant="bodyStrong">{isolateLtr(user.email ?? user.id)}</Text>
      <Text variant="caption" color="textSecondary">
        {[t('admin.users.lastSignIn', { date: last }), t('admin.users.requests', { count: user.requests24h }), t('admin.users.limit', { value: user.dailyLimit ?? t('admin.users.limitDefault') })].join(' · ')}
      </Text>
      {user.banned || user.isAdmin ? (
        <Text variant="caption" style={{ color: user.banned ? colors.error : colors.primary }}>
          {[user.isAdmin ? t('admin.users.admin') : null, user.banned ? t('admin.users.banned') : null].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {t('admin.users.setLimit')}
      </Text>
      <Row>
        <Chip label={t('admin.users.reset')} selected={user.dailyLimit === null} disabled={busy} onPress={() => onLimit(null)} />
        {LIMIT_PRESETS.map((n) => (
          <Chip key={n} label={String(n)} selected={user.dailyLimit === n} disabled={busy} onPress={() => onLimit(n)} />
        ))}
      </Row>
      {!user.isAdmin ? <Button title={user.banned ? t('admin.users.unban') : t('admin.users.ban')} variant={user.banned ? 'secondary' : 'danger'} disabled={busy} onPress={onBan} /> : null}
    </Card>
  );
}

function UsersTab() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [page, setPage] = useState(1);
  const data = useAsyncData(() => requireAdminApi().users(page), [page]);
  const { busy, notice, run } = useAction(data.reload);
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} message={describeError(t, data.error)} onRetry={data.reload} />;
  const api = requireAdminApi();
  const users = data.data;

  const confirmBan = (u: AdminUser) => {
    if (u.banned) return void run(() => api.setUserBanned(u.id, false));
    Alert.alert(t('admin.users.confirmBanTitle'), t('admin.users.confirmBanBody'), [
      { text: t('admin.models.cancel'), style: 'cancel' },
      { text: t('admin.users.ban'), style: 'destructive', onPress: () => void run(() => api.setUserBanned(u.id, true)) },
    ]);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Notice message={notice} />
      {users.length === 0 ? <EmptyState title={t('admin.users.empty')} message="" /> : null}
      {users.map((u) => (
        <UserCard key={u.id} user={u} busy={busy} onLimit={(n) => void run(() => api.setUserLimit(u.id, n))} onBan={() => confirmBan(u)} />
      ))}
      <Row>
        <Button title={t('admin.users.previous')} variant="secondary" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} />
        <Button title={t('admin.users.next')} variant="secondary" disabled={users.length < 50} onPress={() => setPage((p) => p + 1)} />
      </Row>
    </View>
  );
}

// ---------------- usage log ----------------
function UsageTab() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const data = useAsyncData(() => requireAdminApi().usageRecent(50), []);
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} message={describeError(t, data.error)} onRetry={data.reload} />;
  return (
    <View style={{ gap: spacing.sm }}>
      <Button title={t('admin.refresh')} variant="secondary" icon="refresh-outline" onPress={data.reload} />
      {data.data.length === 0 ? <EmptyState title={t('admin.usage.empty')} message="" /> : null}
      {data.data.map((r) => (
        <Card key={r.id} style={{ gap: 2 }}>
          <Text variant="bodyStrong">
            {r.feature} · {r.status}
          </Text>
          <Text variant="caption" color="textSecondary">
            {[isolateLtr(r.modelId ?? '-'), r.pricingTier ?? '-', t('admin.usage.tokens', { input: r.inputTokens, output: r.outputTokens }), r.errorCode ?? '', new Date(r.createdAt).toLocaleString()].filter(Boolean).join(' · ')}
          </Text>
        </Card>
      ))}
    </View>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <Screen edges={['bottom']}>
      <Row>
        <Chip label={t('admin.tabs.overview')} selected={tab === 'overview'} onPress={() => setTab('overview')} />
        <Chip label={t('admin.tabs.models')} selected={tab === 'models'} onPress={() => setTab('models')} />
        <Chip label={t('admin.tabs.users')} selected={tab === 'users'} onPress={() => setTab('users')} />
        <Chip label={t('admin.tabs.usage')} selected={tab === 'usage'} onPress={() => setTab('usage')} />
      </Row>
      <View style={{ gap: spacing.md }}>
        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'models' ? <ModelsTab /> : null}
        {tab === 'users' ? <UsersTab /> : null}
        {tab === 'usage' ? <UsageTab /> : null}
      </View>
    </Screen>
  );
}
