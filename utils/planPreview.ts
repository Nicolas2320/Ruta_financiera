import type {
  ExactFinancialValues,
  OnboardingData,
  SimulationPlanStrategy
} from "../types/financial";
import { formatCOP, formatSignedCOP } from "./financialRanges";
import { getGoalPlanFromOnboarding } from "./goalPlanning";
import { formatTargetMonth } from "./monthYear";
import {
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics
} from "./monthlyPlan";
import {
  getPlanPreferenceGoalBudget,
  getPlanPreferenceGoalPlanOptions,
  getPlanPreferencePreferredGoalId,
  resolvePlanPreference
} from "./planPreference";

export type PlanPreviewData = {
  actionCount: number;
  contributionLabel: string;
  contributionPurpose: string;
  firstActionDescription: string;
  firstActionTitle: string;
  focusText: string;
  focusTitle: string;
  goalProgressPercentage: number | null;
  goalTitle: string | null;
  lockedActionTitles: string[];
  marginLabel: string;
  marginTone: "support" | "warning" | "neutral";
  routeEstimateLabel: string;
  selectedReferenceIsApplicable: boolean;
  selectedReferenceLabel: string | null;
  selectedStrategy: SimulationPlanStrategy;
};

export function getPlanPreviewData(
  onboarding: OnboardingData,
  exactValues: ExactFinancialValues = {}
): PlanPreviewData {
  const data = getMonthlyPlanData(onboarding);
  const metrics = getMonthlyPlanMetrics(data, exactValues);
  const planPreference = resolvePlanPreference({ exactValues, onboarding });
  const preferredGoalId = getPlanPreferencePreferredGoalId({
    onboarding,
    preference: planPreference
  });
  const planPriorityKey = planPreference.isApplicable
    ? planPreference.priorityKey
    : metrics.snapshot.priority.key;
  const goalPlan = getGoalPlanFromOnboarding(
    onboarding,
    getPlanPreferenceGoalBudget({
      fallbackMonthlyBudget: metrics.snapshot.cashflow.suggestedMonthlyContribution,
      preference: planPreference,
      preferredGoalId
    }),
    exactValues,
    getPlanPreferenceGoalPlanOptions(planPreference, preferredGoalId)
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.id === preferredGoalId) ??
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const goalTitle =
    primaryGoalAllocation?.goal.title ?? data.financialGoal ?? metrics.snapshot.goal.name;
  const activeGoalAllocations = goalPlan.allocations.filter(
    (allocation) =>
      allocation.goal.status !== "completed" && allocation.goal.status !== "paused"
  );
  const monthlyGoalContext = {
    activeGoalCount: activeGoalAllocations.length,
    title: goalTitle,
    monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
    monthlyContributionTotal: goalPlan.monthlyContributionTotal,
    estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null,
    hasRegisteredContribution: activeGoalAllocations.some(
      (allocation) => allocation.currentAmount > 0
    )
  };
  const focus = getMonthlyFocus(data, metrics, planPriorityKey, monthlyGoalContext);
  const actions = getMonthlyActions(data, metrics, planPriorityKey, monthlyGoalContext);
  const firstAction = actions[0];
  const monthlyMargin = metrics.estimatedMargin;
  const suggestedContribution =
    planPriorityKey === "advance_goal"
      ? goalPlan.monthlyContributionTotal
      : planPreference.monthlyReference;
  const estimatedMonths =
    primaryGoalAllocation?.estimatedMonthsToGoal ??
    metrics.snapshot.goal.estimatedMonthsToGoal;

  return {
    actionCount: actions.length,
    contributionLabel:
      suggestedContribution > 0 ? `${formatCOP(suggestedContribution)} aprox.` : "Por definir",
    contributionPurpose:
      planPriorityKey === "advance_goal"
        ? "para avanzar hacia tus metas."
        : `como referencia inicial para ${focus.title.toLocaleLowerCase("es-CO")}.`,
    firstActionDescription:
      firstAction?.description ??
      "Tu primera acción aparecerá cuando terminemos de preparar tu plan.",
    firstActionTitle: firstAction?.title ?? focus.title,
    focusText: focus.text,
    focusTitle: focus.title,
    goalProgressPercentage:
      primaryGoalAllocation?.progressPercentage ??
      metrics.snapshot.goal.progressPercentage,
    goalTitle,
    lockedActionTitles: actions.slice(1).map((action) => action.title),
    marginLabel:
      monthlyMargin === null ? "Por calcular" : `${formatSignedCOP(monthlyMargin)} aprox.`,
    marginTone:
      monthlyMargin === null ? "neutral" : monthlyMargin > 0 ? "support" : "warning",
    routeEstimateLabel:
      estimatedMonths !== null
        ? `${estimatedMonths} meses aprox.`
        : primaryGoalAllocation?.goal.targetMonth
          ? formatTargetMonth(primaryGoalAllocation.goal.targetMonth)
          : "Por definir",
    selectedReferenceIsApplicable: planPreference.isApplicable,
    selectedReferenceLabel: planPreference.hasExplicitPreference
      ? planPreference.label
      : null,
    selectedStrategy: planPreference.isApplicable
      ? planPreference.strategy
      : "diagnosis_recommended"
  };
}
