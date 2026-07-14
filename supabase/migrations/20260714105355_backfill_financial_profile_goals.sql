-- Expand legacy single-goal profiles into the canonical goals array.
--
-- This migration is intentionally additive:
-- - legacy goal fields remain in onboarding for rollback compatibility;
-- - exact_values.goalTargetAmount remains untouched;
-- - profiles that already contain one or more goals are never overwritten.

set lock_timeout = '5s';
set statement_timeout = '30s';

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

reset statement_timeout;
reset lock_timeout;
