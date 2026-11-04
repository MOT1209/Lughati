import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { ExerciseItem } from './schemas.ts';
import type { AdminModelPatch, AdminRoutePatch, AdminUser, Store, StoredExercise, UsageOverview, UsageRow } from './store.ts';
import type { ExerciseType, Feature, LearnerContext, RegistryModel, TaskRoute } from './types.ts';

type Row = Record<string, unknown>;
const must = <T>(r: { data: T; error: unknown }): T => {
  if (r.error) throw new Error('db_error');
  return r.data;
};

const toModel = (r: Row): RegistryModel => ({
  id: r.id as string,
  provider: r.provider as string,
  modelId: r.model_id as string,
  pricingTier: r.pricing_tier as RegistryModel['pricingTier'],
  enabled: r.enabled as boolean,
  verifiedAt: (r.verified_at as string | null) ?? null,
  healthStatus: r.health_status as RegistryModel['healthStatus'],
  healthCheckedAt: (r.health_checked_at as string | null) ?? null,
  consecutiveFailures: (r.consecutive_failures as number) ?? 0,
  capabilities: (r.capabilities as Record<string, unknown>) ?? {},
});
const toRoute = (r: Row): TaskRoute => ({
  task: r.task as Feature,
  primaryModel: (r.primary_model as string | null) ?? null,
  fallbackModel: (r.fallback_model as string | null) ?? null,
  allowPaid: r.allow_paid as boolean,
  maxOutputTokens: r.max_output_tokens as number,
});
const toExercise = (r: Row): StoredExercise => ({ id: r.id as string, ...(r.content as ExerciseItem) });

