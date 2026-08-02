-- Keep one temporal source of truth for every goal.
--
-- Existing targetMonth values win. Legacy exact dates lose their day, while
-- approximate horizons receive a deterministic month relative to August 2026.
-- The application performs the same conversion when it loads an old local
-- draft, so profiles remain compatible before and after this migration runs.

set lock_timeout = '5s';
set statement_timeout = '30s';

with expanded_goals as (
  select
    financial_profiles.user_id,
    goals.ordinality,
    goals.goal,
    lower(coalesce(goals.goal ->> 'horizon', '')) as legacy_horizon
  from public.financial_profiles
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(financial_profiles.onboarding -> 'goals') = 'array'
        then financial_profiles.onboarding -> 'goals'
      else '[]'::jsonb
    end
  ) with ordinality as goals(goal, ordinality)
),
converted_goals as (
  select
    expanded_goals.user_id,
    jsonb_agg(
      (
        expanded_goals.goal - 'horizon' - 'targetDate'
      ) || jsonb_build_object(
        'targetMonth',
        case
          when expanded_goals.goal ->> 'targetMonth'
            ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
            then expanded_goals.goal ->> 'targetMonth'
          when expanded_goals.goal ->> 'targetDate'
            ~ '^[0-9]{4}-(0[1-9]|1[0-2])-[0-9]{2}$'
            then left(expanded_goals.goal ->> 'targetDate', 7)
          else case
            when legacy_horizon like '%menos%6%'
              or legacy_horizon like '%6%12%'
              or legacy_horizon like '%1%3%'
              or legacy_horizon like '%3%5%'
              or legacy_horizon like '%5%'
              or legacy_horizon like '%3%'
              then to_char(
                date '2026-08-01' + make_interval(
                  months => case
                    when legacy_horizon like '%menos%6%' then 3
                    when legacy_horizon like '%6%12%' then 9
                    when legacy_horizon like '%1%3%' then 24
                    when legacy_horizon like '%3%5%' then 48
                    when legacy_horizon like '%5%' then 72
                    else 48
                  end
                ),
                'YYYY-MM'
              )
            else null
          end
        end
      )
      order by expanded_goals.ordinality
    ) as goals
  from expanded_goals
  group by expanded_goals.user_id
)
update public.financial_profiles
set onboarding =
  (public.financial_profiles.onboarding - 'goalHorizon') ||
  jsonb_build_object('goals', converted_goals.goals),
  updated_at = now()
from converted_goals
where public.financial_profiles.user_id = converted_goals.user_id;

update public.financial_profiles
set onboarding = onboarding - 'goalHorizon',
    updated_at = now()
where onboarding ? 'goalHorizon';

reset statement_timeout;
reset lock_timeout;
