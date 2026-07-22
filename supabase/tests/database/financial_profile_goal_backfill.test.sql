begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users (id, email)
values
  ('33333333-3333-4333-8333-333333333333', 'legacy-target@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'legacy-empty@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'modern-goals@example.com'),
  ('66666666-6666-4666-8666-666666666666', 'invalid-goals@example.com');

insert into public.financial_profiles (user_id, onboarding, exact_values)
values
  (
    '33333333-3333-4333-8333-333333333333',
    jsonb_build_object(
      'financialGoal', 'Crear un fondo de emergencia',
      'goalHorizon', '6 – 12 meses',
      'goalPriority', 'Es muy importante',
      'goalAmountRange', '$3.000.000 – $5.000.000',
      'firstName', 'Legacy Target'
    ),
    '{"monthlyIncome":2500000,"goalTargetAmount":4000000}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    jsonb_build_object(
      'financialGoal', 'Ahorrar para viajar',
      'goalHorizon', '1 – 3 años',
      'goalPriority', 'Es importante',
      'goalAmountRange', null,
      'goals', '[]'::jsonb
    ),
    '{"monthlyExpenses":1500000}'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    jsonb_build_object(
      'financialGoal', 'Meta moderna',
      'goalHorizon', 'Más de 3 años',
      'goalPriority', 'Es importante',
      'goalAmountRange', '$5.000.000 – $10.000.000',
      'goals', jsonb_build_array(
        jsonb_build_object(
          'id', 'modern-primary',
          'title', 'Meta moderna',
          'type', 'financial',
          'iconKey', 'other',
          'horizon', 'Más de 3 años',
          'priority', 'Es importante',
          'amountRange', '$5.000.000 – $10.000.000',
          'targetAmount', 5000000,
          'currentAmount', 1000000,
          'manualMonthlyContribution', 200000,
          'status', 'active',
          'contributions', '[]'::jsonb,
          'isPrimary', true
        ),
        jsonb_build_object(
          'id', 'modern-secondary',
          'title', 'Meta secundaria',
          'type', 'financial',
          'iconKey', 'other',
          'horizon', 'Más de 3 años',
          'priority', 'Puede esperar',
          'amountRange', null,
          'targetAmount', null,
          'currentAmount', 0,
          'manualMonthlyContribution', null,
          'status', 'active',
          'contributions', '[]'::jsonb,
          'isPrimary', false
        )
      )
    ),
    '{"monthlyIncome":3500000,"goalTargetAmount":9999999}'::jsonb
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    jsonb_build_object(
      'financialGoal', 'No sobrescribir',
      'goalHorizon', 'Sin definir',
      'goalPriority', 'Sin definir',
      'goalAmountRange', null,
      'goals', jsonb_build_object('unexpected', true)
    ),
    '{}'::jsonb
  );

create temporary table pre_migration_snapshots as
select user_id, onboarding, exact_values
from public.financial_profiles
where user_id in (
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);

