import {
  getOnboardingGoals,
  type ExactFinancialValues,
  type OnboardingData,
  type SimulationPlanStrategy
} from "../types/financial";
import {
  buildDistributionScenarios,
  calculateProtectedMargin,
  type DebtMonthlyAllocation,
  type DistributionIssue,
  type DistributionScenario,
  type DistributionScenarioStatus,
  type DistributionStrategyId,
  type GoalMonthlyAllocation,
  type ProtectedMarginPreference
} from "./financialDistribution";
import { calculateFinancialSnapshot } from "./financialCalculations";
import { buildFinancialProjectionInput } from "./financialProjectionInput";
import type { FinancialProjectionInput } from "./financialProjectionInput";
import { isEmergencyGoal } from "./goalPlanning";
import { buildSimulationExperience } from "./simulationExperience";

export type ResolvedMonthlyDistribution = {
  debtAllocations: DebtMonthlyAllocation[];
  distributableAmount: number;
  extraDebtPaymentsTotal: number;
  goalAllocations: GoalMonthlyAllocation[];
  goalContributionTotal: number;
  issues: DistributionIssue[];
  label: string;
  protectedMargin: number;
  requiredDebtPaymentsTotal: number;
  selectedStrategy: SimulationPlanStrategy;
  sourceMode: "detailed" | "preliminary";
  status: DistributionScenarioStatus;
  unassignedAmount: number;
};

const detailedStrategyLabels: Record<DistributionStrategyId, string> = {
  current_reference: "Distribución personalizada",
  reduce_interest: "Reducir intereses",
  accelerate_goal: "Acelerar una meta",
  split_debt_goal: "Avanzar en deuda y meta"
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

function sumGoalAllocations(allocations: GoalMonthlyAllocation[]) {
  return allocations.reduce((total, allocation) => total + allocation.amount, 0);
}

function sumRequiredDebtPayments(allocations: DebtMonthlyAllocation[]) {
  return allocations.reduce((total, allocation) => total + allocation.basePayment, 0);
}

function sumExtraDebtPayments(allocations: DebtMonthlyAllocation[]) {
  return allocations.reduce((total, allocation) => total + allocation.extraPayment, 0);
}

function fromDetailedScenario({
  scenario,
  selectedStrategy
}: {
  scenario: DistributionScenario;
  selectedStrategy: SimulationPlanStrategy;
}): ResolvedMonthlyDistribution {
  return {
    debtAllocations: scenario.debtAllocations,
    distributableAmount: scenario.distributableAmount,
    extraDebtPaymentsTotal: sumExtraDebtPayments(scenario.debtAllocations),
    goalAllocations: scenario.goalAllocations,
    goalContributionTotal: sumGoalAllocations(scenario.goalAllocations),
    issues: scenario.issues,
    label: detailedStrategyLabels[scenario.id],
    protectedMargin: scenario.protectedMargin.amount,
    requiredDebtPaymentsTotal: sumRequiredDebtPayments(scenario.debtAllocations),
    selectedStrategy,
    sourceMode: "detailed",
    status: scenario.status,
    unassignedAmount: scenario.unassignedAmount
  };
}

function getSelectedGoalId(onboarding: OnboardingData) {
  const activeGoals = getOnboardingGoals(onboarding).filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );
  const storedGoalId = onboarding.simulationPlanPreference?.goalId;

  if (storedGoalId) {
    return storedGoalId;
  }

  return (
    activeGoals.find((goal) => goal.isPrimary)?.id ??
    activeGoals[0]?.id ??
    null
  );
}

function getPreliminaryGoalAllocation({
  amount,
  goalId,
  projectionInput
}: {
  amount: number;
  goalId: string | null;
  projectionInput: FinancialProjectionInput;
}) {
  if (!goalId || amount <= 0) {
    return [];
  }

  const goal = projectionInput.goals.find((candidate) => candidate.id === goalId);

  if (!goal || goal.targetAmount === null) {
    return [];
  }

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return [
    {
      amount: Math.min(amount, remainingAmount),
      goalId: goal.id,
      title: goal.title
    }
  ] satisfies GoalMonthlyAllocation[];
}

