begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

select is(
  (select relrowsecurity from pg_class where oid = 'public.financial_profiles'::regclass),
  true,
  'financial_profiles has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.assistant_daily_usage'::regclass),
  true,
  'assistant_daily_usage has RLS enabled'
);

select is(
  has_table_privilege('anon', 'public.financial_profiles', 'select'),
  false,
  'anon cannot read financial profiles'
);
select is(
  has_table_privilege('anon', 'public.financial_profiles', 'insert'),
  false,
  'anon cannot insert financial profiles'
);
select is(
  has_table_privilege('authenticated', 'public.financial_profiles', 'select'),
  true,
  'authenticated can select financial profiles subject to RLS'
);
select is(
  has_table_privilege('authenticated', 'public.financial_profiles', 'insert'),
  true,
  'authenticated can insert financial profiles subject to RLS'
);
select is(
  has_table_privilege('authenticated', 'public.financial_profiles', 'update'),
  true,
  'authenticated can update financial profiles subject to RLS'
);
select is(
  has_table_privilege('authenticated', 'public.financial_profiles', 'delete'),
  true,
  'authenticated can delete financial profiles subject to RLS'
);
select is(
  has_table_privilege('authenticated', 'public.assistant_daily_usage', 'select'),
  true,
  'authenticated can read their assistant usage'
);
select is(
  has_table_privilege('authenticated', 'public.assistant_daily_usage', 'insert'),
  false,
  'authenticated cannot write assistant usage directly'
);

select is(
  has_function_privilege(
    'anon',
    'public.consume_assistant_daily_question(uuid,date,integer)',
    'execute'
  ),
  false,
  'anon cannot execute the assistant quota RPC'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.consume_assistant_daily_question(uuid,date,integer)',
    'execute'
  ),
  false,
  'authenticated cannot execute the assistant quota RPC'
);
select is(
  has_function_privilege(
    'service_role',
    'public.consume_assistant_daily_question(uuid,date,integer)',
    'execute'
  ),
  true,
  'service_role can execute the assistant quota RPC'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'rls-user-1@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'rls-user-2@example.com');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is(
  auth.uid(),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'the test JWT resolves to user 1'
);
select lives_ok(
  $$
    insert into public.financial_profiles (user_id, onboarding)
    values ('11111111-1111-4111-8111-111111111111', '{"firstName":"User 1"}'::jsonb)
  $$,
  'user 1 can insert their own financial profile'
);
select throws_ok(
  $$
    insert into public.financial_profiles (user_id, onboarding)
    values ('22222222-2222-4222-8222-222222222222', '{"firstName":"Blocked"}'::jsonb)
  $$,
  '42501'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select lives_ok(
  $$
    insert into public.financial_profiles (user_id, onboarding)
    values ('22222222-2222-4222-8222-222222222222', '{"firstName":"User 2"}'::jsonb)
  $$,
  'user 2 can insert their own financial profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select results_eq(
  $$ select user_id from public.financial_profiles order by user_id $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid) $$,
  'user 1 can only read their own financial profile'
);
select results_eq(
  $$
    update public.financial_profiles
       set onboarding = '{"firstName":"Updated"}'::jsonb
     where user_id = '11111111-1111-4111-8111-111111111111'
    returning onboarding ->> 'firstName'
  $$,
  $$ values ('Updated'::text) $$,
  'user 1 can update their own financial profile'
);
select results_eq(
  $$
    delete from public.financial_profiles
     where user_id = '22222222-2222-4222-8222-222222222222'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'user 1 cannot delete user 2 financial profile'
);

reset role;
insert into public.assistant_daily_usage (user_id, usage_date, question_count)
values
  ('11111111-1111-4111-8111-111111111111', date '2026-07-14', 2),
  ('22222222-2222-4222-8222-222222222222', date '2026-07-14', 4);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select results_eq(
  $$ select question_count from public.assistant_daily_usage $$,
  $$ values (2) $$,
  'user 1 can only read their own assistant usage'
);

reset role;
set local role service_role;
select results_eq(
  $$
    select allowed, question_count, remaining_questions, daily_limit
    from public.consume_assistant_daily_question(
      '11111111-1111-4111-8111-111111111111',
      date '2026-07-15',
      1
    )
  $$,
  $$ values (true, 1, 0, 1) $$,
  'service_role can consume the first assistant question'
);
select results_eq(
  $$
    select allowed, question_count, remaining_questions, daily_limit
    from public.consume_assistant_daily_question(
      '11111111-1111-4111-8111-111111111111',
      date '2026-07-15',
      1
    )
  $$,
  $$ values (false, 1, 0, 1) $$,
  'the assistant quota RPC blocks questions above the daily limit'
);

reset role;
select * from finish();
rollback;