-- Supabase CLI mounts test files into the pgTAP container without mounting the
-- migrations directory. Keep this transaction-local runner aligned with
-- 20260714105355_backfill_financial_profile_goals.sql; db reset separately
-- verifies that the real migration file applies cleanly.
create function pg_temp.run_financial_profile_goal_backfill()
returns void
language sql
set search_path = ''
as $function$
  with legacy_candidates as (
    select
      financial_profiles.user_id,
      financial_profiles.onboarding,
      financial_profiles.exact_values,
      translate(
        lower(financial_profiles.onboarding ->> 'financialGoal'),
        'áéíóúüñ',
        'aeiouun'
      ) as normalized_goal_title
    from public.financial_profiles
    where jsonb_typeof(financial_profiles.onboarding) = 'object'
      and nullif(btrim(financial_profiles.onboarding ->> 'financialGoal'), '') is not null
      and case
        when not (financial_profiles.onboarding ? 'goals') then true
        when financial_profiles.onboarding -> 'goals' = 'null'::jsonb then true
        when jsonb_typeof(financial_profiles.onboarding -> 'goals') = 'array'
          then jsonb_array_length(financial_profiles.onboarding -> 'goals') = 0
        else false
      end
  ),
  backfill_values as (
    select
      legacy_candidates.user_id,
      jsonb_build_object(
        'id', 'primary-goal',
        'title', legacy_candidates.onboarding ->> 'financialGoal',
        'type', case
          when normalized_goal_title like '%emergencia%' then 'security'
          when normalized_goal_title like '%deuda%' then 'debt'
          when normalized_goal_title like '%vivienda%' then 'home'
          when normalized_goal_title like '%estudi%' then 'education'
          when normalized_goal_title like '%viaj%' then 'wellbeing'
          when normalized_goal_title like '%invert%' then 'investment'
          when normalized_goal_title like '%negocio%' then 'business'
          when normalized_goal_title like '%futuro%' then 'future'
          when normalized_goal_title like '%gasto%' then 'cashflow'
          else 'financial'
        end,
        'iconKey', case
          when normalized_goal_title like '%emergencia%' then 'emergency'
          when normalized_goal_title like '%deuda%' then 'debt'
          when normalized_goal_title like '%vivienda%' then 'home'
          when normalized_goal_title like '%estudi%' then 'education'
          when normalized_goal_title like '%viaj%' then 'travel'
          when normalized_goal_title like '%invert%' then 'investment'
          when normalized_goal_title like '%negocio%' then 'business'
          when normalized_goal_title like '%futuro%' then 'future'
          when normalized_goal_title like '%gasto%' then 'expenses'
          when normalized_goal_title like '%salud%' then 'custom-health'
          when normalized_goal_title like '%vehiculo%'
            or normalized_goal_title like '%carro%' then 'custom-vehicle'
          when normalized_goal_title like '%celebracion%'
            or normalized_goal_title like '%regalo%' then 'custom-gift'
          when normalized_goal_title like '%carrera%' then 'custom-career'
          when normalized_goal_title like '%bienestar%' then 'custom-wellness'
          when normalized_goal_title like '%familia%' then 'custom-family'
          else 'other'
        end,
        'horizon', legacy_candidates.onboarding ->> 'goalHorizon',
        'priority', legacy_candidates.onboarding ->> 'goalPriority',
        'amountRange', legacy_candidates.onboarding ->> 'goalAmountRange',
        'targetAmount', case
          when jsonb_typeof(legacy_candidates.exact_values -> 'goalTargetAmount') = 'number'
            and (legacy_candidates.exact_values ->> 'goalTargetAmount')::numeric >= 0
            then legacy_candidates.exact_values -> 'goalTargetAmount'
          else 'null'::jsonb
        end,
        'currentAmount', 0,
        'manualMonthlyContribution', null,
        'status', 'active',
        'contributions', '[]'::jsonb,
        'isPrimary', true
      ) as primary_goal
    from legacy_candidates
  )
  update public.financial_profiles
  set onboarding = jsonb_set(
    public.financial_profiles.onboarding,
    '{goals}',
    jsonb_build_array(backfill_values.primary_goal),
    true
  )
  from backfill_values
  where public.financial_profiles.user_id = backfill_values.user_id;
$function$;

do $block$
begin
  perform pg_temp.run_financial_profile_goal_backfill();
end;
$block$;

select plan(27);

