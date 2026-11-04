-- RLS / authorization test. Runs inside one transaction that is rolled back, so it leaves no data.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql   (prints "RLS TESTS PASSED")
-- Requires the migrations and supabase/seed/catalog.sql to be applied.
begin;

create temp table _ids (a uuid, b uuid);
insert into _ids values ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');
grant all on _ids to public;

insert into auth.users (id, email, raw_user_meta_data)
select a, 'a@rls.test', '{"name":"Alice"}'::jsonb from _ids
union all select b, 'b@rls.test', '{"name":"Bob"}'::jsonb from _ids;

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
end $$;

-- Runs a statement and requires it to FAIL (RLS violation or privilege error).
create function pg_temp.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'FAILED (statement was allowed): %', label;
end $$;

-- Runs a statement and requires that it changed/returned exactly `n` rows.
create function pg_temp.must_affect(label text, stmt text, n int) returns void language plpgsql as $$
declare c int;
begin
  execute stmt;
  get diagnostics c = row_count;
  if c <> n then raise exception 'FAILED (%): expected % rows, got %', label, n, c; end if;
end $$;

-- 1. The sign-up trigger created a profile and settings row for each user.
do $$ begin
  if (select count(*) from public.profiles) <> 2 then raise exception 'FAILED: handle_new_user did not create profiles'; end if;
  if (select display_name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001') <> 'Alice' then raise exception 'FAILED: display name from metadata'; end if;
  if (select count(*) from public.user_settings) <> 2 then raise exception 'FAILED: user_settings rows'; end if;
end $$;

-- Data owned by Bob (inserted as the table owner, bypassing RLS).
insert into public.quiz_attempts (user_id, id, lesson_id, language_code, correct, total, attempted_at)
select b, 'bob-attempt-1', 'de-a1-1', 'de', 5, 6, now() from _ids;
insert into public.lesson_completions (user_id, lesson_id, language_code) select b, 'de-a1-1', 'de' from _ids;
insert into public.user_progress (user_id, language_code, total_xp) select b, 'de', 100 from _ids;

-- 2. Alice (authenticated) can use her own rows only.
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000001');

select pg_temp.must_affect('alice inserts her attempt', $s$insert into public.quiz_attempts (user_id, id, lesson_id, language_code, correct, total, attempted_at) values ('aaaaaaaa-0000-4000-8000-000000000001','alice-attempt-1','de-a1-1','de',4,6,now())$s$, 1);
select pg_temp.must_affect('alice sees only her attempts', $s$select * from public.quiz_attempts$s$, 1);
select pg_temp.must_affect('alice sees only her completions', $s$select * from public.lesson_completions$s$, 0);
select pg_temp.must_affect('alice sees only her profile', $s$select * from public.profiles$s$, 1);
select pg_temp.must_fail('alice inserts an attempt for Bob', $s$insert into public.quiz_attempts (user_id, id, lesson_id, language_code, correct, total, attempted_at) values ('bbbbbbbb-0000-4000-8000-000000000002','forged','de-a1-1','de',1,1,now())$s$);
select pg_temp.must_fail('alice inserts progress for Bob', $s$insert into public.user_progress (user_id, language_code) values ('bbbbbbbb-0000-4000-8000-000000000002','fr')$s$);
select pg_temp.must_affect('alice cannot update Bob progress', $s$update public.user_progress set total_xp = 9999999 where user_id = 'bbbbbbbb-0000-4000-8000-000000000002'$s$, 0);
select pg_temp.must_affect('alice cannot delete Bob attempts', $s$delete from public.quiz_attempts where user_id = 'bbbbbbbb-0000-4000-8000-000000000002'$s$, 0);
select pg_temp.must_affect('alice cannot rewrite Bob profile', $s$update public.profiles set display_name = 'hacked' where id = 'bbbbbbbb-0000-4000-8000-000000000002'$s$, 0);
select pg_temp.must_affect('alice inserts her own progress', $s$insert into public.user_progress (user_id, language_code) values ('aaaaaaaa-0000-4000-8000-000000000001','fr')$s$, 1);
select pg_temp.must_fail('alice cannot move her row to Bob (update user_id)', $s$update public.user_progress set user_id = 'bbbbbbbb-0000-4000-8000-000000000002' where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and language_code = 'fr'$s$);
-- data validation constraints hold even for the owner
select pg_temp.must_fail('correct > total rejected', $s$insert into public.quiz_attempts (user_id, id, lesson_id, language_code, correct, total, attempted_at) values ('aaaaaaaa-0000-4000-8000-000000000001','bad','de-a1-1','de',9,6,now())$s$);
select pg_temp.must_fail('unknown lesson rejected (FK)', $s$insert into public.lesson_completions (user_id, lesson_id, language_code) values ('aaaaaaaa-0000-4000-8000-000000000001','nope-1','de')$s$);
-- the same attempt id twice is an idempotent upsert, not a duplicate
select pg_temp.must_affect('idempotent upsert', $s$insert into public.quiz_attempts (user_id, id, lesson_id, language_code, correct, total, attempted_at) values ('aaaaaaaa-0000-4000-8000-000000000001','alice-attempt-1','de-a1-1','de',4,6,now()) on conflict (user_id, id) do nothing$s$, 0);

-- 3. Catalog: readable, never writable by clients.
select pg_temp.must_affect('catalog readable', $s$select * from public.languages$s$, 6);
select pg_temp.must_fail('catalog insert denied', $s$insert into public.languages (code,name_ar,name_en,native_name,direction) values ('it','x','x','x','ltr')$s$);
select pg_temp.must_fail('catalog update denied', $s$update public.lessons set title_en = 'pwned'$s$);
select pg_temp.must_fail('catalog delete denied', $s$delete from public.vocabulary$s$);

-- 4. AI usage: readable by the owner, never writable by clients.
select pg_temp.must_fail('client cannot insert ai_usage', $s$insert into public.ai_usage (user_id, mode, provider, status) values ('aaaaaaaa-0000-4000-8000-000000000001','chat','x','ok')$s$);

-- 5. Privileged functions are not callable by clients.
do $$ begin
  if has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') or has_function_privilege('anon', 'public.handle_new_user()', 'execute') then
    raise exception 'FAILED: handle_new_user is executable by clients';
  end if;
  if has_function_privilege('anon', 'public.delete_my_account()', 'execute') then
    raise exception 'FAILED: delete_my_account is executable by anon';
  end if;
end $$;

-- 6. Anonymous (not signed in) callers see no user data at all.
reset role;
set local role anon;
select pg_temp.must_fail('anon cannot read profiles', $s$select * from public.profiles$s$);
select pg_temp.must_fail('anon cannot read attempts', $s$select * from public.quiz_attempts$s$);
select pg_temp.must_fail('anon cannot write progress', $s$insert into public.user_progress (user_id, language_code) values ('aaaaaaaa-0000-4000-8000-000000000001','de')$s$);
select pg_temp.must_fail('anon cannot call delete_my_account', $s$select public.delete_my_account()$s$);
select pg_temp.must_affect('anon can read the catalog', $s$select * from public.levels$s$, 6);

-- 6b. AI platform tables ------------------------------------------------------------------
reset role;
insert into public.ai_conversations (id, user_id, feature, language_code, explanation_language, level_id)
select 'b0000000-0000-4000-8000-00000000000b', b, 'tutor', 'de', 'ar', 'A1' from _ids;
insert into public.ai_messages (conversation_id, user_id, role, content)
select 'b0000000-0000-4000-8000-00000000000b', b, 'user', 'bob secret question' from _ids;
insert into public.ai_usage_logs (user_id, feature, status) select b, 'tutor', 'ok' from _ids;
insert into public.ai_writing_feedback (user_id, language_code, level_id, original_text, corrected_text, result)
select b, 'de', 'A1', 'bob text', 'bob text', '{}'::jsonb from _ids;
insert into public.ai_learning_recommendations (user_id, kind, language_code, content, valid_for)
select b, 'daily', 'de', '{}'::jsonb, current_date from _ids;
insert into public.ai_practice_sessions (user_id, feature, language_code, score, total) select b, 'quiz', 'de', 1, 2 from _ids;
insert into public.ai_generated_exercises (language_code, level_id, topic, exercise_type, difficulty, content, content_hash)
values ('de', 'A1', 'places', 'multiple_choice', 'easy', '{"question":"q"}'::jsonb, 'rls-test-hash');

-- Atomic limit reservation (runs as the table owner here; clients cannot call it, checked below).
do $$
declare r record; n int;
begin
  select * into r from public.ai_reserve((select a from _ids), 'tutor', 100, 2);
  if r.outcome <> 'ok' or r.log_id is null then raise exception 'FAILED: first reservation'; end if;
  select * into r from public.ai_reserve((select a from _ids), 'tutor', 100, 2);
  if r.outcome <> 'ok' then raise exception 'FAILED: second reservation'; end if;
  select * into r from public.ai_reserve((select a from _ids), 'tutor', 100, 2);
  if r.outcome <> 'minute' then raise exception 'FAILED: per-minute limit not enforced (%)', r.outcome; end if;
  select * into r from public.ai_reserve((select b from _ids), 'tutor', 1, 50);
  if r.outcome <> 'daily' then raise exception 'FAILED: per-day limit not enforced (%)', r.outcome; end if; -- Bob already has 1 logged request
  insert into public.ai_user_limits (user_id, daily_requests) select b, 5 from _ids;
  select * into r from public.ai_reserve((select b from _ids), 'tutor', 1, 50);
  if r.outcome <> 'ok' then raise exception 'FAILED: per-user limit override ignored (%)', r.outcome; end if;
  select count(*) into n from public.ai_usage_logs where user_id = (select a from _ids) and status = 'rate_limited';
  if n <> 1 then raise exception 'FAILED: rate-limited request not logged'; end if;
end $$;

do $$ begin
  if has_function_privilege('authenticated', 'public.ai_reserve(uuid,text,integer,integer)', 'execute')
     or has_function_privilege('anon', 'public.ai_reserve(uuid,text,integer,integer)', 'execute') then
    raise exception 'FAILED: ai_reserve is executable by clients';
  end if;
  if not has_function_privilege('service_role', 'public.ai_reserve(uuid,text,integer,integer)', 'execute') then
    raise exception 'FAILED: service_role cannot call ai_reserve';
  end if;
end $$;

set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000001');
-- Alice sees only her own AI rows, never Bob's.
select pg_temp.must_affect('alice sees no foreign conversations', $s$select * from public.ai_conversations$s$, 0);
select pg_temp.must_affect('alice sees no foreign messages', $s$select * from public.ai_messages$s$, 0);
select pg_temp.must_affect('alice sees only her usage logs', $s$select * from public.ai_usage_logs where user_id <> 'aaaaaaaa-0000-4000-8000-000000000001'$s$, 0);
select pg_temp.must_affect('alice sees no foreign writing feedback', $s$select * from public.ai_writing_feedback$s$, 0);
select pg_temp.must_affect('alice sees no foreign recommendations', $s$select * from public.ai_learning_recommendations$s$, 0);
select pg_temp.must_affect('alice sees no foreign practice sessions', $s$select * from public.ai_practice_sessions$s$, 0);
select pg_temp.must_affect('alice sees no foreign limits', $s$select * from public.ai_user_limits$s$, 0);
select pg_temp.must_affect('alice cannot delete a foreign conversation', $s$delete from public.ai_conversations where user_id = 'bbbbbbbb-0000-4000-8000-000000000002'$s$, 0);
-- Clients can never write AI-produced rows or usage counters.
select pg_temp.must_fail('client cannot write usage logs', $s$insert into public.ai_usage_logs (user_id, feature, status) values ('aaaaaaaa-0000-4000-8000-000000000001','tutor','ok')$s$);
select pg_temp.must_fail('client cannot forge a conversation', $s$insert into public.ai_conversations (user_id, feature, language_code, explanation_language, level_id) values ('aaaaaaaa-0000-4000-8000-000000000001','tutor','de','ar','A1')$s$);
select pg_temp.must_fail('client cannot forge messages', $s$insert into public.ai_messages (conversation_id, user_id, role, content) values ('b0000000-0000-4000-8000-00000000000b','aaaaaaaa-0000-4000-8000-000000000001','user','x')$s$);
select pg_temp.must_fail('client cannot forge writing feedback', $s$insert into public.ai_writing_feedback (user_id, language_code, level_id, original_text, corrected_text, result) values ('aaaaaaaa-0000-4000-8000-000000000001','de','A1','a','b','{}')$s$);
select pg_temp.must_fail('client cannot forge recommendations', $s$insert into public.ai_learning_recommendations (user_id, kind, language_code, content, valid_for) values ('aaaaaaaa-0000-4000-8000-000000000001','daily','de','{}',current_date)$s$);
select pg_temp.must_fail('client cannot raise its own limit', $s$insert into public.ai_user_limits (user_id, daily_requests) values ('aaaaaaaa-0000-4000-8000-000000000001', 10000)$s$);
select pg_temp.must_fail('client cannot call ai_reserve', $s$select * from public.ai_reserve('aaaaaaaa-0000-4000-8000-000000000001','tutor',100,100)$s$);
-- Registry, routing and cache are invisible to clients.
select pg_temp.must_fail('client cannot read the model registry', $s$select * from public.ai_model_registry$s$);
select pg_temp.must_fail('client cannot write the model registry', $s$update public.ai_model_registry set enabled = true, pricing_tier = 'free', verified_at = now()$s$);
select pg_temp.must_fail('client cannot read routing', $s$select * from public.ai_task_routing$s$);
select pg_temp.must_fail('client cannot change routing', $s$update public.ai_task_routing set allow_paid = true$s$);
select pg_temp.must_fail('client cannot read the explanation cache', $s$select * from public.ai_explanation_cache$s$);
-- Shared generated exercises: readable, not writable.
select pg_temp.must_affect('signed-in users can read generated exercises', $s$select * from public.ai_generated_exercises$s$, 1);
select pg_temp.must_fail('client cannot insert generated exercises', $s$insert into public.ai_generated_exercises (language_code, level_id, topic, exercise_type, difficulty, content, content_hash) values ('de','A1','t','grammar','easy','{}','h2')$s$);
-- Practice results are the learner's own report.
select pg_temp.must_affect('alice records her own practice result', $s$insert into public.ai_practice_sessions (user_id, feature, language_code, score, total) values ('aaaaaaaa-0000-4000-8000-000000000001','quiz','de',2,3)$s$, 1);
select pg_temp.must_fail('alice cannot record a result for Bob', $s$insert into public.ai_practice_sessions (user_id, feature, language_code, score, total) values ('bbbbbbbb-0000-4000-8000-000000000002','quiz','de',3,3)$s$);
select pg_temp.must_fail('score above total rejected', $s$insert into public.ai_practice_sessions (user_id, feature, language_code, score, total) values ('aaaaaaaa-0000-4000-8000-000000000001','quiz','de',5,3)$s$);
reset role;
set local role anon;
select pg_temp.must_fail('anon cannot read AI conversations', $s$select * from public.ai_conversations$s$);
select pg_temp.must_fail('anon cannot read generated exercises', $s$select * from public.ai_generated_exercises$s$);
select pg_temp.must_fail('anon cannot read the model registry', $s$select * from public.ai_model_registry$s$);
reset role;

-- 7. Account deletion removes the caller's data (cascade) and nobody else's.
reset role;
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000001');
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000001') then raise exception 'FAILED: user not deleted'; end if;
  if exists (select 1 from public.quiz_attempts where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') then raise exception 'FAILED: attempts survived deletion'; end if;
  if exists (select 1 from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001') then raise exception 'FAILED: profile survived deletion'; end if;
  if not exists (select 1 from public.quiz_attempts where user_id = 'bbbbbbbb-0000-4000-8000-000000000002') then raise exception 'FAILED: deletion touched another user'; end if;
end $$;

select 'RLS TESTS PASSED' as result;
rollback;
