import { compareWords } from './diff.ts';
import { conversationPrompt } from './prompts/conversation.prompt.ts';
import { plannerPrompt as plannerPromptFn } from './prompts/learning-planner.prompt.ts';
import { pronunciationPrompt } from './prompts/pronunciation.prompt.ts';
import { quizPrompt } from './prompts/quiz-generator.prompt.ts';
import { tutorPrompt } from './prompts/tutor.prompt.ts';
import { writingPrompt } from './prompts/writing-coach.prompt.ts';
import type { BuiltPrompt } from './prompts/common.ts';
import { chat, isTransient, ProviderError, type ChatMessage, type ProviderConfig } from './provider.ts';
import { MAX_ATTEMPTS, nextHealth, planAttempts } from './registry.ts';
import { parseEnvelope } from './request.ts';
import { exerciseHash, parseJsonLoose, validatePlanner, validateSpeaking, validateTips, validateWriting, validateExercises } from './schemas.ts';
import type { AdminModelPatch, AdminRoutePatch, Store } from './store.ts';
import { FEATURES, LIMITS, type Feature, type LearnerContext, type RegistryModel } from './types.ts';

export interface GatewayEnv {
  baseUrl: string | null;
  apiKey: string | null;
  timeoutMs: number;
  dailyLimit: number;
  minuteLimit: number;
  maxOutputCap: number;
}

export interface Caller {
  id: string;
  role: string | null;
}

export interface Deps {
  store: Store;
  fetch: Parameters<typeof chat>[0];
  env: GatewayEnv;
  now: () => Date;
  sha256: (s: string) => Promise<string>;
}

export interface Reply {
  status: number;
  body: unknown;
}

const reply = (status: number, body: unknown): Reply => ({ status, body });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Reply => reply(status, { error, ...extra });

type Generated<T> = { ok: true; value: T; model: RegistryModel; inputTokens: number; outputTokens: number } | { ok: false; error: 'no_model' | 'provider_failed' | 'invalid_output' | 'rate_limited'; };

