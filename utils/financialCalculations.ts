import {
  exactFinancialValueKeys,
  getOnboardingGoals,
  type CompletedActionsState,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import {
  getRegisteredDebtSummary,
  type DebtDataSource
} from "./debtCalculations";
import { isDebtPaid } from "./debtPayments";
import { formatCOP } from "./financialRanges";
import { isDebtGoal, isEmergencyGoal } from "./goalPlanning";

export type SnapshotSource = "exact" | "estimated" | "withheld" | "missing";
export type SmallExpensesSource =
  | "exact"
  | "estimated"
  | "reported_none"
  | "unknown"
  | "missing";
export type SavingsCapacityLevel = "negative" | "very_tight" | "low" | "medium" | "high" | "unknown";
export type EmergencyFundStatus = "none" | "starter" | "building" | "solid" | "strong" | "unknown";
export type GoalStatus =
  | "needs_target"
  | "completed_or_ready"
  | "needs_margin"
  | "near"
  | "reachable"
  | "long_term";
export type SmallExpensesLevel = "unknown" | "low" | "medium" | "high";
export type DebtLevel = "none" | "low" | "medium" | "high" | "unknown";
export type PriorityKey =
  | "debt_pressure"
  | "organize_cashflow"
  | "build_emergency_fund"
  | "review_small_expenses"
  | "advance_goal"
  | "learn_investing"
  | "keep_tracking";
export type PrecisionStatus = "estimated" | "improved" | "clearer";

export type FinancialProfileInput = {
  onboarding: OnboardingData;
  exactValues?: ExactFinancialValues | null;
  exact_values?: ExactFinancialValues | null;
  completedActions?: CompletedActionsState | null;
  completed_actions?: CompletedActionsState | null;
};

export type FinancialAction = {
  id: string;
  title: string;
  description: string;
  why: string;
  estimatedImpact: string;
  difficulty: "Baja" | "Media" | "Alta";
  category: string;
};

export type FinancialSnapshot = {
  values: {
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    currentSavings: number | null;
    goalTargetAmount: number | null;
    smallExpenses: number | null;
  };
  sourceMap: {
    monthlyIncome: SnapshotSource;
    monthlyExpenses: SnapshotSource;
    currentSavings: SnapshotSource;
    goalTargetAmount: SnapshotSource;
    smallExpenses: SmallExpensesSource;
  };
  precision: {
    exactValuesCount: number;
    status: PrecisionStatus;
    label: string;
    message: string;
  };
  cashflow: {
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    monthlyExpensesIncludesSmallExpenses: boolean;
    monthlyDebtPayments: number;
    totalMonthlyOutflow: number | null;
    monthlyMargin: number | null;
    expensesToIncomeRatio: number | null;
    marginRate: number | null;
    savingsCapacityLevel: SavingsCapacityLevel;
    savingsCapacityLabel: string;
    suggestedContributionRate: number | null;
    suggestedContributionBeforeRounding: number;
    suggestedMonthlyContribution: number;
  };
  emergencyFund: {
    coverageMonths: number | null;
    isGoalCompleted: boolean;
    targetThreeMonths: number | null;
    missingForThreeMonths: number | null;
    status: EmergencyFundStatus;
    label: string;
  };
  goal: {
    name: string | null;
    targetAmount: number | null;
    currentSavings: number | null;
    progressPercentage: number | null;
    remainingAmount: number | null;
    estimatedMonthsToGoal: number | null;
    status: GoalStatus;
    label: string;
  };
  smallExpenses: {
    amount: number | null;
    level: SmallExpensesLevel;
    opportunityAmount: number | null;
    label: string;
    recommendation: string;
  };
  debt: {
    level: DebtLevel;
    shouldPrioritizeDebt: boolean;
    label: string;
    source: DebtDataSource;
    registeredDebtCount: number;
    monthlyPaymentTotal: number;
    categoryMonthlyPaymentTotal: number;
    remainingTotal: number | null;
    debtToIncomeRatio: number | null;
    reportedPaymentShare: string | null;
    reportedMonthlyPaymentRange: string | null;
    reportedPaymentKind: "exact" | "range" | "share" | null;
    isPaymentEstimated: boolean;
    hasCategoryDebtReference: boolean;
    hasPossibleDuplicate: boolean;
  };
  priority: {
    key: PriorityKey;
    title: string;
    description: string;
  };
};

const incomeRangeEstimates: Record<string, number | null> = {
  "Menos de $1.500.000": 750000,
  "$1.500.000 – $3.000.000": 2250000,
  "$3.000.000 – $5.000.000": 4000000,
  "$5.000.000 – $8.000.000": 6500000,
  "Más de $8.000.000": 9000000
};

const expenseRangeEstimates: Record<string, number | null> = {
  "Menos de $1.000.000": 500000,
  "$1.000.000 – $2.000.000": 1500000,
  "$2.000.000 – $4.000.000": 3000000,
  "$4.000.000 – $6.000.000": 5000000,
  "Más de $6.000.000": 7000000,
  "No estoy seguro": null
};

const smallExpenseRangeEstimates: Record<string, number | null> = {
  "Menos de $100.000": 50000,
  "$100.000 – $250.000": 175000,
  "$250.000 – $500.000": 375000,
  "Más de $500.000": 600000,
  "No sé": null
};

const savingsRangeEstimates: Record<string, number | null> = {
  "No tengo ahorros": 0,
  "No tengo": 0,
  "Menos de $500.000": 250000,
  "$500.000 – $2.000.000": 1250000,
  "$2.000.000 – $5.000.000": 3500000,
  "$5.000.000 – $10.000.000": 7500000,
  "Más de $5.000.000": 6000000,
  "Más de $10.000.000": 12000000,
  "Prefiero no responder": null
};

const goalAmountRangeEstimates: Record<string, number | null> = {
  "Menos de $1.000.000": 500000,
  "$1.000.000 – $5.000.000": 3000000,
  "$5.000.000 – $20.000.000": 12500000,
  "$20.000.000 – $50.000.000": 35000000,
  "Más de $50.000.000": 60000000,
  "No tengo una cifra todavía": null,
  "Prefiero definirla después": null
};

const precisionMessages: Record<PrecisionStatus, { label: string; message: string }> = {
  estimated: {
    label: "Estimado",
    message: "Tu plan está basado en los rangos que seleccionaste."
  },
  improved: {
    label: "Mejorado",
    message:
      "Tu plan ya usa algunos datos más claros. Puedes completar los demás cuando quieras."
  },
  clearer: {
    label: "Más claro",
    message:
      "Tu plan tiene una base más clara para calcular margen, gastos pequeños y fondo de emergencia."
  }
};

const savingsCapacityLabels: Record<SavingsCapacityLevel, string> = {
  negative: "Tu margen está muy ajustado",
  very_tight: "Hay poco espacio para ahorrar",
  low: "Puedes empezar con aportes pequeños",
  medium: "Tienes una base útil para avanzar",
  high: "Tienes buen espacio para construir tu plan",
  unknown: "Necesitamos ingresos y gastos para estimar tu margen"
};

const emergencyFundLabels: Record<EmergencyFundStatus, string> = {
  none: "Aún no tienes una base de emergencia visible",
  starter: "Ya tienes una base inicial",
  building: "Vas construyendo protección",
  solid: "Tienes una base sólida",
  strong: "Tienes una protección amplia",
  unknown: "Necesitamos ahorro actual y gastos mensuales para estimar tu fondo"
};

const goalLabels: Record<GoalStatus, string> = {
  needs_target: "Agrega un monto objetivo para calcular mejor tu avance",
  completed_or_ready: "Tu ahorro actual cubre esta meta o está muy cerca",
  needs_margin: "Necesitas liberar margen mensual para avanzar mejor",
  near: "Tu meta podría estar cerca con constancia",
  reachable: "Tu meta parece alcanzable con un plan mensual",
  long_term: "Tu meta requiere un horizonte más largo o ajustes"
};

const smallExpensesLabels: Record<SmallExpensesLevel, string> = {
  low: "Tus gastos pequeños parecen manejables",
  medium: "Hay una oportunidad moderada de ajuste",
  high: "Hay una oportunidad importante para revisar pequeños consumos",
  unknown: "Aún no sabemos cuánto representan tus gastos pequeños"
};

const debtLabels: Record<DebtLevel, string> = {
  none: "No reportaste deudas activas",
  low: "Tus deudas parecen manejables",
  medium: "Tus deudas deben considerarse dentro del plan",
  high: "Conviene priorizar reducir presión de deudas",
  unknown: "No tenemos suficiente información sobre deudas"
};

function getExactValues(profile: FinancialProfileInput) {
  return profile.exactValues ?? profile.exact_values ?? {};
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getRangeEstimate(label: string | null | undefined, estimates: Record<string, number | null>) {
  if (!label) {
    return null;
  }

  return estimates[label] ?? parseCOPRange(label);
}

function getSource(value: number | null): SnapshotSource {
  return value === null ? "missing" : "estimated";
}

function getRangeSource(value: number | null, selectedRange: string | null | undefined): SnapshotSource {
  if (normalizeText(selectedRange ?? "").includes("prefiero")) {
    return "withheld";
  }

  return getSource(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function roundDownToNearest(value: number, nearest: number) {
  if (!Number.isFinite(value) || value <= 0 || nearest <= 0) {
    return 0;
  }

  return Math.floor(value / nearest) * nearest;
}

export function safeDivide(numerator: number | null, denominator: number | null) {
  if (
    numerator === null ||
    denominator === null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null;
  }

  return numerator / denominator;
}

export function parseCOPRange(label: string | null | undefined) {
  if (!label) {
    return null;
  }

  const normalizedLabel = normalizeText(label);

  if (
    normalizedLabel.includes("no se") ||
    normalizedLabel.includes("no estoy seguro") ||
    normalizedLabel.includes("prefiero") ||
    normalizedLabel.includes("todavia")
  ) {
    return null;
  }

  const values = Array.from(label.matchAll(/\d[\d.,]*/g))
    .map((match) => Number(match[0].replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  if (normalizedLabel.includes("menos de")) {
    return Math.round(values[0] / 2);
  }

  if (normalizedLabel.includes("mas de")) {
    return Math.round(values[0] * 1.2);
  }

  if (values.length >= 2) {
    return Math.round((values[0] + values[1]) / 2);
  }

  return values[0];
}

export function estimateIncomeFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, incomeRangeEstimates);
}

export function estimateExpensesFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, expenseRangeEstimates);
}

export function estimateSavingsFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, savingsRangeEstimates);
}

