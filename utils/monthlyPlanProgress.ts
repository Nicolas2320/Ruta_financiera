import {
  type ActionProgressRecord,
  type CompletedActionsState
} from "../types/financial";
import {
  getMonthlyActionImpactSummary,
  type MonthlyActionImpactSummary
} from "./actionProgressImpact";
import { getGoalContributionPeriodSummary } from "./goalContributions";
import type { GoalAllocation } from "./goalPlanning";
import {
  getMonthlyActionProgressId,
  getMonthlyActionProgressStatus,
  getMonthlyPlanKeyFromActionProgressId,
  getMonthlyPlanPeriodFromKey,
  isMonthlyActionCompleted,
  type MonthlyAction
} from "./monthlyPlan";

const goalContributionActionIds = new Set(["set-goal-contribution", "redirect-small-expenses"]);

export type EffectiveMonthlyPlanProgress = {
  completedCount: number;
  effectiveCompletedActions: CompletedActionsState;
  impactSummary: MonthlyActionImpactSummary;
  inProgressCount: number;
};

function getActionIdFromProgressId(progressId: string) {
  const planProgressKey = getMonthlyPlanKeyFromActionProgressId(progressId);

  if (!planProgressKey || !progressId.startsWith(`${planProgressKey}:`)) {
    return null;
  }

  return progressId.slice(planProgressKey.length + 1);
}

function getGoalContributionProgressRecord({
  amount,
  completedAt,
  label
}: {
  amount: number;
  completedAt: string | null;
  label: string;
}): ActionProgressRecord {
  const timestamp = completedAt ?? new Date().toISOString();

  return {
    status: "completed",
    evidence: {
      type: "amount",
      label,
      amount,
      detail: null
    },
    startedAt: timestamp,
    completedAt: timestamp,
    updatedAt: timestamp
  };
}

export function removeStoredGoalContributionActionsForPeriod(
  completedActions: CompletedActionsState,
  periodKey: string
) {
  const nextActions = { ...completedActions };

  Object.keys(nextActions).forEach((progressId) => {
    const planProgressKey = getMonthlyPlanKeyFromActionProgressId(progressId);

    if (!planProgressKey || getMonthlyPlanPeriodFromKey(planProgressKey) !== periodKey) {
      return;
    }

    const actionId = getActionIdFromProgressId(progressId);

    if (actionId && goalContributionActionIds.has(actionId)) {
      nextActions[progressId] = false;
    }
  });

  return nextActions;
}

export function getEffectiveMonthlyPlanProgress({
  actions,
  completedActions,
  periodKey,
  planProgressKey,
  primaryGoalAllocation
}: {
  actions: MonthlyAction[];
  completedActions: CompletedActionsState;
  periodKey: string;
  planProgressKey: string;
  primaryGoalAllocation: GoalAllocation | null;
}): EffectiveMonthlyPlanProgress {
  const effectiveCompletedActions = { ...completedActions };
  const goalContributionAction = actions.find((action) => goalContributionActionIds.has(action.id));
  const goalContributionPeriodSummary = getGoalContributionPeriodSummary(
    primaryGoalAllocation?.goal,
    periodKey
  );
  const goalContributionProgressAmount =
    primaryGoalAllocation !== null && primaryGoalAllocation.currentAmount > 0
      ? Math.min(goalContributionPeriodSummary.amount, primaryGoalAllocation.currentAmount)
      : 0;

  if (goalContributionAction && goalContributionProgressAmount > 0) {
    effectiveCompletedActions[getMonthlyActionProgressId(planProgressKey, goalContributionAction.id)] =
      getGoalContributionProgressRecord({
        amount: goalContributionProgressAmount,
        completedAt: goalContributionPeriodSummary.latestDate,
        label:
          goalContributionAction.id === "redirect-small-expenses"
            ? "Monto redirigido"
            : "Aporte a meta"
      });
  }

  const completedCount = actions.filter((action) =>
    isMonthlyActionCompleted({
      actionId: action.id,
      completedActions: effectiveCompletedActions,
      planProgressKey
    })
  ).length;
  const inProgressCount = actions.filter(
    (action) =>
      getMonthlyActionProgressStatus({
        actionId: action.id,
        completedActions: effectiveCompletedActions,
        planProgressKey
      }) === "in_progress"
  ).length;

  return {
    completedCount,
    effectiveCompletedActions,
    impactSummary: getMonthlyActionImpactSummary(effectiveCompletedActions, { periodKey }),
    inProgressCount
  };
}