export async function handleRequest(input: { body: unknown; caller: Caller | null }, deps: Deps): Promise<Reply> {
  const { caller } = input;
  if (!caller) return fail(401, 'unauthorized');
  if (isObj(input.body) && typeof input.body.admin === 'string') return handleAdmin(input.body, caller, deps);

  const parsed = parseEnvelope(input.body);
  if (!parsed) {
    return fail(400, 'invalid_request');
  }
  const { feature, envelope } = parsed;
  const { context, payload } = envelope;
  const { store, env, now } = deps;

  if (!env.apiKey || !env.baseUrl) return fail(503, 'ai_not_configured');

  // --- Reuse before spending: cached explanations and stored exercises cost no model request. ---
  if (payload.feature === 'quiz') {
    const stored = await store.findExercises(context.learningLanguage, context.level, payload.topic, payload.exerciseType, payload.count);
    if (stored.length >= payload.count) {
      await store.logEvent(caller.id, feature, 'cache_hit');
      return reply(200, { exercises: stored.slice(0, payload.count), source: 'cache' });
    }
  }
  let cacheKey: string | null = null;
  if (payload.feature === 'tutor' && !payload.conversationId && payload.message.length <= 200) {
    cacheKey = await deps.sha256(['tutor', context.learningLanguage, context.explanationLanguage, context.level, norm(payload.message)].join('|'));
    const hit = await store.cacheGet(cacheKey);
    if (hit) {
      await store.logEvent(caller.id, feature, 'cache_hit');
      const conversationId = await store.createConversation(caller.id, 'tutor', context, null, payload.message.slice(0, 60));
      await store.addMessages(conversationId, caller.id, [{ role: 'user', content: payload.message }, { role: 'assistant', content: hit }]);
      return reply(200, { text: hit, conversationId, source: 'cache' });
    }
  }
  // Pronunciation: when every word matched there is nothing to advise, so no model request at all.
  if (payload.feature === 'pronunciation') {
    const diff = compareWords(payload.target, payload.transcript);
    if (diff.missing.length === 0 && diff.substituted.length === 0 && diff.extra.length === 0) {
      return reply(200, { diff, tips: [], practiceWords: [], limitation: LIMITATION, source: 'local' });
    }
  }

  // --- Conversation ownership (history is read server-side, never trusted from the client). ---
  let conversationId: string | null = null;
  let history: ChatMessage[] = [];
  if (payload.feature === 'tutor' || payload.feature === 'speaking') {
    if (payload.conversationId) {
      const conv = await store.getConversation(caller.id, payload.conversationId);
      if (!conv || conv.feature !== payload.feature) return fail(404, 'conversation_not_found');
      conversationId = conv.id;
      const recent = await store.recentMessages(conv.id, LIMITS.history);
      history = recent.map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.historyItem) }));
    }
  }

  // --- Atomic server-side limits. ---
  const reservation = await store.reserve(caller.id, feature, env.dailyLimit, env.minuteLimit);
  if (reservation.outcome !== 'ok' || reservation.logId === null) return fail(429, 'rate_limited', { scope: reservation.outcome });
  const logId = reservation.logId;

  const route = await store.getRoute(feature);
  const models = await store.listModels();
  const started = now().getTime();
  const finish = (status: 'ok' | 'error' | 'unavailable' | 'invalid', model: RegistryModel | null, inT: number, outT: number, code?: string) =>
    store.finalizeLog(logId, { status, modelId: model?.id, pricingTier: model?.pricingTier, inputTokens: inT, outputTokens: outT, durationMs: now().getTime() - started, errorCode: code });

  if (!route) {
    await finish('unavailable', null, 0, 0, 'no_route');
    return fail(503, 'ai_unavailable');
  }
  const cfg: ProviderConfig = { baseUrl: env.baseUrl, apiKey: env.apiKey, timeoutMs: env.timeoutMs };
  const maxTokens = Math.min(route.maxOutputTokens, env.maxOutputCap);

  const run = <T>(prompt: BuiltPrompt, structured: boolean, validate: (text: string) => T | null): Promise<Generated<T>> =>
    generate(deps, cfg, route, models, structured, maxTokens, [{ role: 'system', content: prompt.system }, ...history, { role: 'user', content: prompt.user }], validate);

  const unavailable = async (g: Extract<Generated<unknown>, { ok: false }>): Promise<Reply> => {
    await finish(g.error === 'invalid_output' ? 'invalid' : 'unavailable', null, 0, 0, g.error);
    // Provider details are never forwarded; the user only learns that the service is unavailable.
    return fail(g.error === 'invalid_output' ? 502 : 503, g.error === 'invalid_output' ? 'invalid_output' : 'ai_unavailable');
  };

  switch (payload.feature) {
    case 'tutor': {
      const g = await run(tutorPrompt(context, payload.message), false, (t) => (t.length > 0 ? t : null));
      if (!g.ok) return unavailable(g);
      conversationId ??= await store.createConversation(caller.id, 'tutor', context, null, payload.message.slice(0, 60));
      await store.addMessages(conversationId, caller.id, [{ role: 'user', content: payload.message }, { role: 'assistant', content: g.value.slice(0, 6000) }]);
      if (cacheKey) await store.cachePut(cacheKey, context, g.value.slice(0, 6000), g.model.id);
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { text: g.value, conversationId, source: 'ai', model: g.model.id });
    }
    case 'speaking': {
      const g = await run(conversationPrompt(context, payload.scenario, payload.mode, payload.message), true, (t) => validateSpeaking(parseJsonLoose(t)));
      if (!g.ok) return unavailable(g);
      conversationId ??= await store.createConversation(caller.id, 'speaking', context, payload.mode, payload.scenario.slice(0, 60));
      await store.addMessages(conversationId, caller.id, [{ role: 'user', content: payload.message }, { role: 'assistant', content: g.value.reply }]);
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { ...g.value, conversationId, source: 'ai', model: g.model.id });
    }
    case 'writing': {
      const g = await run(writingPrompt(context, payload.text), true, (t) => validateWriting(parseJsonLoose(t), { text: payload.text, language: context.learningLanguage, level: context.level }));
      if (!g.ok) return unavailable(g);
      await store.saveWriting(caller.id, context, payload.text, g.value.correctedText, g.value, g.model.id);
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { ...g.value, source: 'ai', model: g.model.id });
    }
    case 'quiz': {
      const g = await run(quizPrompt(context, payload.topic, payload.exerciseType, payload.count), true, (t) =>
        validateExercises(parseJsonLoose(t), { type: payload.exerciseType, topic: payload.topic, language: context.learningLanguage, count: payload.count }),
      );
      if (!g.ok) return unavailable(g);
      const hashed = await Promise.all(g.value.map(async (item) => ({ item, hash: await exerciseHash(item, context.level, deps.sha256) })));
      const saved = await store.saveExercises(hashed, context.level, g.model.id);
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { exercises: saved.slice(0, payload.count), source: 'ai', model: g.model.id });
    }
    case 'pronunciation': {
      const diff = compareWords(payload.target, payload.transcript);
      const g = await run(pronunciationPrompt(context, payload.target, diff.missing, diff.substituted), true, (t) => validateTips(parseJsonLoose(t)));
      if (!g.ok) {
        // The text comparison is still useful without model advice.
        await finish('unavailable', null, 0, 0, g.error);
        return reply(200, { diff, tips: [], practiceWords: [], limitation: LIMITATION, source: 'local', adviceUnavailable: true });
      }
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { diff, ...g.value, limitation: LIMITATION, source: 'ai', model: g.model.id });
    }
    case 'planner': {
      const g = await run(plannerPromptFn(context, payload.stats, payload.horizon), true, (t) => validatePlanner(parseJsonLoose(t)));
      if (!g.ok) return unavailable(g);
      await store.saveRecommendation(caller.id, payload.horizon, context.learningLanguage, g.value, now().toISOString().slice(0, 10));
      await finish('ok', g.model, g.inputTokens, g.outputTokens);
      return reply(200, { ...g.value, source: 'ai', model: g.model.id });
    }
  }
}

