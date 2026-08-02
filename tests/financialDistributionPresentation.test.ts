import { describe, expect, it } from "vitest";

import { buildDistributionScenarios } from "../utils/financialDistribution";
import { presentDistributionScenarios } from "../utils/financialDistributionPresentation";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

function makeProjection() {
  return buildFinancialProjectionInput({
    asOfDate: "2026-08-02",
    exactValues: {
      monthlyExpenses: 920_000,
      monthlyIncome: 4_800_000,
      smallExpenses: 0
    },
    onboarding: makeOnboarding({
      debts: [
        makeDebt({
          annualInterestRate: 28.79,
          id: "nubank",
          lender: "Nubank",
          monthlyPayment: 500_000,
          monthlyPaymentType: "minimum_required",
          name: "Nubank TC",
          paymentDay: 1,
          paymentFlexibility: "fixed",
          remainingAmount: 2_000_000,
          status: "on_track",
          type: "Tarjeta de crédito"
        })
      ],
      goals: [
        makeGoal({
          currentAmount: 0,
          id: "specialization",
          isPrimary: true,
          targetAmount: 6_000_000,
          targetMonth: "2027-01",
          title: "Especialización"
        })
      ]
    })
  });
}

describe("financial distribution presentation", () => {
  it("keeps the reference first and explains each strategy with concrete totals", () => {
    const input = makeProjection();
    const presentations = presentDistributionScenarios({
      input,
      scenarios: buildDistributionScenarios({ input })
    });

    expect(presentations.map((scenario) => scenario.id)).toEqual([
      "current_reference",
      "reduce_interest",
      "accelerate_goal",
      "split_debt_goal"
    ]);
    expect(presentations[0]).toMatchObject({
      badge: "Referencia",
      baseDebtPayments: 500_000,
      extraDebtPayment: 0,
      goalContribution: 0
    });
    expect(presentations[1]).toMatchObject({
      badge: "Deuda",
      extraDebtPayment: 1_500_000,
      targetDebtTitles: ["Nubank TC"]
    });
    expect(presentations[3]).toMatchObject({
      badge: "50% deuda · 50% meta",
      debtSharePercent: 50
    });
  });

  it("projects the goal contribution through its stored target month", () => {
    const input = makeProjection();
    const presentations = presentDistributionScenarios({
      input,
      scenarios: buildDistributionScenarios({ input })
    });
    const goalScenario = presentations.find(
      (scenario) => scenario.id === "accelerate_goal"
    );

    expect(goalScenario?.goalContribution).toBe(3_042_000);
    expect(goalScenario?.goalProjection).toMatchObject({
      amountAtTargetMonth: 6_000_000,
      estimatedMonthsToTarget: 2,
      monthsUntilTarget: 5,
      targetGapAtTargetMonth: 0
    });
  });
});
