import type { ExactFinancialValues, OnboardingData } from "../types/financial";
import {
  getRegisteredDebtSummary,
  getReportedDebtPaymentRatioRange,
  type DebtDataSource,
  type ReportedDebtPaymentRatioRange
} from "./debtCalculations";
import { isDebtPaid } from "./debtPayments";
import { calculateFinancialSnapshot } from "./financialCalculations";

export type SimulationExperienceMode =
  | "detailed_debt"
  | "goal_only"
  | "reported_debt";

export type SimulationAmountRange = {
  maximum: number | null;
  minimum: number | null;
};

export type SimulationExperience = {
  debtDataSource: DebtDataSource;
  debtPaymentRange: SimulationAmountRange;
  mode: SimulationExperienceMode;
  monthlyIncome: number | null;
  monthlyMarginRange: SimulationAmountRange;
  monthlyOperatingCosts: number | null;
  planningMonthlyMargin: number | null;
  recommendedMonthlyContribution: number;
  reportedRatioRange: ReportedDebtPaymentRatioRange;
};

function getReportedDebtMode(onboarding: OnboardingData, debtDataSource: DebtDataSource) {
  if (
    onboarding.debtSituation === "No tengo deudas" ||
    onboarding.debtPaymentShare === "No pago deudas"
  ) {
    return false;
  }

  if (debtDataSource === "category" || debtDataSource === "reported") {
    return true;
  }

  // Only an explicit "no debt" answer enables goal-only mode. Missing or withheld
  // information must not be presented as if the person had no debts.
  return true;
}

function getAmountRangeFromRatio({
  monthlyIncome,
  ratioRange
}: {
  monthlyIncome: number | null;
  ratioRange: ReportedDebtPaymentRatioRange;
}): SimulationAmountRange {
  if (monthlyIncome === null) {
    return { maximum: null, minimum: null };
  }

  return {
    maximum:
      ratioRange.maximum === null ? null : Math.round(monthlyIncome * ratioRange.maximum),
    minimum:
      ratioRange.minimum === null ? null : Math.round(monthlyIncome * ratioRange.minimum)
  };
}

function getMonthlyMarginRange({
  debtPaymentRange,
  monthlyIncome,
  monthlyOperatingCosts
}: {
  debtPaymentRange: SimulationAmountRange;
  monthlyIncome: number | null;
  monthlyOperatingCosts: number | null;
}): SimulationAmountRange {
  if (monthlyIncome === null || monthlyOperatingCosts === null) {
    return { maximum: null, minimum: null };
  }

  return {
    maximum:
      debtPaymentRange.minimum === null
        ? null
        : monthlyIncome - monthlyOperatingCosts - debtPaymentRange.minimum,
    minimum:
      debtPaymentRange.maximum === null
        ? null
        : monthlyIncome - monthlyOperatingCosts - debtPaymentRange.maximum
  };
}

export function buildSimulationExperience({
  exactValues,
  onboarding
}: {
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): SimulationExperience {
  const snapshot = calculateFinancialSnapshot({ exactValues, onboarding });
  const activeDebts = onboarding.debts.filter((debt) => !isDebtPaid(debt));
  const debtSummary = getRegisteredDebtSummary({
    debtPaymentShare: onboarding.debtPaymentShare,
    debts: onboarding.debts,
    expenseCategoryAmounts: onboarding.expenseCategoryAmounts,
    monthlyIncome: snapshot.cashflow.monthlyIncome
  });
  const monthlyIncome = snapshot.cashflow.monthlyIncome;
  const monthlyOperatingCosts =
    snapshot.cashflow.monthlyExpenses !== null && snapshot.values.smallExpenses !== null
      ? snapshot.cashflow.monthlyExpenses + snapshot.values.smallExpenses
      : null;
  const reportedRatioRange = getReportedDebtPaymentRatioRange(
    onboarding.debtPaymentShare
  );

  if (activeDebts.length > 0) {
    return {
      debtDataSource: "registered",
      debtPaymentRange: {
        maximum: debtSummary.monthlyPaymentTotal,
        minimum: debtSummary.monthlyPaymentTotal
      },
      mode: "detailed_debt",
      monthlyIncome,
      monthlyMarginRange: {
        maximum: snapshot.cashflow.monthlyMargin,
        minimum: snapshot.cashflow.monthlyMargin
      },
      monthlyOperatingCosts,
      planningMonthlyMargin: snapshot.cashflow.monthlyMargin,
      recommendedMonthlyContribution: snapshot.cashflow.suggestedMonthlyContribution,
      reportedRatioRange
    };
  }

  const hasReportedDebt = getReportedDebtMode(onboarding, debtSummary.source);
  const mode: SimulationExperienceMode = hasReportedDebt ? "reported_debt" : "goal_only";
  const debtPaymentRange =
    debtSummary.source === "category"
      ? {
          maximum: debtSummary.monthlyPaymentTotal,
          minimum: debtSummary.monthlyPaymentTotal
        }
      : mode === "goal_only"
        ? { maximum: 0, minimum: 0 }
        : getAmountRangeFromRatio({ monthlyIncome, ratioRange: reportedRatioRange });
  const monthlyMarginRange = getMonthlyMarginRange({
    debtPaymentRange,
    monthlyIncome,
    monthlyOperatingCosts
  });
  const planningMonthlyMargin = monthlyMarginRange.minimum;
  const safePlanningMargin = Math.max(0, planningMonthlyMargin ?? 0);

  return {
    debtDataSource: debtSummary.source,
    debtPaymentRange,
    mode,
    monthlyIncome,
    monthlyMarginRange,
    monthlyOperatingCosts,
    planningMonthlyMargin,
    recommendedMonthlyContribution:
      planningMonthlyMargin === null
        ? 0
        : Math.min(snapshot.cashflow.suggestedMonthlyContribution, safePlanningMargin),
    reportedRatioRange
  };
}
