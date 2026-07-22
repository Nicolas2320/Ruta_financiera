import { describe, expect, it } from "vitest";

import { getGoalAllocationPlan, getGoalHorizonMonths } from "../utils/goalPlanning";
import { makeGoal } from "./fixtures/financial";

describe("goal planning", () => {
  it.each([
    ["Menos de 6 meses", 6],
    ["6 a 12 meses", 12],
    ["1 a 3 anos", 36],
    ["3 a 5 anos", 60],
    ["Mas de 5 anos", 72],
    ["No estoy seguro", null]
  ])("normalizes the horizon %s", (horizon, expected) => {
    expect(getGoalHorizonMonths(horizon)).toBe(expected);
  });

  it("distributes the full recommended budget without exceeding it", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "emergency", type: "security", priority: "Muy alta" }),
        makeGoal({
          id: "education",
          title: "Estudios",
          type: "education",
          targetAmount: 6_000_000,
          priority: "Media",
          isPrimary: false
        })
      ],
      monthlyGoalBudget: 300_000
    });

    expect(plan.recommendedTotal).toBe(300_000);
    expect(plan.monthlyContributionTotal).toBe(300_000);
    expect(plan.remainingBudget).toBe(0);
    expect(plan.isOverBudget).toBe(false);
    expect(plan.allocations.every((allocation) => allocation.monthlyContribution >= 0)).toBe(true);
  });

  it("does not allocate money to paused or completed goals", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "paused", status: "paused" }),
        makeGoal({ id: "completed", status: "completed", isPrimary: false })
      ],
      monthlyGoalBudget: 300_000
    });

    expect(plan.recommendedTotal).toBe(0);
    expect(plan.allocations.map((allocation) => allocation.monthlyContribution)).toEqual([0, 0]);
    expect(plan.allocations.map((allocation) => allocation.viability)).toEqual([
      "paused",
      "completed"
    ]);
  });

  it("reports when manual goal contributions exceed the available budget", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "one", manualMonthlyContribution: 250_000 }),
        makeGoal({ id: "two", manualMonthlyContribution: 200_000, isPrimary: false })
      ],
      monthlyGoalBudget: 300_000,
      monthlyGoalBudgetMode: "manual"
    });

    expect(plan.monthlyContributionTotal).toBe(450_000);
    expect(plan.remainingBudget).toBe(-150_000);
    expect(plan.isOverBudget).toBe(true);
    expect(plan.allocations.every((allocation) => allocation.contributionMode === "manual")).toBe(
      true
    );
  });
});
