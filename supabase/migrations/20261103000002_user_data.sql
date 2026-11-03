-- Per-user data. Every table is owned by auth.users (cascade delete) and protected by RLS:
-- a signed-in user can read and write only rows whose user_id = auth.uid().

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  source_language text references public.languages(code),
  target_language text references public.languages(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_language is null or target_language is null or source_language <> target_language)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  ui_language text not null default 'system' check (ui_language in ('system','ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  language_code text not null references public.languages(code),
  level_id text not null references public.levels(id) default 'A1',
  total_xp integer not null default 0 check (total_xp between 0 and 10000000),
  daily_goal_minutes smallint not null default 15 check (daily_goal_minutes between 5 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, language_code)
);

create table public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  language_code text not null references public.languages(code),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_completions_user_language_idx on public.lesson_completions (user_id, language_code);

-- Client-generated stable id => re-uploading the same attempt is idempotent.
create table public.quiz_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 200),
  lesson_id text not null references public.lessons(id) on delete cascade,
  language_code text not null references public.languages(code),
  kind text not null default 'lesson' check (kind in ('lesson','practice')),
  correct smallint not null check (correct >= 0),
  total smallint not null check (total between 0 and 1000),
  completed boolean not null default false,
  attempted_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (correct <= total)
);
create index quiz_attempts_user_time_idx on public.quiz_attempts (user_id, attempted_at desc);

create table public.vocabulary_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null references public.vocabulary(id) on delete cascade,
  language_code text not null references public.languages(code),
  step smallint not null default 0 check (step between 0 and 20),
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index vocabulary_reviews_due_idx on public.vocabulary_reviews (user_id, language_code, next_review_at);

-- One row per local calendar day with recorded study activity (the streak is computed from it).
create table public.learning_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  minutes integer not null default 0 check (minutes >= 0),
  xp integer not null default 0 check (xp >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Cached streak snapshot (derived from learning_activity by the client).
create table public.learning_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_days integer not null default 0 check (current_days >= 0),
  best_days integer not null default 0 check (best_days >= 0),
  last_activity_day date,
  updated_at timestamptz not null default now()
);

-- Records that a device's local (AsyncStorage) data was uploaded for this account.
create table public.sync_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) <= 100),
  status text not null check (status in ('started','verified')),
  record_counts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

do $$
declare t text;
begin
  foreach t in array array['profiles','user_settings','user_progress','vocabulary_reviews','learning_activity','learning_streaks','sync_migrations'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- RLS: owner-only, all operations. (select auth.uid()) is evaluated once per statement.
do $$
declare t text;
begin
  foreach t in array array['user_settings','user_progress','lesson_completions','quiz_attempts','vocabulary_reviews','learning_activity','learning_streaks','sync_migrations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "owner select" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "owner insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "owner update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "owner delete" on public.profiles for delete to authenticated using (id = (select auth.uid()));
revoke all on public.profiles from anon;

-- Every new auth user gets a profile and settings row (name comes from sign-up metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Account deletion: removes the caller's auth user; every owned row cascades.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = (select auth.uid());
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
