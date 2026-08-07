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
      badge: "Sin repartir",
      baseDebtPayments: 500_000,
      extraDebtPayment: 0,
      goalContribution: 0
    });
    expect(presentations[1]).toMatchObject({
      badge: "Solo deudas",
      extraDebtPayment: 1_500_000,
      targetDebtTitles: ["Nubank TC"]
    });
    expect(presentations[3]).toMatchObject({
      badge: "50% deudas · 50% metas",
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

  it("keeps a missing interest rate as an internal 0% assumption without repeating it in the scenario copy", () => {
    const input = buildFinancialProjectionInput({
      asOfDate: "2026-08-02",
      exactValues: {
        monthlyExpenses: 1_500_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: null,
            monthlyPayment: 700_000,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 10_000_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const presentations = presentDistributionScenarios({
      input,
      scenarios: buildDistributionScenarios({
        input,
        protectedMarginPreference: { mode: "use_all" }
      })
    });
    const debtScenario = presentations.find(
      (scenario) => scenario.id === "reduce_interest"
    );

    expect(debtScenario?.status).toBe("ready");
    expect(debtScenario?.issueCodes).not.toContain("unknown_interest_rate");
    expect(debtScenario?.issueMessages).toEqual([]);
    expect(debtScenario?.timeline.totalInterestCharged).toBe(0);
  });
});
