import type { DistributionStrategyId } from "./financialDistribution";
import type { DistributionScenarioPresentation } from "./financialDistributionPresentation";

export type DistributionComparisonCriterion = "debt" | "goal" | "interest";

export type DistributionComparisonRow = {
  bestCriteria: DistributionComparisonCriterion[];
  debtFreeMonth: string | null;
  goalCompletionMonth: string | null;
  hasUnknownInterestRates: boolean;
  id: DistributionStrategyId;
  label: string;
  peakMonthlyDebtPayment: number | null;
  status: DistributionScenarioPresentation["status"];
  totalInterestCharged: number | null;
};

function findEarliestMonth(values: Array<string | null>) {
  const comparableValues = values.filter((value): value is string => Boolean(value));
  return comparableValues.length > 0 ? [...comparableValues].sort()[0] : null;
}

function findLowestValue(values: number[]) {
  return values.length > 0 ? Math.min(...values) : null;
}

export function buildDistributionComparison(
  scenarios: DistributionScenarioPresentation[]
): DistributionComparisonRow[] {
  const readyScenarios = scenarios.filter(
    (scenario) => scenario.status === "ready" && scenario.timeline.months.length > 0
  );
  const earliestGoalMonth = findEarliestMonth(
    readyScenarios.map((scenario) => scenario.timeline.goalCompletionMonth)
  );
  const earliestDebtFreeMonth = findEarliestMonth(
    readyScenarios
      .filter((scenario) => scenario.timeline.allDebtBalancesKnown)
      .map((scenario) => scenario.timeline.allKnownDebtsPaidMonth)
  );
  const interestCandidates = readyScenarios.filter(
    (scenario) =>
      scenario.timeline.allDebtBalancesKnown &&
      scenario.timeline.allKnownDebtsPaidMonth !== null &&
      !scenario.timeline.hasUnknownInterestRates
  );
  const lowestInterest = findLowestValue(
    interestCandidates.map((scenario) => scenario.timeline.totalInterestCharged)
  );

  return scenarios.map((scenario) => {
    const timelineReady = scenario.status === "ready" && scenario.timeline.months.length > 0;
    const peakMonthlyDebtPayment = timelineReady
      ? Math.max(
          0,
          ...scenario.timeline.months.map(
            (month) => month.baseDebtPayments + month.extraDebtPayments
          )
        )
      : null;
    const bestCriteria: DistributionComparisonCriterion[] = [];

    if (
      earliestGoalMonth !== null &&
      scenario.timeline.goalCompletionMonth === earliestGoalMonth
    ) {
      bestCriteria.push("goal");
    }

    if (
      earliestDebtFreeMonth !== null &&
      scenario.timeline.allKnownDebtsPaidMonth === earliestDebtFreeMonth
    ) {
      bestCriteria.push("debt");
    }

    if (
      lowestInterest !== null &&
      interestCandidates.includes(scenario) &&
      scenario.timeline.totalInterestCharged === lowestInterest
    ) {
      bestCriteria.push("interest");
    }

    return {
      bestCriteria,
      debtFreeMonth: timelineReady ? scenario.timeline.allKnownDebtsPaidMonth : null,
      goalCompletionMonth: timelineReady ? scenario.timeline.goalCompletionMonth : null,
      hasUnknownInterestRates: scenario.timeline.hasUnknownInterestRates,
      id: scenario.id,
      label: scenario.label,
      peakMonthlyDebtPayment,
      status: scenario.status,
      totalInterestCharged: timelineReady
        ? scenario.timeline.totalInterestCharged
        : null
    };
  });
}
