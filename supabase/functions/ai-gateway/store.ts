import type { ExerciseItem } from './schemas.ts';
import type { ExerciseType, Feature, LearnerContext, RegistryModel, TaskRoute } from './types.ts';

export interface StoredExercise extends ExerciseItem {
  id: string;
}

export interface AdminModelPatch {
  id: string;
  modelId?: string;
  displayName?: string;
  pricingTier?: 'free' | 'paid' | 'unknown';
  enabled?: boolean;
  verified?: boolean;
  contextTokens?: number | null;
  capabilities?: Record<string, unknown>;
  inputPricePerMtok?: number | null;
  outputPricePerMtok?: number | null;
  notes?: string | null;
}

export interface AdminRoutePatch {
  task: Feature;
  primaryModel?: string | null;
  fallbackModel?: string | null;
  allowPaid?: boolean;
  maxOutputTokens?: number;
}

export interface UsageOverview {
  totalUsers: number;
  activeUsers7d: number;
  requests24h: number;
  requests7d: number;
  byStatus24h: Record<string, number>;
  byModel7d: Record<string, { requests: number; inputTokens: number; outputTokens: number }>;
  byFeature7d: Record<string, number>;
  /** True when the 7-day window held more rows than the aggregation cap, so the figures are a lower bound. */
  truncated: boolean;
}

export interface UsageRow {
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

/** Everything the gateway needs from the database; the Supabase implementation lives in supabaseStore.ts. */
export interface Store {
  listModels(): Promise<RegistryModel[]>;
  getRoute(feature: Feature): Promise<TaskRoute | null>;
  reserve(userId: string, feature: Feature, dailyLimit: number, minuteLimit: number): Promise<{ outcome: 'ok' | 'daily' | 'minute'; logId: number | null }>;
  finalizeLog(logId: number, fields: { status: 'ok' | 'error' | 'unavailable' | 'invalid'; modelId?: string; pricingTier?: string; inputTokens: number; outputTokens: number; durationMs: number; errorCode?: string }): Promise<void>;
  logEvent(userId: string, feature: Feature, status: 'cache_hit' | 'invalid' | 'unavailable', errorCode?: string): Promise<void>;
  updateModelHealth(modelId: string, patch: { healthStatus: string; consecutiveFailures: number; healthCheckedAt: string }): Promise<void>;
  getConversation(userId: string, id: string): Promise<{ id: string; feature: string } | null>;
  createConversation(userId: string, feature: 'tutor' | 'speaking', ctx: LearnerContext, mode: string | null, title: string): Promise<string>;
  recentMessages(conversationId: string, limit: number): Promise<{ role: 'user' | 'assistant'; content: string }[]>;
  addMessages(conversationId: string, userId: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<void>;
  findExercises(language: string, level: string, topic: string, type: ExerciseType, limit: number): Promise<StoredExercise[]>;
  saveExercises(items: { item: ExerciseItem; hash: string }[], level: string, modelId: string): Promise<StoredExercise[]>;
  saveWriting(userId: string, ctx: LearnerContext, original: string, corrected: string, result: unknown, modelId: string): Promise<void>;
  saveRecommendation(userId: string, kind: 'daily' | 'weekly', language: string, content: unknown, validFor: string): Promise<void>;
  cacheGet(key: string): Promise<string | null>;
  cachePut(key: string, ctx: LearnerContext, content: string, modelId: string): Promise<void>;
  listRouting(): Promise<TaskRoute[]>;
  upsertModel(patch: AdminModelPatch, verifiedAt: string | null): Promise<void>;
  setRoute(patch: AdminRoutePatch): Promise<void>;
  usageOverview(now: Date): Promise<UsageOverview>;
  recentUsage(limit: number): Promise<UsageRow[]>;
  listUsers(page: number, perPage: number, now: Date): Promise<AdminUser[]>;
  /** null removes the per-user override (the global default applies again). */
  setUserLimit(userId: string, dailyRequests: number | null): Promise<void>;
  setUserBanned(userId: string, banned: boolean): Promise<void>;
}
