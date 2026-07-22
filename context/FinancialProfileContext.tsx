import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useAuth } from "./AuthContext";
import { fetchFinancialProfile, type FinancialProfile } from "../lib/financialProfile";
import { initialOnboarding } from "../types/financial";

type FinancialProfileLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "not-configured";

type FinancialProfileContextValue = {
  financialProfile: FinancialProfile;
  financialProfileLoadError: string | null;
  financialProfileLoadStatus: FinancialProfileLoadStatus;
  financialProfileUserId: string | null;
};

const FinancialProfileContext = createContext<FinancialProfileContextValue | null>(null);

function createEmptyFinancialProfile(): FinancialProfile {
  return {
    profileExists: false,
    onboarding: {
      ...initialOnboarding,
      expenseCategories: [],
      expenseCategoryAmounts: {},
      debts: [],
      smallExpenseCategories: [],
      goals: []
    },
    completedActions: {},
    exactValues: {}
  };
}

export function FinancialProfileProvider({ children }: PropsWithChildren) {
  const { isAuthReady, isSupabaseConfigured, user } = useAuth();
  const [financialProfile, setFinancialProfile] = useState(createEmptyFinancialProfile);
  const [financialProfileLoadStatus, setFinancialProfileLoadStatus] =
    useState<FinancialProfileLoadStatus>("idle");
  const [financialProfileLoadError, setFinancialProfileLoadError] = useState<string | null>(null);
  const [financialProfileUserId, setFinancialProfileUserId] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      loadedUserIdRef.current = null;
      setFinancialProfileUserId(null);
      setFinancialProfile(createEmptyFinancialProfile());
      setFinancialProfileLoadStatus(isSupabaseConfigured ? "idle" : "not-configured");
      setFinancialProfileLoadError(null);
      return;
    }

    if (!isSupabaseConfigured) {
      loadedUserIdRef.current = user.id;
      setFinancialProfileUserId(user.id);
      setFinancialProfile(createEmptyFinancialProfile());
      setFinancialProfileLoadStatus("not-configured");
      setFinancialProfileLoadError(null);
      return;
    }

    let isMounted = true;

    if (loadedUserIdRef.current !== user.id) {
      setFinancialProfile(createEmptyFinancialProfile());
      setFinancialProfileUserId(null);
    }

    setFinancialProfileLoadStatus("loading");
    setFinancialProfileLoadError(null);

    fetchFinancialProfile(user.id)
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        setFinancialProfile(profile);
        loadedUserIdRef.current = user.id;
        setFinancialProfileUserId(user.id);
        setFinancialProfileLoadStatus("ready");
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        loadedUserIdRef.current = user.id;
        setFinancialProfileUserId(user.id);
        setFinancialProfileLoadStatus("error");
        setFinancialProfileLoadError(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, isSupabaseConfigured, userId]);

  const effectiveLoadStatus: FinancialProfileLoadStatus =
    userId && financialProfileUserId !== userId ? "loading" : financialProfileLoadStatus;

  const value = useMemo(
    () => ({
      financialProfile,
      financialProfileLoadError,
      financialProfileLoadStatus: effectiveLoadStatus,
      financialProfileUserId
    }),
    [
      effectiveLoadStatus,
      financialProfile,
      financialProfileLoadError,
      financialProfileUserId
    ]
  );

  return (
    <FinancialProfileContext.Provider value={value}>
      {children}
    </FinancialProfileContext.Provider>
  );
}

export function useFinancialProfile() {
  const context = useContext(FinancialProfileContext);

  if (!context) {
    throw new Error("useFinancialProfile must be used within FinancialProfileProvider");
  }

  return context;
}
