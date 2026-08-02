import { describe, expect, it } from "vitest";

import { buildDistributionScenarios } from "../utils/financialDistribution";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { buildFinancialScenarioTimeline } from "../utils/financialTimeline";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

function makeTimelineInput() {
  return buildFinancialProjectionInput({
    asOfDate: "2026-08-02",
    exactValues: {
      monthlyExpenses: 1_000_000,
      monthlyIncome: 3_000_000,
      smallExpenses: 0
    },
    onboarding: makeOnboarding({
      debts: [
        makeDebt({
          annualInterestRate: 0,
          id: "short-debt",
          monthlyPayment: 200_000,
          monthlyPaymentType: "minimum_required",
          name: "Deuda corta",
          remainingAmount: 200_000
        })
      ],
      goals: [
        makeGoal({
          id: "study",
          targetAmount: 6_000_000,
          targetMonth: "2027-01",
          title: "Estudiar"
        })
      ]
    })
  });
}

describe("month-by-month financial timeline", () => {
  it("releases a required payment in the month after a debt ends", () => {
    const input = makeTimelineInput();
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).accelerateGoal;
    const timeline = buildFinancialScenarioTimeline({ input, scenario });

    expect(timeline.months[0]).toMatchObject({
      baseDebtPayments: 200_000,
      goalContributionTotal: 1_800_000,
      month: "2026-09",
      newlyPaidDebtIds: ["short-debt"],
      releasedPaymentNextMonth: 200_000
    });
    expect(timeline.months[1]).toMatchObject({
      baseDebtPayments: 0,
      goalContributionTotal: 2_000_000,
      month: "2026-10"
    });
  });

  it("finishes the goal sooner after the debt payment is released", () => {
    const input = makeTimelineInput();
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).accelerateGoal;
    const timeline = buildFinancialScenarioTimeline({ input, scenario });

    expect(timeline.goalCompletionMonth).toBe("2026-12");
    expect(timeline.months.at(-1)?.goalContributions.at(-1)).toMatchObject({
      endingAmount: 6_000_000,
      reached: true
    });
  });

  it("marks projections that use an unknown interest rate as limited", () => {
    const input = buildFinancialProjectionInput({
      asOfDate: "2026-08-02",
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: null,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 500_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).accelerateGoal;

    expect(buildFinancialScenarioTimeline({ input, scenario }).hasUnknownInterestRates).toBe(
      true
    );
  });
});
