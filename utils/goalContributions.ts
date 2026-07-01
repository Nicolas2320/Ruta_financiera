import type {
  FinancialGoal,
  FinancialGoalContribution,
  FinancialGoalStatus
} from "../types/financial";

type GoalContributionInput = {
  amount: number;
  date?: string;
  id?: string;
  source?: FinancialGoalContribution["source"];
  sourceProgressId?: string | null;
};

function getSafeAmount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function getContributionId(input: GoalContributionInput) {
  if (input.id) {
    return input.id;
  }

  if (input.sourceProgressId) {
    return `plan-contribution-${input.sourceProgressId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  return `contribution-${Date.now()}`;
}

function isLinkedContribution(
  contribution: FinancialGoalContribution,
  id: string,
  sourceProgressId: string | null | undefined
) {
  return (
    contribution.id === id ||
    (Boolean(sourceProgressId) && contribution.sourceProgressId === sourceProgressId)
  );
}

function getStatusAfterContribution(
  goal: FinancialGoal,
  currentAmount: number
): FinancialGoalStatus {
  if (goal.status === "paused") {
    return "paused";
  }

  if (
    typeof goal.targetAmount === "number" &&
    Number.isFinite(goal.targetAmount) &&
    goal.targetAmount > 0
  ) {
    return currentAmount >= goal.targetAmount ? "completed" : "active";
  }

  return goal.status === "completed" ? "completed" : "active";
}

export function applyGoalContribution(
  goals: FinancialGoal[],
  goalId: string,
  input: GoalContributionInput
) {
  const requestedAmount = getSafeAmount(input.amount);

  if (requestedAmount <= 0) {
    return goals;
  }

  const contributionId = getContributionId(input);

  return goals.map((goal) => {
    if (goal.id !== goalId) {
      return goal;
    }

    const currentContributions = goal.contributions ?? [];
    const existingContribution = currentContributions.find((contribution) =>
      isLinkedContribution(contribution, contributionId, input.sourceProgressId)
    );
    const baseCurrentAmount = Math.max(
      0,
      (goal.currentAmount ?? 0) - (existingContribution?.amount ?? 0)
    );
    const remainingAmount =
      typeof goal.targetAmount === "number" && Number.isFinite(goal.targetAmount)
        ? Math.max(goal.targetAmount - baseCurrentAmount, 0)
        : null;
    const appliedAmount =
      remainingAmount !== null && remainingAmount > 0
        ? Math.min(requestedAmount, remainingAmount)
        : remainingAmount === 0
          ? 0
          : requestedAmount;

    if (appliedAmount <= 0) {
      return goal;
    }

    const currentAmount = baseCurrentAmount + appliedAmount;
    const contributions = [
      {
        id: contributionId,
        amount: appliedAmount,
        date: input.date ?? existingContribution?.date ?? new Date().toISOString(),
        source: existingContribution?.source ?? input.source ?? "manual",
        sourceProgressId: input.sourceProgressId ?? existingContribution?.sourceProgressId ?? null
      },
      ...currentContributions.filter(
        (contribution) =>
          !isLinkedContribution(contribution, contributionId, input.sourceProgressId)
      )
    ];
    const status = getStatusAfterContribution(goal, currentAmount);

    return {
      ...goal,
      currentAmount,
      contributions,
      manualMonthlyContribution: status === "completed" ? 0 : goal.manualMonthlyContribution,
      status
    };
  });
}

export function removeGoalContributionBySource(
  goals: FinancialGoal[],
  goalId: string,
  sourceProgressId: string
) {
  const contributionId = getContributionId({
    amount: 1,
    sourceProgressId
  });

  return goals.map((goal) => {
    if (goal.id !== goalId) {
      return goal;
    }

    const currentContributions = goal.contributions ?? [];
    const contributionToRemove = currentContributions.find((contribution) =>
      isLinkedContribution(contribution, contributionId, sourceProgressId)
    );

    if (!contributionToRemove) {
      return goal;
    }

    if (contributionToRemove.source !== "monthly_plan") {
      return {
        ...goal,
        contributions: currentContributions.map((contribution) =>
          isLinkedContribution(contribution, contributionId, sourceProgressId)
            ? {
                ...contribution,
                sourceProgressId: null
              }
            : contribution
        )
      };
    }

    const currentAmount = Math.max(0, (goal.currentAmount ?? 0) - contributionToRemove.amount);
    const status = getStatusAfterContribution(goal, currentAmount);

    return {
      ...goal,
      currentAmount,
      contributions: currentContributions.filter(
        (contribution) =>
          !isLinkedContribution(contribution, contributionId, sourceProgressId)
      ),
      manualMonthlyContribution: status === "completed" ? 0 : goal.manualMonthlyContribution,
      status
    };
  });
}
