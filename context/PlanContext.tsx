import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";

export type CompletedActionsState = Record<string, boolean>;

type PlanContextValue = {
  completedActions: CompletedActionsState;
  toggleActionCompleted: (actionId: string) => void;
  setActionCompleted: (actionId: string, completed: boolean) => void;
  resetPlanProgress: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: PropsWithChildren) {
  const [completedActions, setCompletedActions] = useState<CompletedActionsState>({});

  const value = useMemo(
    () => ({
      completedActions,
      toggleActionCompleted: (actionId: string) => {
        setCompletedActions((currentActions) => ({
          ...currentActions,
          [actionId]: !currentActions[actionId]
        }));
      },
      setActionCompleted: (actionId: string, completed: boolean) => {
        setCompletedActions((currentActions) => ({
          ...currentActions,
          [actionId]: completed
        }));
      },
      resetPlanProgress: () => {
        setCompletedActions({});
      }
    }),
    [completedActions]
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
