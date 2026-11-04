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
