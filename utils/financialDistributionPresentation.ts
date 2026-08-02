import type {
  DistributionScenario,
  DistributionScenarioSet,
  DistributionStrategyId
} from "./financialDistribution";
import type {
  FinancialProjectionInput,
  ProjectionGoalInput
} from "./financialProjectionInput";
import {
  buildFinancialScenarioTimeline,
  type FinancialScenarioTimeline
} from "./financialTimeline";
import { getMonthsUntilTargetMonth } from "./monthYear";

export type GoalDistributionProjection = {
  amountAtTargetMonth: number;
  estimatedMonthsToTarget: number | null;
  goalId: string;
  goalTitle: string;
  monthsUntilTarget: number | null;
  targetAmount: number;
  targetGapAtTargetMonth: number;
  targetMonth: string | null;
};

export type DistributionScenarioPresentation = {
  badge: string;
  baseDebtPayments: number;
  description: string;
  debtSharePercent: number | null;
  extraDebtPayment: number;
  goalContribution: number;
  goalProjection: GoalDistributionProjection | null;
  id: DistributionStrategyId;
  issueCodes: DistributionScenario["issues"][number]["code"][];
  issueMessages: string[];
  label: string;
  monthlyBalance: number | null;
  protectedMargin: number;
  status: DistributionScenario["status"];
  targetDebtTitles: string[];
  timeline: FinancialScenarioTimeline;
  unassignedAmount: number;
};

const scenarioCopy: Record<
  DistributionStrategyId,
  { badge: string; description: string }
> = {
  current_reference: {
    badge: "Referencia",
    description:
      "Mantiene las cuotas y aportes que ya registraste. No decide un destino nuevo para el dinero libre."
  },
  reduce_interest: {
    badge: "Deuda",
    description:
      "Mantiene las cuotas requeridas y dirige el dinero disponible a las deudas con mayor tasa conocida."
  },
  accelerate_goal: {
    badge: "Meta",
    description:
      "Mantiene las cuotas requeridas y dirige el dinero disponible a una meta activa, sin asumir un préstamo nuevo."
  },
  split_debt_goal: {
    badge: "Reparto ajustable",
    description:
      "Mantiene las cuotas requeridas y reparte el dinero disponible entre una deuda costosa y una meta activa."
  }
};

function sumBaseDebtPayments(scenario: DistributionScenario) {
  return scenario.debtAllocations.reduce(
    (total, allocation) => total + allocation.basePayment,
    0
  );
}

function sumExtraDebtPayments(scenario: DistributionScenario) {
  return scenario.debtAllocations.reduce(
    (total, allocation) => total + allocation.extraPayment,
    0
  );
}

function sumGoalContributions(scenario: DistributionScenario) {
  return scenario.goalAllocations.reduce(
    (total, allocation) => total + allocation.amount,
    0
  );
}

function getGoalByAllocation(
  input: FinancialProjectionInput,
  scenario: DistributionScenario
): ProjectionGoalInput | null {
  const allocation = scenario.goalAllocations[0];

  if (!allocation) {
    return null;
  }

  return input.goals.find((goal) => goal.id === allocation.goalId) ?? null;
}

function getGoalProjection({
  input,
  scenario,
  timeline
}: {
  input: FinancialProjectionInput;
  scenario: DistributionScenario;
  timeline: FinancialScenarioTimeline;
}): GoalDistributionProjection | null {
  const goal = getGoalByAllocation(input, scenario);

  if (!goal || goal.targetAmount === null || timeline.months.length === 0) {
    return null;
  }

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const referenceDate = new Date(`${input.asOfDate}T12:00:00`);
  const monthsUntilTarget = getMonthsUntilTargetMonth(goal.targetMonth, referenceDate);
  const contributionsThroughTarget = timeline.months
    .filter((month) => !goal.targetMonth || month.month <= goal.targetMonth)
    .flatMap((month) => month.goalContributions)
    .filter((contribution) => contribution.goalId === goal.id);
  const amountAtTargetMonth =
    monthsUntilTarget !== null && monthsUntilTarget <= 0
      ? goal.currentAmount
      : contributionsThroughTarget.at(-1)?.endingAmount ?? goal.currentAmount;
  const completionMonth = timeline.goalCompletionMonth
    ? timeline.months.find((month) => month.month === timeline.goalCompletionMonth)
    : null;

  return {
    amountAtTargetMonth,
    estimatedMonthsToTarget:
      remainingAmount <= 0 ? 0 : completionMonth?.index ?? null,
    goalId: goal.id,
    goalTitle: goal.title,
    monthsUntilTarget,
    targetAmount: goal.targetAmount,
    targetGapAtTargetMonth: Math.max(0, goal.targetAmount - amountAtTargetMonth),
    targetMonth: goal.targetMonth
  };
}

export function presentDistributionScenario({
  input,
  scenario
}: {
  input: FinancialProjectionInput;
  scenario: DistributionScenario;
}): DistributionScenarioPresentation {
  const copy = scenarioCopy[scenario.id];
  const timeline = buildFinancialScenarioTimeline({ input, scenario });
  const debtSharePercent =
    scenario.debtShare === null ? null : Math.round(scenario.debtShare * 100);

  return {
    badge:
      debtSharePercent === null
        ? copy.badge
        : `${debtSharePercent}% deuda · ${100 - debtSharePercent}% meta`,
    baseDebtPayments: sumBaseDebtPayments(scenario),
    description: copy.description,
    debtSharePercent,
    extraDebtPayment: sumExtraDebtPayments(scenario),
    goalContribution: sumGoalContributions(scenario),
    goalProjection: getGoalProjection({ input, scenario, timeline }),
    id: scenario.id,
    issueCodes: scenario.issues.map((issue) => issue.code),
    issueMessages: scenario.issues.map((issue) => issue.message),
    label: scenario.label,
    monthlyBalance: scenario.monthlyBalance,
    protectedMargin: scenario.protectedMargin.amount,
    status: scenario.status,
    targetDebtTitles: scenario.debtAllocations
      .filter((allocation) => allocation.extraPayment > 0)
      .map((allocation) => allocation.title),
    timeline,
    unassignedAmount: scenario.unassignedAmount
  };
}

export function presentDistributionScenarios({
  input,
  scenarios
}: {
  input: FinancialProjectionInput;
  scenarios: DistributionScenarioSet;
}) {
  return [
    scenarios.currentReference,
    scenarios.reduceInterest,
    scenarios.accelerateGoal,
    scenarios.splitDebtGoal
  ].map((scenario) => presentDistributionScenario({ input, scenario }));
}
