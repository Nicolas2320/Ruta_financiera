import { describe, expect, it } from "vitest";

import {
  calculateFinancialSnapshot,
  getSuggestedContributionRate,
  getPlanPrecisionStatus,
  parseCOPRange,
  roundDownToNearest,
  safeDivide
} from "../utils/financialCalculations";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

describe("financial calculation primitives", () => {
  it("divides only finite values with a non-zero denominator", () => {
    expect(safeDivide(375, 1_000)).toBe(0.375);
    expect(safeDivide(1, 0)).toBeNull();
    expect(safeDivide(Number.POSITIVE_INFINITY, 1)).toBeNull();
    expect(safeDivide(null, 1)).toBeNull();
  });

  it("rounds down without creating negative or invalid recommendations", () => {
    expect(roundDownToNearest(127_999, 10_000)).toBe(120_000);
    expect(roundDownToNearest(-10, 10_000)).toBe(0);
    expect(roundDownToNearest(100_000, 0)).toBe(0);
  });

  it("selects a transparent contribution rate from the margin share", () => {
    expect(getSuggestedContributionRate(100_000, 0.08)).toBe(0.25);
    expect(getSuggestedContributionRate(500_000, 0.2)).toBe(0.35);
    expect(getSuggestedContributionRate(1_000_000, 0.3)).toBe(0.45);
    expect(getSuggestedContributionRate(-100_000, -0.05)).toBeNull();
  });

  it.each([
    ["$1.000.000 - $3.000.000", 2_000_000],
    ["Menos de $1.000.000", 500_000],
    ["Mas de $5.000.000", 6_000_000],
    ["No estoy seguro", null],
    [null, null]
  ])("parses the COP range %s", (label, expected) => {
    expect(parseCOPRange(label)).toBe(expected);
  });

  it("counts zero as an exact value only for savings and small expenses", () => {
    expect(
      getPlanPrecisionStatus({
        monthlyIncome: 0,
        monthlyExpenses: -1,
        currentSavings: 0,
        smallExpenses: 0
      })
    ).toMatchObject({ exactValuesCount: 2, status: "improved" });
  });
});

