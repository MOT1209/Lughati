import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '../backend/client';

/**
 * Administration goes through the same Edge Function as the AI features (`ai-gateway`, body
 * `{ admin: '<action>' }`). The server checks `app_metadata.role === 'admin'` on every call; the
 * client only hides the entry point, it never decides who is an admin.
 */

export type PricingTier = 'free' | 'paid' | 'unknown';
export type HealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';
export type AdminTask = 'tutor' | 'speaking' | 'writing' | 'quiz' | 'pronunciation' | 'planner';
export const ADMIN_TASKS: readonly AdminTask[] = ['tutor', 'speaking', 'writing', 'quiz', 'pronunciation', 'planner'];

export interface AdminModel {
  id: string;
  provider: string;
  modelId: string;
  pricingTier: PricingTier;
  enabled: boolean;
  verifiedAt: string | null;
  healthStatus: HealthStatus;
  healthCheckedAt: string | null;
  consecutiveFailures: number;
  capabilities: Record<string, unknown>;
}

export interface AdminRoute {
  task: AdminTask;
  primaryModel: string | null;
  fallbackModel: string | null;
  allowPaid: boolean;
  maxOutputTokens: number;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers7d: number;
  requests24h: number;
  requests7d: number;
  byStatus24h: Record<string, number>;
  byModel7d: Record<string, { requests: number; inputTokens: number; outputTokens: number }>;
  byFeature7d: Record<string, number>;
  truncated: boolean;
}

export interface AdminUsageRow {
  id: number;
  userId: string;
  feature: string;
  modelId: string | null;
  pricingTier: string | null;
  status: string;
  errorCode: string | null;
  inputTokens: number;
  outputTokens: number;
  durationMs: number | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  isAdmin: boolean;
  requests24h: number;
  dailyLimit: number | null;
}

export interface AdminModelPatch {
  id: string;
  pricingTier?: PricingTier;
  enabled?: boolean;
  verified?: boolean;
  notes?: string | null;
}

export interface AdminRoutePatch {
  task: AdminTask;
  primaryModel?: string | null;
  fallbackModel?: string | null;
  allowPaid?: boolean;
}

export type AdminErrorCode = 'unavailable' | 'forbidden' | 'network' | 'rejected' | 'unknown';

export class AdminError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    /** The server's fixed error token (for example `cannot_enable_unverified`), when it sent one. */
    readonly detail?: string,
  ) {
    super(code);
    this.name = 'AdminError';
  }
}

export interface AdminApi {
  whoami(): Promise<boolean>;
  overview(): Promise<AdminOverview>;
  usageRecent(limit?: number): Promise<AdminUsageRow[]>;
  users(page?: number): Promise<AdminUser[]>;
  setUserLimit(userId: string, dailyRequests: number | null): Promise<void>;
  setUserBanned(userId: string, banned: boolean): Promise<void>;
  models(): Promise<{ models: AdminModel[]; routing: AdminRoute[] }>;
  upsertModel(patch: AdminModelPatch): Promise<void>;
  setRoute(patch: AdminRoutePatch): Promise<void>;
  refreshModels(): Promise<string[]>;
}

async function toError(error: unknown): Promise<AdminError> {
  const e = error as { name?: string; context?: { status?: number; json?: () => Promise<unknown> } };
  if (e?.name === 'FunctionsFetchError') return new AdminError('network');
  const status = e?.context?.status;
  let detail: string | undefined;
  try {
    const body = (await e?.context?.json?.()) as { error?: unknown } | undefined;
    if (typeof body?.error === 'string') detail = body.error;
  } catch {
    // The body is optional; the status alone decides the code.
  }
  if (status === 401 || status === 403) return new AdminError('forbidden', detail);
  if (status === 400) return new AdminError('rejected', detail);
  if (status === 503) return new AdminError('unavailable', detail);
  return new AdminError('unknown', detail);
}

export function createAdminApi(client: SupabaseClient): AdminApi {
  async function call<T>(body: Record<string, unknown>): Promise<T> {
    let result: { data: unknown; error: unknown };
    try {
      result = await client.functions.invoke('ai-gateway', { body });
    } catch {
      throw new AdminError('network');
    }
    if (result.error) throw await toError(result.error);
    return result.data as T;
  }
  return {
    whoami: async () => (await call<{ admin?: boolean }>({ admin: 'whoami' })).admin === true,
    overview: () => call<AdminOverview>({ admin: 'overview' }),
    usageRecent: async (limit = 50) => (await call<{ rows: AdminUsageRow[] }>({ admin: 'usage.recent', limit })).rows,
    users: async (page = 1) => (await call<{ users: AdminUser[] }>({ admin: 'users.list', page })).users,
    setUserLimit: async (userId, dailyRequests) => void (await call({ admin: 'users.setLimit', userId, dailyRequests })),
    setUserBanned: async (userId, banned) => void (await call({ admin: 'users.setBanned', userId, banned })),
    models: () => call<{ models: AdminModel[]; routing: AdminRoute[] }>({ admin: 'models.list' }),
    upsertModel: async (model) => void (await call({ admin: 'models.upsert', model })),
    setRoute: async (route) => void (await call({ admin: 'routing.set', route })),
    refreshModels: async () => (await call<{ listed: string[] }>({ admin: 'models.refresh' })).listed,
  };
}

/** The signed-in user's admin API, or null when the build has no backend. */
export function getAdminApi(): AdminApi | null {
  const client = getSupabase();
  return client ? createAdminApi(client) : null;
}

export function requireAdminApi(): AdminApi {
  const api = getAdminApi();
  if (!api) throw new AdminError('unavailable');
  return api;
}
