import { describe, expect, it } from "vitest";

import {
  hasCompletedOnboarding,
  normalizeDebtRecords,
  type OnboardingData
} from "../types/financial";
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
});
