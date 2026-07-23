import type { ExactFinancialValues, OnboardingData } from "../types/financial";
import { formatCOP, formatSignedCOP } from "./financialRanges";
import { getGoalPlanFromOnboarding } from "./goalPlanning";
import {
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics
} from "./monthlyPlan";

export type PlanPreviewData = {
  actionCount: number;
  contributionLabel: string;
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
};

export function getPlanPreviewData(
  onboarding: OnboardingData,
  exactValues: ExactFinancialValues = {}
): PlanPreviewData {
  const data = getMonthlyPlanData(onboarding);
  const metrics = getMonthlyPlanMetrics(data, exactValues);
  const goalPlan = getGoalPlanFromOnboarding(
    onboarding,
    metrics.snapshot.cashflow.suggestedMonthlyContribution,
    exactValues
  );
  const primaryGoalAllocation =
    goalPlan.allocations.find((allocation) => allocation.goal.isPrimary) ??
    goalPlan.allocations[0] ??
    null;
  const goalTitle =
    primaryGoalAllocation?.goal.title ?? data.financialGoal ?? metrics.snapshot.goal.name;
  const monthlyGoalContext = {
    title: goalTitle,
    monthlyContribution: primaryGoalAllocation?.monthlyContribution ?? null,
    estimatedMonthsToGoal: primaryGoalAllocation?.estimatedMonthsToGoal ?? null
  };
  const focus = getMonthlyFocus(data, metrics, undefined, monthlyGoalContext);
  const actions = getMonthlyActions(data, metrics, undefined, monthlyGoalContext);
  const firstAction = actions[0];
  const monthlyMargin = metrics.estimatedMargin;
  const suggestedContribution =
    primaryGoalAllocation?.monthlyContribution ??
    metrics.snapshot.cashflow.suggestedMonthlyContribution;
  const estimatedMonths =
    primaryGoalAllocation?.estimatedMonthsToGoal ??
    metrics.snapshot.goal.estimatedMonthsToGoal;

  return {
    actionCount: actions.length,
    contributionLabel:
      suggestedContribution > 0 ? `${formatCOP(suggestedContribution)} aprox.` : "Por definir",
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
        : primaryGoalAllocation?.goal.horizon ?? data.goalHorizon ?? "Por definir"
  };
}
