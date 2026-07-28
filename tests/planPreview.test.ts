import { describe, expect, it } from "vitest";

import { getPlanPreviewData } from "../utils/planPreview";
import { makeGoal, makeOnboarding } from "./fixtures/financial";

describe("getPlanPreviewData", () => {
  it("builds a personalized preview from the diagnosis", () => {
    const preview = getPlanPreviewData(
      makeOnboarding({
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
    expect(preview.marginLabel).toBe("$2.000.000 aprox.");
    expect(preview.marginTone).toBe("support");
    expect(preview.contributionLabel).not.toBe("Por definir");
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
});
