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
import { fetchFinancialProfile, saveCompletedActions } from "../lib/financialProfile";
import type { CompletedActionsState } from "../types/financial";

type PlanContextValue = {
  completedActions: CompletedActionsState;
  planSyncError: string | null;
  planSyncStatus: "idle" | "loading" | "saving" | "saved" | "error" | "not-configured";
  toggleActionCompleted: (actionId: string) => void;
  setActionCompleted: (actionId: string, completed: boolean) => void;
  resetPlanProgress: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: PropsWithChildren) {
  const { isAuthReady, isSupabaseConfigured, user } = useAuth();
  const [completedActions, setCompletedActions] = useState<CompletedActionsState>({});
  const [planSyncStatus, setPlanSyncStatus] =
    useState<PlanContextValue["planSyncStatus"]>("idle");
  const [planSyncError, setPlanSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setCompletedActions({});
      setPlanSyncStatus(isSupabaseConfigured ? "idle" : "not-configured");
      setPlanSyncError(null);
      return;
    }

    let isMounted = true;
    setPlanSyncStatus("loading");
    setPlanSyncError(null);

    fetchFinancialProfile(user.id)
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        setCompletedActions(profile.completedActions);
        setPlanSyncStatus("saved");
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        setPlanSyncStatus("error");
        setPlanSyncError(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, isSupabaseConfigured, user]);

  const savePlanProgress = useCallback(
    (nextActions: CompletedActionsState) => {
      if (!isSupabaseConfigured) {
        setPlanSyncStatus("not-configured");
        return;
      }

      if (!user) {
        setPlanSyncStatus("idle");
        return;
      }

      setPlanSyncStatus("saving");
      setPlanSyncError(null);

      saveCompletedActions(user.id, nextActions)
        .then(() => {
          setPlanSyncStatus("saved");
        })
        .catch((error: Error) => {
          setPlanSyncStatus("error");
          setPlanSyncError(error.message);
        });
    },
    [isSupabaseConfigured, user]
  );

  const toggleActionCompleted = useCallback(
    (actionId: string) => {
      setCompletedActions((currentActions) => {
        const nextActions = {
          ...currentActions,
          [actionId]: !currentActions[actionId]
        };

        savePlanProgress(nextActions);
        return nextActions;
      });
    },
    [savePlanProgress]
  );

  const setActionCompleted = useCallback(
    (actionId: string, completed: boolean) => {
      setCompletedActions((currentActions) => {
        const nextActions = {
          ...currentActions,
          [actionId]: completed
        };

        savePlanProgress(nextActions);
        return nextActions;
      });
    },
    [savePlanProgress]
  );

  const resetPlanProgress = useCallback(() => {
    setCompletedActions({});
    savePlanProgress({});
  }, [savePlanProgress]);

  const value = useMemo(
    () => ({
      completedActions,
      planSyncError,
      planSyncStatus,
      toggleActionCompleted,
      setActionCompleted,
      resetPlanProgress
    }),
    [
      completedActions,
      planSyncError,
      planSyncStatus,
      toggleActionCompleted,
      setActionCompleted,
      resetPlanProgress
    ]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error("usePlan must be used within PlanProvider");
  }

  return context;
}
