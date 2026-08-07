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
  goalProjections: GoalDistributionProjection[];
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
    badge: "Sin repartir",
    description:
      "Proyecta las cuotas de deuda que registraste. Los aportes hechos a tus metas actualizan su avance, pero no se repiten como aportes mensuales."
  },
  reduce_interest: {
    badge: "Solo deudas",
    description:
      "Mantiene las cuotas requeridas y usa el dinero disponible para adelantar el pago de tus deudas."
  },
  accelerate_goal: {
    badge: "Solo metas",
    description:
      "Mantiene las cuotas requeridas y reparte el dinero disponible según el saldo, la fecha y la prioridad de cada meta."
  },
  split_debt_goal: {
    badge: "Deudas y metas",
    description:
      "Mantiene las cuotas requeridas y reparte el dinero disponible entre deudas y todas tus metas activas."
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
  goal,
  input,
  timeline
}: {
  goal: ProjectionGoalInput | null;
  input: FinancialProjectionInput;
  timeline: FinancialScenarioTimeline;
}): GoalDistributionProjection | null {
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
  const goalCompletionMonth = timeline.goalCompletionMonths[goal.id] ?? null;
  const completionMonth = goalCompletionMonth
    ? timeline.months.find((month) => month.month === goalCompletionMonth)
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
  const visibleIssues = scenario.issues.filter(
    (issue) => issue.code !== "unknown_interest_rate"
  );
  const timeline = buildFinancialScenarioTimeline({ input, scenario });
  const debtSharePercent =
    scenario.debtShare === null ? null : Math.round(scenario.debtShare * 100);
  const badge =
    scenario.id === "split_debt_goal" && debtSharePercent !== null
      ? `${debtSharePercent}% deudas · ${100 - debtSharePercent}% metas`
      : copy.badge;
  const goalProjections = timeline.trackedGoals
    .map((trackedGoal) =>
      getGoalProjection({
        goal: input.goals.find((goal) => goal.id === trackedGoal.goalId) ?? null,
        input,
        timeline
      })
    )
    .filter((projection): projection is GoalDistributionProjection => projection !== null);
  const primaryGoal = getGoalByAllocation(input, scenario);

  return {
    badge,
    baseDebtPayments: sumBaseDebtPayments(scenario),
    description: copy.description,
    debtSharePercent,
    extraDebtPayment: sumExtraDebtPayments(scenario),
    goalContribution: sumGoalContributions(scenario),
    goalProjection:
      getGoalProjection({ goal: primaryGoal, input, timeline }) ?? goalProjections[0] ?? null,
    goalProjections,
    id: scenario.id,
    issueCodes: visibleIssues.map((issue) => issue.code),
    issueMessages: visibleIssues.map((issue) => issue.message),
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
