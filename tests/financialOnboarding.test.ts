import { describe, expect, it } from "vitest";

import {
  hasCompletedOnboarding,
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
