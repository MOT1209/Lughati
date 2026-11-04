-- AI usage and cost tracking. Written only by the ai-tutor Edge Function (service role);
-- users may read their own rows, never write them.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  provider text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  status text not null check (status in ('ok','error','rate_limited','invalid')),
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;
create policy "owner select" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.ai_usage from anon;
revoke insert, update, delete on public.ai_usage from authenticated;