/** Service-role implementation. RLS is bypassed here on purpose: every query is scoped by the caller id the gateway verified. */
export function createSupabaseStore(db: SupabaseClient): Store {
  return {
    async listModels() {
      return must(await db.from('ai_model_registry').select('*')).map(toModel);
    },
    async getRoute(feature) {
      const row = must(await db.from('ai_task_routing').select('*').eq('task', feature).maybeSingle());
      return row ? toRoute(row as Row) : null;
    },
    async listRouting() {
      return must(await db.from('ai_task_routing').select('*')).map(toRoute);
    },
    async reserve(userId, feature, dailyLimit, minuteLimit) {
      const rows = must(await db.rpc('ai_reserve', { p_user: userId, p_feature: feature, p_daily: dailyLimit, p_minute: minuteLimit })) as Row[];
      const r = rows[0];
      return { outcome: (r?.outcome as 'ok' | 'daily' | 'minute') ?? 'daily', logId: (r?.log_id as number | null) ?? null };
    },
    async finalizeLog(logId, f) {
      must(
        await db
          .from('ai_usage_logs')
          .update({ status: f.status, model_id: f.modelId ?? null, pricing_tier: f.pricingTier ?? null, input_tokens: f.inputTokens, output_tokens: f.outputTokens, duration_ms: f.durationMs, error_code: f.errorCode ?? null })
          .eq('id', logId),
      );
    },
    async logEvent(userId, feature, status, errorCode) {
      must(await db.from('ai_usage_logs').insert({ user_id: userId, feature, status, error_code: errorCode ?? null }));
    },
    async updateModelHealth(modelId, p) {
      must(await db.from('ai_model_registry').update({ health_status: p.healthStatus, consecutive_failures: p.consecutiveFailures, health_checked_at: p.healthCheckedAt }).eq('id', modelId));
    },
    async getConversation(userId, id) {
      const row = must(await db.from('ai_conversations').select('id, feature').eq('id', id).eq('user_id', userId).maybeSingle());
      return row ? { id: (row as Row).id as string, feature: (row as Row).feature as string } : null;
    },
    async createConversation(userId, feature, ctx: LearnerContext, mode, title) {
      const row = must(
        await db
          .from('ai_conversations')
          .insert({ user_id: userId, feature, language_code: ctx.learningLanguage, explanation_language: ctx.explanationLanguage, level_id: ctx.level, mode, title })
          .select('id')
          .single(),
      );
      return (row as Row).id as string;
    },
    async recentMessages(conversationId, limit) {
      const rows = must(await db.from('ai_messages').select('role, content').eq('conversation_id', conversationId).order('id', { ascending: false }).limit(limit)) as Row[];
      return rows.reverse().map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content as string }));
    },
    async addMessages(conversationId, userId, messages) {
      must(await db.from('ai_messages').insert(messages.map((m) => ({ conversation_id: conversationId, user_id: userId, role: m.role, content: m.content }))));
      await db.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    },
    async findExercises(language, level, topic, type: ExerciseType, limit) {
      const rows = must(await db.from('ai_generated_exercises').select('id, content').eq('language_code', language).eq('level_id', level).eq('topic', topic).eq('exercise_type', type).order('created_at', { ascending: false }).limit(limit)) as Row[];
      return rows.map(toExercise);
    },
    async saveExercises(items, level, modelId) {
      const out: StoredExercise[] = [];
      for (const { item, hash } of items) {
        const existing = await db.from('ai_generated_exercises').select('id, content').eq('content_hash', hash).maybeSingle();
        if (existing.data) {
          out.push(toExercise(existing.data as Row));
          continue;
        }
        const row = must(
          await db
            .from('ai_generated_exercises')
            .insert({ language_code: item.language, level_id: level, topic: item.topic, exercise_type: item.type, difficulty: item.difficulty, content: item, content_hash: hash, model_id: modelId })
            .select('id, content')
            .single(),
        );
        out.push(toExercise(row as Row));
      }
      return out;
    },
    async saveWriting(userId, ctx, original, corrected, result, modelId) {
      must(await db.from('ai_writing_feedback').insert({ user_id: userId, language_code: ctx.learningLanguage, level_id: ctx.level, original_text: original, corrected_text: corrected, result, model_id: modelId }));
    },
    async saveRecommendation(userId, kind, language, content, validFor) {
      must(await db.from('ai_learning_recommendations').upsert({ user_id: userId, kind, language_code: language, content, valid_for: validFor }, { onConflict: 'user_id,kind,language_code,valid_for' }));
    },
    async cacheGet(key) {
      const row = must(await db.from('ai_explanation_cache').select('content, hits').eq('cache_key', key).maybeSingle());
      if (!row) return null;
      await db.from('ai_explanation_cache').update({ hits: ((row as Row).hits as number) + 1 }).eq('cache_key', key);
      return (row as Row).content as string;
    },
    async cachePut(key, ctx, content, modelId) {
      await db.from('ai_explanation_cache').upsert({ cache_key: key, language_code: ctx.learningLanguage, explanation_language: ctx.explanationLanguage, level_id: ctx.level, content, model_id: modelId }, { onConflict: 'cache_key' });
    },
    async upsertModel(p: AdminModelPatch, verifiedAt) {
      const row: Row = { id: p.id };
      if (p.modelId !== undefined) row.model_id = p.modelId;
      else if (!(await db.from('ai_model_registry').select('id').eq('id', p.id).maybeSingle()).data) row.model_id = p.id;
      if (p.displayName !== undefined) row.display_name = p.displayName;
      if (p.pricingTier !== undefined) row.pricing_tier = p.pricingTier;
      if (p.enabled !== undefined) row.enabled = p.enabled;
      if (verifiedAt) row.verified_at = verifiedAt;
      if (p.verified === false) row.verified_at = null;
      if (p.contextTokens !== undefined) row.context_tokens = p.contextTokens;
      if (p.capabilities !== undefined) row.capabilities = p.capabilities;
      if (p.inputPricePerMtok !== undefined) row.input_price_per_mtok = p.inputPricePerMtok;
      if (p.outputPricePerMtok !== undefined) row.output_price_per_mtok = p.outputPricePerMtok;
      if (p.notes !== undefined) row.notes = p.notes;
      must(await db.from('ai_model_registry').upsert(row, { onConflict: 'id' }));
    },
    async setRoute(p: AdminRoutePatch) {
      const row: Row = { task: p.task };
      if (p.primaryModel !== undefined) row.primary_model = p.primaryModel;
      if (p.fallbackModel !== undefined) row.fallback_model = p.fallbackModel;
      if (p.allowPaid !== undefined) row.allow_paid = p.allowPaid;
      if (p.maxOutputTokens !== undefined) row.max_output_tokens = p.maxOutputTokens;
      must(await db.from('ai_task_routing').upsert(row, { onConflict: 'task' }));
    },
    async usageOverview(now: Date): Promise<UsageOverview> {
      const CAP = 10_000;
      const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString();
      const since24 = now.getTime() - 86_400_000;
      const rows = must(await db.from('ai_usage_logs').select('user_id, feature, model_id, status, input_tokens, output_tokens, created_at').gte('created_at', since7).order('id', { ascending: false }).limit(CAP + 1)) as Row[];
      const out: UsageOverview = { totalUsers: 0, activeUsers7d: 0, requests24h: 0, requests7d: 0, byStatus24h: {}, byModel7d: {}, byFeature7d: {}, truncated: rows.length > CAP };
      const active = new Set<string>();
      for (const r of rows.slice(0, CAP)) {
        const status = r.status as string;
        active.add(r.user_id as string);
        const counted = status !== 'rate_limited' && status !== 'cache_hit';
        if (counted) out.requests7d += 1;
        out.byFeature7d[r.feature as string] = (out.byFeature7d[r.feature as string] ?? 0) + 1;
        const model = r.model_id as string | null;
        if (model) {
          const m = (out.byModel7d[model] ??= { requests: 0, inputTokens: 0, outputTokens: 0 });
          m.requests += 1;
          m.inputTokens += (r.input_tokens as number) ?? 0;
          m.outputTokens += (r.output_tokens as number) ?? 0;
        }
        if (new Date(r.created_at as string).getTime() >= since24) {
          out.byStatus24h[status] = (out.byStatus24h[status] ?? 0) + 1;
          if (counted) out.requests24h += 1;
        }
      }
      out.activeUsers7d = active.size;
      const users = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      out.totalUsers = (users.data as { total?: number } | null)?.total ?? users.data?.users?.length ?? 0;
      return out;
    },
    async recentUsage(limit: number): Promise<UsageRow[]> {
      const rows = must(await db.from('ai_usage_logs').select('*').order('id', { ascending: false }).limit(limit)) as Row[];
      return rows.map((r) => ({
        id: r.id as number,
        userId: r.user_id as string,
        feature: r.feature as string,
        modelId: (r.model_id as string | null) ?? null,
        pricingTier: (r.pricing_tier as string | null) ?? null,
        status: r.status as string,
        errorCode: (r.error_code as string | null) ?? null,
        inputTokens: (r.input_tokens as number) ?? 0,
        outputTokens: (r.output_tokens as number) ?? 0,
        durationMs: (r.duration_ms as number | null) ?? null,
        createdAt: r.created_at as string,
      }));
    },
    async listUsers(page: number, perPage: number, now: Date): Promise<AdminUser[]> {
      const listed = await db.auth.admin.listUsers({ page, perPage });
      if (listed.error) throw new Error('db_error');
      const users = listed.data.users;
      const ids = users.map((u) => u.id);
      const limits = new Map<string, number>();
      const used = new Map<string, number>();
      if (ids.length) {
        for (const r of must(await db.from('ai_user_limits').select('user_id, daily_requests').in('user_id', ids)) as Row[]) limits.set(r.user_id as string, r.daily_requests as number);
        const since = new Date(now.getTime() - 86_400_000).toISOString();
        for (const r of must(await db.from('ai_usage_logs').select('user_id').in('user_id', ids).in('status', ['reserved', 'ok', 'error']).gte('created_at', since)) as Row[]) used.set(r.user_id as string, (used.get(r.user_id as string) ?? 0) + 1);
      }
      return users.map((u) => {
        const bannedUntil = (u as { banned_until?: string | null }).banned_until;
        return {
          id: u.id,
          email: u.email ?? null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          banned: Boolean(bannedUntil && new Date(bannedUntil).getTime() > now.getTime()),
          isAdmin: (u.app_metadata as { role?: string } | undefined)?.role === 'admin',
          requests24h: used.get(u.id) ?? 0,
          dailyLimit: limits.get(u.id) ?? null,
        };
      });
    },
    async setUserLimit(userId: string, dailyRequests: number | null) {
      if (dailyRequests === null) must(await db.from('ai_user_limits').delete().eq('user_id', userId));
      else must(await db.from('ai_user_limits').upsert({ user_id: userId, daily_requests: dailyRequests }, { onConflict: 'user_id' }));
    },
    async setUserBanned(userId: string, banned: boolean) {
      const r = await db.auth.admin.updateUserById(userId, { ban_duration: banned ? '876000h' : 'none' });
      if (r.error) throw new Error('db_error');
    },
  };
}
