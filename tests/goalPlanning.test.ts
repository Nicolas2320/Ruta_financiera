import { describe, expect, it } from "vitest";

import {
  getGoalAllocationPlan,
  getGoalPlanningMonths
} from "../utils/goalPlanning";
import { makeGoal } from "./fixtures/financial";

describe("goal planning", () => {
  it("uses the selected target month as the only planning deadline", () => {
    expect(
      getGoalPlanningMonths(
        makeGoal({ targetMonth: "2027-01" }),
        new Date(2026, 7, 1)
      )
    ).toBe(5);
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

  it("uses the principal goal instead of legacy importance when recommending a split", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "principal", priority: "Baja", isPrimary: true }),
        makeGoal({ id: "secondary", priority: "Muy alta", isPrimary: false })
      ],
      monthlyGoalBudget: 300_000
    });
    const principal = plan.allocations.find((allocation) => allocation.goal.id === "principal");
    const secondary = plan.allocations.find((allocation) => allocation.goal.id === "secondary");

    expect(principal?.score).toBeGreaterThan(secondary?.score ?? 0);
    expect(principal?.recommendedMonthlyContribution).toBeGreaterThan(
      secondary?.recommendedMonthlyContribution ?? 0
    );
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