describe("calculateFinancialSnapshot", () => {
  it("keeps the main financial outputs coherent when exact values are available", () => {
    const onboarding = makeOnboarding({
      debtSituation: "No tengo deudas",
      debtPaymentShare: "No pago deudas",
      goals: [makeGoal({ currentAmount: 250_000 })]
    });

    const snapshot = calculateFinancialSnapshot({
      onboarding,
      exactValues: {
        monthlyIncome: 4_000_000,
        monthlyExpenses: 1_500_000,
        currentSavings: 1_250_000,
        smallExpenses: 375_000
      }
    });

    expect(snapshot.values).toEqual({
      monthlyIncome: 4_000_000,
      monthlyExpenses: 1_500_000,
      currentSavings: 1_250_000,
      goalTargetAmount: 3_000_000,
      smallExpenses: 375_000
    });
    expect(snapshot.sourceMap).toEqual({
      monthlyIncome: "exact",
      monthlyExpenses: "exact",
      currentSavings: "exact",
      goalTargetAmount: "exact",
      smallExpenses: "exact"
    });
    expect(snapshot.cashflow).toMatchObject({
      monthlyDebtPayments: 0,
      totalMonthlyOutflow: 1_875_000,
      monthlyMargin: 2_125_000,
      expensesToIncomeRatio: 0.46875,
      marginRate: 0.53125,
      savingsCapacityLevel: "high",
      suggestedContributionRate: 0.45,
      suggestedContributionBeforeRounding: 956_250,
      suggestedMonthlyContribution: 950_000
    });
    expect(snapshot.emergencyFund.coverageMonths).toBeCloseTo(0.8333, 3);
    expect(snapshot.emergencyFund.status).toBe("starter");
    expect(snapshot.goal).toMatchObject({
      progressPercentage: 250_000 / 3_000_000 * 100,
      remainingAmount: 2_750_000,
      estimatedMonthsToGoal: 3,
      status: "near"
    });
    expect(snapshot.smallExpenses).toMatchObject({
      level: "high",
      opportunityAmount: 70_000
    });
    expect(snapshot.precision).toMatchObject({ exactValuesCount: 4, status: "clearer" });
    expect(snapshot.priority.key).toBe("build_emergency_fund");
  });

  it("never recommends a contribution when monthly cashflow is negative", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        debtSituation: "No tengo deudas",
        debtPaymentShare: "No pago deudas",
        goals: [makeGoal()]
      }),
      exactValues: {
        monthlyIncome: 2_000_000,
        monthlyExpenses: 2_500_000,
        currentSavings: 4_000_000,
        smallExpenses: 100_000
      }
    });

    expect(snapshot.cashflow.monthlyMargin).toBe(-600_000);
    expect(snapshot.cashflow.suggestedContributionRate).toBeNull();
    expect(snapshot.cashflow.suggestedMonthlyContribution).toBe(0);
    expect(snapshot.cashflow.savingsCapacityLevel).toBe("negative");
    expect(snapshot.goal.status).toBe("needs_margin");
    expect(snapshot.priority.key).toBe("organize_cashflow");
  });

  it("prioritizes a high registered debt before a cashflow deficit", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            monthlyPayment: 800_000,
            remainingAmount: 5_000_000,
            status: "overdue"
          })
        ],
        goals: [makeGoal()]
      }),
      exactValues: {
        monthlyIncome: 2_000_000,
        monthlyExpenses: 2_200_000,
        currentSavings: 0,
        smallExpenses: 50_000
      }
    });

    expect(snapshot.debt).toMatchObject({
      source: "registered",
      monthlyPaymentTotal: 800_000,
      debtToIncomeRatio: 0.4,
      level: "high",
      shouldPrioritizeDebt: true
    });
    expect(snapshot.priority.key).toBe("debt_pressure");
  });

  it("releases monthly margin when a registered debt is paid off", () => {
    const baseInput = {
      exactValues: {
        monthlyIncome: 3_000_000,
        monthlyExpenses: 1_500_000,
        smallExpenses: 100_000
      }
    };
    const withActiveDebt = calculateFinancialSnapshot({
      ...baseInput,
      onboarding: makeOnboarding({
        debts: [makeDebt({ monthlyPayment: 500_000, remainingAmount: 500_000 })]
      })
    });
    const withPaidDebt = calculateFinancialSnapshot({
      ...baseInput,
      onboarding: makeOnboarding({
        debts: [makeDebt({ monthlyPayment: 500_000, remainingAmount: 0 })]
      })
    });

    expect(withActiveDebt.cashflow.monthlyMargin).toBe(900_000);
    expect(withPaidDebt.cashflow.monthlyMargin).toBe(1_400_000);
    expect(withPaidDebt.cashflow.monthlyDebtPayments).toBe(0);
  });

  it("does not count the legacy debt expense category on top of detailed debts", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        debts: [makeDebt({ monthlyPayment: 500_000, remainingAmount: 2_000_000 })],
        expenseCategories: ["Alimentación", "Deudas"],
        expenseCategoryAmounts: {
          Alimentación: 400_000,
          Deudas: 700_000
        }
      }),
      exactValues: {
        monthlyIncome: 3_000_000,
        monthlyExpenses: 1_000_000,
        smallExpenses: 0
      }
    });

    expect(snapshot.debt.source).toBe("registered");
    expect(snapshot.cashflow.monthlyDebtPayments).toBe(500_000);
    expect(snapshot.cashflow.totalMonthlyOutflow).toBe(1_500_000);
    expect(snapshot.cashflow.monthlyMargin).toBe(1_500_000);
  });

  it("accepts zero exact savings without replacing it with an estimate", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({ savingsRange: "$2.000.000 - $5.000.000" }),
      exactValues: {
        monthlyIncome: 3_000_000,
        monthlyExpenses: 2_000_000,
        currentSavings: 0,
        smallExpenses: 0
      }
    });

    expect(snapshot.values.currentSavings).toBe(0);
    expect(snapshot.sourceMap.currentSavings).toBe("exact");
    expect(snapshot.emergencyFund.status).toBe("none");
  });

  it("does not create savings opportunities after the user reports no small expenses", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        hasSmallExpenses: "No",
        smallExpensesRange: "Menos de $100.000",
        smallExpensesIntention: "Redirigir una parte a una meta"
      }),
      exactValues: {
        smallExpenses: 200_000
      }
    });

    expect(snapshot.values.smallExpenses).toBe(0);
    expect(snapshot.sourceMap.smallExpenses).toBe("reported_none");
    expect(snapshot.smallExpenses.opportunityAmount).toBe(0);
  });

  it("marks intentionally withheld savings differently from missing data", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        savingsRange: "Prefiero no responder"
      }),
      exactValues: {
        currentSavings: 2_000_000
      }
    });

    expect(snapshot.values.currentSavings).toBeNull();
    expect(snapshot.sourceMap.currentSavings).toBe("withheld");
  });

  it("uses the reported debt range until detailed debts are registered", () => {
    const snapshot = calculateFinancialSnapshot({
      onboarding: makeOnboarding({
        debtSituation: "Son una preocupación importante",
        debtPaymentShare: "20% – 40%"
      }),
      exactValues: {
        monthlyIncome: 2_000_000,
        monthlyExpenses: 2_500_000
      }
    });

    expect(snapshot.debt).toMatchObject({
      source: "reported",
      monthlyPaymentTotal: 600_000,
      debtToIncomeRatio: 0.3,
      reportedPaymentShare: "20% – 40%",
      level: "high"
    });
    expect(snapshot.priority.key).toBe("debt_pressure");
  });
});