export function estimateSmallExpensesFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, smallExpenseRangeEstimates);
}

export function getSmallExpensesMonthlySummary({
  amount,
  range,
  source
}: {
  amount: number | null;
  range: string | null;
  source: SmallExpensesSource;
}) {
  if (source === "exact" && isNonNegativeNumber(amount)) {
    return `Monto mensual ingresado: ${formatCOP(amount)}.`;
  }

  return `Estimación mensual: ${range ?? "No respondido"}.`;
}

function estimateGoalTargetAmountFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, goalAmountRangeEstimates);
}

export function getExactValuesCount(exactValues: ExactFinancialValues | null | undefined) {
  return exactFinancialValueKeys.filter((key) => key !== "monthlyDebtPayments").filter((key) => {
    const value = exactValues?.[key];

    if (key === "currentSavings" || key === "smallExpenses") {
      return isNonNegativeNumber(value);
    }

    return isPositiveNumber(value);
  }).length;
}

export function getPlanPrecisionStatus(exactValues: ExactFinancialValues | null | undefined) {
  const exactValuesCount = getExactValuesCount(exactValues);
  const status: PrecisionStatus =
    exactValuesCount === 0 ? "estimated" : exactValuesCount === 4 ? "clearer" : "improved";

  return {
    exactValuesCount,
    status,
    ...precisionMessages[status]
  };
}

