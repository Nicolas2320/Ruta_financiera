-- Remove questions and planning fields retired from the active profile model.
-- This changes JSONB payloads only; it does not remove profiles or auth users.

update public.financial_profiles
set
  onboarding =
    (onboarding - array[
      'lastName',
      'ageRange',
      'country',
      'city',
      'incomeType',
      'incomeFrequency',
      'emergencyCoverage',
      'investmentSituation',
      'financialGoal',
      'goalPriority',
      'goalAmountRange',
      'goalHorizon',
      'goalMonthlyBudget',
      'monthlyExpensesExcludingDebt',
      'paymentPlan'
    ]::text[])
    || case
      when jsonb_typeof(onboarding -> 'goals') = 'array'
        then jsonb_build_object(
          'goals',
          coalesce(
            (
              select jsonb_agg(
                goal - array[
                  'priority',
                  'horizon',
                  'manualMonthlyContribution',
                  'minimumInitialAmount',
                  'targetDate'
                ]::text[]
                order by goal_order
              )
              from jsonb_array_elements(onboarding -> 'goals')
                with ordinality as expanded_goals(goal, goal_order)
            ),
            '[]'::jsonb
          )
        )
      else '{}'::jsonb
    end,
  exact_values = case
    when exact_values is null then null
    else exact_values - 'goalTargetAmount'
  end,
  updated_at = now()
where
  onboarding ?| array[
    'lastName',
    'ageRange',
    'country',
    'city',
    'incomeType',
    'incomeFrequency',
    'emergencyCoverage',
    'investmentSituation',
    'financialGoal',
    'goalPriority',
    'goalAmountRange',
    'goalHorizon',
    'goalMonthlyBudget',
    'monthlyExpensesExcludingDebt',
    'paymentPlan'
  ]::text[]
  or exact_values ? 'goalTargetAmount'
  or exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(onboarding -> 'goals') = 'array'
          then onboarding -> 'goals'
        else '[]'::jsonb
      end
    ) as existing_goals(goal)
    where goal ?| array[
      'priority',
      'horizon',
      'manualMonthlyContribution',
      'minimumInitialAmount',
      'targetDate'
    ]::text[]
  );
