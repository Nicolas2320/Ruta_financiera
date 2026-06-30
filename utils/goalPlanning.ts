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
import { roundDownToNearest } from "./financialCalculations";

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
  education: "Educacion",
  financial: "Financiera",
  future: "Futuro",
  home: "Vivienda",
  investment: "Inversion",
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

export function getGoalHorizonMonths(horizon: string | null | undefined) {
  const normalizedHorizon = normalizeText(horizon);

  if (!normalizedHorizon || normalizedHorizon.includes("seguro")) {
    return null;
  }

  if (normalizedHorizon.includes("menos") && normalizedHorizon.includes("6")) {
    return 6;
  }

  if (normalizedHorizon.includes("6") && normalizedHorizon.includes("12")) {
    return 12;
  }

  if (normalizedHorizon.includes("1") && normalizedHorizon.includes("3")) {
    return 36;
  }

  if (normalizedHorizon.includes("3") && normalizedHorizon.includes("5")) {
    return 60;
  }

  if (normalizedHorizon.includes("mas") && normalizedHorizon.includes("5")) {
    return 72;
  }

  return null;
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

function getGoalPriorityScore(priority: string | null | undefined) {
  const normalizedPriority = normalizeText(priority);

  if (normalizedPriority.includes("muy")) {
    return 4;
  }

  if (normalizedPriority.includes("alta")) {
    return 3;
  }

  if (normalizedPriority.includes("media")) {
    return 2;
  }

  if (normalizedPriority.includes("baja")) {
    return 1;
  }

  return 2;
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
    getGoalPriorityScore(goal.priority) * 2 +
    getGoalUrgencyScore(horizonMonths) +
    getGoalTypeScore(goal.type) +
    getGoalViabilityScore({ monthlyGoalBudget, requiredMonthlyContribution })
  );
}

function distributeRecommendedContributions(
  goalsWithScores: Array<{ goalId: string; score: number }>,
  monthlyGoalBudget: number
) {
  if (goalsWithScores.length === 0 || monthlyGoalBudget <= 0) {
    return new Map<string, number>();
  }

  const totalScore = goalsWithScores.reduce((total, goal) => total + goal.score, 0);
  const allocations = new Map<string, number>();
  let assignedBudget = 0;

  goalsWithScores.forEach((goalWithScore) => {
    const rawAmount =
      totalScore > 0 ? monthlyGoalBudget * (goalWithScore.score / totalScore) : 0;
    const recommendedAmount = roundDownToNearest(rawAmount, 10000);
    allocations.set(goalWithScore.goalId, recommendedAmount);
    assignedBudget += recommendedAmount;
  });

  let remainingBudget = monthlyGoalBudget - assignedBudget;
  const sortedGoals = [...goalsWithScores].sort((a, b) => b.score - a.score);

  for (const goalWithScore of sortedGoals) {
    if (remainingBudget < 10000) {
      break;
    }

    allocations.set(goalWithScore.goalId, (allocations.get(goalWithScore.goalId) ?? 0) + 10000);
    remainingBudget -= 10000;
  }

  if (assignedBudget === 0 && monthlyGoalBudget > 0) {
    const primaryGoal = sortedGoals[0];
    allocations.set(primaryGoal.goalId, monthlyGoalBudget);
  }

  return allocations;
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
      viabilityLabel: "Necesita mas tiempo"
    };
  }

  return {
    viability: "needs_adjustment",
    viabilityLabel: "Requiere ajuste"
  };
}

export function getGoalAllocationPlan({
  exactValues = {},
  goals,
  monthlyGoalBudget,
  monthlyGoalBudgetMode = "recommended"
}: {
  exactValues?: ExactFinancialValues;
  goals: FinancialGoal[];
  monthlyGoalBudget: number;
  monthlyGoalBudgetMode?: GoalAllocationPlan["monthlyGoalBudgetMode"];
}): GoalAllocationPlan {
  const safeBudget = Math.max(0, Math.floor(monthlyGoalBudget));
  const normalizedGoals = goals;
  const goalMetrics = normalizedGoals.map((goal, index) => {
    const horizonMonths = getGoalHorizonMonths(goal.horizon);
    const targetAmount = getGoalTargetAmount(goal, exactValues, goal.isPrimary === true || index === 0);
    const currentAmount = Math.max(0, goal.currentAmount ?? 0);
    const remainingAmount =
      targetAmount !== null ? Math.max(targetAmount - currentAmount, 0) : null;
    const progressPercentage =
      targetAmount !== null && targetAmount > 0
        ? Math.min((currentAmount / targetAmount) * 100, 100)
        : null;
    const requiredMonthlyContribution =
      remainingAmount !== null && horizonMonths !== null && horizonMonths > 0
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
  const recommendedContributions = distributeRecommendedContributions(
    goalMetrics
      .filter((goalMetric) => goalMetric.score > 0)
      .map((goalMetric) => ({
        goalId: goalMetric.goal.id,
        score: goalMetric.score
      })),
    safeBudget
  );
  const allocations = goalMetrics.map((goalMetric) => {
    const goalIsInactive =
      goalMetric.goal.status === "completed" || goalMetric.goal.status === "paused";
    const recommendedMonthlyContribution =
      recommendedContributions.get(goalMetric.goal.id) ?? 0;
    const manualContribution = safeNonNegative(goalMetric.goal.manualMonthlyContribution);
    const monthlyContribution = goalIsInactive
      ? 0
      : manualContribution ?? recommendedMonthlyContribution;
    const estimatedMonthsToGoal =
      goalMetric.remainingAmount !== null && monthlyContribution > 0
        ? Math.ceil(goalMetric.remainingAmount / monthlyContribution)
        : null;
    const contributionMode: GoalAllocation["contributionMode"] =
      !goalIsInactive && manualContribution !== null ? "manual" : "recommended";
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
  exactValues: ExactFinancialValues = {}
) {
  const manualGoalBudget = safeNonNegative(onboarding.goalMonthlyBudget);

  return getGoalAllocationPlan({
    exactValues,
    goals: getOnboardingGoals(onboarding),
    monthlyGoalBudget: manualGoalBudget ?? monthlyGoalBudget,
    monthlyGoalBudgetMode: manualGoalBudget !== null ? "manual" : "recommended"
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
