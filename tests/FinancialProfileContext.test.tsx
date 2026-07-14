import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const contextMocks = vi.hoisted(() => ({
  auth: {
    isAuthReady: true,
    isSupabaseConfigured: true,
    user: { id: "user-1" } as { id: string } | null
  },
  fetchFinancialProfile: vi.fn(),
  saveCompletedActions: vi.fn(),
  saveExactValues: vi.fn(),
  saveOnboardingData: vi.fn()
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => contextMocks.auth
}));

vi.mock("../lib/financialProfile", () => ({
  fetchFinancialProfile: contextMocks.fetchFinancialProfile,
  saveCompletedActions: contextMocks.saveCompletedActions,
  saveExactValues: contextMocks.saveExactValues,
  saveOnboardingData: contextMocks.saveOnboardingData
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
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
  contextMocks.fetchFinancialProfile.mockReset();
  contextMocks.saveCompletedActions.mockReset();
  contextMocks.saveExactValues.mockReset();
  contextMocks.saveOnboardingData.mockReset();
  contextMocks.saveCompletedActions.mockResolvedValue(undefined);
  contextMocks.saveExactValues.mockResolvedValue(undefined);
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
    expect(getOnboarding().onboardingSyncStatus).toBe("not-configured");
    expect(getPlan().planSyncStatus).toBe("not-configured");
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
});
