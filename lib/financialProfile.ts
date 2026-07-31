import { supabase } from "./supabase";
import {
  getLegacyFieldsFromGoal,
  getLegacyGoalFromOnboarding,
  getPrimaryFinancialGoal,
  initialOnboarding,
  normalizeCompletedActionsState,
  normalizeDebtRecords,
  normalizeExpenseCategoryAmounts,
  normalizeFinancialGuidanceMode,
  normalizeFinancialGoals,
  normalizeGoalMonthlyBudget,
  type CompletedActionsState,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import { syncDebtExpenseCategory } from "../utils/debtCalculations";
import { normalizeExactValues } from "../utils/financialRanges";

const FINANCIAL_PROFILES_TABLE = "financial_profiles";

type FinancialProfileRow = {
  onboarding: Partial<OnboardingData> | null;
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
  onboarding: Partial<OnboardingData> | null | undefined
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
    ...(onboarding ?? {}),
    firstName: typeof onboarding?.firstName === "string" ? onboarding.firstName : "",
    lastName: typeof onboarding?.lastName === "string" ? onboarding.lastName : "",
    financialGuidanceMode: normalizeFinancialGuidanceMode(onboarding?.financialGuidanceMode),
    expenseCategories: expenseData.expenseCategories,
    expenseCategoryAmounts: expenseData.expenseCategoryAmounts,
    debts,
    smallExpenseCategories: Array.isArray(onboarding?.smallExpenseCategories)
      ? onboarding.smallExpenseCategories
      : [],
    goalMonthlyBudget: normalizeGoalMonthlyBudget(onboarding?.goalMonthlyBudget),
    goals: normalizeFinancialGoals(onboarding?.goals)
  };

  const legacyGoal = getLegacyGoalFromOnboarding(normalizedBase);
  const goals =
    normalizedBase.goals.length > 0 ? normalizedBase.goals : legacyGoal ? [legacyGoal] : [];
  const normalizedWithGoals = {
    ...normalizedBase,
    goals
  };
  const primaryGoal = getPrimaryFinancialGoal(normalizedWithGoals);

  return {
    ...normalizedWithGoals,
    ...getLegacyFieldsFromGoal(primaryGoal)
  };
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
      onboarding,
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
      onboarding,
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
