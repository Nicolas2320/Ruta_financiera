import { getMonthsUntilTargetMonth } from "./monthYear";

export type GoalBudgetCandidate = {
  currentAmount?: number | null;
  goalId: string;
  isPrimary?: boolean;
  remainingAmount?: number | null;
  status?: "active" | "paused" | "completed";
  targetAmount?: number | null;
  targetMonth?: string | null;
  title: string;
};

export type GoalBudgetAllocation = {
  amount: number;
  goalId: string;
  title: string;
};

export const PRIMARY_GOAL_WEIGHT_MULTIPLIER = 1.5;
const FALLBACK_HORIZON_MONTHS = 12;

function getRemainingAmount(goal: GoalBudgetCandidate) {
  if (typeof goal.remainingAmount === "number" && Number.isFinite(goal.remainingAmount)) {
    return Math.max(0, Math.floor(goal.remainingAmount));
  }

  if (typeof goal.targetAmount === "number" && Number.isFinite(goal.targetAmount)) {
    return Math.max(
      0,
      Math.floor(goal.targetAmount - Math.max(0, goal.currentAmount ?? 0))
    );
  }

  return null;
}

function getReferenceDate(referenceDate: Date | string | undefined) {
  if (referenceDate instanceof Date) {
    return referenceDate;
  }

  if (typeof referenceDate === "string") {
    const parsedDate = new Date(referenceDate);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return new Date();
}

function getGoalWeights(
  goals: GoalBudgetCandidate[],
  referenceDate: Date | string | undefined
) {
  const primaryGoal = goals.find((goal) => goal.isPrimary) ?? goals[0] ?? null;

  if (!primaryGoal) {
    return new Map<string, number>();
  }

  const normalizedReferenceDate = getReferenceDate(referenceDate);

  return new Map(
    goals.map((goal) => {
      const remainingAmount = getRemainingAmount(goal) ?? 0;
      const monthsUntilTarget = getMonthsUntilTargetMonth(
        goal.targetMonth,
        normalizedReferenceDate
      );
      const planningMonths = Math.max(
        1,
        monthsUntilTarget ?? FALLBACK_HORIZON_MONTHS
      );
      const monthlyNeed = Math.max(1, remainingAmount / planningMonths);
      const priorityMultiplier =
        goal.goalId === primaryGoal.goalId
          ? PRIMARY_GOAL_WEIGHT_MULTIPLIER
          : 1;

      return [goal.goalId, monthlyNeed * priorityMultiplier] as const;
    })
  );
}

function allocateWeightedBudget(
  goals: GoalBudgetCandidate[],
  weights: Map<string, number>,
  monthlyBudget: number
) {
  const allocations = new Map(goals.map((goal) => [goal.goalId, 0]));
  const safeBudget = Math.max(0, Math.floor(monthlyBudget));
  const totalWeight = goals.reduce(
    (total, goal) => total + (weights.get(goal.goalId) ?? 0),
    0
  );
  let plannedAmount = 0;
  let assignedAmount = 0;

  goals.forEach((goal, index) => {
    const remainingAmount = getRemainingAmount(goal);
    const weightedAmount =
      index === goals.length - 1
        ? safeBudget - plannedAmount
        : Math.floor(
            safeBudget *
              (totalWeight > 0
                ? (weights.get(goal.goalId) ?? 0) / totalWeight
                : 1 / goals.length)
          );
    const amount = Math.min(
      remainingAmount ?? Number.POSITIVE_INFINITY,
      Math.max(0, weightedAmount)
    );

    allocations.set(goal.goalId, amount);
    plannedAmount += weightedAmount;
    assignedAmount += amount;
  });

  return {
    allocations,
    unassignedAmount: Math.max(0, safeBudget - assignedAmount)
  };
}

export function allocateMonthlyGoalBudget({
  goals,
  monthlyBudget,
  referenceDate
}: {
  goals: GoalBudgetCandidate[];
  monthlyBudget: number;
  referenceDate?: Date | string;
}) {
  const activeGoals = goals.filter(
    (goal) =>
      goal.status !== "completed" &&
      goal.status !== "paused" &&
      getRemainingAmount(goal) !== 0
  );
  const weights = getGoalWeights(activeGoals, referenceDate);
  const result = allocateWeightedBudget(activeGoals, weights, monthlyBudget);

  return {
    allocations: activeGoals
      .map<GoalBudgetAllocation>((goal) => ({
        amount: result.allocations.get(goal.goalId) ?? 0,
        goalId: goal.goalId,
        title: goal.title
      }))
      .filter((allocation) => allocation.amount > 0),
    unassignedAmount: result.unassignedAmount
  };
}
