import { describe, expect, it } from "vitest";

import { buildSimulationExperience } from "../utils/simulationExperience";
import { makeDebt, makeOnboarding } from "./fixtures/financial";

const exactCashflow = {
  monthlyExpenses: 2_500_000,
  monthlyIncome: 4_000_000,
  smallExpenses: 100_000
};

describe("buildSimulationExperience", () => {
  it("keeps a reported debt percentage as a range and plans with its cautious end", () => {
    const experience = buildSimulationExperience({
      exactValues: exactCashflow,
      onboarding: makeOnboarding({
        debtPaymentShare: "10% – 20%",
        debtSituation: "Tengo deudas, pero las pago sin problema"
      })
    });

    expect(experience.mode).toBe("reported_debt");
    expect(experience.debtPaymentRange).toEqual({ maximum: 800_000, minimum: 400_000 });
    expect(experience.monthlyMarginRange).toEqual({ maximum: 1_000_000, minimum: 600_000 });
    expect(experience.planningMonthlyMargin).toBe(600_000);
    expect(experience.recommendedMonthlyContribution).toBeGreaterThan(0);
    expect(experience.recommendedMonthlyContribution).toBeLessThanOrEqual(600_000);
  });

  it("uses the goal-only experience when the person reports no debt", () => {
    const experience = buildSimulationExperience({
      exactValues: exactCashflow,
      onboarding: makeOnboarding({
        debtPaymentShare: "No pago deudas",
        debtSituation: "No tengo deudas"
      })
    });

    expect(experience.mode).toBe("goal_only");
    expect(experience.debtPaymentRange).toEqual({ maximum: 0, minimum: 0 });
    expect(experience.planningMonthlyMargin).toBe(1_400_000);
  });

  it("does not interpret missing debt information as having no debt", () => {
    const experience = buildSimulationExperience({
      exactValues: exactCashflow,
      onboarding: makeOnboarding()
    });

    expect(experience.mode).toBe("reported_debt");
    expect(experience.debtPaymentRange).toEqual({ maximum: null, minimum: null });
    expect(experience.planningMonthlyMargin).toBeNull();
  });

  it("keeps the full comparison when active debt records exist", () => {
    const experience = buildSimulationExperience({
      exactValues: exactCashflow,
      onboarding: makeOnboarding({
        debtPaymentShare: "10% – 20%",
        debtSituation: "Tengo deudas, pero las pago sin problema",
        debts: [makeDebt({ monthlyPayment: 500_000 })]
      })
    });

    expect(experience.mode).toBe("detailed_debt");
    expect(experience.debtDataSource).toBe("registered");
  });

  it("does not invent a safe planning amount for an open-ended debt range", () => {
    const experience = buildSimulationExperience({
      exactValues: exactCashflow,
      onboarding: makeOnboarding({
        debtPaymentShare: "Más del 40%",
        debtSituation: "Son una preocupación importante"
      })
    });

    expect(experience.mode).toBe("reported_debt");
    expect(experience.debtPaymentRange).toEqual({ maximum: null, minimum: 1_600_000 });
    expect(experience.monthlyMarginRange).toEqual({ maximum: -200_000, minimum: null });
    expect(experience.planningMonthlyMargin).toBeNull();
    expect(experience.recommendedMonthlyContribution).toBe(0);
  });
});