function getSavingsCapacityLevel(monthlyMargin: number | null, marginRate: number | null) {
  if (monthlyMargin === null || marginRate === null) {
    return "unknown";
  }

  if (monthlyMargin <= 0) {
    return "negative";
  }

  if (marginRate <= 0.05) {
    return "very_tight";
  }

  if (marginRate <= 0.15) {
    return "low";
  }

  if (marginRate <= 0.3) {
    return "medium";
  }

  return "high";
}

export function getSuggestedContributionRate(
  monthlyMargin: number | null,
  marginRate: number | null
) {
  if (monthlyMargin === null || marginRate === null || monthlyMargin <= 0) {
    return null;
  }

  return marginRate <= 0.1 ? 0.25 : marginRate <= 0.25 ? 0.35 : 0.45;
}

function getSuggestedMonthlyContribution(monthlyMargin: number | null, contributionRate: number | null) {
  if (monthlyMargin === null || contributionRate === null || monthlyMargin <= 0) {
    return 0;
  }

  const contribution = roundDownToNearest(monthlyMargin * contributionRate, 10000);

  return Math.min(contribution, monthlyMargin);
}

function getEmergencyFundStatus(currentSavings: number | null, monthlyExpenses: number | null) {
  if (currentSavings === null || monthlyExpenses === null || monthlyExpenses <= 0) {
    return "unknown";
  }

  const coverageMonths = currentSavings / monthlyExpenses;

  if (currentSavings <= 0) {
    return "none";
  }

  if (coverageMonths < 1) {
    return "starter";
  }

  if (coverageMonths < 3) {
    return "building";
  }

  if (coverageMonths < 6) {
    return "solid";
  }

  return "strong";
}

