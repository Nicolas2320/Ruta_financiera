import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const contextMocks = vi.hoisted(() => ({
  auth: {
    isAuthReady: true,
    isSupabaseConfigured: true,
    user: { id: "user-1" } as { id: string } | null
  },
  clearGuestFinancialDraft: vi.fn(),
  fetchFinancialProfile: vi.fn(),
  loadGuestFinancialDraft: vi.fn(),
  saveCompletedActions: vi.fn(),
  saveExactValues: vi.fn(),
  saveFinancialProfileDraft: vi.fn(),
  saveGuestFinancialDraft: vi.fn(),
  saveOnboardingData: vi.fn()
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => contextMocks.auth
}));

vi.mock("../lib/financialProfile", () => ({
  fetchFinancialProfile: contextMocks.fetchFinancialProfile,
  saveCompletedActions: contextMocks.saveCompletedActions,
  saveExactValues: contextMocks.saveExactValues,
  saveFinancialProfileDraft: contextMocks.saveFinancialProfileDraft,
  saveOnboardingData: contextMocks.saveOnboardingData
}));

vi.mock("../lib/guestFinancialDraft", () => ({
  clearGuestFinancialDraft: contextMocks.clearGuestFinancialDraft,
  loadGuestFinancialDraft: contextMocks.loadGuestFinancialDraft,
  saveGuestFinancialDraft: contextMocks.saveGuestFinancialDraft
}));

import {
  FinancialProfileProvider,
  useFinancialProfile
} from "../context/FinancialProfileContext";
import { OnboardingProvider, useOnboarding } from "../context/OnboardingContext";
import { PlanProvider, usePlan } from "../context/PlanContext";
import { initialOnboarding } from "../types/financial";

type FinancialProfileValue = ReturnType<typeof useFinancialProfile>;
type OnboardingValue = ReturnType<typeof useOnboarding>;
type PlanValue = ReturnType<typeof usePlan>;

let latestFinancialProfile: FinancialProfileValue | null = null;
let latestOnboarding: OnboardingValue | null = null;
let latestPlan: PlanValue | null = null;
let renderer: ReactTestRenderer | null = null;

function createProfile(firstName: string, completedActionId: string) {
  return {
    profileExists: true,
    onboarding: {
      ...initialOnboarding,
      firstName,
      financialGoal: "Crear un fondo de emergencia"
    },
    completedActions: {
      [completedActionId]: true
    },
    exactValues: {
      monthlyIncome: 3500000
    }
  };
}

function createGuestDraft(firstName: string) {
  return {
    exactValues: {
      monthlyIncome: 3200000
    },
    onboarding: {
      ...initialOnboarding,
      firstName
    },
    updatedAt: "2026-07-23T10:00:00.000Z",
    version: 1 as const
  };
}

function Probe() {
  latestFinancialProfile = useFinancialProfile();
  latestOnboarding = useOnboarding();
  latestPlan = usePlan();
  return null;
}

function ProviderTree() {
  return (
    <FinancialProfileProvider>
      <OnboardingProvider>
        <PlanProvider>
          <Probe />
        </PlanProvider>
      </OnboardingProvider>
    </FinancialProfileProvider>
  );
}

async function flushEffects() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function mountProviders() {
  await act(async () => {
    renderer = create(<ProviderTree />);
    await flushEffects();
  });
}

function getFinancialProfile() {
  if (!latestFinancialProfile) {
    throw new Error("Financial profile context was not rendered");
  }

  return latestFinancialProfile;
}

function getOnboarding() {
  if (!latestOnboarding) {
    throw new Error("Onboarding context was not rendered");
  }

  return latestOnboarding;
}

function getPlan() {
  if (!latestPlan) {
    throw new Error("Plan context was not rendered");
  }

  return latestPlan;
}

beforeEach(() => {
  latestFinancialProfile = null;
  latestOnboarding = null;
  latestPlan = null;
  renderer = null;

  contextMocks.auth.isAuthReady = true;
  contextMocks.auth.isSupabaseConfigured = true;
  contextMocks.auth.user = { id: "user-1" };
  contextMocks.clearGuestFinancialDraft.mockReset();
  contextMocks.fetchFinancialProfile.mockReset();
  contextMocks.loadGuestFinancialDraft.mockReset();
  contextMocks.saveCompletedActions.mockReset();
  contextMocks.saveExactValues.mockReset();
  contextMocks.saveFinancialProfileDraft.mockReset();
  contextMocks.saveGuestFinancialDraft.mockReset();
  contextMocks.saveOnboardingData.mockReset();
  contextMocks.clearGuestFinancialDraft.mockResolvedValue(undefined);
  contextMocks.loadGuestFinancialDraft.mockResolvedValue(null);
  contextMocks.saveCompletedActions.mockResolvedValue(undefined);
  contextMocks.saveExactValues.mockResolvedValue(undefined);
  contextMocks.saveFinancialProfileDraft.mockResolvedValue(undefined);
  contextMocks.saveGuestFinancialDraft.mockResolvedValue(undefined);
  contextMocks.saveOnboardingData.mockResolvedValue(undefined);
});