const LIMITATION = 'text_comparison_only';
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Calls the planned models in order (primary, then fallback). At most MAX_ATTEMPTS provider calls
 * per user request, and never a model the registry does not allow (unverified / unknown price /
 * paid without explicit permission). Output that fails validation counts as a failed attempt.
 */
async function generate<T>(
  deps: Deps,
  cfg: ProviderConfig,
  route: NonNullable<Awaited<ReturnType<Store['getRoute']>>>,
  models: RegistryModel[],
  structured: boolean,
  maxTokens: number,
  messages: ChatMessage[],
  validate: (text: string) => T | null,
): Promise<Generated<T>> {
  const plan = planAttempts(route, models, deps.now(), structured);
  if (plan.length === 0) return { ok: false, error: 'no_model' };
  let attempts = 0;
  let sawInvalid = false;
  let sawRateLimit = false;
  for (const model of plan) {
    let retried = false;
    while (attempts < MAX_ATTEMPTS) {
      attempts += 1;
      try {
        const res = await chat(deps.fetch, cfg, model.modelId, messages, maxTokens);
        const value = validate(res.text);
        if (value === null) {
          sawInvalid = true;
          break; // bad output: try the next model, do not repeat the same one
        }
        await deps.store.updateModelHealth(model.id, nextHealth(model, true, deps.now()));
        return { ok: true, value, model, inputTokens: res.inputTokens, outputTokens: res.outputTokens };
      } catch (error) {
        const kind = error instanceof ProviderError ? error.kind : 'unavailable';
        if (kind === 'rate_limited') sawRateLimit = true;
        await deps.store.updateModelHealth(model.id, nextHealth(model, false, deps.now()));
        if (isTransient(kind) && !retried && plan.length === 1 && attempts < MAX_ATTEMPTS) {
          retried = true; // a single retry only when there is no fallback to move to
          continue;
        }
        break;
      }
    }
    if (attempts >= MAX_ATTEMPTS) break;
  }
  if (sawInvalid) return { ok: false, error: 'invalid_output' };
  return { ok: false, error: sawRateLimit ? 'rate_limited' : 'provider_failed' };
}

// ---------------- Administration (JWT app_metadata.role === 'admin' only) ----------------

async function handleAdmin(body: Record<string, unknown>, caller: Caller, deps: Deps): Promise<Reply> {
  if (caller.role !== 'admin') return fail(403, 'forbidden');
  const { store } = deps;
  switch (body.admin) {
    case 'models.list':
      return reply(200, { models: await store.listModels(), routing: await store.listRouting() });
    case 'models.upsert': {
      const patch = parseModelPatch(body.model);
      if (!patch) return fail(400, 'invalid_request');
      // Enabling requires a known price tier and an explicit verification.
      const enabling = patch.enabled === true;
      const existing = (await store.listModels()).find((m) => m.id === patch.id);
      const tier = patch.pricingTier ?? existing?.pricingTier ?? 'unknown';
      const verifiedNow = patch.verified === true;
      if (enabling && (tier === 'unknown' || (!verifiedNow && !existing?.verifiedAt))) return fail(400, 'cannot_enable_unverified');
      await store.upsertModel(patch, verifiedNow ? deps.now().toISOString() : null);
      return reply(200, { ok: true });
    }
    case 'routing.set': {
      const patch = parseRoutePatch(body.route);
      if (!patch) return fail(400, 'invalid_request');
      await store.setRoute(patch);
      return reply(200, { ok: true });
    }
    case 'models.refresh': {
      if (!deps.env.apiKey || !deps.env.baseUrl) return fail(503, 'ai_not_configured');
      const listed = await listProviderModels(deps);
      if (!listed) return fail(502, 'provider_unreachable');
      const now = deps.now().toISOString();
      for (const m of await store.listModels()) {
        // "Listed" is availability only. It never makes a model free or verified.
        const present = listed.has(m.modelId);
        await store.updateModelHealth(m.id, { healthStatus: present ? 'ok' : 'down', consecutiveFailures: present ? 0 : m.consecutiveFailures + 1, healthCheckedAt: now });
      }
      return reply(200, { listed: [...listed].slice(0, 200) });
    }
    case 'whoami':
      return reply(200, { admin: true, id: caller.id });
    case 'overview':
      return reply(200, await store.usageOverview(deps.now()));
    case 'usage.recent': {
      const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(Math.max(body.limit, 1), 200) : 50;
      return reply(200, { rows: await store.recentUsage(limit) });
    }
    case 'users.list': {
      const page = typeof body.page === 'number' && Number.isInteger(body.page) && body.page >= 1 && body.page <= 1000 ? body.page : 1;
      return reply(200, { page, perPage: USERS_PER_PAGE, users: await store.listUsers(page, USERS_PER_PAGE, deps.now()) });
    }
    case 'users.setLimit': {
      const id = typeof body.userId === 'string' && UUID.test(body.userId) ? body.userId : null;
      const n = body.dailyRequests;
      const valid = n === null || (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10_000);
      if (!id || !valid) return fail(400, 'invalid_request');
      await store.setUserLimit(id, n as number | null);
      return reply(200, { ok: true });
    }
    case 'users.setBanned': {
      const id = typeof body.userId === 'string' && UUID.test(body.userId) ? body.userId : null;
      if (!id || typeof body.banned !== 'boolean') return fail(400, 'invalid_request');
      // An admin cannot lock themselves out from here.
      if (id === caller.id) return fail(400, 'cannot_ban_self');
      await store.setUserBanned(id, body.banned);
      return reply(200, { ok: true });
    }
    default:
      return fail(400, 'invalid_request');
  }
}

