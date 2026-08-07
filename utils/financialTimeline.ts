import {
  calculateProtectedMargin,
  type DistributionScenario,
  type DistributionScenarioStatus,
  type ProtectedMarginPreference
} from "./financialDistribution";
import type {
  FinancialProjectionInput,
  ProjectionDebtInput,
  ProjectionGoalInput
} from "./financialProjectionInput";
import { allocateMonthlyGoalBudget } from "./goalAllocationPolicy";

export type TimelineDebtPayment = {
  annualInterestRate: number | null;
  basePayment: number;
  debtId: string;
  endingBalance: number | null;
  extraPayment: number;
  interestCharged: number | null;
  paidOff: boolean;
  startingBalance: number | null;
  title: string;
  totalPayment: number;
};

export type TimelineGoalContribution = {
  amount: number;
  endingAmount: number;
  goalId: string;
  reached: boolean;
  startingAmount: number;
  title: string;
};

export type FinancialTimelineMonth = {
  baseDebtPayments: number;
  debtPayments: TimelineDebtPayment[];
  endingKnownDebtBalance: number;
  extraDebtPayments: number;
  goalContributions: TimelineGoalContribution[];
  goalContributionTotal: number;
  goalAmounts: Record<string, number>;
  index: number;
  interestCharged: number;
  month: string;
  monthlyBalance: number;
  newlyPaidDebtIds: string[];
  protectedMargin: number;
  releasedPaymentNextMonth: number;
  trackedGoalAmount: number | null;
  unassignedAmount: number;
};

export type TimelineTrackedGoal = {
  currentAmount: number;
  goalId: string;
  targetAmount: number | null;
  targetMonth: string | null;
  title: string;
};

export type FinancialScenarioTimeline = {
  allDebtBalancesKnown: boolean;
  allKnownDebtsPaidMonth: string | null;
  asOfMonth: string;
  goalCompletionMonth: string | null;
  goalCompletionMonths: Record<string, string>;
  hasUnknownInterestRates: boolean;
  months: FinancialTimelineMonth[];
  status: DistributionScenarioStatus;
  totalInterestCharged: number;
  trackedGoal: TimelineTrackedGoal | null;
  trackedGoals: TimelineTrackedGoal[];
};

export function getFinancialTimelineDisplayMonths(
  timeline: FinancialScenarioTimeline
): FinancialTimelineMonth[] {
  const firstProjectedMonth = timeline.months[0];

  if (!firstProjectedMonth) {
    return [];
  }

  const startingDebtPayments = firstProjectedMonth.debtPayments.map((payment) => ({
    ...payment,
    basePayment: 0,
    endingBalance: payment.startingBalance,
    extraPayment: 0,
    interestCharged: payment.startingBalance === null ? null : 0,
    paidOff: false,
    totalPayment: 0
  }));
  const startingKnownDebtBalance = startingDebtPayments.reduce(
    (total, payment) => total + (payment.startingBalance ?? 0),
    0
  );
  const startingMonth: FinancialTimelineMonth = {
    baseDebtPayments: 0,
    debtPayments: startingDebtPayments,
    endingKnownDebtBalance: startingKnownDebtBalance,
    extraDebtPayments: 0,
    goalContributions: [],
    goalContributionTotal: 0,
    goalAmounts: Object.fromEntries(
      timeline.trackedGoals.map((goal) => [goal.goalId, goal.currentAmount])
    ),
    index: 0,
    interestCharged: 0,
    month: timeline.asOfMonth,
    monthlyBalance: 0,
    newlyPaidDebtIds: [],
    protectedMargin: 0,
    releasedPaymentNextMonth: 0,
    trackedGoalAmount: timeline.trackedGoal?.currentAmount ?? null,
    unassignedAmount: 0
  };

  return [startingMonth, ...timeline.months];
}

type TimelineDebtState = {
  balance: number | null;
  debt: ProjectionDebtInput;
};

