import { supabase } from "./supabase";
import {
  initialOnboarding,
  type CompletedActionsState,
  type OnboardingData
} from "../types/financial";

const FINANCIAL_PROFILES_TABLE = "financial_profiles";

type FinancialProfileRow = {
  onboarding: Partial<OnboardingData> | null;
  completed_actions: CompletedActionsState | null;
};

export type FinancialProfile = {
  profileExists: boolean;
  onboarding: OnboardingData;
  completedActions: CompletedActionsState;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  return supabase;
}

function normalizeOnboarding(onboarding: Partial<OnboardingData> | null | undefined) {
  return {
    ...initialOnboarding,
    ...(onboarding ?? {}),
    expenseCategories: Array.isArray(onboarding?.expenseCategories)
      ? onboarding.expenseCategories
      : [],
    smallExpenseCategories: Array.isArray(onboarding?.smallExpenseCategories)
      ? onboarding.smallExpenseCategories
      : []
  };
}

function normalizeCompletedActions(
  completedActions: CompletedActionsState | null | undefined
) {
  return completedActions ?? {};
}

export async function fetchFinancialProfile(userId: string): Promise<FinancialProfile> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(FINANCIAL_PROFILES_TABLE)
    .select("onboarding, completed_actions")
    .eq("user_id", userId)
    .maybeSingle<FinancialProfileRow>();

  if (error) {
    throw error;
  }

  return {
    profileExists: Boolean(data),
    onboarding: normalizeOnboarding(data?.onboarding),
    completedActions: normalizeCompletedActions(data?.completed_actions)
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
