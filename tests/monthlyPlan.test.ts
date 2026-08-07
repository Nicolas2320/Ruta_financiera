import { describe, expect, it } from "vitest";

import {
  getMonthlyActions,
  getMonthlyActionProgressId,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanProgressKey
} from "../utils/monthlyPlan";
import { getGoalPlanFromOnboarding } from "../utils/goalPlanning";
import { getEffectiveMonthlyPlanProgress } from "../utils/monthlyPlanProgress";
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
      "register-debt-payments",
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

    expect(getMonthlyActions(data, metrics, "debt_pressure").map((action) => action.id)).toEqual([
      "register-debt-payments"
    ]);
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

describe("monthly cashflow plan", () => {
  it("asks for exact cashflow data and categories when the diagnosis only has estimates", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        expenseCategories: [],
        expensesRange: "$2.000.000 – $4.000.000",
        incomeRange: "$1.500.000 – $3.000.000"
      })
    );
    const metrics = getMonthlyPlanMetrics(data);

    const actions = getMonthlyActions(data, metrics, "organize_cashflow");

    expect(actions.map((action) => action.id)).toEqual([
      "confirm-monthly-income",
      "confirm-monthly-expenses",
      "select-expense-categories"
    ]);
    expect(actions.slice(0, 2).map((action) => action.title)).toEqual([
      "Ingresar mi ingreso mensual promedio",
      "Ingresar mis gastos mensuales promedio"
    ]);
  });

  it("only asks for categories when exact cashflow has no recurring category", () => {
    const data = getMonthlyPlanData(makeOnboarding({ expenseCategories: ["Deudas"] }));
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 3_000_000,
      monthlyIncome: 2_000_000
    });

    expect(getMonthlyActions(data, metrics, "organize_cashflow").map((action) => action.id)).toEqual([
      "select-expense-categories"
    ]);
  });

  it("unlocks category amounts after the user selects categories", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        expenseCategories: ["Alimentación", "Transporte"],
        expenseCategoryAmounts: { Alimentación: 700_000 }
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 3_000_000,
      monthlyIncome: 2_000_000
    });

    expect(getMonthlyActions(data, metrics, "organize_cashflow").map((action) => action.id)).toEqual([
      "enter-category-amounts"
    ]);
  });

  it("finishes the cashflow actions when every selected category has a valid amount", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        expenseCategories: ["Alimentación", "Transporte"],
        expenseCategoryAmounts: { Alimentación: 700_000, Transporte: 300_000 }
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 3_000_000,
      monthlyIncome: 2_000_000
    });

    expect(getMonthlyActions(data, metrics, "organize_cashflow")).toEqual([]);
  });

  it("asks to review category amounts when their sum exceeds monthly expenses", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        expenseCategories: ["Alimentación", "Transporte"],
        expenseCategoryAmounts: { Alimentación: 2_000_000, Transporte: 2_000_000 }
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 3_000_000,
      monthlyIncome: 2_000_000
    });

    expect(getMonthlyActions(data, metrics, "organize_cashflow")[0]).toMatchObject({
      id: "enter-category-amounts",
      why: "La suma actual supera tus gastos mensuales y conviene revisarla."
    });
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

  it("uses the general goals flow when an emergency goal is already active", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        goals: [
          makeGoal({ type: "security" }),
          makeGoal({ id: "goal-2", isPrimary: false, title: "Viaje", type: "wellbeing" })
        ],
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    });
    const actions = getMonthlyActions(data, metrics, "build_emergency_fund", {
      activeGoalCount: 2,
      monthlyContributionTotal: 900_000
    });

    expect(actions.map((action) => action.id)).toEqual([
      "set-goal-contribution",
      "compare-goal-contribution"
    ]);
    expect(actions[0]).toMatchObject({
      title: "Registrar aportes a mis metas",
      estimatedImpact: "Tu estrategia distribuye $900.000 aprox. al mes entre 2 metas."
    });
  });

  it("only asks to create the emergency goal while it is missing", () => {
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

    expect(actions).toEqual([
      expect.objectContaining({ id: "create-emergency-goal" })
    ]);
  });

  it("keeps only the general contribution action when there is no margin to simulate", () => {
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

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: "set-goal-contribution",
      title: "Registrar aportes a mis metas"
    });
    expect(actions.some((action) => action.id === "review-goal-target")).toBe(false);
  });

  it("does not recreate a completed emergency goal", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({
        goals: [
          makeGoal({
            currentAmount: 500_000,
            status: "completed",
            targetAmount: 500_000
          })
        ],
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    });

    expect(metrics.snapshot.priority.key).not.toBe("build_emergency_fund");
    expect(
      getMonthlyActions(data, metrics, "build_emergency_fund").some(
        (action) => action.id === "create-emergency-goal"
      )
    ).toBe(false);
  });

  it("keeps the contribution action in progress until every active goal has an aporte", () => {
    const periodKey = "2026-08";
    const exactValues = {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    };
    const onboarding = makeOnboarding({
      goals: [
        makeGoal(),
        makeGoal({
          contributions: [
            {
              id: "contribution-goal-2",
              amount: 150_000,
              date: "2026-08-07T12:00:00.000Z",
              source: "manual"
            }
          ],
          currentAmount: 150_000,
          id: "goal-2",
          isPrimary: false,
          title: "Viaje",
          type: "wellbeing"
        })
      ],
      monthlyExpensesIncludesSmallExpenses: true
    });
    const data = getMonthlyPlanData(onboarding);
    const metrics = getMonthlyPlanMetrics(data, exactValues);
    const goalPlan = getGoalPlanFromOnboarding(onboarding, 900_000, exactValues);
    const actions = getMonthlyActions(data, metrics, "build_emergency_fund", {
      activeGoalCount: 2,
      monthlyContributionTotal: goalPlan.monthlyContributionTotal
    });
    const planProgressKey = getMonthlyPlanProgressKey(
      metrics,
      actions,
      "build_emergency_fund",
      periodKey
    );
    const progress = getEffectiveMonthlyPlanProgress({
      actions,
      completedActions: {},
      goalAllocations: goalPlan.allocations,
      periodKey,
      planProgressKey
    });
    const contributionProgressId = getMonthlyActionProgressId(
      planProgressKey,
      "set-goal-contribution"
    );

    expect(progress.completedCount).toBe(0);
    expect(progress.effectiveCompletedActions[contributionProgressId]).toMatchObject({
      status: "in_progress",
      evidence: {
        amount: 150_000,
        detail: "1 de 2 metas con aporte registrado",
        label: "Aporte a metas"
      }
    });
    expect(progress.impactSummary.realContributionTotal).toBe(150_000);
  });

  it("completes the contribution action when every active goal has an aporte this month", () => {
    const periodKey = "2026-08";
    const exactValues = {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    };
    const onboarding = makeOnboarding({
      goals: [
        makeGoal({
          contributions: [
            {
              id: "contribution-goal-1",
              amount: 100_000,
              date: "2026-08-05T12:00:00.000Z",
              source: "manual"
            }
          ],
          currentAmount: 100_000
        }),
        makeGoal({
          contributions: [
            {
              id: "contribution-goal-2",
              amount: 150_000,
              date: "2026-08-07T12:00:00.000Z",
              source: "manual"
            }
          ],
          currentAmount: 150_000,
          id: "goal-2",
          isPrimary: false,
          title: "Viaje",
          type: "wellbeing"
        })
      ],
      monthlyExpensesIncludesSmallExpenses: true
    });
    const data = getMonthlyPlanData(onboarding);
    const metrics = getMonthlyPlanMetrics(data, exactValues);
    const goalPlan = getGoalPlanFromOnboarding(onboarding, 900_000, exactValues);
    const actions = getMonthlyActions(data, metrics, "build_emergency_fund", {
      activeGoalCount: 2,
      monthlyContributionTotal: goalPlan.monthlyContributionTotal
    });
    const planProgressKey = getMonthlyPlanProgressKey(
      metrics,
      actions,
      "build_emergency_fund",
      periodKey
    );
    const progress = getEffectiveMonthlyPlanProgress({
      actions,
      completedActions: {},
      goalAllocations: goalPlan.allocations,
      periodKey,
      planProgressKey
    });

    expect(progress.completedCount).toBe(1);
    expect(
      progress.effectiveCompletedActions[
        getMonthlyActionProgressId(planProgressKey, "set-goal-contribution")
      ]
    ).toMatchObject({
      status: "completed",
      evidence: {
        amount: 250_000,
        detail: "2 de 2 metas con aporte registrado"
      }
    });
    expect(progress.impactSummary.realContributionTotal).toBe(250_000);
  });
});

