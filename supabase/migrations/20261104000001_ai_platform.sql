-- Unified AI platform: model registry + routing (admin/service-role only), usage logs and atomic
-- limits, conversations, generated exercises (shared, reusable), writing feedback, practice results,
-- learning recommendations and an explanation cache. Clients never write AI-produced rows.

create table public.ai_model_registry (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  provider text not null default 'opencode-zen',
  model_id text not null,
  display_name text,
  -- A model is usable only when enabled AND verified_at is set AND pricing_tier = 'free'
  -- (or 'paid' while its task route explicitly allows paid models).
  pricing_tier text not null default 'unknown' check (pricing_tier in ('free','paid','unknown')),
  enabled boolean not null default false,
  verified_at timestamptz,
  context_tokens integer check (context_tokens is null or context_tokens > 0),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object'),
  health_status text not null default 'unknown' check (health_status in ('ok','degraded','down','unknown')),
  health_checked_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  input_price_per_mtok numeric check (input_price_per_mtok is null or input_price_per_mtok >= 0),
  output_price_per_mtok numeric check (output_price_per_mtok is null or output_price_per_mtok >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_task_routing (
  task text primary key check (task in ('tutor','speaking','writing','quiz','pronunciation','planner')),
  primary_model text references public.ai_model_registry(id) on delete set null,
  fallback_model text references public.ai_model_registry(id) on delete set null,
  allow_paid boolean not null default false,
  max_output_tokens integer not null default 600 check (max_output_tokens between 50 and 4000),
  updated_at timestamptz not null default now()
);

create table public.ai_user_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_requests integer not null check (daily_requests between 0 and 10000),
  updated_at timestamptz not null default now()
);

create table public.ai_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model_id text,
  pricing_tier text check (pricing_tier is null or pricing_tier in ('free','paid','unknown')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  status text not null check (status in ('reserved','ok','error','rate_limited','invalid','unavailable','cache_hit')),
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_usage_logs_user_time_idx on public.ai_usage_logs (user_id, created_at desc);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('tutor','speaking')),
  language_code text not null references public.languages(code),
  explanation_language text not null references public.languages(code),
  level_id text not null references public.levels(id),
  title text check (title is null or char_length(title) <= 120),
  mode text check (mode is null or char_length(mode) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table public.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 6000),
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, id);

-- Reusable generated exercises: shared (not private), deduplicated by content hash.
create table public.ai_generated_exercises (
  id uuid primary key default gen_random_uuid(),
  language_code text not null references public.languages(code),
  level_id text not null references public.levels(id),
  topic text not null check (char_length(topic) between 1 and 80),
  exercise_type text not null check (exercise_type in ('multiple_choice','fill_blank','translation','vocabulary','grammar','sentence_order','reading','short_writing')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  content jsonb not null,
  content_hash text not null unique,
  model_id text,
  created_at timestamptz not null default now()
);
create index ai_generated_exercises_lookup_idx on public.ai_generated_exercises (language_code, level_id, topic, exercise_type);

create table public.ai_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('quiz','speaking','pronunciation','writing')),
  exercise_id uuid references public.ai_generated_exercises(id) on delete set null,
  language_code text not null references public.languages(code),
  score integer not null check (score >= 0),
  total integer not null check (total >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (score <= total)
);
create index ai_practice_sessions_user_idx on public.ai_practice_sessions (user_id, created_at desc);

create table public.ai_writing_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language_code text not null references public.languages(code),
  level_id text not null references public.levels(id),
  original_text text not null check (char_length(original_text) <= 2000),
  corrected_text text not null check (char_length(corrected_text) <= 4000),
  result jsonb not null,
  model_id text,
  created_at timestamptz not null default now()
);
create index ai_writing_feedback_user_idx on public.ai_writing_feedback (user_id, created_at desc);

create table public.ai_learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily','weekly')),
  language_code text not null references public.languages(code),
  content jsonb not null,
  valid_for date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, language_code, valid_for)
);

