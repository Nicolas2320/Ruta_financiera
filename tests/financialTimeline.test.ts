import { describe, expect, it } from "vitest";

import { buildDistributionScenarios } from "../utils/financialDistribution";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import {
  buildFinancialScenarioTimeline,
  getFinancialTimelineDisplayMonths
} from "../utils/financialTimeline";
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
      releasedPaymentNextMonth: 200_000,
      trackedGoalAmount: 1_800_000
    });
    expect(timeline.months[1]).toMatchObject({
      baseDebtPayments: 0,
      goalContributionTotal: 2_000_000,
      month: "2026-10",
      trackedGoalAmount: 3_800_000
    });
  });

  it("adds the current month as a chart baseline without applying a payment", () => {
    const input = makeTimelineInput();
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).accelerateGoal;
    const timeline = buildFinancialScenarioTimeline({ input, scenario });
    const displayMonths = getFinancialTimelineDisplayMonths(timeline);

    expect(timeline.asOfMonth).toBe("2026-08");
    expect(timeline.months[0].month).toBe("2026-09");
    expect(displayMonths[0]).toMatchObject({
      baseDebtPayments: 0,
      endingKnownDebtBalance: 200_000,
      extraDebtPayments: 0,
      goalContributionTotal: 0,
      index: 0,
      month: "2026-08",
      trackedGoalAmount: 0
    });
    expect(displayMonths[1]).toBe(timeline.months[0]);
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

  it("continues with zero-rate and unknown-rate debts after costly debts", () => {
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
            annualInterestRate: 25,
            id: "costly-debt",
            monthlyPayment: 200_000,
            monthlyPaymentType: "minimum_required",
            name: "Deuda costosa",
            remainingAmount: 200_000
          }),
          makeDebt({
            annualInterestRate: 0,
            id: "zero-rate-debt",
            monthlyPayment: 100_000,
            monthlyPaymentType: "self_selected",
            name: "Deuda sin interés",
            remainingAmount: 1_000_000
          }),
          makeDebt({
            annualInterestRate: null,
            id: "unknown-rate-debt",
            monthlyPayment: 100_000,
            monthlyPaymentType: "self_selected",
            name: "Deuda sin tasa confirmada",
            remainingAmount: 500_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).reduceInterest;
    const timeline = buildFinancialScenarioTimeline({ input, scenario });
    const firstMonthPayments = timeline.months[0].debtPayments;

    expect(
      firstMonthPayments.find((payment) => payment.debtId === "zero-rate-debt")
        ?.extraPayment
    ).toBeGreaterThan(0);
    expect(
      timeline.months.some((month) =>
        month.debtPayments.some(
          (payment) =>
            payment.debtId === "unknown-rate-debt" && payment.extraPayment > 0
        )
      )
    ).toBe(true);
    expect(timeline.allKnownDebtsPaidMonth).not.toBeNull();
  });
});
