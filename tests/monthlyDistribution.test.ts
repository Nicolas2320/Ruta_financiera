import { describe, expect, it } from "vitest";

import { getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import { resolveMonthlyDistribution } from "../utils/monthlyDistribution";
import {
  getPlanPreferenceGoalBudget,
  getPlanPreferenceGoalPlanOptions,
  getPlanPreferencePreferredGoalId,
  resolvePlanPreference
} from "../utils/planPreference";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

const exactValues = {
  currentSavings: 0,
  monthlyExpenses: 1_000_000,
  monthlyIncome: 4_000_000,
  smallExpenses: 0
};

function makeDetailedOnboarding(
  strategy: "accelerate_goal" | "reduce_interest" | "split_debt_goal"
) {
  return makeOnboarding({
    debts: [
      makeDebt({
        annualInterestRate: 28,
        monthlyPayment: 500_000,
        monthlyPaymentType: "minimum_required",
        remainingAmount: 5_000_000
      })
    ],
    goals: [
      makeGoal({
        id: "investment-goal",
        targetAmount: 10_000_000,
        title: "Empezar a invertir",
        type: "investment"
      })
    ],
    simulationPlanPreference: {
      strategy,
      goalId: strategy === "reduce_interest" ? null : "investment-goal",
      debtShare: strategy === "split_debt_goal" ? 0.4 : null,
      protectedMarginMode: "automatic",
      customProtectedMargin: null,
      selectedAt: "2026-08-07T12:00:00.000Z"
    }
  });
}

function getGoalPlanForPreference(
  onboarding: ReturnType<typeof makeDetailedOnboarding>
) {
  const preference = resolvePlanPreference({ exactValues, onboarding });
  const preferredGoalId = getPlanPreferencePreferredGoalId({
    onboarding,
    preference
  });
  const budget = getPlanPreferenceGoalBudget({
    fallbackMonthlyBudget: 500_000,
    preference,
    preferredGoalId
  });

  return {
    plan: getGoalPlanFromOnboarding(
      onboarding,
      budget,
      exactValues,
      getPlanPreferenceGoalPlanOptions(preference, preferredGoalId)
    ),
    preference
  };
}

describe("resolved monthly distribution", () => {
  it("uses the exact same goal contribution in simulation and Goals", () => {
    const onboarding = makeDetailedOnboarding("accelerate_goal");
    const distribution = resolveMonthlyDistribution({ exactValues, onboarding });
    const { plan, preference } = getGoalPlanForPreference(onboarding);

    expect(distribution).toMatchObject({
      distributableAmount: 2_250_000,
      extraDebtPaymentsTotal: 0,
      goalContributionTotal: 2_250_000,
      protectedMargin: 250_000,
      status: "ready",
      unassignedAmount: 0
    });
    expect(preference.goalMonthlyContribution).toBe(2_250_000);
    expect(plan.monthlyContributionTotal).toBe(2_250_000);
    expect(plan.allocations[0]?.monthlyContribution).toBe(2_250_000);
  });

  it("keeps goal contributions at zero when the selected strategy prioritizes debt", () => {
    const onboarding = makeDetailedOnboarding("reduce_interest");
    const distribution = resolveMonthlyDistribution({ exactValues, onboarding });
    const { plan } = getGoalPlanForPreference(onboarding);

    expect(distribution.extraDebtPaymentsTotal).toBe(2_250_000);
    expect(distribution.goalContributionTotal).toBe(0);
    expect(plan.monthlyContributionTotal).toBe(0);
  });

  it("persists the debt share and balances debt, goals and unassigned money", () => {
    const onboarding = makeDetailedOnboarding("split_debt_goal");
    const distribution = resolveMonthlyDistribution({ exactValues, onboarding });
    const { plan } = getGoalPlanForPreference(onboarding);

    expect(distribution.extraDebtPaymentsTotal).toBe(900_000);
    expect(distribution.goalContributionTotal).toBe(1_350_000);
    expect(plan.monthlyContributionTotal).toBe(1_350_000);
    expect(
      distribution.extraDebtPaymentsTotal +
        distribution.goalContributionTotal +
        distribution.unassignedAmount
    ).toBe(distribution.distributableAmount);
  });

  it("recalculates amounts from current inputs while preserving the strategy", () => {
    const onboarding = makeDetailedOnboarding("split_debt_goal");
    const first = resolveMonthlyDistribution({ exactValues, onboarding });
    const updated = resolveMonthlyDistribution({
      exactValues: { ...exactValues, monthlyIncome: 5_000_000 },
      onboarding
    });

    expect(first.selectedStrategy).toBe("split_debt_goal");
    expect(updated.selectedStrategy).toBe("split_debt_goal");
    expect(updated.distributableAmount).toBeGreaterThan(first.distributableAmount);
    expect(updated.goalContributionTotal).toBeGreaterThan(first.goalContributionTotal);
  });

  it("leaves the remainder unassigned after a manual goal contribution", () => {
    const onboarding = makeOnboarding({
      debtPaymentShare: "No pago deudas",
      debtSituation: "No tengo deudas",
      goals: [
        makeGoal({
          id: "investment-goal",
          manualMonthlyContribution: 600_000,
          title: "Empezar a invertir",
          type: "investment"
        })
      ],
      simulationPlanPreference: {
        strategy: "current_reference",
        goalId: null,
        debtShare: null,
        protectedMarginMode: "automatic",
        customProtectedMargin: null,
        selectedAt: "2026-08-07T12:00:00.000Z"
      }
    });
    const distribution = resolveMonthlyDistribution({ exactValues, onboarding });

    expect(distribution.goalContributionTotal).toBe(600_000);
    expect(distribution.extraDebtPaymentsTotal).toBe(0);
    expect(distribution.unassignedAmount).toBe(
      distribution.distributableAmount - 600_000
    );
  });
});
