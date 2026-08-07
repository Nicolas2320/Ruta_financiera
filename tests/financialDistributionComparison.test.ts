import { describe, expect, it } from "vitest";

import { buildDistributionComparison } from "../utils/financialDistributionComparison";
import { buildDistributionScenarios } from "../utils/financialDistribution";
import { presentDistributionScenarios } from "../utils/financialDistributionPresentation";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

function makeComparisonScenarios(annualInterestRate: number | null = 12) {
  const input = buildFinancialProjectionInput({
    asOfDate: "2026-08-02",
    exactValues: {
      monthlyExpenses: 920_000,
      monthlyIncome: 4_800_000,
      smallExpenses: 0
    },
    onboarding: makeOnboarding({
      debts: [
        makeDebt({
          annualInterestRate,
          id: "education-debt",
          monthlyPayment: 577_000,
          monthlyPaymentType: "minimum_required",
          name: "Crédito educativo",
          remainingAmount: 30_000_000
        })
      ],
      goals: [
        makeGoal({
          currentAmount: 0,
          id: "study",
          isPrimary: true,
          targetAmount: 6_000_000,
          targetMonth: "2027-01",
          title: "Estudiar"
        })
      ]
    })
  });

  return presentDistributionScenarios({
    input,
    scenarios: buildDistributionScenarios({
      input,
      splitDebtShare: 0.5
    })
  });
}

describe("financial distribution comparison", () => {
  it("identifies the fastest goal, fastest debt payoff and lowest interest", () => {
    const comparison = buildDistributionComparison(makeComparisonScenarios());

    expect(comparison.map((row) => row.id)).toEqual([
      "current_reference",
      "reduce_interest",
      "accelerate_goal",
      "split_debt_goal"
    ]);
    expect(
      comparison.find((row) => row.id === "accelerate_goal")?.bestCriteria
    ).toContain("goal");
    expect(
      comparison.find((row) => row.id === "reduce_interest")?.bestCriteria
    ).toEqual(expect.arrayContaining(["debt", "interest"]));
  });

  it("shows that the split strategy can increase debt payments after reallocations", () => {
    const scenarios = makeComparisonScenarios();
    const comparison = buildDistributionComparison(scenarios);
    const splitScenario = scenarios.find((scenario) => scenario.id === "split_debt_goal");
    const splitComparison = comparison.find((row) => row.id === "split_debt_goal");
    const firstMonthDebtPayment =
      (splitScenario?.baseDebtPayments ?? 0) + (splitScenario?.extraDebtPayment ?? 0);

    expect(splitComparison?.peakMonthlyDebtPayment).toBeGreaterThan(firstMonthDebtPayment);
  });

  it("does not award the lowest-interest label when rates are incomplete", () => {
    const comparison = buildDistributionComparison(makeComparisonScenarios(null));

    expect(comparison.every((row) => !row.bestCriteria.includes("interest"))).toBe(true);
    expect(comparison.find((row) => row.id === "reduce_interest")).toMatchObject({
      hasUnknownInterestRates: true,
      status: "ready"
    });
    expect(comparison.find((row) => row.id === "split_debt_goal")?.status).toBe("ready");
    expect(
      comparison.find((row) => row.id === "reduce_interest")?.debtFreeMonth
    ).not.toBeNull();
  });
});
