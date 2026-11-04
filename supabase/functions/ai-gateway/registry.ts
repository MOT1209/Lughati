import type { RegistryModel, TaskRoute } from './types.ts';

/** A model that has been down is tried again after this long. */
export const DOWN_RETRY_MS = 5 * 60_000;
export const DOWN_AFTER_FAILURES = 3;
/** Hard cap on provider calls per user request: costs cannot snowball through retries. */
export const MAX_ATTEMPTS = 2;

/**
 * The only rule that decides whether a model may be called. Unverified, disabled or unknown-priced
 * models are never used; a paid model is used only when the task route explicitly allows paid.
 */
export function isUsable(model: RegistryModel, allowPaid: boolean, now: Date): boolean {
  if (!model.enabled || !model.verifiedAt) return false;
  if (model.pricingTier === 'free') {
    /* ok */
  } else if (model.pricingTier === 'paid') {
    if (!allowPaid) return false;
  } else {
    return false;
  }
  if (model.healthStatus === 'down') {
    const checked = model.healthCheckedAt ? Date.parse(model.healthCheckedAt) : 0;
    if (now.getTime() - checked < DOWN_RETRY_MS) return false;
  }
  return true;
}

/** Primary first, then fallback; free models always before paid ones; at most MAX_ATTEMPTS entries. */
export function planAttempts(route: TaskRoute, models: RegistryModel[], now: Date, needStructured = false): RegistryModel[] {
  const byId = new Map(models.map((m) => [m.id, m]));
  const wanted = [route.primaryModel, route.fallbackModel]
    .filter((id): id is string => !!id)
    .map((id) => byId.get(id))
    .filter((m): m is RegistryModel => !!m && isUsable(m, route.allowPaid, now));
  // A model explicitly marked as not supporting structured output is skipped for JSON tasks.
  const capable = wanted.filter((m) => !(needStructured && m.capabilities.structuredOutput === false));
  const unique = capable.filter((m, i) => capable.findIndex((x) => x.id === m.id) === i);
  unique.sort((a, b) => Number(a.pricingTier === 'paid') - Number(b.pricingTier === 'paid'));
  return unique.slice(0, MAX_ATTEMPTS);
}

export function nextHealth(model: RegistryModel, success: boolean, now: Date) {
  if (success) return { healthStatus: 'ok' as const, consecutiveFailures: 0, healthCheckedAt: now.toISOString() };
  const failures = model.consecutiveFailures + 1;
  return {
    healthStatus: failures >= DOWN_AFTER_FAILURES ? ('down' as const) : ('degraded' as const),
    consecutiveFailures: failures,
    healthCheckedAt: now.toISOString(),
  };
}
