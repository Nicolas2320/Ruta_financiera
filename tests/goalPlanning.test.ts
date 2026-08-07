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
        makeGoal({ id: "emergency", type: "security" }),
        makeGoal({
          id: "education",
          title: "Estudios",
          type: "education",
          targetAmount: 6_000_000,
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
        makeGoal({ id: "principal", isPrimary: true }),
        makeGoal({ id: "secondary", isPrimary: false })
      ],
      monthlyGoalBudget: 300_000
    });
    const principal = plan.allocations.find((allocation) => allocation.goal.id === "principal");
    const secondary = plan.allocations.find((allocation) => allocation.goal.id === "secondary");

    expect(principal?.score).toBeGreaterThan(secondary?.score ?? 0);
    expect(principal?.recommendedMonthlyContribution).toBe(180_000);
    expect(secondary?.recommendedMonthlyContribution).toBe(120_000);
  });

  it("gives the principal a moderate advantage without fixing a sixty-percent share", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "principal", isPrimary: true }),
        makeGoal({ id: "trip", isPrimary: false, title: "Viaje" }),
        makeGoal({ id: "study", isPrimary: false, title: "Estudios" })
      ],
      monthlyGoalBudget: 1_000_000
    });

    const contributions = Object.fromEntries(
      plan.allocations.map((allocation) => [
        allocation.goal.id,
        allocation.monthlyContribution
      ])
    );

    expect(contributions.principal).toBeGreaterThan(contributions.trip);
    expect(contributions.principal).toBeGreaterThan(contributions.study);
    expect(Math.abs(contributions.trip - contributions.study)).toBeLessThanOrEqual(1);
    expect(Object.values(contributions).reduce((total, amount) => total + amount, 0)).toBe(
      1_000_000
    );
  });

  it("lets an urgent secondary goal outweigh the principal bonus", () => {
    const plan = getGoalAllocationPlan({
      asOfDate: new Date(2026, 7, 1),
      goals: [
        makeGoal({ id: "principal", isPrimary: true, targetMonth: "2028-08" }),
        makeGoal({
          id: "urgent",
          isPrimary: false,
          targetAmount: 1_000_000,
          targetMonth: "2026-10",
          title: "Urgente"
        })
      ],
      monthlyGoalBudget: 700_000
    });
    const principal = plan.allocations.find((allocation) => allocation.goal.id === "principal");
    const urgent = plan.allocations.find((allocation) => allocation.goal.id === "urgent");

    expect(urgent?.monthlyContribution).toBeGreaterThan(principal?.monthlyContribution ?? 0);
    expect(plan.monthlyContributionTotal).toBe(700_000);
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

  it("reports when an explicit scenario allocation exceeds the available budget", () => {
    const plan = getGoalAllocationPlan({
      goals: [
        makeGoal({ id: "one" }),
        makeGoal({ id: "two", isPrimary: false })
      ],
      monthlyContributions: { one: 250_000, two: 200_000 },
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
