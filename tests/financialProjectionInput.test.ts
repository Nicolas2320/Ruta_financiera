import { describe, expect, it } from "vitest";

import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

describe("financial projection input", () => {
  it("keeps debt goals out of goal allocations because debts have their own projection", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        goals: [
          makeGoal({
            id: "debt-goal",
            title: "Pagar deudas",
            type: "debt"
          }),
          makeGoal({
            id: "travel-goal",
            isPrimary: false,
            title: "Ahorrar para viajar",
            type: "wellbeing"
          })
        ]
      })
    });

    expect(input.goals.map((goal) => goal.id)).toEqual(["travel-goal"]);
  });

  it("keeps baseline expenses and planned debt payments separate", () => {
    const input = buildFinancialProjectionInput({
      asOfDate: "2026-07-31",
      exactValues: {
        monthlyExpenses: 920_000,
        monthlyIncome: 4_800_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            id: "icetex",
            monthlyPayment: 577_000,
            monthlyPaymentType: "minimum_required"
          }),
          makeDebt({
            id: "friend",
            monthlyPayment: 250_000,
            monthlyPaymentType: "agreed",
            paymentFlexibility: "negotiable"
          }),
          makeDebt({
            id: "card",
            minimumMonthlyPayment: 200_000,
            monthlyPayment: 500_000,
            monthlyPaymentType: "self_selected"
          })
        ],
        goals: [makeGoal({ targetAmount: 6_000_000, targetMonth: "2027-01" })]
      })
    });

    expect(input.cashflow).toMatchObject({
      monthlyIncome: 4_800_000,
      baselineMonthlyExpenses: 920_000,
      smallMonthlyExpenses: 0,
      totalMonthlyExpenses: 2_247_000,
      plannedDebtPaymentsTotal: 1_327_000,
      knownRequiredDebtPaymentsTotal: 827_000,
      unitemizedRequiredDebtPaymentsTotal: 0,
      hasCompleteRequiredDebtPayments: true,
      availableAfterPlannedPayments: 2_553_000,
      availableAfterRequiredPayments: 3_053_000
    });
    expect(input.cashflow.baselineMonthlyExpensesSource).toBe("exact");
    expect(input.goals[0]).toMatchObject({
      amountRange: null,
      targetAmount: 6_000_000,
      targetAmountSource: "exact",
      targetMonth: "2027-01"
    });
    expect(input.goals[0]).not.toHaveProperty("priority");
  });

  it("reserves a reported debt payment before projecting goals without debt details", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyDebtPayments: 1_200_000,
        monthlyExpenses: 1_500_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        hasDebts: true,
        debtMonthlyPaymentRange: "$1.000.000 – $2.000.000",
        debts: [],
        goals: [makeGoal()]
      })
    });

    expect(input.cashflow).toMatchObject({
      hasCompleteRequiredDebtPayments: true,
      knownRequiredDebtPaymentsTotal: 1_200_000,
      plannedDebtPaymentsTotal: 1_200_000,
      unitemizedRequiredDebtPaymentsTotal: 1_200_000,
      availableAfterRequiredPayments: 1_300_000
    });
  });

  it("uses a selected goal range as an explicit projection reference", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 2_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debtPaymentShare: "No pago deudas",
        debtSituation: "No tengo deudas",
        goals: [
          makeGoal({
            amountRange: "$5.000.000 – $20.000.000",
            targetAmount: null
          })
        ]
      })
    });

    expect(input.goals[0]).toMatchObject({
      amountRange: "$5.000.000 – $20.000.000",
      targetAmount: 12_500_000,
      targetAmountSource: "range"
    });
    expect(
      input.issues.some(
        (issue) => issue.code === "missing_goal_target" && issue.entityId === "goal-1"
      )
    ).toBe(false);
  });

  it("treats a self-selected payment as adjustable with a zero required floor", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [makeDebt({ monthlyPaymentType: "self_selected" })],
        goals: [makeGoal({ targetMonth: null })]
      })
    });

    expect(input.cashflow.hasCompleteRequiredDebtPayments).toBe(true);
    expect(input.cashflow.knownRequiredDebtPaymentsTotal).toBe(0);
    expect(input.cashflow.availableAfterRequiredPayments).toBe(2_000_000);
    expect(input.issues.map((issue) => issue.code)).toContain("missing_goal_target_month");
  });

  it("keeps separately tracked small expenses inside the new monthly total", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 2_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 300_000
      },
      onboarding: makeOnboarding({
        monthlyExpensesIncludesSmallExpenses: true,
        debtSituation: "No tengo deudas",
        debtPaymentShare: "No pago deudas"
      })
    });

    expect(input.cashflow).toMatchObject({
      baselineMonthlyExpenses: 2_000_000,
      smallMonthlyExpenses: 0,
      totalMonthlyExpenses: 2_000_000,
      availableAfterPlannedPayments: 2_000_000
    });
  });

  it("routes missing facts back to their owning sections", () => {
    const input = buildFinancialProjectionInput({
      onboarding: makeOnboarding({
        debts: [makeDebt({ annualInterestRate: undefined })],
        goals: [makeGoal({ targetAmount: null })]
      })
    });

    expect(input.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_income", ownerRoute: "/income" }),
        expect.objectContaining({ code: "missing_expenses", ownerRoute: "/improve-plan" }),
        expect.objectContaining({ code: "missing_goal_target", ownerRoute: "/goals-overview" }),
        expect.objectContaining({ code: "unknown_debt_payment_type", ownerRoute: "/debts" })
      ])
    );
  });

  it("ignores a legacy separate minimum when the payment is self-selected", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            minimumMonthlyPayment: 600_000,
            monthlyPayment: 500_000,
            monthlyPaymentType: "self_selected"
          })
        ]
      })
    });

    expect(input.debts[0].requiredMonthlyPayment).toBe(0);
    expect(input.cashflow.hasCompleteRequiredDebtPayments).toBe(true);
  });

  it("adds debts to exact main expenses without counting either component twice", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 2_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required"
          })
        ]
      })
    });

    expect(input.cashflow).toMatchObject({
      totalMonthlyExpenses: 2_500_000,
      baselineMonthlyExpenses: 2_000_000,
      baselineMonthlyExpensesSource: "exact",
      availableAfterPlannedPayments: 1_500_000
    });
    expect(input.issues.some((issue) => issue.owner === "expenses")).toBe(false);
  });

  it("accepts main expenses lower than debt payments because they are separate components", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 400_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required"
          })
        ]
      })
    });

    expect(input.cashflow).toMatchObject({
      baselineMonthlyExpenses: 400_000,
      plannedDebtPaymentsTotal: 500_000,
      totalMonthlyExpenses: 900_000,
      availableAfterPlannedPayments: 3_100_000
    });
    expect(input.issues.some((issue) => issue.owner === "expenses")).toBe(false);
  });
});
