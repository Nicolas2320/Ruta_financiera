import { describe, expect, it } from "vitest";

import { getGoalBudgetPresentation } from "../utils/goalBudgetPresentation";

describe("goal budget presentation", () => {
  it("separates the reference from the amount actually assigned", () => {
    expect(
      getGoalBudgetPresentation({
        assignedAmount: 400_000,
        hasExplicitPreference: false,
        mode: "recommended",
        preferredGoalId: null,
        priorityKey: "advance_goal",
        referenceAmount: 950_000
      })
    ).toEqual({
      assignedAmount: 400_000,
      availableAmount: 550_000,
      excessAmount: 0,
      referenceAmount: 950_000,
      source: "diagnosis",
      status: "partially_assigned"
    });
  });

  it("identifies a reference waiting for an emergency goal", () => {
    expect(
      getGoalBudgetPresentation({
        assignedAmount: 0,
        hasExplicitPreference: true,
        mode: "recommended",
        preferredGoalId: null,
        priorityKey: "build_emergency_fund",
        referenceAmount: 0
      })
    ).toMatchObject({
      source: "simulation",
      status: "waiting_for_emergency_goal"
    });
  });

  it("does not hide a manual contribution behind the emergency waiting state", () => {
    expect(
      getGoalBudgetPresentation({
        assignedAmount: 200_000,
        hasExplicitPreference: false,
        mode: "recommended",
        preferredGoalId: null,
        priorityKey: "build_emergency_fund",
        referenceAmount: 0
      })
    ).toMatchObject({
      excessAmount: 200_000,
      status: "over_reference"
    });
  });

  it("marks a manual reference as fully assigned", () => {
    expect(
      getGoalBudgetPresentation({
        assignedAmount: 600_000,
        hasExplicitPreference: true,
        mode: "manual",
        preferredGoalId: "goal-1",
        priorityKey: "advance_goal",
        referenceAmount: 600_000
      })
    ).toMatchObject({
      availableAmount: 0,
      source: "manual",
      status: "fully_assigned"
    });
  });
});
