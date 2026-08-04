import {
  getOnboardingGoals,
  type ExactFinancialValues,
  type OnboardingData,
  type SimulationPlanStrategy
} from "../types/financial";
import {
  calculateProtectedMargin,
  type ProtectedMarginPreference
} from "./financialDistribution";
import {
  calculateFinancialSnapshot,
  type PriorityKey
} from "./financialCalculations";
import { buildSimulationExperience } from "./simulationExperience";

export type ResolvedPlanPreference = {
  goalId: string | null;
  goalTitle: string | null;
  hasExplicitPreference: boolean;
  isApplicable: boolean;
  label: string;
  monthlyReference: number;
  priorityKey: PriorityKey;
  strategy: SimulationPlanStrategy;
};

function getProtectedMarginPreference(
  onboarding: OnboardingData
): ProtectedMarginPreference {
  const preference = onboarding.simulationPlanPreference;

  if (!preference || preference.protectedMarginMode === "automatic") {
    return { mode: "automatic" };
  }

  if (preference.protectedMarginMode === "use_all") {
    return { mode: "use_all" };
  }

  return preference.customProtectedMargin === null
    ? { mode: "automatic" }
    : { amount: preference.customProtectedMargin, mode: "custom" };
}

export function resolvePlanPreference({
  exactValues = {},
  onboarding
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): ResolvedPlanPreference {
  const experience = buildSimulationExperience({ exactValues, onboarding });
  const snapshot = calculateFinancialSnapshot({ exactValues, onboarding });
  const storedPreference = onboarding.simulationPlanPreference;
  const recommendedResult: ResolvedPlanPreference = {
    goalId: null,
    goalTitle: null,
    hasExplicitPreference: storedPreference !== null,
    isApplicable: true,
    label: "Recomendación del diagnóstico",
    monthlyReference: experience.recommendedMonthlyContribution,
    priorityKey: snapshot.priority.key,
    strategy: "diagnosis_recommended"
  };

  if (!storedPreference || storedPreference.strategy === "diagnosis_recommended") {
    return recommendedResult;
  }

  const activeGoals = getOnboardingGoals(onboarding).filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );
  const goal = storedPreference.goalId
    ? activeGoals.find((candidate) => candidate.id === storedPreference.goalId) ?? null
    : activeGoals.find((candidate) => candidate.isPrimary) ?? activeGoals[0] ?? null;

  if (!goal || experience.planningMonthlyMargin === null) {
    return {
      ...recommendedResult,
      goalId: goal?.id ?? storedPreference.goalId,
      goalTitle: goal?.title ?? null,
      isApplicable: false,
      label: goal ? `Priorizar ${goal.title}` : "Priorizar la meta seleccionada",
      monthlyReference: 0,
      priorityKey: "advance_goal",
      strategy: "prioritize_goal"
    };
  }

  const surplusBeforeProtection = Math.max(0, experience.planningMonthlyMargin);
  const protectedMargin = calculateProtectedMargin({
    preference: getProtectedMarginPreference(onboarding),
    surplusBeforeProtection
  }).result.amount;
  const monthlyReference = Math.max(0, surplusBeforeProtection - protectedMargin);

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    hasExplicitPreference: true,
    isApplicable: monthlyReference > 0,
    label: `Priorizar ${goal.title}`,
    monthlyReference,
    priorityKey: "advance_goal",
    strategy: "prioritize_goal"
  };
}

export function getPlanPreferenceGoalBudget({
  fallbackMonthlyBudget,
  preference
}: {
  fallbackMonthlyBudget: number;
  preference: ResolvedPlanPreference;
}) {
  return preference.hasExplicitPreference && preference.isApplicable
    ? preference.monthlyReference
    : fallbackMonthlyBudget;
}
