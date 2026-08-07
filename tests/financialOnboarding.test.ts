import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ supabase: null }));

import {
  createFinancialGoal,
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
    incomeRange: "$3.000.000 – $5.000.000",
    expensesRange: "$2.000.000 – $4.000.000",
    expenseCategories: [],
    expensesFeeling: "A veces son difíciles de controlar",
    savingsRange: "Prefiero no responder",
    hasDebts: false,
    goals: [makeGoal()],
    ...overrides
  });
}

describe("onboarding completion", () => {
  it("does not require small-expense answers in the initial diagnosis", () => {
    expect(hasCompletedOnboarding(makeCompletedOnboarding())).toBe(true);
  });

  it("does not require legacy demographic fields for a new profile", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          ageRange: null,
          country: null,
          city: "",
          lastName: ""
        })
      )
    ).toBe(true);
  });

  it("still requires a name or nickname", () => {
    expect(hasCompletedOnboarding(makeCompletedOnboarding({ firstName: "" }))).toBe(false);
  });

  it("does not require legacy income type or frequency fields", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({ incomeType: null, incomeFrequency: null })
      )
    ).toBe(true);
  });

  it("keeps legacy small-expense answers optional for completion", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          hasSmallExpenses: "Sí",
          smallExpenseCategories: [],
          smallExpensesRange: null,
          smallExpensesIntention: null
        })
      )
    ).toBe(true);
  });

  it("does not require expense categories before entering the spending screen", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          expenseCategories: []
        })
      )
    ).toBe(true);
  });

  it("does not require declared emergency coverage or investments", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          emergencyCoverage: null,
          investmentSituation: null
        })
      )
    ).toBe(true);
  });

  it("requires a monthly payment answer when the person has debts", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          hasDebts: true,
          debtMonthlyPaymentRange: null
        })
      )
    ).toBe(false);

    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          hasDebts: true,
          debtMonthlyPaymentRange: "$250.000 \u2013 $500.000"
        })
      )
    ).toBe(true);
  });

  it("keeps legacy debt answers valid for existing profiles", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          hasDebts: null,
          debtSituation: "Prefiero no responder",
          debtPaymentShare: "Prefiero no responder"
        })
      )
    ).toBe(true);
  });

  it("does not require goal importance for the initial diagnosis", () => {
    expect(
      hasCompletedOnboarding(
        makeCompletedOnboarding({
          goalPriority: null,
          goals: [makeGoal({ priority: null })]
        })
      )
    ).toBe(true);
  });

  it("creates new goals without an importance value", () => {
    expect(
      createFinancialGoal({
        amountRange: "$1.000.000 \u2013 $5.000.000",
        isPrimary: true,
        targetMonth: "2027-03",
        title: "Ahorrar para estudiar"
      })
    ).toMatchObject({
      isPrimary: true,
      priority: null,
      targetMonth: "2027-03"
    });
  });
});

describe("simulation plan preference normalization", () => {
  it("preserves a valid strategy inside the onboarding JSON", () => {
    const normalized = normalizeOnboardingData({
      ...makeOnboarding(),
      simulationPlanPreference: {
        strategy: "prioritize_goal",
        goalId: " goal-1 ",
        debtShare: null,
        protectedMarginMode: "custom",
        customProtectedMargin: 320_000,
        selectedAt: "2026-08-04T12:00:00.000Z"
      }
    });

    expect(normalized.simulationPlanPreference).toEqual({
      strategy: "prioritize_goal",
      goalId: "goal-1",
      debtShare: null,
      protectedMarginMode: "custom",
      customProtectedMargin: 320_000,
      selectedAt: "2026-08-04T12:00:00.000Z"
    });
  });

  it("discards malformed strategies instead of applying an unknown plan", () => {
    const normalized = normalizeOnboardingData({
      ...makeOnboarding(),
      simulationPlanPreference: {
        strategy: "invented_strategy"
      } as never
    });

    expect(normalized.simulationPlanPreference).toBeNull();
  });

  it("normalizes a persisted debt and goal split in five-point steps", () => {
    const normalized = normalizeOnboardingData({
      ...makeOnboarding(),
      simulationPlanPreference: {
        strategy: "split_debt_goal",
        goalId: "goal-1",
        debtShare: 0.43,
        protectedMarginMode: "automatic",
        customProtectedMargin: null,
        selectedAt: "2026-08-04T12:00:00.000Z"
      }
    });

    expect(normalized.simulationPlanPreference).toMatchObject({
      strategy: "split_debt_goal",
      debtShare: 0.45
    });
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
  it("keeps a single target amount and drops the previous minimum field", () => {
    const [goal] = normalizeFinancialGoals([
      {
        id: "education",
        title: "Ahorrar para estudiar",
        type: "education",
        horizon: "Menos de 6 meses",
        priority: "Muy alta",
        amountRange: null,
        targetAmount: 6_000_000,
        targetMonth: "2027-01",
        minimumInitialAmount: 6_000_000
      }
    ], new Date(2026, 7, 1));

    expect(goal).toMatchObject({
      targetAmount: 6_000_000,
      targetMonth: "2027-01"
    });
    expect(goal).not.toHaveProperty("horizon");
    expect(goal).not.toHaveProperty("minimumInitialAmount");
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
