import { describe, expect, it } from "vitest";

import {
  getMonthlyActions,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getPriorityDebt
} from "../utils/monthlyPlan";
import { makeDebt, makeOnboarding } from "./fixtures/financial";

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
});