type TimelineGoalState = {
  amount: number;
  goal: ProjectionGoalInput;
};

function safeNonNegative(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function getOperatingCosts(input: FinancialProjectionInput) {
  const mainExpenses = safeNonNegative(input.cashflow.baselineMonthlyExpenses);
  const smallExpenses = safeNonNegative(input.cashflow.smallMonthlyExpenses);

  return mainExpenses === null || smallExpenses === null
    ? null
    : mainExpenses + smallExpenses;
}

function getMonthlyInterestRate(annualInterestRate: number | null) {
  if (annualInterestRate === null || annualInterestRate <= 0) {
    return 0;
  }

  return Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;
}

function getProjectionMonth(asOfDate: string, monthIndex: number) {
  const [yearValue, monthValue] = asOfDate.split("-").map(Number);
  const baseYear = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
  const baseMonth = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getMonth();
  const projectedDate = new Date(Date.UTC(baseYear, baseMonth + monthIndex, 1));

  return `${projectedDate.getUTCFullYear()}-${String(projectedDate.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function buildGoalOnlyTimeline({
  asOfDate,
  goal,
  maxMonths = 120,
  monthlyContribution
}: {
  asOfDate: string;
  goal: ProjectionGoalInput;
  maxMonths?: number;
  monthlyContribution: number;
}): FinancialScenarioTimeline | null {
  const targetAmount = safeNonNegative(goal.targetAmount);
  const safeMonthlyContribution = safeNonNegative(monthlyContribution);

  if (
    targetAmount === null ||
    targetAmount <= 0 ||
    safeMonthlyContribution === null ||
    safeMonthlyContribution <= 0
  ) {
    return null;
  }

  const asOfMonth = getProjectionMonth(asOfDate, 0);
  const trackedGoal = {
    currentAmount: Math.max(0, goal.currentAmount),
    goalId: goal.id,
    targetAmount,
    targetMonth: goal.targetMonth,
    title: goal.title
  };
  const months: FinancialTimelineMonth[] = [];
  const safeMaxMonths = Math.max(1, Math.floor(maxMonths));
  let currentAmount = trackedGoal.currentAmount;
  let goalCompletionMonth = currentAmount >= targetAmount ? asOfMonth : null;

  for (let index = 1; index <= safeMaxMonths; index += 1) {
    const startingAmount = currentAmount;
    const amount =
      goalCompletionMonth === null
        ? Math.min(safeMonthlyContribution, Math.max(0, targetAmount - startingAmount))
        : 0;
    currentAmount += amount;
    const reached = currentAmount >= targetAmount;
    const month = getProjectionMonth(asOfDate, index);

    if (reached && goalCompletionMonth === null) {
      goalCompletionMonth = month;
    }

    months.push({
      baseDebtPayments: 0,
      debtPayments: [],
      endingKnownDebtBalance: 0,
      extraDebtPayments: 0,
      goalContributions: [
        {
          amount,
          endingAmount: currentAmount,
          goalId: goal.id,
          reached,
          startingAmount,
          title: goal.title
        }
      ],
      goalContributionTotal: amount,
      goalAmounts: { [goal.id]: currentAmount },
      index,
      interestCharged: 0,
      month,
      monthlyBalance: 0,
      newlyPaidDebtIds: [],
      protectedMargin: 0,
      releasedPaymentNextMonth: 0,
      trackedGoalAmount: currentAmount,
      unassignedAmount: 0
    });

    if (goalCompletionMonth !== null) {
      break;
    }
  }

  return {
    allDebtBalancesKnown: false,
    allKnownDebtsPaidMonth: null,
    asOfMonth,
    goalCompletionMonth,
    goalCompletionMonths: goalCompletionMonth ? { [goal.id]: goalCompletionMonth } : {},
    hasUnknownInterestRates: false,
    months,
    status: "ready",
    totalInterestCharged: 0,
    trackedGoal,
    trackedGoals: [trackedGoal]
  };
}

export function buildGoalsOnlyTimeline({
  asOfDate,
  goals,
  maxMonths = 120,
  monthlyBudget
}: {
  asOfDate: string;
  goals: ProjectionGoalInput[];
  maxMonths?: number;
  monthlyBudget: number;
}): FinancialScenarioTimeline | null {
  const activeGoals = getActiveGoals(goals).filter(
    (goal) => goal.targetAmount !== null && goal.targetAmount > goal.currentAmount
  );
  const safeMonthlyBudget = safeNonNegative(monthlyBudget);

  if (activeGoals.length === 0 || safeMonthlyBudget === null || safeMonthlyBudget <= 0) {
    return null;
  }

  const asOfMonth = getProjectionMonth(asOfDate, 0);
  const trackedGoals = activeGoals.map<TimelineTrackedGoal>((goal) => ({
    currentAmount: goal.currentAmount,
    goalId: goal.id,
    targetAmount: goal.targetAmount,
    targetMonth: goal.targetMonth,
    title: goal.title
  }));
  const trackedGoal = trackedGoals[0] ?? null;
  const goalStates = new Map(
    activeGoals.map((goal) => [
      goal.id,
      { amount: Math.max(0, goal.currentAmount), goal } satisfies TimelineGoalState
    ])
  );
  const goalCompletionMonths: Record<string, string> = {};
  const months: FinancialTimelineMonth[] = [];

  for (let index = 1; index <= Math.max(1, Math.floor(maxMonths)); index += 1) {
    const month = getProjectionMonth(asOfDate, index);
    const result = allocateToGoalStates({
      amount: safeMonthlyBudget,
      goalStates,
      referenceDate: `${getProjectionMonth(asOfDate, index - 1)}-01`
    });
    const goalContributionTotal = result.contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0
    );

    result.contributions.forEach((contribution) => {
      if (contribution.reached && !goalCompletionMonths[contribution.goalId]) {
        goalCompletionMonths[contribution.goalId] = month;
      }
    });

    const goalAmounts = Object.fromEntries(
      trackedGoals.map((goal) => [
        goal.goalId,
        goalStates.get(goal.goalId)?.amount ?? goal.currentAmount
      ])
    );

    months.push({
      baseDebtPayments: 0,
      debtPayments: [],
      endingKnownDebtBalance: 0,
      extraDebtPayments: 0,
      goalAmounts,
      goalContributions: result.contributions,
      goalContributionTotal,
      index,
      interestCharged: 0,
      month,
      monthlyBalance: result.unallocatedAmount,
      newlyPaidDebtIds: [],
      protectedMargin: 0,
      releasedPaymentNextMonth: 0,
      trackedGoalAmount: trackedGoal ? goalAmounts[trackedGoal.goalId] ?? null : null,
      unassignedAmount: result.unallocatedAmount
    });

    if (Object.keys(goalCompletionMonths).length === trackedGoals.length) {
      break;
    }
  }

  return {
    allDebtBalancesKnown: false,
    allKnownDebtsPaidMonth: null,
    asOfMonth,
    goalCompletionMonth: trackedGoal
      ? goalCompletionMonths[trackedGoal.goalId] ?? null
      : null,
    goalCompletionMonths,
    hasUnknownInterestRates: false,
    months,
    status: "ready",
    totalInterestCharged: 0,
    trackedGoal,
    trackedGoals
  };
}

function getProtectedMarginPreference(
  scenario: DistributionScenario
): ProtectedMarginPreference {
  if (scenario.protectedMargin.mode === "custom") {
    return {
      amount: scenario.protectedMargin.requestedAmount ?? scenario.protectedMargin.amount,
      mode: "custom"
    };
  }

  return { mode: scenario.protectedMargin.mode };
}

function getDebtBasePayment(debt: ProjectionDebtInput, scenario: DistributionScenario) {
  return scenario.id === "current_reference"
    ? debt.plannedMonthlyPayment
    : debt.requiredMonthlyPayment ?? 0;
}

function getActiveGoal(
  goals: ProjectionGoalInput[],
  scenario: DistributionScenario
) {
  const allocatedGoalId = scenario.goalAllocations[0]?.goalId;
  const activeGoals = goals.filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );

  return (
    activeGoals.find((goal) => goal.id === allocatedGoalId) ??
    activeGoals.find((goal) => goal.isPrimary) ??
    activeGoals[0] ??
    null
  );
}

function getActiveGoals(goals: ProjectionGoalInput[]) {
  const activeGoals = goals.filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );
  const primaryGoal = activeGoals.find((goal) => goal.isPrimary) ?? activeGoals[0] ?? null;

  return primaryGoal
    ? [primaryGoal, ...activeGoals.filter((goal) => goal.id !== primaryGoal.id)]
    : [];
}

function allocateToGoal({
  amount,
  goalState
}: {
  amount: number;
  goalState: TimelineGoalState | null;
}) {
  if (!goalState || goalState.goal.targetAmount === null) {
    return { allocatedAmount: 0, unallocatedAmount: amount };
  }

  const remainingAmount = Math.max(0, goalState.goal.targetAmount - goalState.amount);
  const allocatedAmount = Math.min(Math.max(0, amount), remainingAmount);
  goalState.amount += allocatedAmount;

  return {
    allocatedAmount,
    unallocatedAmount: Math.max(0, amount - allocatedAmount)
  };
}

function allocateToGoalStates({
  amount,
  goalStates,
  referenceDate
}: {
  amount: number;
  goalStates: Map<string, TimelineGoalState>;
  referenceDate: string;
}) {
  const result = allocateMonthlyGoalBudget({
    goals: [...goalStates.values()].map((state) => ({
      currentAmount: state.amount,
      goalId: state.goal.id,
      isPrimary: state.goal.isPrimary,
      status: state.goal.status,
      targetAmount: state.goal.targetAmount,
      targetMonth: state.goal.targetMonth,
      title: state.goal.title
    })),
    monthlyBudget: amount,
    referenceDate
  });
  const contributions: TimelineGoalContribution[] = [];

  result.allocations.forEach((allocation) => {
    const goalState = goalStates.get(allocation.goalId);

    if (!goalState) {
      return;
    }

    const startingAmount = goalState.amount;
    const allocationResult = allocateToGoal({
      amount: allocation.amount,
      goalState
    });

    if (allocationResult.allocatedAmount <= 0) {
      return;
    }

    contributions.push({
      amount: allocationResult.allocatedAmount,
      endingAmount: goalState.amount,
      goalId: goalState.goal.id,
      reached:
        goalState.goal.targetAmount !== null &&
        goalState.amount >= goalState.goal.targetAmount,
      startingAmount,
      title: goalState.goal.title
    });
  });

  return {
    contributions,
    unallocatedAmount: result.unassignedAmount
  };
}

function allocateExtraToDebts({
  amount,
  debtPayments,
  debtStates
}: {
  amount: number;
  debtPayments: TimelineDebtPayment[];
  debtStates: TimelineDebtState[];
}) {
  let unallocatedAmount = Math.max(0, amount);
  const paymentByDebtId = new Map(
    debtPayments.map((payment) => [payment.debtId, payment])
  );
  const eligibleStates = debtStates
    .filter(
      ({ balance }) => balance !== null && balance > 0
    )
    .sort((left, right) => {
      if (
        left.debt.annualInterestRate === null &&
        right.debt.annualInterestRate !== null
      ) {
        return 1;
      }

      if (
        right.debt.annualInterestRate === null &&
        left.debt.annualInterestRate !== null
      ) {
        return -1;
      }

      const rateDifference =
        (right.debt.annualInterestRate ?? 0) - (left.debt.annualInterestRate ?? 0);

      if (rateDifference !== 0) {
        return rateDifference;
      }

      if (left.debt.status === "overdue" && right.debt.status !== "overdue") return -1;
      if (right.debt.status === "overdue" && left.debt.status !== "overdue") return 1;
      return left.debt.id.localeCompare(right.debt.id);
    });

  eligibleStates.forEach((state) => {
    if (unallocatedAmount <= 0 || state.balance === null) {
      return;
    }

    const payment = paymentByDebtId.get(state.debt.id);
    const extraPayment = Math.min(unallocatedAmount, state.balance);
    state.balance -= extraPayment;
    unallocatedAmount -= extraPayment;

    if (payment) {
      payment.extraPayment += extraPayment;
      payment.totalPayment += extraPayment;
      payment.endingBalance = state.balance;
    }
  });

  return unallocatedAmount;
}

export function buildFinancialScenarioTimeline({
  input,
  maxMonths = 120,
  scenario
}: {
  input: FinancialProjectionInput;
  maxMonths?: number;
  scenario: DistributionScenario;
}): FinancialScenarioTimeline {
  const monthlyIncome = safeNonNegative(input.cashflow.monthlyIncome);
  const asOfMonth = getProjectionMonth(input.asOfDate, 0);
  const operatingCosts = getOperatingCosts(input);
  const allDebtBalancesKnown = input.debts.every((debt) => debt.remainingAmount !== null);
  const hasUnknownInterestRates = input.debts.some(
    (debt) => debt.annualInterestRate === null
  );
  const activeGoals = getActiveGoals(input.goals);
  const trackedGoal = activeGoals[0] ?? getActiveGoal(input.goals, scenario);
  const trackedGoalSummary = trackedGoal
    ? {
        currentAmount: trackedGoal.currentAmount,
        goalId: trackedGoal.id,
        targetAmount: trackedGoal.targetAmount,
        targetMonth: trackedGoal.targetMonth,
        title: trackedGoal.title
      }
    : null;
  const trackedGoalSummaries = activeGoals.map((goal) => ({
    currentAmount: goal.currentAmount,
    goalId: goal.id,
    targetAmount: goal.targetAmount,
    targetMonth: goal.targetMonth,
    title: goal.title
  }));

  if (scenario.status !== "ready" || monthlyIncome === null || operatingCosts === null) {
    return {
      allDebtBalancesKnown,
      allKnownDebtsPaidMonth: null,
      asOfMonth,
      goalCompletionMonth: null,
      goalCompletionMonths: {},
      hasUnknownInterestRates,
      months: [],
      status: scenario.status,
      totalInterestCharged: 0,
      trackedGoal: trackedGoalSummary,
      trackedGoals: trackedGoalSummaries
    };
  }

  const debtStates: TimelineDebtState[] = input.debts.map((debt) => ({
    balance: safeNonNegative(debt.remainingAmount),
    debt
  }));
  const goalStates = new Map(
    input.goals.map((goal) => [
      goal.id,
      { amount: Math.max(0, goal.currentAmount), goal } satisfies TimelineGoalState
    ])
  );
  const selectedGoalState = trackedGoal ? goalStates.get(trackedGoal.id) ?? null : null;
  const scenarioGoalIds = new Set(
    scenario.id === "accelerate_goal" || scenario.id === "split_debt_goal"
      ? activeGoals.map((goal) => goal.id)
      : scenario.id === "current_reference"
        ? scenario.goalAllocations.map((allocation) => allocation.goalId)
        : []
  );
  const preference = getProtectedMarginPreference(scenario);
  const paidDebtIds = new Set<string>();
  const months: FinancialTimelineMonth[] = [];
  let allKnownDebtsPaidMonth: string | null = null;
  let goalCompletionMonth: string | null = null;
  const goalCompletionMonths: Record<string, string> = {};
  let totalInterestCharged = 0;

  for (let index = 1; index <= Math.max(1, maxMonths); index += 1) {
    const month = getProjectionMonth(input.asOfDate, index);
    const debtPayments = debtStates.map<TimelineDebtPayment>((state) => {
      const startingBalance = state.balance;
      const monthlyRate = getMonthlyInterestRate(state.debt.annualInterestRate);
      const interestCharged =
        startingBalance === null ? null : Math.round(startingBalance * monthlyRate);

      if (state.balance !== null) {
        state.balance += interestCharged ?? 0;
      }

      const requestedBasePayment = Math.max(0, getDebtBasePayment(state.debt, scenario));
      const basePayment =
        state.balance === null
          ? requestedBasePayment
          : Math.min(requestedBasePayment, state.balance);

      if (state.balance !== null) {
        state.balance -= basePayment;
      }

      return {
        annualInterestRate: state.debt.annualInterestRate,
        basePayment,
        debtId: state.debt.id,
        endingBalance: state.balance,
        extraPayment: 0,
        interestCharged,
        paidOff: false,
        startingBalance,
        title: state.debt.title,
        totalPayment: basePayment
      };
    });
    const detailedBaseDebtPayments = debtPayments.reduce(
      (total, payment) => total + payment.basePayment,
      0
    );
    const baseDebtPayments =
      detailedBaseDebtPayments +
      input.cashflow.unitemizedRequiredDebtPaymentsTotal;
    let protectedMargin = 0;
    let unassignedAmount = 0;
    const goalContributions: TimelineGoalContribution[] = [];

    if (scenario.id === "current_reference") {
      scenario.goalAllocations.forEach((allocation) => {
        const goalState = goalStates.get(allocation.goalId);
        const startingAmount = goalState?.amount ?? 0;
        const result = allocateToGoal({
          amount: Math.max(0, allocation.amount),
          goalState: goalState ?? null
        });

        if (result.allocatedAmount > 0 && goalState) {
          goalContributions.push({
            amount: result.allocatedAmount,
            endingAmount: goalState.amount,
            goalId: goalState.goal.id,
            reached:
              goalState.goal.targetAmount !== null &&
              goalState.amount >= goalState.goal.targetAmount,
            startingAmount,
            title: goalState.goal.title
          });
        }
      });

      const goalContributionTotal = goalContributions.reduce(
        (total, contribution) => total + contribution.amount,
        0
      );
      const surplusBeforeProtection = Math.max(
        0,
        monthlyIncome - operatingCosts - baseDebtPayments - goalContributionTotal
      );
      protectedMargin = calculateProtectedMargin({
        preference,
        surplusBeforeProtection
      }).result.amount;
      unassignedAmount = Math.max(0, surplusBeforeProtection - protectedMargin);
    } else {
      const surplusBeforeProtection = Math.max(
        0,
        monthlyIncome - operatingCosts - baseDebtPayments
      );
      protectedMargin = calculateProtectedMargin({
        preference,
        surplusBeforeProtection
      }).result.amount;
      let distributableAmount = Math.max(
        0,
        surplusBeforeProtection - protectedMargin
      );

      if (scenario.id === "reduce_interest") {
        distributableAmount = allocateExtraToDebts({
          amount: distributableAmount,
          debtPayments,
          debtStates
        });
      } else if (scenario.id === "accelerate_goal") {
        const goalResult = allocateToGoalStates({
          amount: distributableAmount,
          goalStates,
          referenceDate: `${getProjectionMonth(input.asOfDate, index - 1)}-01`
        });
        goalContributions.push(...goalResult.contributions);
        distributableAmount = goalResult.unallocatedAmount;
      } else {
        const debtShare = scenario.debtShare ?? 0.5;
        const debtBudget = distributableAmount * debtShare;
        const goalBudget = distributableAmount - debtBudget;
        const debtRemainder = allocateExtraToDebts({
          amount: debtBudget,
          debtPayments,
          debtStates
        });
        const goalResult = allocateToGoalStates({
          amount: goalBudget + debtRemainder,
          goalStates,
          referenceDate: `${getProjectionMonth(input.asOfDate, index - 1)}-01`
        });
        goalContributions.push(...goalResult.contributions);
        distributableAmount = allocateExtraToDebts({
          amount: goalResult.unallocatedAmount,
          debtPayments,
          debtStates
        });
      }

      unassignedAmount = distributableAmount;
    }

    const newlyPaidDebtIds: string[] = [];
    let releasedPaymentNextMonth = 0;

    debtStates.forEach((state) => {
      const payment = debtPayments.find((item) => item.debtId === state.debt.id);

      if (!payment || state.balance === null || state.balance > 0 || paidDebtIds.has(state.debt.id)) {
        return;
      }

      paidDebtIds.add(state.debt.id);
      payment.paidOff = true;
      newlyPaidDebtIds.push(state.debt.id);
      releasedPaymentNextMonth += Math.max(0, getDebtBasePayment(state.debt, scenario));
    });

    const goalContributionTotal = goalContributions.reduce(
      (total, contribution) => total + contribution.amount,
      0
    );
    const extraDebtPayments = debtPayments.reduce(
      (total, payment) => total + payment.extraPayment,
      0
    );
    const interestCharged = debtPayments.reduce(
      (total, payment) => total + (payment.interestCharged ?? 0),
      0
    );
    const endingKnownDebtBalance = debtStates.reduce(
      (total, state) => total + (state.balance ?? 0),
      0
    );
    const totalDebtPayments = baseDebtPayments + extraDebtPayments;
    const monthlyBalance =
      monthlyIncome - operatingCosts - totalDebtPayments - goalContributionTotal;

    totalInterestCharged += interestCharged;
    months.push({
      baseDebtPayments,
      debtPayments,
      endingKnownDebtBalance,
      extraDebtPayments,
      goalContributions,
      goalContributionTotal,
      goalAmounts: Object.fromEntries(
        trackedGoalSummaries.map((goal) => [
          goal.goalId,
          goalStates.get(goal.goalId)?.amount ?? goal.currentAmount
        ])
      ),
      index,
      interestCharged,
      month,
      monthlyBalance,
      newlyPaidDebtIds,
      protectedMargin,
      releasedPaymentNextMonth,
      trackedGoalAmount: selectedGoalState?.amount ?? null,
      unassignedAmount
    });

    trackedGoalSummaries.forEach((goal) => {
      const goalState = goalStates.get(goal.goalId);

      if (
        !goalCompletionMonths[goal.goalId] &&
        goal.targetAmount !== null &&
        goalState &&
        goalState.amount >= goal.targetAmount
      ) {
        goalCompletionMonths[goal.goalId] = month;
      }
    });
    goalCompletionMonth = trackedGoalSummary
      ? goalCompletionMonths[trackedGoalSummary.goalId] ?? null
      : null;

    if (
      !allKnownDebtsPaidMonth &&
      input.debts.length > 0 &&
      allDebtBalancesKnown &&
      debtStates.every((state) => state.balance === 0)
    ) {
      allKnownDebtsPaidMonth = month;
    }

    const selectedGoalsFinished = [...scenarioGoalIds].every((goalId) => {
      const goalState = goalStates.get(goalId);
      return (
        !goalState ||
        goalState.goal.targetAmount === null ||
        goalState.amount >= goalState.goal.targetAmount
      );
    });
    const allDebtsFinished =
      allDebtBalancesKnown && debtStates.every((state) => state.balance === 0);

    if (selectedGoalsFinished && allDebtsFinished) {
      break;
    }
  }

  return {
    allDebtBalancesKnown,
    allKnownDebtsPaidMonth,
    asOfMonth,
    goalCompletionMonth,
    goalCompletionMonths,
    hasUnknownInterestRates,
    months,
    status: scenario.status,
    totalInterestCharged,
    trackedGoal: trackedGoalSummary,
    trackedGoals: trackedGoalSummaries
  };
}
