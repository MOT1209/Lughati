// Supabase Edge Function: ai-tutor. Deploy with verify_jwt = true.
// Secrets (set with `supabase secrets set`, never in the app): ANTHROPIC_API_KEY,
// optional AI_MODEL (default claude-haiku-5-5), AI_MINUTE_LIMIT (6), AI_DAILY_LIMIT (60).
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildSystemPrompt, parseRequest } from './prompt.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const num = (name: string, fallback: number) => {
  const v = Number(Deno.env.get(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  // Identify the caller from their own token (never from the request body).
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json(401, { error: 'unauthorized' });
  const userId = auth.user.id;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const record = (mode: string, status: 'ok' | 'error' | 'rate_limited' | 'invalid', extra: { model?: string; input?: number; output?: number } = {}) =>
    admin.from('ai_usage').insert({ user_id: userId, mode, provider: 'anthropic', model: extra.model ?? null, input_tokens: extra.input ?? 0, output_tokens: extra.output ?? 0, status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = parseRequest(body);
  if (!parsed) {
    await record('unknown', 'invalid');
    return json(400, { error: 'invalid_request' });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(503, { error: 'ai_not_configured' });

  // Rate limits per user, counted from the usage table.
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const count = async (ms: number) => {
    const { count: c } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['ok', 'error'])
      .gte('created_at', since(ms));
    return c ?? 0;
  };
  if ((await count(60_000)) >= num('AI_MINUTE_LIMIT', 6) || (await count(86_400_000)) >= num('AI_DAILY_LIMIT', 60)) {
    await record(parsed.mode, 'rate_limited');
    return json(429, { error: 'rate_limited' });
  }

  const model = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: buildSystemPrompt(parsed),
        messages: [...parsed.history, { role: 'user', content: parsed.message }],
      }),
    });
    if (!res.ok) {
      await record(parsed.mode, 'error', { model });
      return json(res.status === 429 ? 503 : 502, { error: 'provider_error' });
    }
    const data = await res.json();
    const text = Array.isArray(data.content) ? data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim() : '';
    if (!text) {
      await record(parsed.mode, 'error', { model });
      return json(502, { error: 'empty_response' });
    }
    await record(parsed.mode, 'ok', { model, input: data.usage?.input_tokens ?? 0, output: data.usage?.output_tokens ?? 0 });
    return json(200, { text, model });
  } catch (e) {
    await record(parsed.mode, 'error', { model });
    return (e as Error).name === 'AbortError' ? json(504, { error: 'timeout' }) : json(502, { error: 'provider_unreachable' });
  } finally {
    clearTimeout(timer);
  }
});
