import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ supabase: null }));

import {
  hasCompletedOnboarding,
  normalizeDebtRecords,
  normalizeFinancialGoals,
  type OnboardingData
} from "../types/financial";
import { normalizeOnboardingData } from "../lib/financialProfile";
import { makeGoal, makeOnboarding } from "./fixtures/financial";

function makeCompletedOnboarding(overrides: Partial<OnboardingData> = {}) {
  return makeOnboarding({
    firstName: "Ana",
    ageRange: "31–35",
    country: "Colombia",
    incomeRange: "$3.000.000 – $5.000.000",
    incomeType: "Empleo",
    incomeFrequency: "Mensual",
    expensesRange: "$2.000.000 – $4.000.000",
    expenseCategories: ["Vivienda"],
    expensesFeeling: "A veces son difíciles de controlar",
    hasSmallExpenses: "No",
    smallExpenseCategories: [],
    smallExpensesRange: null,
    smallExpensesIntention: null,
    savingsRange: "Prefiero no responder",
    emergencyCoverage: "No estoy seguro",
    debtSituation: "Prefiero no responder",
    debtPaymentShare: "Prefiero no responder",
    investmentSituation: "Prefiero no responder",
    goals: [makeGoal()],
    ...overrides
  });
}

describe("onboarding completion", () => {
  it("allows a truthful No answer without forcing a small-expense amount or intention", () => {
    expect(hasCompletedOnboarding(makeCompletedOnboarding())).toBe(true);
  });

  it("still requires details when small expenses may exist", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          hasSmallExpenses: "Sí",
          smallExpenseCategories: ["Cafés, snacks y salidas"]
        })
      )
    ).toBe(false);
  });

  it("does not treat the managed debt category as a selected recurring expense", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          expenseCategories: ["Deudas"]
        })
      )
    ).toBe(false);
  });
});

describe("debt normalization", () => {
  it("preserves a valid annual interest rate and rejects invalid percentages", () => {
    const normalized = normalizeDebtRecords([
      {
        id: "debt-1",
        type: "Tarjeta de crédito",
        monthlyPayment: 200_000,
        annualInterestRate: "32,5",
        status: "on_track"
      },
      {
        id: "debt-2",
        type: "Préstamo",
        monthlyPayment: 300_000,
        annualInterestRate: 120,
        status: "on_track"
      }
    ]);

    expect(normalized[0].annualInterestRate).toBe(32.5);
    expect(normalized[1].annualInterestRate).toBeNull();
  });

  it("normalizes, orders and deduplicates persisted payment history", () => {
    const [debt] = normalizeDebtRecords([
      {
        id: "debt-1",
        type: "Préstamo",
        monthlyPayment: 300_000,
        status: "on_track",
        payments: [
          { id: "payment-1", amount: 100_000, date: "2026-07-01" },
          { id: "payment-2", amount: 150_000, date: "2026-07-31" },
          { id: "payment-1", amount: 999_000, date: "2026-07-02" },
          { id: "invalid", amount: 0, date: "not-a-date" }
        ]
      }
    ]);

    expect(debt.payments).toHaveLength(2);
    expect(debt.payments?.map((payment) => payment.id)).toEqual([
      "payment-2",
      "payment-1"
    ]);
    expect(debt.payments?.[0].date).toBe("2026-07-31");
  });

  it("keeps payment meaning explicit and defaults legacy debts to unknown", () => {
    const normalized = normalizeDebtRecords([
      {
        id: "planned-card-payment",
        type: "Tarjeta de crédito",
        monthlyPayment: 500_000,
        monthlyPaymentType: "self_selected",
        minimumMonthlyPayment: 175_000,
        paymentFlexibility: "negotiable",
        status: "on_track"
      },
      {
        id: "legacy-debt",
        type: "Préstamo",
        monthlyPayment: 300_000,
        status: "on_track"
      }
    ]);

    expect(normalized[0]).toMatchObject({
      monthlyPaymentType: "self_selected",
      minimumMonthlyPayment: 175_000,
      paymentFlexibility: "negotiable"
    });
    expect(normalized[1]).toMatchObject({
      monthlyPaymentType: "unknown",
      minimumMonthlyPayment: null,
      paymentFlexibility: "unknown"
    });
  });
});

describe("goal planning data normalization", () => {
  it("preserves a target month and a minimum initial amount", () => {
    const [goal] = normalizeFinancialGoals([
      {
        id: "education",
        title: "Ahorrar para estudiar",
        type: "education",
        horizon: "Menos de 6 meses",
        priority: "Muy alta",
        amountRange: null,
        targetAmount: 12_000_000,
        targetMonth: "2027-01",
        minimumInitialAmount: 6_000_000
      }
    ], new Date(2026, 7, 1));

    expect(goal).toMatchObject({
      targetAmount: 12_000_000,
      targetMonth: "2027-01",
      minimumInitialAmount: 6_000_000
    });
    expect(goal).not.toHaveProperty("horizon");
  });

  it("converts the previous exact-date format to month and year", () => {
    const [goal] = normalizeFinancialGoals([
      {
        id: "education",
        title: "Ahorrar para estudiar",
        type: "education",
        horizon: "Menos de 6 meses",
        priority: "Muy alta",
        amountRange: null,
        targetDate: "2027-02-15"
      }
    ], new Date(2026, 7, 1));

    expect(goal.targetMonth).toBe("2027-02");
    expect(goal).not.toHaveProperty("horizon");
  });

  it("replaces a legacy horizon with one concrete target month", () => {
    const [goal] = normalizeFinancialGoals(
      [
        {
          id: "legacy",
          title: "Ahorrar para estudiar",
          horizon: "Menos de 6 meses",
          priority: "Alta"
        }
      ],
      new Date(2026, 7, 1)
    );

    expect(goal.targetMonth).toBe("2026-11");
    expect(goal).not.toHaveProperty("horizon");
  });

  it("removes legacy horizon keys from the profile saved in Supabase", () => {
    const normalized = normalizeOnboardingData(
      {
        ...makeOnboarding(),
        financialGoal: "Ahorrar para estudiar",
        goalHorizon: "Menos de 6 meses",
        goalPriority: "Alta",
        goals: [
          {
            id: "legacy",
            title: "Ahorrar para estudiar",
            type: "education",
            horizon: "Menos de 6 meses",
            priority: "Alta",
            amountRange: null
          }
        ]
      } as unknown as Partial<OnboardingData> & { goalHorizon: string },
      new Date(2026, 7, 1)
    );

    expect(normalized).not.toHaveProperty("goalHorizon");
    expect(normalized.goals[0]).toMatchObject({ targetMonth: "2026-11" });
    expect(normalized.goals[0]).not.toHaveProperty("horizon");
  });
});