describe("monthly recurring actions", () => {
  it("keeps debt payments recurring even when debt pressure is not the main focus", () => {
    const data = getMonthlyPlanData(
      makeOnboarding({ debts: [makeDebt()], hasDebts: true })
    );
    const metrics = getMonthlyPlanMetrics(data);

    expect(getMonthlyActions(data, metrics, "keep_tracking").map((action) => action.id)).toEqual([
      "register-debt-payments"
    ]);
  });

  it("tracks debt payments per active debt during the current month", () => {
    const periodKey = "2026-08";
    const debts = [
      makeDebt({
        payments: [
          {
            id: "payment-1",
            amount: 200_000,
            date: "2026-08-04"
          }
        ]
      }),
      makeDebt({ id: "debt-2", name: "Crédito", remainingAmount: 1_000_000 })
    ];
    const data = getMonthlyPlanData(
      makeOnboarding({ debts, hasDebts: true, monthlyExpensesIncludesSmallExpenses: true })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    });
    const actions = getMonthlyActions(data, metrics, "debt_pressure");
    const planProgressKey = getMonthlyPlanProgressKey(
      metrics,
      actions,
      "debt_pressure",
      periodKey
    );
    const progress = getEffectiveMonthlyPlanProgress({
      actions,
      completedActions: {},
      debts,
      goalAllocations: [],
      periodKey,
      planProgressKey
    });

    expect(
      progress.effectiveCompletedActions[
        getMonthlyActionProgressId(planProgressKey, "register-debt-payments")
      ]
    ).toMatchObject({
      status: "in_progress",
      evidence: {
        amount: 200_000,
        detail: "1 de 2 deudas con pago registrado"
      }
    });
    expect(progress.impactSummary.realContributionTotal).toBe(200_000);
  });

  it("completes a simulation action only after saving a strategy this month", () => {
    const periodKey = "2026-08";
    const data = getMonthlyPlanData(
      makeOnboarding({
        debts: [makeDebt()],
        hasDebts: true,
        monthlyExpensesIncludesSmallExpenses: true
      })
    );
    const metrics = getMonthlyPlanMetrics(data, {
      monthlyExpenses: 1_500_000,
      monthlyIncome: 4_000_000
    });
    const actions = getMonthlyActions(data, metrics, "debt_pressure");
    const planProgressKey = getMonthlyPlanProgressKey(
      metrics,
      actions,
      "debt_pressure",
      periodKey
    );
    const progress = getEffectiveMonthlyPlanProgress({
      actions,
      completedActions: {},
      debts: data.debts,
      goalAllocations: [],
      periodKey,
      planProgressKey,
      simulationPlanPreference: {
        strategy: "reduce_interest",
        goalId: null,
        debtShare: null,
        protectedMarginMode: "automatic",
        customProtectedMargin: null,
        selectedAt: "2026-08-07T12:00:00.000Z"
      }
    });

    expect(
      progress.effectiveCompletedActions[
        getMonthlyActionProgressId(planProgressKey, "compare-debt-strategies")
      ]
    ).toMatchObject({
      status: "completed",
      evidence: {
        detail: "Repartir solo a deudas",
        label: "Estrategia guardada"
      }
    });
  });

  it("does not generate the discarded small-expense, investing or tracking actions", () => {
    const data = getMonthlyPlanData(makeOnboarding());
    const metrics = getMonthlyPlanMetrics(data);

    expect(getMonthlyActions(data, metrics, "review_small_expenses")).toEqual([]);
    expect(getMonthlyActions(data, metrics, "learn_investing")).toEqual([]);
    expect(getMonthlyActions(data, metrics, "keep_tracking")).toEqual([]);
  });
});
