import {
  type ActionProgressRecord,
  type ActionProgressStatus,
  type DebtRecord,
  type SimulationPlanPreference,
  type CompletedActionsState
} from "../types/financial";
import {
  getMonthlyActionImpactSummary,
  type MonthlyActionImpactSummary
} from "./actionProgressImpact";
import { getGoalContributionPeriodSummary } from "./goalContributions";
import { type GoalAllocation } from "./goalPlanning";
import { getDebtPaymentTotalForPeriod, isDebtPaid } from "./debtPayments";
import {
  getMonthlyActionProgressId,
  getMonthlyActionProgressStatus,
  getMonthlyPlanKeyFromActionProgressId,
  getMonthlyPlanPeriodFromKey,
  isMonthlyActionCompleted,
  type MonthlyAction
} from "./monthlyPlan";

const goalContributionActionIds = new Set(["set-goal-contribution"]);
const autoInjectedGoalContributionActionIds = new Set(["set-goal-contribution"]);

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

function getTrackedProgressRecord({
  amount,
  completedAt,
  detail,
  status,
  label
}: {
  amount: number;
  completedAt: string | null;
  detail: string | null;
  status: ActionProgressStatus;
  label: string;
}): ActionProgressRecord {
  const timestamp = completedAt ?? new Date().toISOString();

  return {
    status,
    evidence: {
      type: "amount",
      label,
      amount,
      detail
    },
    startedAt: timestamp,
    completedAt: status === "completed" ? timestamp : null,
    updatedAt: timestamp
  };
}

function getSimulationStrategyLabel(preference: SimulationPlanPreference) {
  if (preference.strategy === "diagnosis_recommended") {
    return "Recomendación del diagnóstico";
  }

  if (preference.strategy === "prioritize_goal" || preference.strategy === "accelerate_goal") {
    return "Repartir solo a metas";
  }

  if (preference.strategy === "current_reference") {
    return "Sin repartición";
  }

  if (preference.strategy === "reduce_interest") {
    return "Repartir solo a deudas";
  }

  if (preference.debtShare !== null) {
    const debtPercentage = Math.round(preference.debtShare * 100);
    return `Repartir ${debtPercentage}% a deudas y ${100 - debtPercentage}% a metas`;
  }

  return "Repartir a deudas y metas";
}

function getDecisionProgressRecord(
  preference: SimulationPlanPreference
): ActionProgressRecord {
  return {
    status: "completed",
    evidence: {
      type: "decision",
      label: "Estrategia guardada",
      amount: null,
      detail: getSimulationStrategyLabel(preference)
    },
    startedAt: preference.selectedAt,
    completedAt: preference.selectedAt,
    updatedAt: preference.selectedAt
  };
}

export function isGoalContributionActionId(actionId: string) {
  return goalContributionActionIds.has(actionId);
}

export function getGoalContributionLabelForActionId(actionId: string) {
  if (actionId === "redirect-small-expenses") {
    return "Monto redirigido";
  }

  return "Aporte a metas";
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

    if (actionId && autoInjectedGoalContributionActionIds.has(actionId)) {
      nextActions[progressId] = false;
    }
  });

  return nextActions;
}

export function getEffectiveMonthlyPlanProgress({
  actions,
  completedActions,
  debts = [],
  goalAllocations,
  periodKey,
  planProgressKey,
  simulationPlanPreference = null
}: {
  actions: MonthlyAction[];
  completedActions: CompletedActionsState;
  debts?: DebtRecord[];
  goalAllocations: GoalAllocation[];
  periodKey: string;
  planProgressKey: string;
  simulationPlanPreference?: SimulationPlanPreference | null;
}): EffectiveMonthlyPlanProgress {
  const effectiveCompletedActions = { ...completedActions };
  const goalContributionAction = actions.find((action) =>
    goalContributionActionIds.has(action.id)
  );
  const activeGoalAllocations = goalAllocations.filter(
    (allocation) =>
      allocation.goal.status !== "completed" && allocation.goal.status !== "paused"
  );
  const goalContributionProgress = activeGoalAllocations.reduce(
    (progress, allocation) => {
      const periodSummary = getGoalContributionPeriodSummary(allocation.goal, periodKey);
      const amount = Math.min(periodSummary.amount, Math.max(allocation.currentAmount, 0));

      return {
        amount: progress.amount + amount,
        contributedGoalCount:
          progress.contributedGoalCount + (periodSummary.amount > 0 ? 1 : 0),
        latestDate:
          periodSummary.latestDate &&
          (!progress.latestDate || periodSummary.latestDate > progress.latestDate)
            ? periodSummary.latestDate
            : progress.latestDate
      };
    },
    { amount: 0, contributedGoalCount: 0, latestDate: null as string | null }
  );

  if (goalContributionAction && goalContributionProgress.amount > 0) {
    effectiveCompletedActions[getMonthlyActionProgressId(planProgressKey, goalContributionAction.id)] =
      getTrackedProgressRecord({
        amount: goalContributionProgress.amount,
        completedAt: goalContributionProgress.latestDate,
        detail: `${goalContributionProgress.contributedGoalCount} de ${activeGoalAllocations.length} metas con aporte registrado`,
        status:
          goalContributionProgress.contributedGoalCount === activeGoalAllocations.length
            ? "completed"
            : "in_progress",
        label: getGoalContributionLabelForActionId(goalContributionAction.id)
      });
  }

  const debtPaymentAction = actions.find((action) => action.id === "register-debt-payments");
  const activeDebts = debts.filter((debt) => !isDebtPaid(debt));
  const debtPaymentProgress = activeDebts.reduce(
    (progress, debt) => {
      const amount = getDebtPaymentTotalForPeriod(debt, periodKey);
      const latestDate = (debt.payments ?? [])
        .filter((payment) => payment.date.startsWith(periodKey) && payment.amount > 0)
        .reduce<string | null>(
          (latest, payment) => (!latest || payment.date > latest ? payment.date : latest),
          null
        );

      return {
        amount: progress.amount + amount,
        debtCount: progress.debtCount + (amount > 0 ? 1 : 0),
        latestDate:
          latestDate && (!progress.latestDate || latestDate > progress.latestDate)
            ? latestDate
            : progress.latestDate
      };
    },
    { amount: 0, debtCount: 0, latestDate: null as string | null }
  );

  if (debtPaymentAction && debtPaymentProgress.amount > 0) {
    effectiveCompletedActions[getMonthlyActionProgressId(planProgressKey, debtPaymentAction.id)] =
      getTrackedProgressRecord({
        amount: debtPaymentProgress.amount,
        completedAt: debtPaymentProgress.latestDate,
        detail: `${debtPaymentProgress.debtCount} de ${activeDebts.length} deudas con pago registrado`,
        status:
          debtPaymentProgress.debtCount === activeDebts.length ? "completed" : "in_progress",
        label: "Pagos de deudas"
      });
  }

  const scenarioAction = actions.find(
    (action) =>
      action.id === "compare-goal-contribution" || action.id === "compare-debt-strategies"
  );

  if (
    scenarioAction &&
    simulationPlanPreference?.selectedAt.startsWith(periodKey)
  ) {
    effectiveCompletedActions[getMonthlyActionProgressId(planProgressKey, scenarioAction.id)] =
      getDecisionProgressRecord(simulationPlanPreference);
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
