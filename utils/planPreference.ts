import {
  getOnboardingGoals,
  type ExactFinancialValues,
  type OnboardingData,
  type SimulationPlanStrategy
} from "../types/financial";
import {
  calculateFinancialSnapshot,
  type PriorityKey
} from "./financialCalculations";
import { isEmergencyGoal } from "./goalPlanning";
import {
  resolveMonthlyDistribution,
  type ResolvedMonthlyDistribution
} from "./monthlyDistribution";
import { buildSimulationExperience } from "./simulationExperience";

export type ResolvedPlanPreference = {
  distribution: ResolvedMonthlyDistribution | null;
  extraDebtPayment: number;
  goalContributions: Record<string, number>;
  goalId: string | null;
  goalMonthlyContribution: number;
  goalTitle: string | null;
  hasExplicitPreference: boolean;
  isApplicable: boolean;
  label: string;
  monthlyReference: number;
  priorityKey: PriorityKey;
  strategy: SimulationPlanStrategy;
  usesResolvedDistribution: boolean;
};

function getDistributionPriority(
  distribution: ResolvedMonthlyDistribution,
  fallback: PriorityKey
): PriorityKey {
  if (distribution.extraDebtPaymentsTotal > 0 && distribution.goalContributionTotal === 0) {
    return "debt_pressure";
  }

  if (distribution.goalContributionTotal > 0) {
    return "advance_goal";
  }

  return fallback;
}

function getGoalContributions(distribution: ResolvedMonthlyDistribution) {
  return distribution.goalAllocations.reduce<Record<string, number>>(
    (contributions, allocation) => {
      contributions[allocation.goalId] = allocation.amount;
      return contributions;
    },
    {}
  );
}

function resolveStoredDistributionPreference({
  exactValues,
  onboarding
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): ResolvedPlanPreference | null {
  const storedPreference = onboarding.simulationPlanPreference;

  if (!storedPreference || storedPreference.strategy === "diagnosis_recommended") {
    return null;
  }

  const distribution = resolveMonthlyDistribution({ exactValues, onboarding });
  const goalContributions = getGoalContributions(distribution);
  const allocatedGoalIds = Object.keys(goalContributions);
  const selectedGoalId = allocatedGoalIds.length === 1 ? allocatedGoalIds[0] : null;
  const activeGoals = getOnboardingGoals(onboarding).filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );
  const storedGoal = storedPreference.goalId
    ? activeGoals.find((goal) => goal.id === storedPreference.goalId) ?? null
    : null;
  const allocatedGoal = selectedGoalId
    ? activeGoals.find((goal) => goal.id === selectedGoalId) ?? null
    : null;
  const isGoalStrategy =
    storedPreference.strategy === "prioritize_goal" ||
    storedPreference.strategy === "accelerate_goal" ||
    storedPreference.strategy === "split_debt_goal";
  const isApplicable =
    distribution.status === "ready" &&
    (!isGoalStrategy || distribution.goalContributionTotal > 0);
  const snapshot = calculateFinancialSnapshot({ exactValues, onboarding });

  return {
    distribution,
    extraDebtPayment: distribution.extraDebtPaymentsTotal,
    goalContributions,
    goalId: allocatedGoal?.id ?? storedGoal?.id ?? storedPreference.goalId,
    goalMonthlyContribution: distribution.goalContributionTotal,
    goalTitle: allocatedGoal?.title ?? storedGoal?.title ?? null,
    hasExplicitPreference: true,
    isApplicable,
    label:
      storedPreference.strategy === "prioritize_goal" && storedGoal
        ? `Priorizar ${storedGoal.title}`
        : distribution.label,
    monthlyReference: distribution.distributableAmount,
    priorityKey: getDistributionPriority(distribution, snapshot.priority.key),
    strategy: storedPreference.strategy,
    usesResolvedDistribution: true
  };
}

export function resolvePlanPreference({
  exactValues = {},
  onboarding
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): ResolvedPlanPreference {
  const storedDistributionPreference = resolveStoredDistributionPreference({
    exactValues,
    onboarding
  });

  if (storedDistributionPreference) {
    return storedDistributionPreference;
  }

  const experience = buildSimulationExperience({ exactValues, onboarding });
  const snapshot = calculateFinancialSnapshot({ exactValues, onboarding });
  const storedPreference = onboarding.simulationPlanPreference;

  return {
    distribution: null,
    extraDebtPayment: 0,
    goalContributions: {},
    goalId: null,
    goalMonthlyContribution: 0,
    goalTitle: null,
    hasExplicitPreference: storedPreference !== null,
    isApplicable: true,
    label: "Recomendación del diagnóstico",
    monthlyReference: experience.recommendedMonthlyContribution,
    priorityKey: snapshot.priority.key,
    strategy: "diagnosis_recommended",
    usesResolvedDistribution: false
  };
}

export function getPlanPreferenceGoalBudget({
  fallbackMonthlyBudget,
  preference,
  preferredGoalId = null
}: {
  fallbackMonthlyBudget: number;
  preference: ResolvedPlanPreference;
  preferredGoalId?: string | null;
}) {
  if (preference.usesResolvedDistribution) {
    if (preference.isApplicable) {
      return preference.goalMonthlyContribution;
    }

    return preference.strategy === "prioritize_goal" ||
      preference.strategy === "accelerate_goal" ||
      preference.strategy === "split_debt_goal"
      ? fallbackMonthlyBudget
      : 0;
  }

  const canFundPreferredGoal =
    preference.priorityKey === "advance_goal" ||
    (preference.priorityKey === "build_emergency_fund" && preferredGoalId !== null);

  if (!canFundPreferredGoal) {
    return 0;
  }

  return preference.hasExplicitPreference && preference.isApplicable
    ? preference.monthlyReference
    : fallbackMonthlyBudget;
}

export function getPlanPreferencePreferredGoalId({
  onboarding,
  preference
}: {
  onboarding: OnboardingData;
  preference: ResolvedPlanPreference;
}) {
  if (!preference.isApplicable) {
    return null;
  }

  if (preference.usesResolvedDistribution) {
    const allocatedGoalIds = Object.keys(preference.goalContributions);
    return allocatedGoalIds.length === 1 ? allocatedGoalIds[0] : null;
  }

  if (preference.priorityKey !== "build_emergency_fund") {
    return null;
  }

  const activeEmergencyGoal = getOnboardingGoals(onboarding).find(
    (goal) =>
      goal.status !== "completed" &&
      goal.status !== "paused" &&
      isEmergencyGoal(goal)
  );

  return activeEmergencyGoal?.id ?? null;
}

export function getPlanPreferenceGoalPlanOptions(
  preference: ResolvedPlanPreference,
  preferredGoalId: string | null
) {
  return {
    monthlyContributions:
      preference.usesResolvedDistribution && preference.isApplicable
      ? preference.goalContributions
      : null,
    preferredGoalId,
    useStoredManualBudget:
      !preference.usesResolvedDistribution || !preference.isApplicable
  };
}