function getGoalStatus({
  targetAmount,
  progressPercentage,
  estimatedMonthsToGoal
}: {
  targetAmount: number | null;
  progressPercentage: number | null;
  estimatedMonthsToGoal: number | null;
}) {
  if (targetAmount === null) {
    return "needs_target";
  }

  if (progressPercentage !== null && progressPercentage >= 100) {
    return "completed_or_ready";
  }

  if (estimatedMonthsToGoal === null) {
    return "needs_margin";
  }

  if (estimatedMonthsToGoal <= 6) {
    return "near";
  }

  if (estimatedMonthsToGoal <= 24) {
    return "reachable";
  }

  return "long_term";
}

function getSmallExpensesLevel(amount: number | null) {
  if (amount === null) {
    return "unknown";
  }

  if (amount <= 100000) {
    return "low";
  }

  if (amount <= 250000) {
    return "medium";
  }

  return "high";
}

function getDebtLevel(debtSituation: string | null, debtPaymentShare: string | null): DebtLevel {
  const situation = normalizeText(debtSituation ?? "");
  const paymentShare = normalizeText(debtPaymentShare ?? "");

  if (situation.includes("prefiero") || paymentShare.includes("prefiero")) {
    return "unknown";
  }

  if (situation.includes("no tengo") || paymentShare.includes("no pago")) {
    return "none";
  }

  if (
    situation.includes("preocupacion importante") ||
    paymentShare.includes("mas del 40") ||
    paymentShare.includes("20") && paymentShare.includes("40")
  ) {
    return "high";
  }

  if (
    situation.includes("cuesta") ||
    paymentShare.includes("10") && paymentShare.includes("20")
  ) {
    return "medium";
  }

  if (
    situation.includes("pago sin problema") ||
    paymentShare.includes("menos del 10")
  ) {
    return "low";
  }

  if (!debtSituation && !debtPaymentShare) {
    return "unknown";
  }

  return "medium";
}

function getPriority(
  snapshot: Omit<FinancialSnapshot, "priority">
): FinancialSnapshot["priority"] {
  if (snapshot.debt.shouldPrioritizeDebt) {
    return {
      key: "debt_pressure",
      title: "Reducir presión de deudas",
      description:
        "Antes de acelerar otras metas, conviene entender cuánto pesan tus deudas en el mes."
    };
  }

  if (snapshot.cashflow.monthlyMargin !== null && snapshot.cashflow.monthlyMargin <= 0) {
    return {
      key: "organize_cashflow",
      title: "Ordenar ingresos y gastos",
      description: "Tu primera oportunidad está en recuperar margen mensual."
    };
  }

  if (
    !snapshot.emergencyFund.isGoalCompleted &&
    (snapshot.emergencyFund.status === "none" ||
      snapshot.emergencyFund.status === "starter")
  ) {
    return {
      key: "build_emergency_fund",
      title: "Construir fondo de emergencia",
      description:
        "Crear una base para imprevistos puede darte más estabilidad antes de avanzar a metas grandes."
    };
  }

  if (snapshot.goal.status !== "completed_or_ready") {
    return {
      key: "advance_goal",
      title: "Avanzar hacia tu meta",
      description:
        "Tu plan puede enfocarse en separar un monto mensual adecuado para tu objetivo."
    };
  }

  return {
    key: "keep_tracking",
    title: "Mantener claridad mensual",
    description: "Revisar tu plan cada mes te ayuda a tomar mejores decisiones."
  };
}

