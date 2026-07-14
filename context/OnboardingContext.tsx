import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { useAuth } from "./AuthContext";
import { useFinancialProfile } from "./FinancialProfileContext";
import {
  saveExactValues as persistExactValues,
  saveOnboardingData
} from "../lib/financialProfile";
import {
  hasCompletedOnboarding as getHasCompletedOnboarding,
  initialOnboarding,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import { normalizeExactValues } from "../utils/financialRanges";

type OnboardingContextValue = {
  exactValues: ExactFinancialValues;
  financialProfileExists: boolean;
  hasCompletedOnboarding: boolean;
  onboarding: OnboardingData;
  onboardingSyncError: string | null;
  onboardingSyncStatus: "idle" | "loading" | "saving" | "saved" | "error" | "not-configured";
  resetFinancialData: () => Promise<boolean>;
  saveExactValues: (values: ExactFinancialValues) => Promise<boolean>;
  updateOnboarding: (data: Partial<OnboardingData>) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function getEmptyOnboarding(): OnboardingData {
  return {
    ...initialOnboarding,
    expenseCategories: [],
    expenseCategoryAmounts: {},
    smallExpenseCategories: [],
    goals: []
  };
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { isAuthReady, isSupabaseConfigured, user } = useAuth();
  const {
    financialProfile,
    financialProfileLoadError,
    financialProfileLoadStatus,
    financialProfileUserId
  } = useFinancialProfile();
  const [onboarding, setOnboarding] = useState<OnboardingData>(initialOnboarding);
  const [exactValues, setExactValues] = useState<ExactFinancialValues>({});
  const [financialProfileExists, setFinancialProfileExists] = useState(false);
  const [onboardingSyncStatus, setOnboardingSyncStatus] =
    useState<OnboardingContextValue["onboardingSyncStatus"]>("idle");
  const [onboardingSyncError, setOnboardingSyncError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setOnboarding(initialOnboarding);
      setExactValues({});
      setFinancialProfileExists(false);
      setOnboardingSyncStatus(isSupabaseConfigured ? "idle" : "not-configured");
      setOnboardingSyncError(null);
      return;
    }

    if (!isSupabaseConfigured || financialProfileLoadStatus === "not-configured") {
      setOnboarding(initialOnboarding);
      setExactValues({});
      setFinancialProfileExists(false);
      setOnboardingSyncStatus("not-configured");
      setOnboardingSyncError(null);
      return;
    }

    if (
      financialProfileLoadStatus === "loading" ||
      financialProfileLoadStatus === "idle" ||
      financialProfileUserId !== user.id
    ) {
      if (financialProfileUserId !== user.id) {
        setOnboarding(initialOnboarding);
        setExactValues({});
        setFinancialProfileExists(false);
      }

      setOnboardingSyncStatus("loading");
      setOnboardingSyncError(null);
      return;
    }

    if (financialProfileLoadStatus === "error") {
      setOnboardingSyncStatus("error");
      setOnboardingSyncError(
        financialProfileLoadError ?? "No pudimos recuperar tus datos financieros."
      );
      return;
    }

    if (financialProfileLoadStatus === "ready") {
      setOnboarding(financialProfile.onboarding);
      setExactValues(financialProfile.exactValues);
      setFinancialProfileExists(financialProfile.profileExists);
      setOnboardingSyncStatus("saved");
      setOnboardingSyncError(null);
    }
  }, [
    financialProfile,
    financialProfileLoadError,
    financialProfileLoadStatus,
    financialProfileUserId,
    isAuthReady,
    isSupabaseConfigured,
    userId
  ]);

  const updateOnboarding = useCallback(
    (data: Partial<OnboardingData>) => {
      setOnboarding((current) => {
        const next = {
          ...current,
          ...data
        };

        if (!isSupabaseConfigured) {
          setOnboardingSyncStatus("not-configured");
          return next;
        }

        if (!user) {
          setOnboardingSyncStatus("idle");
          return next;
        }

        setOnboardingSyncStatus("saving");
        setOnboardingSyncError(null);

        saveOnboardingData(user.id, next)
          .then(() => {
            setFinancialProfileExists(true);
            setOnboardingSyncStatus("saved");
          })
          .catch((error: Error) => {
            setOnboardingSyncStatus("error");
            setOnboardingSyncError(error.message);
          });

        return next;
      });
    },
    [isSupabaseConfigured, user]
  );

  const saveExactValues = useCallback(
    async (values: ExactFinancialValues) => {
      const nextValues = normalizeExactValues(values);

      if (!isSupabaseConfigured) {
        setExactValues(nextValues);
        setOnboardingSyncStatus("not-configured");
        return true;
      }

      if (!user) {
        setOnboardingSyncStatus("idle");
        return false;
      }

      setOnboardingSyncStatus("saving");
      setOnboardingSyncError(null);

      try {
        await persistExactValues(user.id, nextValues);
        setExactValues(nextValues);
        setFinancialProfileExists(true);
        setOnboardingSyncStatus("saved");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "No pudimos guardar los datos.";
        setOnboardingSyncStatus("error");
        setOnboardingSyncError(message);
        return false;
      }
    },
    [isSupabaseConfigured, user]
  );

  const resetFinancialData = useCallback(async () => {
    const nextOnboarding = getEmptyOnboarding();
    const nextExactValues: ExactFinancialValues = {};

    if (!isSupabaseConfigured) {
      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setFinancialProfileExists(false);
      setOnboardingSyncStatus("not-configured");
      setOnboardingSyncError(null);
      return true;
    }

    if (!user) {
      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setFinancialProfileExists(false);
      setOnboardingSyncStatus("idle");
      setOnboardingSyncError(null);
      return true;
    }

    setOnboardingSyncStatus("saving");
    setOnboardingSyncError(null);

    try {
      await saveOnboardingData(user.id, nextOnboarding);
      await persistExactValues(user.id, nextExactValues);
      setOnboarding(nextOnboarding);
      setExactValues(nextExactValues);
      setFinancialProfileExists(true);
      setOnboardingSyncStatus("saved");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos borrar los datos.";
      setOnboardingSyncStatus("error");
      setOnboardingSyncError(message);
      return false;
    }
  }, [isSupabaseConfigured, user]);

  const isLoadedForCurrentUser = userId
    ? financialProfileLoadStatus === "ready" && financialProfileUserId === userId
    : financialProfileUserId === null;
  const effectiveOnboardingSyncStatus =
    userId && !isLoadedForCurrentUser
      ? financialProfileLoadStatus === "error"
        ? "error"
        : financialProfileLoadStatus === "not-configured"
          ? "not-configured"
          : "loading"
      : onboardingSyncStatus;
  const effectiveOnboardingSyncError =
    userId && financialProfileLoadStatus === "error"
      ? financialProfileLoadError
      : onboardingSyncError;

  const value = useMemo(
    () => ({
      exactValues,
      financialProfileExists: isLoadedForCurrentUser && financialProfileExists,
      hasCompletedOnboarding:
        isLoadedForCurrentUser &&
        financialProfileExists &&
        getHasCompletedOnboarding(onboarding),
      onboarding,
      onboardingSyncError: effectiveOnboardingSyncError,
      onboardingSyncStatus: effectiveOnboardingSyncStatus,
      resetFinancialData,
      saveExactValues,
      updateOnboarding
    }),
    [
      exactValues,
      effectiveOnboardingSyncStatus,
      effectiveOnboardingSyncError,
      financialProfileExists,
      isLoadedForCurrentUser,
      onboarding,
      resetFinancialData,
      saveExactValues,
      updateOnboarding
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
