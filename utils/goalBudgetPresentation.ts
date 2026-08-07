import type { PriorityKey } from "./financialCalculations";

export type GoalBudgetPresentationStatus =
  | "waiting_for_emergency_goal"
  | "no_reference"
  | "unassigned"
  | "partially_assigned"
  | "fully_assigned"
  | "over_reference";

export type GoalBudgetPresentationSource = "diagnosis" | "manual" | "simulation";

function safeAmount(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getGoalBudgetPresentation({
  assignedAmount,
  hasExplicitPreference,
  mode,
  preferredGoalId,
  priorityKey,
  referenceAmount
}: {
  assignedAmount: number;
  hasExplicitPreference: boolean;
  mode: "recommended" | "manual";
  preferredGoalId: string | null;
  priorityKey: PriorityKey;
  referenceAmount: number;
}) {
  const safeAssignedAmount = safeAmount(assignedAmount);
  const safeReferenceAmount = safeAmount(referenceAmount);
  const availableAmount = Math.max(0, safeReferenceAmount - safeAssignedAmount);
  const excessAmount = Math.max(0, safeAssignedAmount - safeReferenceAmount);
  const source: GoalBudgetPresentationSource =
    mode === "manual"
      ? "manual"
      : hasExplicitPreference
        ? "simulation"
        : "diagnosis";

  let status: GoalBudgetPresentationStatus;

  if (excessAmount > 0) {
    status = "over_reference";
  } else if (
    safeReferenceAmount === 0 &&
    safeAssignedAmount === 0 &&
    mode === "recommended" &&
    priorityKey === "build_emergency_fund" &&
    preferredGoalId === null
  ) {
    status = "waiting_for_emergency_goal";
  } else if (safeReferenceAmount === 0) {
    status = "no_reference";
  } else if (safeAssignedAmount === 0) {
    status = "unassigned";
  } else if (availableAmount > 0) {
    status = "partially_assigned";
  } else {
    status = "fully_assigned";
  }

  return {
    assignedAmount: safeAssignedAmount,
    availableAmount,
    excessAmount,
    referenceAmount: safeReferenceAmount,
    source,
    status
  };
}
