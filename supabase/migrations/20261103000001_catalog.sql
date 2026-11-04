-- Static, public learning catalog. Read-only for clients (no write policies = writes denied).
create table public.languages (
  code text primary key check (code in ('ar','de','en','es','fr','tr')),
  name_ar text not null,
  name_en text not null,
  native_name text not null,
  direction text not null check (direction in ('ltr','rtl')),
  can_be_source boolean not null default true,
  can_be_target boolean not null default true
);

create table public.levels (
  id text primary key check (id in ('A1','A2','B1','B2','C1','C2')),
  position smallint not null unique,
  title_ar text not null,
  title_en text not null
);

-- A "course" is one target language (courses.language_code); its lessons are grouped by level.
create table public.courses (
  language_code text primary key references public.languages(code) on delete cascade,
  title_ar text not null,
  title_en text not null
);

create table public.lessons (
  id text primary key,
  language_code text not null references public.courses(language_code) on delete cascade,
  level_id text not null references public.levels(id),
  position smallint not null check (position > 0),
  title_ar text not null,
  title_en text not null,
  summary_ar text not null,
  summary_en text not null,
  estimated_minutes smallint not null check (estimated_minutes between 1 and 120),
  unique (language_code, level_id, position)
);
create index lessons_language_idx on public.lessons (language_code, level_id, position);
create index lessons_level_idx on public.lessons (level_id);

create table public.vocabulary (
  id text primary key,
  lesson_id text not null references public.lessons(id) on delete cascade,
  language_code text not null references public.courses(language_code) on delete cascade,
  position smallint not null check (position >= 0),
  term text not null,
  -- meaning per source language, e.g. {"ar": "...", "en": "..."}
  translations jsonb not null check (jsonb_typeof(translations) = 'object'),
  unique (lesson_id, position)
);
create index vocabulary_lesson_idx on public.vocabulary (lesson_id);
create index vocabulary_language_idx on public.vocabulary (language_code);

alter table public.languages enable row level security;
alter table public.levels enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;

create policy "catalog is readable" on public.languages for select to anon, authenticated using (true);
create policy "catalog is readable" on public.levels for select to anon, authenticated using (true);
create policy "catalog is readable" on public.courses for select to anon, authenticated using (true);
create policy "catalog is readable" on public.lessons for select to anon, authenticated using (true);
create policy "catalog is readable" on public.vocabulary for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.languages, public.levels, public.courses, public.lessons, public.vocabulary from anon, authenticated;
