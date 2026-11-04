import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { ExerciseItem } from './schemas.ts';
import type { AdminModelPatch, AdminRoutePatch, Store, StoredExercise } from './store.ts';
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
  };
}
