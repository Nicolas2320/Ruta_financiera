import { describe, expect, it } from "vitest";

import {
  evaluateNewDebt,
  getDebtMonthlyPaymentTotal,
  getDebtRemainingTotal,
  getRegisteredDebtSummary
} from "../utils/debtCalculations";
import { makeDebt } from "./fixtures/financial";

describe("registered debt calculations", () => {
  it("sanitizes invalid amounts when totaling debts", () => {
    const debts = [
      makeDebt({ id: "positive", monthlyPayment: 200_000, remainingAmount: 1_000_000 }),
      makeDebt({ id: "negative", monthlyPayment: -100_000, remainingAmount: -500 }),
      makeDebt({ id: "invalid", monthlyPayment: Number.NaN, remainingAmount: Number.NaN })
    ];

    expect(getDebtMonthlyPaymentTotal(debts)).toBe(200_000);
    expect(getDebtRemainingTotal(debts)).toBe(1_000_000);
  });

  it("uses registered debts as the source of truth without double counting expense categories", () => {
    const summary = getRegisteredDebtSummary({
      debts: [makeDebt({ monthlyPayment: 300_000, remainingAmount: 4_000_000 })],
      expenseCategoryAmounts: {
        "Pago de deudas": 250_000,
        Vivienda: 1_000_000
      },
      monthlyIncome: 3_000_000
    });

    expect(summary).toMatchObject({
      source: "registered",
      monthlyPaymentTotal: 300_000,
      categoryMonthlyPaymentTotal: 250_000,
      remainingTotal: 4_000_000,
      debtToIncomeRatio: 0.1,
      level: "medium",
      hasCategoryDebtReference: true,
      hasPossibleDuplicate: true
    });
  });

  it("falls back to the debt expense category when no detailed debt exists", () => {
    const summary = getRegisteredDebtSummary({
      debts: [],
      expenseCategoryAmounts: { "Deudas y creditos": 400_000 },
      monthlyIncome: 2_000_000
    });

    expect(summary).toMatchObject({
      count: 0,
      source: "category",
      monthlyPaymentTotal: 400_000,
      debtToIncomeRatio: 0.2,
      level: "high",
      shouldPrioritizeDebt: true
    });
  });
});

describe("new debt viability", () => {
  it("requires a positive new monthly payment", () => {
    expect(
      evaluateNewDebt({
        currentMonthlyDebtPayment: 0,
        monthlyIncome: 4_000_000,
        monthlyMargin: 1_000_000,
        newMonthlyPayment: 0
      }).viability
    ).toBe("missing");
  });

  it("marks a payment as possible when margin and debt ratio stay healthy", () => {
    expect(
      evaluateNewDebt({
        currentMonthlyDebtPayment: 100_000,
        monthlyIncome: 4_000_000,
        monthlyMargin: 1_000_000,
        newMonthlyPayment: 100_000
      })
    ).toMatchObject({
      viability: "possible",
      marginAfterNewPayment: 900_000,
      totalDebtPayment: 200_000,
      totalDebtToIncomeRatio: 0.05
    });
  });

  it("marks the exact 20% debt-ratio boundary as tight", () => {
    expect(
      evaluateNewDebt({
        currentMonthlyDebtPayment: 600_000,
        monthlyIncome: 4_000_000,
        monthlyMargin: 1_000_000,
        newMonthlyPayment: 200_000
      }).viability
    ).toBe("tight");
  });

  it("marks a negative remaining margin or 40% debt ratio as risky", () => {
    const negativeMargin = evaluateNewDebt({
      currentMonthlyDebtPayment: 0,
      monthlyIncome: 4_000_000,
      monthlyMargin: 100_000,
      newMonthlyPayment: 200_000
    });
    const highRatio = evaluateNewDebt({
      currentMonthlyDebtPayment: 1_400_000,
      monthlyIncome: 4_000_000,
      monthlyMargin: 1_500_000,
      newMonthlyPayment: 200_000
    });

    expect(negativeMargin.viability).toBe("risky");
    expect(highRatio.viability).toBe("risky");
  });
});
