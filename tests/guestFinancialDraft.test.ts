import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();

  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    })
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: storage.getItem,
    removeItem: storage.removeItem,
    setItem: storage.setItem
  }
}));

vi.mock("../lib/financialProfile", () => ({
  normalizeOnboardingData: (onboarding: unknown) => onboarding
}));

import {
  clearGuestFinancialDraft,
  loadGuestFinancialDraft,
  saveGuestFinancialDraft
} from "../lib/guestFinancialDraft";
import { initialOnboarding } from "../types/financial";

beforeEach(() => {
  storage.values.clear();
  storage.getItem.mockClear();
  storage.removeItem.mockClear();
  storage.setItem.mockClear();
});

describe("guest financial draft", () => {
  it("saves and restores a normalized local diagnosis", async () => {
    await saveGuestFinancialDraft(
      {
        ...initialOnboarding,
        firstName: "Andrea",
        expenseCategories: ["Vivienda"],
        expenseCategoryAmounts: { Vivienda: 900000 },
        simulationPlanPreference: {
          strategy: "prioritize_goal",
          goalId: "goal-1",
          protectedMarginMode: "automatic",
          customProtectedMargin: null,
          selectedAt: "2026-08-04T12:00:00.000Z"
        }
      },
      {
        monthlyIncome: 3500000
      }
    );

    const draft = await loadGuestFinancialDraft();

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(draft).toMatchObject({
      version: 1,
      exactValues: { monthlyIncome: 3500000 },
      onboarding: {
        firstName: "Andrea",
        expenseCategories: ["Vivienda"],
        expenseCategoryAmounts: { Vivienda: 900000 },
        simulationPlanPreference: {
          strategy: "prioritize_goal",
          goalId: "goal-1"
        }
      }
    });
  });

  it("ignores an invalid local draft", async () => {
    storage.values.set("ruta-financiera:guest-financial-draft:v1", "{invalid-json");

    await expect(loadGuestFinancialDraft()).resolves.toBeNull();
  });

  it("clears the local diagnosis after migration", async () => {
    await saveGuestFinancialDraft(initialOnboarding, {});
    await clearGuestFinancialDraft();

    await expect(loadGuestFinancialDraft()).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledOnce();
  });
});
