import {
  getGoalAmountRangeEstimate,
  formatCOP
} from "./financialRanges";
import {
  getOnboardingGoals,
  type ExactFinancialValues,
  type FinancialGoal,
  type OnboardingData
} from "../types/financial";
import { allocateMonthlyGoalBudget } from "./goalAllocationPolicy";
import { getMonthsUntilTargetMonth } from "./monthYear";

export type GoalViability =
  | "ready"
  | "possible"
  | "stretched"
  | "needs_adjustment"
  | "unknown"
  | "paused"
  | "completed";

export type GoalAllocation = {
  goal: FinancialGoal;
  targetAmount: number | null;
  currentAmount: number;
  remainingAmount: number | null;
  progressPercentage: number | null;
  horizonMonths: number | null;
  requiredMonthlyContribution: number | null;
  recommendedMonthlyContribution: number;
  monthlyContribution: number;
  estimatedMonthsToGoal: number | null;
  score: number;
  viability: GoalViability;
  viabilityLabel: string;
  contributionMode: "recommended" | "manual";
};

export type GoalAllocationPlan = {
  goals: FinancialGoal[];
  monthlyGoalBudget: number;
  monthlyGoalBudgetMode: "recommended" | "manual";
  allocations: GoalAllocation[];
  recommendedTotal: number;
  monthlyContributionTotal: number;
  remainingBudget: number;
  isOverBudget: boolean;
};