afterEach(async () => {
  if (renderer) {
    await act(async () => {
      renderer?.unmount();
    });
  }

  renderer = null;
});

describe("FinancialProfileProvider", () => {
  it("loads one profile snapshot for both onboarding and plan", async () => {
    contextMocks.fetchFinancialProfile.mockResolvedValue(
      createProfile("Andrea", "action-1")
    );

    await mountProviders();

    expect(contextMocks.fetchFinancialProfile).toHaveBeenCalledOnce();
    expect(contextMocks.fetchFinancialProfile).toHaveBeenCalledWith("user-1");
    expect(getFinancialProfile().financialProfileLoadStatus).toBe("ready");
    expect(getOnboarding()).toMatchObject({
      onboardingSyncStatus: "saved",
      financialProfileExists: true,
      exactValues: { monthlyIncome: 3500000 }
    });
    expect(getOnboarding().onboarding.firstName).toBe("Andrea");
    expect(getPlan()).toMatchObject({
      planSyncStatus: "saved",
      completedActions: { "action-1": true }
    });
  });

  it("propagates one profile read failure to both consumers", async () => {
    contextMocks.fetchFinancialProfile.mockRejectedValue(new Error("Network unavailable"));

    await mountProviders();

    expect(contextMocks.fetchFinancialProfile).toHaveBeenCalledOnce();
    expect(getFinancialProfile()).toMatchObject({
      financialProfileLoadStatus: "error",
      financialProfileLoadError: "Network unavailable"
    });
    expect(getOnboarding()).toMatchObject({
      onboardingSyncStatus: "error",
      onboardingSyncError: "Network unavailable"
    });
    expect(getPlan()).toMatchObject({
      planSyncStatus: "error",
      planSyncError: "Network unavailable"
    });
  });

  it("does not request a profile when Supabase is not configured", async () => {
    contextMocks.auth.isSupabaseConfigured = false;
    contextMocks.auth.user = null;

    await mountProviders();

    expect(contextMocks.fetchFinancialProfile).not.toHaveBeenCalled();
    expect(getFinancialProfile().financialProfileLoadStatus).toBe("not-configured");
    expect(getOnboarding().onboardingSyncStatus).toBe("saved");
    expect(getPlan().planSyncStatus).toBe("not-configured");
  });

  it("restores the guest diagnosis without requesting a remote profile", async () => {
    contextMocks.auth.user = null;
    contextMocks.loadGuestFinancialDraft.mockResolvedValue(createGuestDraft("Invitada"));

    await mountProviders();

    expect(contextMocks.fetchFinancialProfile).not.toHaveBeenCalled();
    expect(contextMocks.loadGuestFinancialDraft).toHaveBeenCalledOnce();
    expect(getOnboarding()).toMatchObject({
      onboardingSyncStatus: "saved",
      exactValues: { monthlyIncome: 3200000 }
    });
    expect(getOnboarding().onboarding.firstName).toBe("Invitada");
    expect(getOnboarding().financialProfileExists).toBe(false);
  });

  it("migrates the guest diagnosis when the new account has no financial profile", async () => {
    const guestDraft = createGuestDraft("Invitada");
    contextMocks.loadGuestFinancialDraft.mockResolvedValue(guestDraft);
    contextMocks.fetchFinancialProfile.mockResolvedValue({
      profileExists: false,
      onboarding: initialOnboarding,
      completedActions: {},
      exactValues: {}
    });

    await mountProviders();

    expect(contextMocks.saveFinancialProfileDraft).toHaveBeenCalledWith(
      "user-1",
      guestDraft.onboarding,
      guestDraft.exactValues
    );
    expect(contextMocks.clearGuestFinancialDraft).toHaveBeenCalledOnce();
    expect(getOnboarding().financialProfileExists).toBe(true);
    expect(getOnboarding().onboarding.firstName).toBe("Invitada");
    expect(getOnboarding().onboardingSyncStatus).toBe("saved");
  });

  it("keeps an existing account profile instead of overwriting it with the guest draft", async () => {
    contextMocks.loadGuestFinancialDraft.mockResolvedValue(createGuestDraft("Invitada"));
    contextMocks.fetchFinancialProfile.mockResolvedValue(
      createProfile("Cuenta existente", "action-1")
    );

    await mountProviders();

    expect(contextMocks.saveFinancialProfileDraft).not.toHaveBeenCalled();
    expect(getOnboarding().onboarding.firstName).toBe("Cuenta existente");
    expect(contextMocks.clearGuestFinancialDraft).toHaveBeenCalledOnce();
  });

  it("ignores a stale response after the authenticated user changes", async () => {
    let resolveFirstProfile!: (profile: ReturnType<typeof createProfile>) => void;
    let resolveSecondProfile!: (profile: ReturnType<typeof createProfile>) => void;
    contextMocks.fetchFinancialProfile
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstProfile = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecondProfile = resolve;
        })
      );

    await mountProviders();
    expect(getFinancialProfile().financialProfileLoadStatus).toBe("loading");

    contextMocks.auth.user = { id: "user-2" };
    await act(async () => {
      renderer?.update(<ProviderTree />);
      await flushEffects();
    });

    await act(async () => {
      resolveFirstProfile(createProfile("Usuario anterior", "old-action"));
      resolveSecondProfile(createProfile("Usuario actual", "new-action"));
      await flushEffects();
    });

    expect(contextMocks.fetchFinancialProfile).toHaveBeenCalledTimes(2);
    expect(contextMocks.fetchFinancialProfile).toHaveBeenNthCalledWith(2, "user-2");
    expect(getFinancialProfile().financialProfileUserId).toBe("user-2");
    expect(getOnboarding().onboarding.firstName).toBe("Usuario actual");
    expect(getPlan().completedActions).toEqual({ "new-action": true });
  });

  it("saves onboarding and exact values together in one authenticated write", async () => {
    contextMocks.fetchFinancialProfile.mockResolvedValue(
      createProfile("Andrea", "action-1")
    );
    await mountProviders();

    let saved = false;
    await act(async () => {
      saved = await getOnboarding().saveOnboardingAndExactValues(
        {
          incomeRange: "$3.000.000 – $5.000.000"
        },
        {
          monthlyIncome: 4_800_000,
          monthlyExpenses: 2_100_000
        }
      );
      await flushEffects();
    });

    expect(saved).toBe(true);
    expect(contextMocks.saveFinancialProfileDraft).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        firstName: "Andrea",
        incomeRange: "$3.000.000 – $5.000.000"
      }),
      {
        monthlyIncome: 4_800_000,
        monthlyExpenses: 2_100_000
      }
    );
    expect(getOnboarding()).toMatchObject({
      onboardingSyncStatus: "saved",
      exactValues: {
        monthlyIncome: 4_800_000,
        monthlyExpenses: 2_100_000
      }
    });
  });

  it("serializes authenticated onboarding writes so newer debt data cannot be overwritten", async () => {
    let resolveFirstSave!: () => void;
    contextMocks.fetchFinancialProfile.mockResolvedValue(
      createProfile("Andrea", "action-1")
    );
    contextMocks.saveOnboardingData
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFirstSave = resolve;
        })
      )
      .mockResolvedValueOnce(undefined);
    await mountProviders();

    await act(async () => {
      getOnboarding().updateOnboarding({ firstName: "Primer cambio" });
      getOnboarding().updateOnboarding({ expensesFeeling: "Segundo cambio" });
      await flushEffects();
    });

    expect(contextMocks.saveOnboardingData).toHaveBeenCalledOnce();

    await act(async () => {
      resolveFirstSave();
      await flushEffects();
    });

    expect(contextMocks.saveOnboardingData).toHaveBeenCalledTimes(2);
    expect(contextMocks.saveOnboardingData).toHaveBeenNthCalledWith(
      2,
      "user-1",
      expect.objectContaining({
        firstName: "Primer cambio",
        expensesFeeling: "Segundo cambio"
      })
    );
    expect(getOnboarding().onboardingSyncStatus).toBe("saved");
  });

  it("stores a guest onboarding and exact-value change as one local draft", async () => {
    contextMocks.auth.user = null;
    contextMocks.loadGuestFinancialDraft.mockResolvedValue(null);
    await mountProviders();

    await act(async () => {
      await getOnboarding().saveOnboardingAndExactValues(
        {
          expensesRange: "$2.000.000 – $4.000.000"
        },
        {
          monthlyExpenses: 2_400_000
        }
      );
      await flushEffects();
    });

    expect(contextMocks.saveGuestFinancialDraft).toHaveBeenCalledOnce();
    expect(contextMocks.saveGuestFinancialDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        expensesRange: "$2.000.000 – $4.000.000"
      }),
      {
        monthlyExpenses: 2_400_000
      }
    );
  });
});
