import { describe, expect, it } from "vitest";

import {
  getMonthlyActions,
  getMonthlyPlanData,
  getMonthlyPlanMetrics
} from "../utils/monthlyPlan";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

describe("monthly debt plan", () => {
  it("asks for detailed debts when the diagnosis only has a debt reference", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [],
        hasDebts: true,
        debtMonthlyPaymentRange: "$250.000 – $500.000"
      })
    );
    const metrics = getMonthlyPlanMetrics(data);
    const actions = getMonthlyActions(data, metrics, "debt_pressure");

    expect(actions.map((action) => action.id)).toEqual(["register-debts"]);
  });

  it("does not show debt actions after an explicit no-debt answer", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debtPaymentShare: "No pago deudas",
        debtSituation: "No tengo deudas",
        hasDebts: false
      })
    );
    const metrics = getMonthlyPlanMetrics(data);

    expect(getMonthlyActions(data, metrics, "debt_pressure")).toEqual([]);
  });

  it("offers simulation when active debts and positive monthly margin are available", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [
          makeDebt({
            monthlyPayment: 900_000,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 5_000_000
          })
        ],
        hasDebts: true,
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000,
      smallExpenses: 0
    });

    expect(getMonthlyActions(data, metrics, "debt_pressure").map((action) => action.id)).toEqual([
      "compare-debt-strategies"
    ]);
  });

  it("does not offer simulation without money available to distribute", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [
          makeDebt({
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required"
          })
        ],
        hasDebts: true,
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 2_000_000,
      smallExpenses: 0
    });

    expect(getMonthlyActions(data, metrics, "debt_pressure")).toEqual([]);
  });

  it("does not keep debt pressure after every detailed debt is paid", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [makeDebt({ remainingAmount: 0, status: "overdue" })],
        debtPaymentShare: "Más del 40%",
        debtSituation: "Son una preocupación importante",
        hasDebts: true,
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000,
      smallExpenses: 0
    });

    expect(metrics.snapshot.priority.key).not.toBe("debt_pressure");
  });

  it("carries the new onboarding debt payment into monthly plan metrics", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        hasDebts: true,
        debtMonthlyPaymentRange: "$250.000 \u2013 $500.000",
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyDebtPayments: 400_000,
      monthlyExpenses: 2_000_000,
      monthlyIncome: 4_000_000
    });

    expect(data).toMatchObject({
      hasDebts: true,
      debtMonthlyPaymentRange: "$250.000 \u2013 $500.000"
    });
    expect(metrics.snapshot.debt).toMatchObject({
      monthlyPaymentTotal: 400_000,
      reportedPaymentKind: "exact"
    });
    expect(metrics.estimatedMargin).toBe(1_600_000);
  });
});

describe("monthly emergency-fund action", () => {
  it("invites the user to create the emergency goal when it does not exist", () => {
    const data = getMonthlyPlanData(makeOnboarding({ goals: [] }));
    const metrics = getMonthlyPlanMetrics(data);
    const actions = getMonthlyActions(data, metrics, "build_emergency_fund");

    expect(actions[0]).toMatchObject({
      id: "create-emergency-goal",
      title: "Crear fondo de emergencia en Metas"
    });
  });

  it("keeps the contribution action when an emergency goal is already active", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({ goals: [makeGoal({ type: "security" })] })
    );
    const metrics = getMonthlyPlanMetrics(data);
    const actions = getMonthlyActions(data, metrics, "build_emergency_fund");

    expect(actions[0]?.id).toBe("initial-emergency-contribution");
  });

  it("keeps the emergency goal as a monthly task while honoring a goal-focused plan", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        goals: [
          makeGoal({
            title: "Empezar a invertir",
            type: "investment"
          })
        ]
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      currentSavings: 0,
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    });
    const actions = getMonthlyActions(data, metrics, "advance_goal", {
      title: "Empezar a invertir",
      monthlyContribution: 900_000,
      estimatedMonthsToGoal: 14
    });

    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({
      id: "set-goal-contribution",
      title: "Registrar el primer aporte para Empezar a invertir"
    });
    expect(actions[2]?.id).toBe("create-emergency-goal");
  });

  it("invites another real contribution after the goal has progress", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({ goals: [makeGoal({ currentAmount: 300_000 })] })
    );
    const metrics = getMonthlyPlanMetrics(data);
    const actions = getMonthlyActions(data, metrics, "advance_goal", {
      title: "Viaje",
      monthlyContribution: 500_000,
      estimatedMonthsToGoal: 10,
      hasRegisteredContribution: true
    });

    expect(actions[0]?.title).toBe("Registrar otro aporte para Viaje");
    expect(actions[0]?.description).toContain("desde Metas");
  });
});