function resolvePreliminaryDistribution({
  exactValues,
  onboarding,
  selectedStrategy
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
  selectedStrategy: SimulationPlanStrategy;
}): ResolvedMonthlyDistribution {
  const experience = buildSimulationExperience({ exactValues, onboarding });
  const snapshot = calculateFinancialSnapshot({ exactValues, onboarding });
  const protectedMarginResult = calculateProtectedMargin({
    preference: getProtectedMarginPreference(onboarding),
    surplusBeforeProtection: Math.max(0, experience.planningMonthlyMargin ?? 0)
  });
  const distributableAmount =
    experience.planningMonthlyMargin === null
      ? 0
      : Math.max(0, experience.planningMonthlyMargin - protectedMarginResult.result.amount);
  const primaryGoalId = getSelectedGoalId(onboarding);
  const activeEmergencyGoal = getOnboardingGoals(onboarding).find(
    (goal) =>
      goal.status !== "completed" &&
      goal.status !== "paused" &&
      isEmergencyGoal(goal)
  );
  const normalizedStrategy =
    selectedStrategy === "prioritize_goal" ? "accelerate_goal" : selectedStrategy;
  const isUnsupportedDebtStrategy =
    normalizedStrategy === "reduce_interest" || normalizedStrategy === "split_debt_goal";
  let goalId: string | null = null;
  let requestedGoalAmount = 0;
  let label = "Recomendación del diagnóstico";

  if (normalizedStrategy === "accelerate_goal") {
    goalId = primaryGoalId;
    requestedGoalAmount = distributableAmount;
    label = "Acelerar una meta";
  } else if (normalizedStrategy === "current_reference") {
    label = "Distribución personalizada";
  } else if (selectedStrategy === "diagnosis_recommended") {
    goalId =
      snapshot.priority.key === "build_emergency_fund"
        ? activeEmergencyGoal?.id ?? null
        : snapshot.priority.key === "advance_goal"
          ? primaryGoalId
          : null;
    requestedGoalAmount = Math.min(
      distributableAmount,
      experience.recommendedMonthlyContribution
    );
  }

  const projectionInput = buildFinancialProjectionInput({ exactValues, onboarding });
  const customGoalAllocations = projectionInput.goals
    .filter(
      (goal) =>
        normalizedStrategy === "current_reference" &&
        goal.status !== "completed" &&
        goal.status !== "paused" &&
        (goal.manualMonthlyContribution ?? 0) > 0
    )
    .map((goal) => ({
      amount: goal.manualMonthlyContribution ?? 0,
      goalId: goal.id,
      title: goal.title
    }));
  const goalAllocations =
    normalizedStrategy === "current_reference"
      ? customGoalAllocations
      : getPreliminaryGoalAllocation({
          amount: requestedGoalAmount,
          goalId,
          projectionInput
        });
  const goalContributionTotal = sumGoalAllocations(goalAllocations);
  const status: DistributionScenarioStatus =
    experience.planningMonthlyMargin === null
      ? "incomplete"
      : isUnsupportedDebtStrategy
        ? "not_applicable"
        : distributableAmount <= 0
          ? "no_surplus"
          : "ready";
  const requiredDebtPaymentsTotal =
    experience.debtPaymentRange.maximum ?? experience.debtPaymentRange.minimum ?? 0;

  return {
    debtAllocations: [],
    distributableAmount,
    extraDebtPaymentsTotal: 0,
    goalAllocations,
    goalContributionTotal,
    issues: protectedMarginResult.issues,
    label,
    protectedMargin: protectedMarginResult.result.amount,
    requiredDebtPaymentsTotal,
    selectedStrategy,
    sourceMode: "preliminary",
    status,
    unassignedAmount: Math.max(0, distributableAmount - goalContributionTotal)
  };
}

export function resolveMonthlyDistribution({
  exactValues,
  onboarding
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): ResolvedMonthlyDistribution {
  const experience = buildSimulationExperience({ exactValues, onboarding });
  const preference = onboarding.simulationPlanPreference;
  const selectedStrategy = preference?.strategy ?? "diagnosis_recommended";

  if (experience.mode !== "detailed_debt") {
    return resolvePreliminaryDistribution({ exactValues, onboarding, selectedStrategy });
  }

  const projectionInput = buildFinancialProjectionInput({ exactValues, onboarding });
  const selectedGoalId = getSelectedGoalId(onboarding);
  const scenarios = buildDistributionScenarios({
    input: projectionInput,
    protectedMarginPreference: getProtectedMarginPreference(onboarding),
    selectedGoalId,
    splitDebtShare: preference?.debtShare ?? 0.5
  });
  const normalizedStrategy: DistributionStrategyId =
    selectedStrategy === "prioritize_goal" ||
    selectedStrategy === "diagnosis_recommended"
      ? "accelerate_goal"
      : selectedStrategy;
  const scenarioByStrategy: Record<DistributionStrategyId, DistributionScenario> = {
    accelerate_goal: scenarios.accelerateGoal,
    current_reference: scenarios.currentReference,
    reduce_interest: scenarios.reduceInterest,
    split_debt_goal: scenarios.splitDebtGoal
  };

  return fromDetailedScenario({
    scenario: scenarioByStrategy[normalizedStrategy],
    selectedStrategy
  });
}
