import { describe, expect, it } from "vitest";

import { getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import {
  getPlanPreferenceGoalBudget,
  resolvePlanPreference
} from "../utils/planPreference";
import { makeGoal, makeOnboarding } from "./fixtures/financial";

const exactValues = {
  currentSavings: 0,
  monthlyExpenses: 2_000_000,
  monthlyIncome: 4_000_000,
  smallExpenses: 0
};

function makeGoalPreference(
  overrides: Partial<NonNullable<ReturnType<typeof makeOnboarding>["simulationPlanPreference"]>> = {}
) {
  return {
    strategy: "prioritize_goal" as const,
    goalId: "goal-1",
    protectedMarginMode: "automatic" as const,
    customProtectedMargin: null,
    selectedAt: "2026-08-04T12:00:00.000Z",
    ...overrides
  };
}

describe("simulation plan preference", () => {
  it("recalculates the goal reference when the financial inputs change", () => {
    const onboarding = makeOnboarding({
      debtPaymentShare: "No pago deudas",
      debtSituation: "No tengo deudas",
      goals: [makeGoal()],
      simulationPlanPreference: makeGoalPreference()
    });

    const firstResult = resolvePlanPreference({ exactValues, onboarding });
    const updatedResult = resolvePlanPreference({
      exactValues: { ...exactValues, monthlyIncome: 5_000_000 },
      onboarding
    });

    expect(firstResult).toMatchObject({
      goalId: "goal-1",
      isApplicable: true,
      monthlyReference: 1_800_000,
      priorityKey: "advance_goal",
      strategy: "prioritize_goal"
    });
    expect(updatedResult.monthlyReference).toBe(2_700_000);
  });

  it("respects a custom protected margin without storing a frozen contribution", () => {
    const onboarding = makeOnboarding({
      debtPaymentShare: "No pago deudas",
      debtSituation: "No tengo deudas",
      goals: [makeGoal()],
      simulationPlanPreference: makeGoalPreference({
        protectedMarginMode: "custom",
        customProtectedMargin: 500_000
      })
    });

    expect(resolvePlanPreference({ exactValues, onboarding }).monthlyReference).toBe(
      1_500_000
    );
  });

  it("falls back safely when the selected goal no longer exists", () => {
    const onboarding = makeOnboarding({
      debtPaymentShare: "No pago deudas",
      debtSituation: "No tengo deudas",
      goals: [makeGoal()],
      simulationPlanPreference: makeGoalPreference({ goalId: "deleted-goal" })
    });
    const preference = resolvePlanPreference({ exactValues, onboarding });

    expect(preference).toMatchObject({
      goalId: "deleted-goal",
      isApplicable: false,
      strategy: "prioritize_goal"
    });
    expect(
      getPlanPreferenceGoalBudget({
        fallbackMonthlyBudget: 450_000,
        preference
      })
    ).toBe(450_000);
  });

  it("directs the recommended budget to the selected goal while preserving manual values", () => {
    const selectedGoal = makeGoal({
      id: "goal-2",
      isPrimary: false,
      title: "Especialización"
    });
    const onboarding = makeOnboarding({
      goalMonthlyBudget: 600_000,
      goals: [
        makeGoal({ manualMonthlyContribution: 200_000 }),
        selectedGoal
      ]
    });
    const plan = getGoalPlanFromOnboarding(onboarding, 1_000_000, exactValues, {
      preferredGoalId: selectedGoal.id
    });

    expect(plan.monthlyGoalBudget).toBe(600_000);
    expect(plan.allocations.find((item) => item.goal.id === "goal-1")?.monthlyContribution)
      .toBe(200_000);
    expect(plan.allocations.find((item) => item.goal.id === "goal-2")?.monthlyContribution)
      .toBe(600_000);
  });
});
