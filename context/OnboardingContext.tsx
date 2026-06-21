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
import { fetchFinancialProfile, saveOnboardingData } from "../lib/financialProfile";
import {
  hasCompletedOnboarding as getHasCompletedOnboarding,
  initialOnboarding,
  type OnboardingData
} from "../types/financial";

type OnboardingContextValue = {
  financialProfileExists: boolean;
  hasCompletedOnboarding: boolean;
  onboarding: OnboardingData;
  onboardingSyncError: string | null;
  onboardingSyncStatus: "idle" | "loading" | "saving" | "saved" | "error" | "not-configured";
  updateOnboarding: (data: Partial<OnboardingData>) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { isAuthReady, isSupabaseConfigured, user } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingData>(initialOnboarding);
  const [financialProfileExists, setFinancialProfileExists] = useState(false);
  const [onboardingSyncStatus, setOnboardingSyncStatus] =
    useState<OnboardingContextValue["onboardingSyncStatus"]>("idle");
  const [onboardingSyncError, setOnboardingSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setOnboarding(initialOnboarding);
      setFinancialProfileExists(false);
      setOnboardingSyncStatus(isSupabaseConfigured ? "idle" : "not-configured");
      setOnboardingSyncError(null);
      return;
    }

    let isMounted = true;
    setOnboardingSyncStatus("loading");
    setOnboardingSyncError(null);

    fetchFinancialProfile(user.id)
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        setOnboarding(profile.onboarding);
        setFinancialProfileExists(profile.profileExists);
        setOnboardingSyncStatus("saved");
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        setOnboardingSyncStatus("error");
        setOnboardingSyncError(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, isSupabaseConfigured, user]);

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

  const value = useMemo(
    () => ({
      financialProfileExists,
      hasCompletedOnboarding:
        financialProfileExists && getHasCompletedOnboarding(onboarding),
      onboarding,
      onboardingSyncError,
      onboardingSyncStatus,
      updateOnboarding
    }),
    [
      financialProfileExists,
      onboarding,
      onboardingSyncError,
      onboardingSyncStatus,
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
