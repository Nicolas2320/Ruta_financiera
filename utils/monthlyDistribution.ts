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
import { allocateMonthlyGoalBudget } from "./goalAllocationPolicy";
import { isDebtGoal, isEmergencyGoal } from "./goalPlanning";
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
  current_reference: "Sin repartición",
  reduce_interest: "Repartir solo a deudas",
  accelerate_goal: "Repartir solo a metas",
  split_debt_goal: "Repartir a deudas y metas"
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

function getPrimaryActiveGoalId(onboarding: OnboardingData) {
  const activeGoals = getOnboardingGoals(onboarding).filter(
    (goal) =>
      goal.status !== "completed" &&
      goal.status !== "paused" &&
      !isDebtGoal(goal)
  );

  return (
    activeGoals.find((goal) => goal.isPrimary)?.id ??
    activeGoals[0]?.id ??
    null
  );
}

function getPreliminaryGoalAllocations({
  amount,
  projectionInput
}: {
  amount: number;
  projectionInput: FinancialProjectionInput;
}) {
  if (amount <= 0) {
    return [];
  }

  return allocateMonthlyGoalBudget({
    goals: projectionInput.goals
      .filter((goal) => goal.targetAmount !== null)
      .map((goal) => ({
        currentAmount: goal.currentAmount,
        goalId: goal.id,
        isPrimary: goal.isPrimary,
        status: goal.status,
        targetAmount: goal.targetAmount,
        targetMonth: goal.targetMonth,
        title: goal.title
      })),
    monthlyBudget: amount,
    referenceDate: projectionInput.asOfDate
  }).allocations satisfies GoalMonthlyAllocation[];
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
  const primaryGoalId = getPrimaryActiveGoalId(onboarding);
  const activeEmergencyGoal = getOnboardingGoals(onboarding).find(
    (goal) =>
      goal.status !== "completed" &&
      goal.status !== "paused" &&
      isEmergencyGoal(goal)
  );
  const normalizedStrategy =
    selectedStrategy === "prioritize_goal" ? "accelerate_goal" : selectedStrategy;
  const isUnsupportedDebtStrategy =
    experience.mode === "reported_debt" &&
    (normalizedStrategy === "current_reference" ||
      normalizedStrategy === "reduce_interest" ||
      normalizedStrategy === "split_debt_goal");
  let goalId: string | null = null;
  let requestedGoalAmount = 0;
  let label = "Recomendación del diagnóstico";

  if (normalizedStrategy === "accelerate_goal") {
    requestedGoalAmount = distributableAmount;
    label = "Repartir solo a metas";
  } else if (normalizedStrategy === "current_reference") {
    label = "Sin repartición";
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
  const goalAllocations =
    normalizedStrategy === "current_reference"
      ? []
      : normalizedStrategy === "accelerate_goal"
        ? getPreliminaryGoalAllocations({
          amount: requestedGoalAmount,
          projectionInput
        })
        : getPreliminaryGoalAllocations({
            amount: requestedGoalAmount,
            projectionInput: {
              ...projectionInput,
              goals: projectionInput.goals.filter((goal) => goal.id === goalId)
            }
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
  const scenarios = buildDistributionScenarios({
    input: projectionInput,
    protectedMarginPreference: getProtectedMarginPreference(onboarding),
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