export function calculateFinancialSnapshot(profile: FinancialProfileInput): FinancialSnapshot {
  const { onboarding } = profile;
  const planningGoals = getOnboardingGoals(onboarding).filter((goal) => !isDebtGoal(goal));
  const emergencyGoal = planningGoals.find(isEmergencyGoal) ?? null;
  const primaryGoal =
    planningGoals.find((goal) => goal.isPrimary) ?? planningGoals[0] ?? null;
  const exactValues = getExactValues(profile);
  const exactMonthlyIncome = exactValues.monthlyIncome;
  const exactMonthlyExpenses = exactValues.monthlyExpenses;
  const exactCurrentSavings = exactValues.currentSavings;
  const exactSmallExpenses = exactValues.smallExpenses;

  const estimatedMonthlyIncome = estimateIncomeFromRange(onboarding.incomeRange);
  const estimatedMonthlyExpenses = estimateExpensesFromRange(onboarding.expensesRange);
  const estimatedCurrentSavings = estimateSavingsFromRange(onboarding.savingsRange);
  const estimatedGoalTargetAmount = estimateGoalTargetAmountFromRange(
    primaryGoal?.amountRange ?? null
  );
  const estimatedSmallExpenses = estimateSmallExpensesFromRange(onboarding.smallExpensesRange);
  const reportedNoSmallExpenses = onboarding.hasSmallExpenses === "No";
  const monthlyExpensesIncludesSmallExpenses =
    onboarding.monthlyExpensesIncludesSmallExpenses === true;
  const withheldSavings =
    normalizeText(onboarding.savingsRange ?? "").includes("prefiero");

  const monthlyIncome = isPositiveNumber(exactMonthlyIncome)
    ? exactMonthlyIncome
    : estimatedMonthlyIncome;
  const monthlyExpenses = isPositiveNumber(exactMonthlyExpenses)
    ? exactMonthlyExpenses
    : estimatedMonthlyExpenses;
  const currentSavings = withheldSavings
    ? null
    : isNonNegativeNumber(exactCurrentSavings)
      ? exactCurrentSavings
      : estimatedCurrentSavings;
  const goalTargetAmount = isPositiveNumber(primaryGoal?.targetAmount)
    ? primaryGoal.targetAmount
    : estimatedGoalTargetAmount;
  const smallExpenses = reportedNoSmallExpenses
    ? 0
    : isNonNegativeNumber(exactSmallExpenses)
      ? exactSmallExpenses
      : estimatedSmallExpenses;
  const goalCurrentSavings = isNonNegativeNumber(primaryGoal?.currentAmount)
    ? primaryGoal.currentAmount
    : currentSavings;
  const emergencyGoalAmount = isNonNegativeNumber(emergencyGoal?.currentAmount)
    ? emergencyGoal.currentAmount
    : 0;
  const emergencyFundSavings = emergencyGoal
    ? emergencyGoal.status === "completed"
      ? Math.max(emergencyGoalAmount, emergencyGoal.targetAmount ?? 0)
      : emergencyGoalAmount
    : currentSavings;

  const selectedDebtLevel = getDebtLevel(onboarding.debtSituation, onboarding.debtPaymentShare);
  const registeredDebtSummary = getRegisteredDebtSummary({
    debts: onboarding.debts,
    debtPaymentShare: onboarding.debtPaymentShare,
    hasDebts: onboarding.hasDebts,
    expenseCategoryAmounts: onboarding.expenseCategoryAmounts,
    reportedMonthlyPayment: exactValues.monthlyDebtPayments,
    reportedMonthlyPaymentRange: onboarding.debtMonthlyPaymentRange,
    monthlyIncome
  });
  const hasOnlyPaidDetailedDebts =
    onboarding.debts.length > 0 && onboarding.debts.every(isDebtPaid);
  const debtLevel = hasOnlyPaidDetailedDebts
    ? "none"
    : registeredDebtSummary.source !== "none"
      ? registeredDebtSummary.level
      : selectedDebtLevel;
  const totalMonthlyOutflow =
    monthlyExpenses !== null &&
    (monthlyExpensesIncludesSmallExpenses || smallExpenses !== null)
      ? monthlyExpenses +
        (monthlyExpensesIncludesSmallExpenses ? 0 : (smallExpenses ?? 0)) +
        registeredDebtSummary.monthlyPaymentTotal
      : null;

  const monthlyMargin =
    monthlyIncome !== null && totalMonthlyOutflow !== null
      ? monthlyIncome - totalMonthlyOutflow
      : null;
  const expensesToIncomeRatio = safeDivide(totalMonthlyOutflow, monthlyIncome);
  const marginRate = safeDivide(monthlyMargin, monthlyIncome);
  const savingsCapacityLevel = getSavingsCapacityLevel(monthlyMargin, marginRate);
  const suggestedContributionRate = getSuggestedContributionRate(monthlyMargin, marginRate);
  const suggestedContributionBeforeRounding =
    monthlyMargin !== null && suggestedContributionRate !== null
      ? monthlyMargin * suggestedContributionRate
      : 0;
  const suggestedMonthlyContribution = getSuggestedMonthlyContribution(
    monthlyMargin,
    suggestedContributionRate
  );

  const coverageMonths = safeDivide(emergencyFundSavings, monthlyExpenses);
  const targetThreeMonths = monthlyExpenses !== null ? monthlyExpenses * 3 : null;
  const missingForThreeMonths =
    targetThreeMonths !== null && emergencyFundSavings !== null
      ? Math.max(targetThreeMonths - emergencyFundSavings, 0)
      : null;
  const emergencyFundStatus = getEmergencyFundStatus(emergencyFundSavings, monthlyExpenses);

  const goalProgressPercentage =
    goalCurrentSavings !== null && goalTargetAmount !== null && goalTargetAmount > 0
      ? Math.min((goalCurrentSavings / goalTargetAmount) * 100, 100)
      : null;
  const remainingAmount =
    goalTargetAmount !== null && goalCurrentSavings !== null
      ? Math.max(goalTargetAmount - goalCurrentSavings, 0)
      : null;
  const estimatedMonthsToGoal =
    remainingAmount !== null && suggestedMonthlyContribution > 0
      ? Math.ceil(remainingAmount / suggestedMonthlyContribution)
      : null;
  const goalStatus = getGoalStatus({
    targetAmount: goalTargetAmount,
    progressPercentage: goalProgressPercentage,
    estimatedMonthsToGoal
  });

  const smallExpensesLevel = getSmallExpensesLevel(smallExpenses);
  const smallExpensesOpportunity =
    smallExpenses !== null ? roundDownToNearest(smallExpenses * 0.2, 10000) : null;

  const baseSnapshot: Omit<FinancialSnapshot, "priority"> = {
    values: {
      monthlyIncome,
      monthlyExpenses,
      currentSavings,
      goalTargetAmount,
      smallExpenses
    },
    sourceMap: {
      monthlyIncome: isPositiveNumber(exactMonthlyIncome)
        ? "exact"
        : getRangeSource(monthlyIncome, onboarding.incomeRange),
      monthlyExpenses: isPositiveNumber(exactMonthlyExpenses)
        ? "exact"
        : getRangeSource(monthlyExpenses, onboarding.expensesRange),
      currentSavings: withheldSavings
        ? "withheld"
        : isNonNegativeNumber(exactCurrentSavings)
        ? "exact"
        : getRangeSource(currentSavings, onboarding.savingsRange),
      goalTargetAmount:
        isPositiveNumber(primaryGoal?.targetAmount)
          ? "exact"
          : getSource(goalTargetAmount),
      smallExpenses:
        reportedNoSmallExpenses
          ? "reported_none"
          : isNonNegativeNumber(exactSmallExpenses)
          ? "exact"
          : onboarding.smallExpensesRange === "No sé" || onboarding.smallExpensesRange === "No estoy seguro"
          ? "unknown"
          : smallExpenses === null
            ? "missing"
            : "estimated"
    },
    precision: getPlanPrecisionStatus(exactValues),
    cashflow: {
      monthlyIncome,
      monthlyExpenses,
      monthlyExpensesIncludesSmallExpenses,
      monthlyDebtPayments: registeredDebtSummary.monthlyPaymentTotal,
      totalMonthlyOutflow,
      monthlyMargin,
      expensesToIncomeRatio,
      marginRate,
      savingsCapacityLevel,
      savingsCapacityLabel: savingsCapacityLabels[savingsCapacityLevel],
      suggestedContributionRate,
      suggestedContributionBeforeRounding,
      suggestedMonthlyContribution
    },
    emergencyFund: {
      coverageMonths,
      isGoalCompleted: emergencyGoal?.status === "completed",
      targetThreeMonths,
      missingForThreeMonths,
      status: emergencyFundStatus,
      label: emergencyFundLabels[emergencyFundStatus]
    },
    goal: {
      name: primaryGoal?.title ?? null,
      targetAmount: goalTargetAmount,
      currentSavings: goalCurrentSavings,
      progressPercentage: goalProgressPercentage,
      remainingAmount,
      estimatedMonthsToGoal,
      status: goalStatus,
      label: goalLabels[goalStatus]
    },
    smallExpenses: {
      amount: smallExpenses,
      level: smallExpensesLevel,
      opportunityAmount: smallExpensesOpportunity,
      label:
        monthlyExpensesIncludesSmallExpenses && smallExpenses === null
          ? "Incluidos en gastos mensuales"
          : reportedNoSmallExpenses
            ? "No identificaste gastos pequeños frecuentes"
            : smallExpensesLabels[smallExpensesLevel],
      recommendation:
        monthlyExpensesIncludesSmallExpenses && smallExpenses === null
          ? "Ya están considerados dentro del gasto mensual. Puedes detallarlos después sin que se sumen dos veces."
          : reportedNoSmallExpenses
            ? "Indicaste que no identificas gastos pequeños frecuentes. No usamos este rubro para crear aportes."
            : "Podrías revisar una parte de estos gastos, sin eliminarlos todos."
    },
    debt: {
      level: debtLevel,
      shouldPrioritizeDebt: debtLevel === "high" || registeredDebtSummary.shouldPrioritizeDebt,
      label:
        registeredDebtSummary.source !== "none" ? registeredDebtSummary.label : debtLabels[debtLevel],
      source: registeredDebtSummary.source,
      registeredDebtCount: registeredDebtSummary.count,
      monthlyPaymentTotal: registeredDebtSummary.monthlyPaymentTotal,
      categoryMonthlyPaymentTotal: registeredDebtSummary.categoryMonthlyPaymentTotal,
      remainingTotal: registeredDebtSummary.remainingTotal,
      debtToIncomeRatio: registeredDebtSummary.debtToIncomeRatio,
      reportedPaymentShare: registeredDebtSummary.reportedPaymentShare,
      reportedMonthlyPaymentRange: registeredDebtSummary.reportedMonthlyPaymentRange,
      reportedPaymentKind: registeredDebtSummary.reportedPaymentKind,
      isPaymentEstimated: registeredDebtSummary.isPaymentEstimated,
      hasCategoryDebtReference: registeredDebtSummary.hasCategoryDebtReference,
      hasPossibleDuplicate: registeredDebtSummary.hasPossibleDuplicate
    }
  };

  const priority = getPriority(baseSnapshot);

  return {
    ...baseSnapshot,
    priority
  };
}

export function generateMonthlyActions(
  snapshot: FinancialSnapshot,
  priorityKey: PriorityKey = snapshot.priority.key
): FinancialAction[] {
  const actionsByPriority: Record<PriorityKey, FinancialAction[]> = {
    debt_pressure: [],
    organize_cashflow: [],
    build_emergency_fund: [],
    review_small_expenses: [],
    advance_goal: [],
    learn_investing: [],
    keep_tracking: []
  };

  return actionsByPriority[priorityKey];
}