const USERS_PER_PAGE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listProviderModels(deps: Deps): Promise<Set<string> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.env.timeoutMs);
  try {
    const res = await deps.fetch(`${deps.env.baseUrl!.replace(/\/+$/, '')}/models`, { method: 'GET', headers: { Authorization: `Bearer ${deps.env.apiKey}` }, body: '', signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { id?: unknown }[] };
    return new Set((data.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === 'string'));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
function parseModelPatch(raw: unknown): AdminModelPatch | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !ID.test(raw.id)) return null;
  const p: AdminModelPatch = { id: raw.id };
  if (raw.modelId !== undefined) {
    if (typeof raw.modelId !== 'string' || raw.modelId.length < 1 || raw.modelId.length > 120) return null;
    p.modelId = raw.modelId;
  }
  if (raw.pricingTier !== undefined) {
    if (raw.pricingTier !== 'free' && raw.pricingTier !== 'paid' && raw.pricingTier !== 'unknown') return null;
    p.pricingTier = raw.pricingTier;
  }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') return null;
    p.enabled = raw.enabled;
  }
  if (raw.verified !== undefined) {
    if (typeof raw.verified !== 'boolean') return null;
    p.verified = raw.verified;
  }
  if (raw.displayName !== undefined) p.displayName = typeof raw.displayName === 'string' ? raw.displayName.slice(0, 80) : undefined;
  if (raw.notes !== undefined) p.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 500) : null;
  for (const key of ['inputPricePerMtok', 'outputPricePerMtok'] as const) {
    if (raw[key] !== undefined) {
      const v = raw[key];
      if (v !== null && !(typeof v === 'number' && Number.isFinite(v) && v >= 0)) return null;
      p[key] = v as number | null;
    }
  }
  if (raw.contextTokens !== undefined) {
    const v = raw.contextTokens;
    if (v !== null && !(typeof v === 'number' && Number.isInteger(v) && v > 0)) return null;
    p.contextTokens = v as number | null;
  }
  if (raw.capabilities !== undefined) {
    if (!isObj(raw.capabilities)) return null;
    p.capabilities = raw.capabilities;
  }
  return p;
}

function parseRoutePatch(raw: unknown): AdminRoutePatch | null {
  if (!isObj(raw) || !FEATURES.includes(raw.task as Feature)) return null;
  const p: AdminRoutePatch = { task: raw.task as Feature };
  for (const key of ['primaryModel', 'fallbackModel'] as const) {
    if (raw[key] !== undefined) {
      const v = raw[key];
      if (v !== null && !(typeof v === 'string' && ID.test(v))) return null;
      p[key] = v as string | null;
    }
  }
  if (raw.allowPaid !== undefined) {
    if (typeof raw.allowPaid !== 'boolean') return null;
    p.allowPaid = raw.allowPaid;
  }
  if (raw.maxOutputTokens !== undefined) {
    const v = raw.maxOutputTokens;
    if (!(typeof v === 'number' && Number.isInteger(v) && v >= 50 && v <= 4000)) return null;
    p.maxOutputTokens = v;
  }
  return p;
}

export type { LearnerContext };
