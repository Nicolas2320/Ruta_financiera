import { describe, expect, it } from "vitest";

import {
  getMonthlyActions,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getPriorityDebt
} from "../utils/monthlyPlan";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

describe("monthly debt plan", () => {
  it("prioritizes an overdue debt before rate and payment size", () => {
    const overdueDebt = makeDebt({
      id: "overdue",
      name: "Tarjeta atrasada",
      annualInterestRate: 18,
      monthlyPayment: 120_000,
      status: "overdue"
    });
    const expensiveDebt = makeDebt({
      id: "expensive",
      name: "Crédito costoso",
      annualInterestRate: 42,
      monthlyPayment: 500_000
    });

    expect(getPriorityDebt([expensiveDebt, overdueDebt])?.id).toBe("overdue");
  });

  it("uses the highest registered annual rate when no debt is overdue", () => {
    const lowerRateDebt = makeDebt({
      id: "lower",
      annualInterestRate: 18,
      monthlyPayment: 500_000
    });
    const higherRateDebt = makeDebt({
      id: "higher",
      annualInterestRate: 36,
      monthlyPayment: 150_000
    });

    expect(getPriorityDebt([lowerRateDebt, higherRateDebt])?.id).toBe("higher");
  });

  it("prioritizes a payment marked as heavy before an on-track debt", () => {
    const heavyDebt = makeDebt({
      id: "heavy",
      annualInterestRate: null,
      monthlyPayment: 200_000,
      status: "sometimes_heavy"
    });
    const onTrackDebt = makeDebt({
      id: "on-track",
      annualInterestRate: 40,
      monthlyPayment: 350_000,
      status: "on_track"
    });

    expect(getPriorityDebt([onTrackDebt, heavyDebt])?.id).toBe("heavy");
  });

  it("personalizes the debt action with the registered priority", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [
          makeDebt({
            name: "Tarjeta principal",
            annualInterestRate: 32,
            status: "overdue"
          })
        ],
        debtPaymentShare: "Más del 40%",
        debtSituation: "Son una preocupación importante",
        expensesRange: "$2.000.000 – $4.000.000",
        incomeRange: "$3.000.000 – $5.000.000"
      })
    );
    const metrics = getMonthlyPlanMetrics(data);
    const actions = getMonthlyActions(data, metrics, "debt_pressure");

    expect(actions[1]).toMatchObject({
      id: "debt-pressure-source",
      title: "Revisar primero: Tarjeta principal"
    });
    expect(actions[1].description).toContain("pagos atrasados");
    expect(actions[1].estimatedImpact).toContain("32% E.A.");
  });

  it("does not prioritize a debt whose confirmed balance is zero", () => {
    const paidDebt = makeDebt({
      id: "paid",
      remainingAmount: 0,
      status: "overdue",
      annualInterestRate: 50
    });
    const activeDebt = makeDebt({ id: "active", remainingAmount: 500_000 });

    expect(getPriorityDebt([paidDebt, activeDebt])?.id).toBe("active");
    expect(getPriorityDebt([paidDebt])).toBeNull();
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