select is(
  jsonb_typeof((select onboarding -> 'goals' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333')),
  'array',
  'a legacy profile receives a goals array'
);
select is(
  jsonb_array_length((select onboarding -> 'goals' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333')),
  1,
  'a legacy profile receives exactly one goal'
);
select is(
  (select onboarding #>> '{goals,0,id}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'primary-goal',
  'the backfilled goal has a stable id'
);
select is(
  (select onboarding #>> '{goals,0,title}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'Crear un fondo de emergencia',
  'the legacy goal title is copied'
);
select is(
  (select onboarding #>> '{goals,0,type}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'security',
  'the goal type matches the application normalizer'
);
select is(
  (select onboarding #>> '{goals,0,iconKey}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'emergency',
  'the goal icon matches the application normalizer'
);
select is(
  (select onboarding #>> '{goals,0,horizon}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  '6 – 12 meses',
  'the legacy horizon is copied'
);
select is(
  (select onboarding #>> '{goals,0,priority}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'Es muy importante',
  'the legacy priority is copied'
);
select is(
  (select onboarding #>> '{goals,0,amountRange}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  '$3.000.000 – $5.000.000',
  'the legacy amount range is copied'
);
select is(
  (select (onboarding #>> '{goals,0,targetAmount}')::numeric
    from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  4000000::numeric,
  'the legacy exact target is copied into the canonical goal'
);
select is(
  (select (onboarding #>> '{goals,0,currentAmount}')::numeric
    from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  0::numeric,
  'a backfilled goal starts with a zero current amount'
);
select is(
  (select onboarding #>> '{goals,0,status}' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'active',
  'a backfilled goal starts active'
);
select is(
  (select (onboarding #>> '{goals,0,isPrimary}')::boolean
    from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  true,
  'a backfilled goal is primary'
);
select is(
  (select jsonb_array_length(onboarding #> '{goals,0,contributions}')
    from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  0,
  'a backfilled goal starts without contributions'
);
select is(
  (select onboarding ->> 'financialGoal' from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  'Crear un fondo de emergencia',
  'the legacy goal fields remain available'
);
select is(
  (select (exact_values ->> 'goalTargetAmount')::numeric
    from public.financial_profiles
    where user_id = '33333333-3333-4333-8333-333333333333'),
  4000000::numeric,
  'the legacy exact target remains available for rollback'
);
select is(
  jsonb_array_length((select onboarding -> 'goals' from public.financial_profiles
    where user_id = '44444444-4444-4444-8444-444444444444')),
  1,
  'an explicitly empty goals array is backfilled'
);
select is(
  (select onboarding #>> '{goals,0,type}' from public.financial_profiles
    where user_id = '44444444-4444-4444-8444-444444444444'),
  'wellbeing',
  'a travel goal receives the expected type'
);
select is(
  (select onboarding #>> '{goals,0,iconKey}' from public.financial_profiles
    where user_id = '44444444-4444-4444-8444-444444444444'),
  'travel',
  'a travel goal receives the expected icon'
);
select ok(
  (select onboarding #> '{goals,0,targetAmount}' = 'null'::jsonb
    from public.financial_profiles
    where user_id = '44444444-4444-4444-8444-444444444444'),
  'a missing exact target remains JSON null'
);
select is(
  (select onboarding from public.financial_profiles
    where user_id = '55555555-5555-4555-8555-555555555555'),
  (select onboarding from pre_migration_snapshots
    where user_id = '55555555-5555-4555-8555-555555555555'),
  'an existing goals array is not overwritten'
);
select is(
  (select exact_values from public.financial_profiles
    where user_id = '55555555-5555-4555-8555-555555555555'),
  (select exact_values from pre_migration_snapshots
    where user_id = '55555555-5555-4555-8555-555555555555'),
  'existing exact values are not altered'
);
select is(
  jsonb_array_length((select onboarding -> 'goals' from public.financial_profiles
    where user_id = '55555555-5555-4555-8555-555555555555')),
  2,
  'a modern multi-goal profile keeps both goals'
);
select is(
  (select onboarding from public.financial_profiles
    where user_id = '66666666-6666-4666-8666-666666666666'),
  (select onboarding from pre_migration_snapshots
    where user_id = '66666666-6666-4666-8666-666666666666'),
  'an invalid goals container is preserved for manual review'
);
select is(
  (select count(*) from public.financial_profiles where user_id in (
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    '66666666-6666-4666-8666-666666666666'
  )),
  4::bigint,
  'the migration neither creates nor removes profiles'
);

create temporary table first_pass_snapshots as
select user_id, onboarding, exact_values
from public.financial_profiles
where user_id in (
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);

do $block$
begin
  perform pg_temp.run_financial_profile_goal_backfill();
end;
$block$;

select is(
  (
    select count(*)
    from public.financial_profiles as profile
    join first_pass_snapshots as snapshot using (user_id)
    where profile.onboarding is distinct from snapshot.onboarding
       or profile.exact_values is distinct from snapshot.exact_values
  ),
  0::bigint,
  'running the migration twice leaves every profile unchanged'
);
select is(
  (
    select count(*)
    from public.financial_profiles
    where user_id in (
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444'
    )
      and (
        jsonb_typeof(onboarding -> 'goals') <> 'array'
        or jsonb_array_length(onboarding -> 'goals') = 0
      )
  ),
  0::bigint,
  'no eligible legacy fixture remains without a canonical goal'
);

select * from finish();
rollback;