const goalTypeLabels: Record<string, string> = {
  business: "Negocio",
  cashflow: "Flujo",
  debt: "Deudas",
  education: "Educación",
  financial: "Financiera",
  future: "Futuro",
  home: "Vivienda",
  investment: "Inversión",
  security: "Seguridad",
  wellbeing: "Bienestar"
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function safePositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function safeNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function getGoalTypeLabel(type: string | null | undefined) {
  return goalTypeLabels[type ?? ""] ?? "Meta";
}

export function isEmergencyGoal(goal: Pick<FinancialGoal, "title" | "type"> | null | undefined) {
  const normalizedTitle = normalizeText(goal?.title);

  return goal?.type === "security" || normalizedTitle.includes("emergencia");
}

export function isDebtGoal(goal: Pick<FinancialGoal, "title" | "type"> | null | undefined) {
  const normalizedTitle = normalizeText(goal?.title);

  return goal?.type === "debt" || normalizedTitle.includes("deuda");
}

export function getGoalPlanningMonths(goal: FinancialGoal, referenceDate = new Date()) {
  const exactMonths = getMonthsUntilTargetMonth(goal.targetMonth, referenceDate);

  return exactMonths === null || exactMonths < 0 ? null : Math.max(1, exactMonths);
}

export function getGoalTargetAmount(
  goal: FinancialGoal,
  _exactValues: ExactFinancialValues = {},
  _isPrimary = false
) {
  const goalTargetAmount = safePositive(goal.targetAmount);

  if (goalTargetAmount !== null) {
    return goalTargetAmount;
  }

  return getGoalAmountRangeEstimate(goal.amountRange).midpoint;
}

function getGoalFocusScore(isPrimary: boolean | undefined) {
  return isPrimary ? 6 : 4;
}

function getGoalUrgencyScore(horizonMonths: number | null) {
  if (horizonMonths === null) {
    return 1;
  }

  if (horizonMonths <= 6) {
    return 4;
  }

  if (horizonMonths <= 12) {
    return 3;
  }

  if (horizonMonths <= 36) {
    return 2;
  }

  return 1;
}

function getGoalTypeScore(type: string | null | undefined) {
  if (type === "security" || type === "debt") {
    return 3;
  }

  if (type === "education" || type === "future" || type === "home") {
    return 2;
  }

  if (type === "investment" || type === "business") {
    return 1.5;
  }

  return 1;
}

function getGoalViabilityScore({
  monthlyGoalBudget,
  requiredMonthlyContribution
}: {
  monthlyGoalBudget: number;
  requiredMonthlyContribution: number | null;
}) {
  if (requiredMonthlyContribution === null || monthlyGoalBudget <= 0) {
    return 0.5;
  }

  if (requiredMonthlyContribution <= monthlyGoalBudget * 0.5) {
    return 2;
  }

  if (requiredMonthlyContribution <= monthlyGoalBudget) {
    return 1.25;
  }

  if (requiredMonthlyContribution <= monthlyGoalBudget * 1.5) {
    return 0.75;
  }

  return 0.25;
}

function getGoalScore({
  goal,
  horizonMonths,
  monthlyGoalBudget,
  requiredMonthlyContribution
}: {
  goal: FinancialGoal;
  horizonMonths: number | null;
  monthlyGoalBudget: number;
  requiredMonthlyContribution: number | null;
}) {
  if (goal.status === "paused" || goal.status === "completed") {
    return 0;
  }

  return (
    getGoalFocusScore(goal.isPrimary) +
    getGoalUrgencyScore(horizonMonths) +
    getGoalTypeScore(goal.type) +
    getGoalViabilityScore({ monthlyGoalBudget, requiredMonthlyContribution })
  );
}

function distributeRecommendedContributions(
  goals: Array<{
    currentAmount: number;
    goal: FinancialGoal;
    remainingAmount: number | null;
    targetAmount: number | null;
  }>,
  monthlyGoalBudget: number,
  asOfDate: Date
) {
  const result = allocateMonthlyGoalBudget({
    goals: goals.map((goalMetric) => ({
      currentAmount: goalMetric.currentAmount,
      goalId: goalMetric.goal.id,
      isPrimary: goalMetric.goal.isPrimary,
      remainingAmount: goalMetric.remainingAmount,
      status: goalMetric.goal.status,
      targetAmount: goalMetric.targetAmount,
      targetMonth: goalMetric.goal.targetMonth,
      title: goalMetric.goal.title
    })),
    monthlyBudget: monthlyGoalBudget,
    referenceDate: asOfDate
  });

  return new Map(
    result.allocations.map((allocation) => [allocation.goalId, allocation.amount])
  );
}

function getViability({
  estimatedMonthsToGoal,
  horizonMonths,
  monthlyContribution,
  progressPercentage,
  requiredMonthlyContribution,
  status,
  targetAmount
}: {
  estimatedMonthsToGoal: number | null;
  horizonMonths: number | null;
  monthlyContribution: number;
  progressPercentage: number | null;
  requiredMonthlyContribution: number | null;
  status: FinancialGoal["status"];
  targetAmount: number | null;
}): { viability: GoalViability; viabilityLabel: string } {
  if (status === "completed" || (progressPercentage !== null && progressPercentage >= 100)) {
    return {
      viability: "completed",
      viabilityLabel: "Completada"
    };
  }

  if (status === "paused") {
    return {
      viability: "paused",
      viabilityLabel: "Pausada"
    };
  }

  if (targetAmount === null) {
    return {
      viability: "unknown",
      viabilityLabel: "Falta monto objetivo"
    };
  }

  if (monthlyContribution <= 0) {
    return {
      viability: "needs_adjustment",
      viabilityLabel: "Sin aporte asignado"
    };
  }

  if (horizonMonths === null || requiredMonthlyContribution === null) {
    return {
      viability: "possible",
      viabilityLabel: "Avance gradual"
    };
  }

  if (estimatedMonthsToGoal !== null && estimatedMonthsToGoal <= horizonMonths) {
    return {
      viability: "ready",
      viabilityLabel: "Va en ritmo"
    };
  }

  if (monthlyContribution >= requiredMonthlyContribution * 0.7) {
    return {
      viability: "possible",
      viabilityLabel: "Cerca del ritmo"
    };
  }

  if (monthlyContribution > 0) {
    return {
      viability: "stretched",
      viabilityLabel: "Necesita más tiempo"
    };
  }

  return {
    viability: "needs_adjustment",
    viabilityLabel: "Requiere ajuste"
  };
}

export function getGoalAllocationPlan({
  asOfDate = new Date(),
  exactValues = {},
  goals,
  monthlyContributions = null,
  monthlyGoalBudget,
  monthlyGoalBudgetMode = "recommended",
  preferredGoalId = null
}: {
  asOfDate?: Date;
  exactValues?: ExactFinancialValues;
  goals: FinancialGoal[];
  monthlyContributions?: Record<string, number> | null;
  monthlyGoalBudget: number;
  monthlyGoalBudgetMode?: GoalAllocationPlan["monthlyGoalBudgetMode"];
  preferredGoalId?: string | null;
}): GoalAllocationPlan {
  const safeBudget = Math.max(0, Math.floor(monthlyGoalBudget));
  const normalizedGoals = goals;
  const goalMetrics = normalizedGoals.map((goal, index) => {
    const horizonMonths = getGoalPlanningMonths(goal, asOfDate);
    const targetAmount = getGoalTargetAmount(goal, exactValues, goal.isPrimary === true || index === 0);
    const isCompleted = goal.status === "completed";
    const currentAmount = Math.max(0, goal.currentAmount ?? 0);
    const remainingAmount =
      targetAmount !== null ? (isCompleted ? 0 : Math.max(targetAmount - currentAmount, 0)) : null;
    const progressPercentage =
      targetAmount !== null && targetAmount > 0
        ? isCompleted
          ? 100
          : Math.min((currentAmount / targetAmount) * 100, 100)
        : null;
    const requiredMonthlyContribution =
      !isCompleted && remainingAmount !== null && horizonMonths !== null && horizonMonths > 0
        ? Math.ceil(remainingAmount / horizonMonths)
        : null;
    const score =
      progressPercentage !== null && progressPercentage >= 100
        ? 0
        : getGoalScore({
            goal,
            horizonMonths,
            monthlyGoalBudget: safeBudget,
            requiredMonthlyContribution
          });

    return {
      goal,
      horizonMonths,
      currentAmount,
      remainingAmount,
      progressPercentage,
      requiredMonthlyContribution,
      score,
      targetAmount
    };
  });
  const preferredGoal = preferredGoalId
    ? goalMetrics.find(
        (goalMetric) =>
          goalMetric.goal.id === preferredGoalId &&
          goalMetric.goal.status !== "completed" &&
          goalMetric.goal.status !== "paused"
      ) ?? null
    : null;
  const recommendedContributions = monthlyContributions
    ? new Map(
        Object.entries(monthlyContributions).map(([goalId, amount]) => [
          goalId,
          Math.max(0, Math.floor(amount))
        ])
      )
    : preferredGoal
      ? new Map([[preferredGoal.goal.id, safeBudget]])
      : distributeRecommendedContributions(
          goalMetrics
            .filter((goalMetric) => goalMetric.score > 0),
          safeBudget,
          asOfDate
        );
  const allocations = goalMetrics.map((goalMetric) => {
    const goalIsInactive =
      goalMetric.goal.status === "completed" || goalMetric.goal.status === "paused";
    const recommendedMonthlyContribution =
      recommendedContributions.get(goalMetric.goal.id) ?? 0;
    const monthlyContribution = goalIsInactive
      ? 0
      : recommendedMonthlyContribution;
    const estimatedMonthsToGoal =
      goalMetric.remainingAmount !== null && monthlyContribution > 0
        ? Math.ceil(goalMetric.remainingAmount / monthlyContribution)
        : null;
    const contributionMode: GoalAllocation["contributionMode"] =
      monthlyGoalBudgetMode === "manual" ? "manual" : "recommended";
    const viability = getViability({
      estimatedMonthsToGoal,
      horizonMonths: goalMetric.horizonMonths,
      monthlyContribution,
      progressPercentage: goalMetric.progressPercentage,
      requiredMonthlyContribution: goalMetric.requiredMonthlyContribution,
      status: goalMetric.goal.status,
      targetAmount: goalMetric.targetAmount
    });

    return {
      goal: goalMetric.goal,
      targetAmount: goalMetric.targetAmount,
      currentAmount: goalMetric.currentAmount,
      remainingAmount: goalMetric.remainingAmount,
      progressPercentage: goalMetric.progressPercentage,
      horizonMonths: goalMetric.horizonMonths,
      requiredMonthlyContribution: goalMetric.requiredMonthlyContribution,
      recommendedMonthlyContribution,
      monthlyContribution,
      estimatedMonthsToGoal,
      score: goalMetric.score,
      contributionMode,
      ...viability
    };
  });
  const recommendedTotal = allocations.reduce(
    (total, allocation) => total + allocation.recommendedMonthlyContribution,
    0
  );
  const monthlyContributionTotal = allocations.reduce(
    (total, allocation) => total + allocation.monthlyContribution,
    0
  );
  const remainingBudget = safeBudget - monthlyContributionTotal;

  return {
    goals: normalizedGoals,
    monthlyGoalBudget: safeBudget,
    monthlyGoalBudgetMode,
    allocations,
    recommendedTotal,
    monthlyContributionTotal,
    remainingBudget,
    isOverBudget: remainingBudget < 0
  };
}

export function getGoalPlanFromOnboarding(
  onboarding: OnboardingData,
  monthlyGoalBudget: number,
  exactValues: ExactFinancialValues = {},
  options: {
    monthlyContributions?: Record<string, number> | null;
    preferredGoalId?: string | null;
  } = {}
) {
  return getGoalAllocationPlan({
    exactValues,
    goals: getOnboardingGoals(onboarding).filter((goal) => !isDebtGoal(goal)),
    monthlyContributions: options.monthlyContributions,
    monthlyGoalBudget,
    monthlyGoalBudgetMode: "recommended",
    preferredGoalId: options.preferredGoalId
  });
}

export function formatGoalContribution(value: number) {
  return value > 0 ? `${formatCOP(value)} aprox.` : "Sin aporte";
}

export function getAllocationProgress(allocation: GoalAllocation) {
  if (allocation.progressPercentage !== null) {
    return allocation.progressPercentage;
  }

  if (allocation.targetAmount === null || allocation.monthlyContribution <= 0) {
    return 0;
  }

  const months = allocation.estimatedMonthsToGoal ?? 0;
  const horizon = allocation.horizonMonths ?? months;

  if (horizon <= 0 || months <= 0) {
    return 0;
  }

  return clamp((horizon / months) * 100, 8, 100);
}
