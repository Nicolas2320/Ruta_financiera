import { supabase } from "./supabase";
import {
  getLegacyGoalFromOnboarding,
  initialOnboarding,
  normalizeCompletedActionsState,
  normalizeDebtRecords,
  normalizeExpenseCategoryAmounts,
  normalizeFinancialGuidanceMode,
  normalizeFinancialGoals,
  normalizeSimulationPlanPreference,
  type CompletedActionsState,
  type ExactFinancialValues,
  type LegacyOnboardingFields,
  type OnboardingData
} from "../types/financial";
import { syncDebtExpenseCategory } from "../utils/debtCalculations";
import { normalizeExactValues } from "../utils/financialRanges";

const FINANCIAL_PROFILES_TABLE = "financial_profiles";

type FinancialProfileRow = {
  onboarding: (Partial<OnboardingData> & LegacyOnboardingFields) | null;
  completed_actions: CompletedActionsState | null;
  exact_values: ExactFinancialValues | null;
};

export type FinancialProfile = {
  profileExists: boolean;
  onboarding: OnboardingData;
  completedActions: CompletedActionsState;
  exactValues: ExactFinancialValues;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  return supabase;
}

export function normalizeOnboardingData(
  onboarding:
    | (Partial<OnboardingData> & LegacyOnboardingFields)
    | null
    | undefined,
  referenceDate = new Date()
) {
  const debts = normalizeDebtRecords(onboarding?.debts);
  const expenseData = syncDebtExpenseCategory({
    debts,
    expenseCategories: Array.isArray(onboarding?.expenseCategories)
      ? onboarding.expenseCategories
      : [],
    expenseCategoryAmounts: normalizeExpenseCategoryAmounts(
      onboarding?.expenseCategoryAmounts
    ),
    preserveExistingReference: true
  });
  const normalizedBase: OnboardingData = {
    ...initialOnboarding,
    firstName: typeof onboarding?.firstName === "string" ? onboarding.firstName : "",
    financialGuidanceMode: normalizeFinancialGuidanceMode(onboarding?.financialGuidanceMode),
    incomeRange: typeof onboarding?.incomeRange === "string" ? onboarding.incomeRange : null,
    expensesRange:
      typeof onboarding?.expensesRange === "string" ? onboarding.expensesRange : null,
    monthlyExpensesIncludesSmallExpenses:
      typeof onboarding?.monthlyExpensesIncludesSmallExpenses === "boolean"
        ? onboarding.monthlyExpensesIncludesSmallExpenses
        : null,
    hasDebts: typeof onboarding?.hasDebts === "boolean" ? onboarding.hasDebts : null,
    debtMonthlyPaymentRange:
      typeof onboarding?.debtMonthlyPaymentRange === "string"
        ? onboarding.debtMonthlyPaymentRange
        : null,
    expenseCategories: expenseData.expenseCategories,
    expenseCategoryAmounts: expenseData.expenseCategoryAmounts,
    expensesFeeling:
      typeof onboarding?.expensesFeeling === "string" ? onboarding.expensesFeeling : null,
    hasSmallExpenses:
      typeof onboarding?.hasSmallExpenses === "string" ? onboarding.hasSmallExpenses : null,
    debts,
    smallExpenseCategories: Array.isArray(onboarding?.smallExpenseCategories)
      ? onboarding.smallExpenseCategories
      : [],
    smallExpensesRange:
      typeof onboarding?.smallExpensesRange === "string"
        ? onboarding.smallExpensesRange
        : null,
    smallExpensesIntention:
      typeof onboarding?.smallExpensesIntention === "string"
        ? onboarding.smallExpensesIntention
        : null,
    savingsRange:
      typeof onboarding?.savingsRange === "string" ? onboarding.savingsRange : null,
    debtSituation:
      typeof onboarding?.debtSituation === "string" ? onboarding.debtSituation : null,
    debtPaymentShare:
      typeof onboarding?.debtPaymentShare === "string" ? onboarding.debtPaymentShare : null,
    simulationPlanPreference: normalizeSimulationPlanPreference(
      onboarding?.simulationPlanPreference
    ),
    goals: normalizeFinancialGoals(onboarding?.goals, referenceDate)
  };

  const legacyGoal = getLegacyGoalFromOnboarding(
    onboarding ?? {},
    referenceDate
  );
  const goals =
    normalizedBase.goals.length > 0 ? normalizedBase.goals : legacyGoal ? [legacyGoal] : [];
  return {
    ...normalizedBase,
    goals
  };
}

export function getPersistedOnboardingData(onboarding: OnboardingData) {
  return normalizeOnboardingData(onboarding);
}

function normalizeCompletedActions(
  completedActions: CompletedActionsState | null | undefined
) {
  return normalizeCompletedActionsState(completedActions);
}

export async function fetchFinancialProfile(userId: string): Promise<FinancialProfile> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(FINANCIAL_PROFILES_TABLE)
    .select("onboarding, completed_actions, exact_values")
    .eq("user_id", userId)
    .maybeSingle<FinancialProfileRow>();

  if (error) {
    throw error;
  }

  return {
    profileExists: Boolean(data),
    onboarding: normalizeOnboardingData(data?.onboarding),
    completedActions: normalizeCompletedActions(data?.completed_actions),
    exactValues: normalizeExactValues(data?.exact_values)
  };
}

export async function saveOnboardingData(userId: string, onboarding: OnboardingData) {
  const client = getSupabaseClient();
  const { error } = await client.from(FINANCIAL_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      onboarding: getPersistedOnboardingData(onboarding),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function saveFinancialProfileDraft(
  userId: string,
  onboarding: OnboardingData,
  exactValues: ExactFinancialValues
) {
  const client = getSupabaseClient();
  const { error } = await client.from(FINANCIAL_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      onboarding: getPersistedOnboardingData(onboarding),
      exact_values: normalizeExactValues(exactValues),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function saveCompletedActions(
  userId: string,
  completedActions: CompletedActionsState
) {
  const client = getSupabaseClient();
  const { error } = await client.from(FINANCIAL_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      completed_actions: completedActions,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function saveExactValues(userId: string, exactValues: ExactFinancialValues) {
  const client = getSupabaseClient();
  const { error } = await client.from(FINANCIAL_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      exact_values: normalizeExactValues(exactValues),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}
