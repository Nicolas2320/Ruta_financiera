import { describe, expect, it } from "vitest";

import { applyGoalContribution } from "../utils/goalContributions";
import { makeGoal } from "./fixtures/financial";

describe("goal contributions", () => {
  it("completes a goal by registering the exact remaining amount", () => {
    const goals = [
      makeGoal({
        currentAmount: 514_900,
        targetAmount: 6_000_000,
        title: "Ahorrar para estudiar"
      })
    ];

    const [completedGoal] = applyGoalContribution(goals, goals[0].id, {
      amount: 5_485_100,
      date: "2026-08-07T12:00:00.000Z",
      id: "complete-goal",
      source: "manual"
    });

    expect(completedGoal).toMatchObject({
      currentAmount: 6_000_000,
      status: "completed",
      contributions: [
        {
          amount: 5_485_100,
          id: "complete-goal",
          source: "manual"
        }
      ]
    });
  });
});
