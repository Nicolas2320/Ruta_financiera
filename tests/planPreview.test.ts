import { describe, expect, it } from "vitest";

import { getPlanPreviewData } from "../utils/planPreview";
import { makeGoal, makeOnboarding } from "./fixtures/financial";

describe("getPlanPreviewData", () => {
  it("builds a personalized preview from the diagnosis", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
        debtPaymentShare: "No pago deudas",
        debtSituation: "No tengo deudas",
        financialGoal: "Fondo de emergencia",
        goals: [makeGoal()]
      }),
      {
        currentSavings: 300_000,
        monthlyExpenses: 2_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 200_000
      }
    );

    expect(preview.goalTitle).toBe("Fondo de emergencia");
    expect(preview.marginLabel).toBe("$1.800.000 aprox.");
    expect(preview.marginTone).toBe("support");
    expect(preview.contributionLabel).not.toBe("Por definir");
    expect(preview.contributionPurpose.length).toBeGreaterThan(0);
    expect(preview.routeEstimateLabel).toContain("meses");
    expect(preview.firstActionTitle.length).toBeGreaterThan(0);
    expect(preview.actionCount).toBeGreaterThan(0);
    expect(preview.lockedActionTitles).toHaveLength(preview.actionCount - 1);
  });

  it("communicates a negative margin without inventing a contribution", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
        goals: [makeGoal()]
      }),
      {
        currentSavings: 0,
        monthlyExpenses: 2_500_000,
        monthlyIncome: 2_000_000,
        smallExpenses: 0
      }
    );

    expect(preview.marginLabel).toBe("-$500.000 aprox.");
    expect(preview.marginTone).toBe("warning");
    expect(preview.contributionLabel).toBe("Por definir");
  });

  it("does not overstate the plan when debt was only reported as a range", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
        debtPaymentShare: "10% – 20%",
        debtSituation: "Tengo deudas, pero las pago sin problema",
        goals: [makeGoal({ title: "Viaje" })]
      }),
      {
        currentSavings: 0,
        monthlyExpenses: 2_500_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 100_000
      }
    );

    expect(preview.contributionLabel).not.toBe("Por definir");
    expect(preview.contributionPurpose).not.toContain("avanzar hacia Viaje");
  });

  it("avoids inventing a contribution when the reported debt range is open-ended", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
        debtPaymentShare: "Más del 40%",
        debtSituation: "Son una preocupación importante",
        goals: [makeGoal()]
      }),
      {
        currentSavings: 0,
        monthlyExpenses: 2_500_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 100_000
      }
    );

    expect(preview.contributionLabel).toBe("Por definir");
  });

  it("uses the reference explicitly selected in simulation", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
        debtPaymentShare: "No pago deudas",
        debtSituation: "No tengo deudas",
        goals: [makeGoal({ title: "Especialización" })],
        simulationPlanPreference: {
          strategy: "prioritize_goal",
          goalId: "goal-1",
          protectedMarginMode: "automatic",
          customProtectedMargin: null,
          selectedAt: "2026-08-04T12:00:00.000Z"
        }
      }),
      {
        currentSavings: 0,
        monthlyExpenses: 2_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 200_000
      }
    );

    expect(preview.selectedStrategy).toBe("prioritize_goal");
    expect(preview.selectedReferenceLabel).toBe("Priorizar Especialización");
    expect(preview.focusTitle).toBe("Meta del mes: Especialización");
    expect(preview.contributionLabel).toBe("$1.620.000 aprox.");
    expect(preview.contributionPurpose).toContain("Especialización");
  });
});
