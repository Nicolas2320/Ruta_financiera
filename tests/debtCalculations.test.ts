import { describe, expect, it } from "vitest";

import {
  evaluateNewDebt,
  getRecurringExpenseCategories,
  getDebtMonthlyPaymentTotal,
  getDebtRemainingTotal,
  getReportedDebtPaymentRatio,
  getRegisteredDebtSummary,
  hasDebtMonthlyExpenseMismatch,
  syncDebtExpenseCategory
} from "../utils/debtCalculations";
import { makeDebt } from "./fixtures/financial";

describe("registered debt calculations", () => {
  it("keeps debt categories out of the recurring expense selection", () => {
    expect(
      getRecurringExpenseCategories([
        "Vivienda",
        "Deudas",
        "Pago de deudas",
        "Salud",
        "Arriendo"
      ])
    ).toEqual(["Arriendo", "Salud"]);
  });

  it("creates one managed debt expense category from registered installments", () => {
    expect(
      syncDebtExpenseCategory({
        debts: [
          makeDebt({ id: "education", monthlyPayment: 300_000 }),
          makeDebt({ id: "vehicle", monthlyPayment: 450_000 })
        ],
        expenseCategories: ["Vivienda", "Deudas"],
        expenseCategoryAmounts: {
          Vivienda: 900_000,
          Deudas: 200_000
        }
      })
    ).toEqual({
      expenseCategories: ["Arriendo", "Deudas"],
      expenseCategoryAmounts: {
        Arriendo: 900_000,
        Deudas: 750_000
      }
    });
  });

  it("keeps the managed debt category visible after the last registered debt is deleted", () => {
    expect(
      syncDebtExpenseCategory({
        debts: [],
        expenseCategories: ["Vivienda", "Deudas"],
        expenseCategoryAmounts: {
          Vivienda: 900_000,
          Deudas: 300_000
        }
      })
    ).toEqual({
      expenseCategories: ["Arriendo", "Deudas"],
      expenseCategoryAmounts: {
        Arriendo: 900_000
      }
    });
  });

  it("preserves a legacy debt amount while recurring expenses are edited", () => {
    expect(
      syncDebtExpenseCategory({
        debts: [],
        expenseCategories: ["Vivienda", "Salud"],
        expenseCategoryAmounts: {
          Vivienda: 900_000,
          Deudas: 300_000
        },
        preserveExistingReference: true
      })
    ).toEqual({
      expenseCategories: ["Arriendo", "Salud", "Deudas"],
      expenseCategoryAmounts: {
        Arriendo: 900_000,
        Deudas: 300_000
      }
    });
  });

  it("flags registered installments that exceed an exact monthly expense total", () => {
    expect(
      hasDebtMonthlyExpenseMismatch({
        isExactMonthlyExpense: true,
        monthlyExpenses: 600_000,
        monthlyPaymentTotal: 800_000
      })
    ).toBe(true);
    expect(
      hasDebtMonthlyExpenseMismatch({
        isExactMonthlyExpense: false,
        monthlyExpenses: 600_000,
        monthlyPaymentTotal: 800_000
      })
    ).toBe(false);
  });

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

  it("keeps a reported debt range as an estimate instead of showing zero", () => {
    const summary = getRegisteredDebtSummary({
      debts: [],
      debtPaymentShare: "20% – 40%",
      expenseCategoryAmounts: {},
      monthlyIncome: 2_000_000
    });

    expect(getReportedDebtPaymentRatio("20% – 40%")).toBe(0.3);
    expect(summary).toMatchObject({
      source: "reported",
      monthlyPaymentTotal: 600_000,
      debtToIncomeRatio: 0.3,
      reportedPaymentShare: "20% – 40%",
      level: "high",
      shouldPrioritizeDebt: true
    });
  });

  it("prefers registered debt over an earlier reported range", () => {
    const summary = getRegisteredDebtSummary({
      debts: [makeDebt({ monthlyPayment: 320_000 })],
      debtPaymentShare: "Más del 40%",
      expenseCategoryAmounts: {},
      monthlyIncome: 4_000_000
    });

    expect(summary).toMatchObject({
      source: "registered",
      monthlyPaymentTotal: 320_000,
      debtToIncomeRatio: 0.08
    });
  });

  it("excludes paid debts without reviving an earlier reported range", () => {
    const paidDebt = makeDebt({
      remainingAmount: 0,
      monthlyPayment: 320_000,
      payments: [{ id: "final", amount: 320_000, date: "2026-07-15" }]
    });
    const summary = getRegisteredDebtSummary({
      debts: [paidDebt],
      debtPaymentShare: "Más del 40%",
      expenseCategoryAmounts: {},
      monthlyIncome: 4_000_000
    });

    expect(getDebtMonthlyPaymentTotal([paidDebt])).toBe(0);
    expect(summary).toMatchObject({
      count: 0,
      source: "none",
      monthlyPaymentTotal: 0,
      remainingTotal: 0,
      level: "none"
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
