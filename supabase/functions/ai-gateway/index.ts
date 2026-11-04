// Supabase Edge Function: ai-gateway. verify_jwt = true (the platform rejects unsigned callers; the
// handler additionally resolves the user from the token and never from the request body).
// Secrets (supabase secrets set …): OPENCODE_ZEN_API_KEY, OPENCODE_ZEN_BASE_URL (take both from
// the provider's official docs), optional AI_DAILY_REQUEST_LIMIT, AI_MINUTE_LIMIT,
// AI_MAX_OUTPUT_TOKENS, AI_REQUEST_TIMEOUT_MS. SUPABASE_* are injected by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleRequest, type Caller, type GatewayEnv } from './handler.ts';
import { LIMITS } from './types.ts';
import { createSupabaseStore } from './supabaseStore.ts';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const num = (name: string, fallback: number, min: number, max: number) => {
  const v = Number(Deno.env.get(name));
  return Number.isFinite(v) && v >= min && v <= max ? Math.floor(v) : fallback;
};
const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data, error } = await userClient.auth.getUser();
  const caller: Caller | null = error || !data.user ? null : { id: data.user.id, role: (data.user.app_metadata as { role?: string } | undefined)?.role ?? null };

  let body: unknown = null;
  const raw = await req.text();
  if (raw.length > LIMITS.body) return json(413, { error: 'too_large' });
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const env: GatewayEnv = {
    baseUrl: Deno.env.get('OPENCODE_ZEN_BASE_URL') ?? null,
    apiKey: Deno.env.get('OPENCODE_ZEN_API_KEY') ?? null,
    timeoutMs: num('AI_REQUEST_TIMEOUT_MS', 20_000, 1000, 60_000),
    dailyLimit: num('AI_DAILY_REQUEST_LIMIT', 40, 1, 10_000),
    minuteLimit: num('AI_MINUTE_LIMIT', 6, 1, 120),
    maxOutputCap: num('AI_MAX_OUTPUT_TOKENS', 700, 50, 4000),
  };
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const res = await handleRequest({ body, caller }, { store: createSupabaseStore(admin), fetch: fetch as never, env, now: () => new Date(), sha256 });
    return json(res.status, res.body);
  } catch {
    // Internal details (provider/database errors) are never returned to the client.
    return json(500, { error: 'internal_error' });
  }
});