create table public.ai_explanation_cache (
  cache_key text primary key,
  language_code text not null,
  explanation_language text not null,
  level_id text not null,
  content text not null,
  model_id text,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

create trigger touch_updated_at before update on public.ai_model_registry for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.ai_task_routing for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.ai_user_limits for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.ai_conversations for each row execute function public.touch_updated_at();

alter table public.ai_model_registry enable row level security;
alter table public.ai_task_routing enable row level security;
alter table public.ai_user_limits enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_generated_exercises enable row level security;
alter table public.ai_practice_sessions enable row level security;
alter table public.ai_writing_feedback enable row level security;
alter table public.ai_learning_recommendations enable row level security;
alter table public.ai_explanation_cache enable row level security;

-- Registry, routing and cache: no client policies at all (service role / Edge Function only).
revoke all on public.ai_model_registry, public.ai_task_routing, public.ai_explanation_cache from anon, authenticated;

-- Owner-readable, never client-writable (rows are produced by the gateway with the service role).
create policy "owner select" on public.ai_user_limits for select to authenticated using (user_id = (select auth.uid()));
create policy "owner select" on public.ai_usage_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "owner select" on public.ai_conversations for select to authenticated using (user_id = (select auth.uid()));
create policy "owner delete" on public.ai_conversations for delete to authenticated using (user_id = (select auth.uid()));
create policy "owner select" on public.ai_messages for select to authenticated using (user_id = (select auth.uid()));
create policy "owner select" on public.ai_writing_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy "owner delete" on public.ai_writing_feedback for delete to authenticated using (user_id = (select auth.uid()));
create policy "owner select" on public.ai_learning_recommendations for select to authenticated using (user_id = (select auth.uid()));
-- Practice results are the learner's own report of their answers.
create policy "owner select" on public.ai_practice_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "owner insert" on public.ai_practice_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner delete" on public.ai_practice_sessions for delete to authenticated using (user_id = (select auth.uid()));
-- Generated exercises are shared learning content: readable by any signed-in user.
create policy "signed-in read" on public.ai_generated_exercises for select to authenticated using (true);

revoke all on public.ai_usage_logs, public.ai_user_limits, public.ai_messages, public.ai_generated_exercises, public.ai_writing_feedback, public.ai_learning_recommendations from anon;
revoke insert, update, delete on public.ai_usage_logs, public.ai_user_limits, public.ai_messages, public.ai_generated_exercises, public.ai_writing_feedback, public.ai_learning_recommendations from authenticated;
revoke all on public.ai_conversations, public.ai_practice_sessions from anon;
revoke insert, update on public.ai_conversations from authenticated;
revoke update on public.ai_practice_sessions from authenticated;

-- Atomic per-user limit check + reservation (serialised per user with an advisory lock), so
-- parallel requests cannot overshoot the limits. Only the gateway (service role) may call it.
create function public.ai_reserve(p_user uuid, p_feature text, p_daily integer, p_minute integer)
returns table (outcome text, log_id bigint) language plpgsql security definer set search_path = '' as $$
declare
  daily_used integer;
  minute_used integer;
  effective_daily integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select coalesce((select daily_requests from public.ai_user_limits where user_id = p_user), p_daily) into effective_daily;
  select count(*) into daily_used from public.ai_usage_logs
    where user_id = p_user and status in ('reserved','ok','error') and created_at > now() - interval '24 hours';
  select count(*) into minute_used from public.ai_usage_logs
    where user_id = p_user and status in ('reserved','ok','error') and created_at > now() - interval '1 minute';
  if daily_used >= effective_daily then
    insert into public.ai_usage_logs (user_id, feature, status, error_code) values (p_user, p_feature, 'rate_limited', 'daily');
    return query select 'daily'::text, null::bigint; return;
  end if;
  if minute_used >= p_minute then
    insert into public.ai_usage_logs (user_id, feature, status, error_code) values (p_user, p_feature, 'rate_limited', 'minute');
    return query select 'minute'::text, null::bigint; return;
  end if;
  insert into public.ai_usage_logs (user_id, feature, status) values (p_user, p_feature, 'reserved') returning id into new_id;
  return query select 'ok'::text, new_id;
end $$;
revoke execute on function public.ai_reserve(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_reserve(uuid, text, integer, integer) to service_role;

-- Candidate free models named by the product owner. NOT verified: all start disabled with unknown
-- pricing; an administrator enables one only after checking the provider's current docs/catalog.
insert into public.ai_model_registry (id, model_id, display_name, notes) values
  ('glm-5.3-flash-free','glm-5.3-flash-free','GLM 5.3 Flash (candidate)','unverified candidate'),
  ('deepseek-v4.1-flash-free','deepseek-v4.1-flash-free','DeepSeek V4.1 Flash (candidate)','unverified candidate'),
  ('mimo-v2.6-flash-free','mimo-v2.6-flash-free','MiMo V2.6 Flash (candidate)','unverified candidate'),
  ('nemotron-3-ultra-free','nemotron-3-ultra-free','Nemotron 3 Ultra (candidate)','unverified candidate'),
  ('nemotron-3.5-lightning-free','nemotron-3.5-lightning-free','Nemotron 3.5 Lightning (candidate)','unverified candidate'),
  ('nemotron-3.5-super-vl-free','nemotron-3.5-super-vl-free','Nemotron 3.5 Super VL (candidate)','unverified candidate'),
  ('flint-40b-free','flint-40b-free','Flint 40B (candidate)','unverified candidate'),
  ('big-pickle','big-pickle','Big Pickle (candidate)','unverified candidate'),
  ('beam-free','beam-free','Beam (candidate)','unverified candidate');
insert into public.ai_task_routing (task) values ('tutor'),('speaking'),('writing'),('quiz'),('pronunciation'),('planner');
