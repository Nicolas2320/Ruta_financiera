import {
  exactFinancialValueKeys,
  getPrimaryFinancialGoal,
  type CompletedActionsState,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import { formatCOP } from "./financialRanges";

export type SnapshotSource = "exact" | "estimated" | "missing";
export type SmallExpensesSource = "estimated" | "unknown" | "missing";
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
    monthlyMargin: number | null;
    expensesToIncomeRatio: number | null;
    marginRate: number | null;
    savingsCapacityLevel: SavingsCapacityLevel;
    savingsCapacityLabel: string;
    suggestedMonthlyContribution: number;
  };
  emergencyFund: {
    coverageMonths: number | null;
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
      "Tu plan tiene una base más clara para calcular margen, meta y fondo de emergencia."
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
  unknown: "Necesitamos ahorro actual y gasto mensual para estimar tu fondo"
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

function estimateGoalTargetAmountFromRange(label: string | null | undefined) {
  return getRangeEstimate(label, goalAmountRangeEstimates);
}

export function getExactValuesCount(exactValues: ExactFinancialValues | null | undefined) {
  return exactFinancialValueKeys.filter((key) => {
    const value = exactValues?.[key];

    if (key === "currentSavings") {
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

function getSuggestedMonthlyContribution(monthlyMargin: number | null, marginRate: number | null) {
  if (monthlyMargin === null || marginRate === null || monthlyMargin <= 0) {
    return 0;
  }

  const share = marginRate <= 0.1 ? 0.25 : marginRate <= 0.25 ? 0.35 : 0.45;
  const contribution = roundDownToNearest(monthlyMargin * share, 10000);

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
  snapshot: Omit<FinancialSnapshot, "priority">,
  investmentSituation: string | null
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
    snapshot.emergencyFund.status === "none" ||
    snapshot.emergencyFund.status === "starter"
  ) {
    return {
      key: "build_emergency_fund",
      title: "Construir fondo de emergencia",
      description:
        "Crear una base para imprevistos puede darte más estabilidad antes de avanzar a metas grandes."
    };
  }

  if (snapshot.smallExpenses.level === "high") {
    return {
      key: "review_small_expenses",
      title: "Revisar gastos pequeños",
      description:
        "Puedes redirigir una parte de tus pequeños consumos hacia tu meta sin eliminarlos todos."
    };
  }

  if (snapshot.goal.status !== "completed_or_ready") {
    return {
      key: "advance_goal",
      title: "Avanzar hacia tu meta",
      description:
        "Tu plan puede enfocarse en separar un monto mensual realista para tu objetivo."
    };
  }

  const normalizedInvestmentSituation = normalizeText(investmentSituation ?? "");

  if (
    normalizedInvestmentSituation.includes("quiero aprender") &&
    (snapshot.emergencyFund.status === "solid" ||
      snapshot.emergencyFund.status === "strong")
  ) {
    return {
      key: "learn_investing",
      title: "Aprender antes de invertir",
      description:
        "Puedes empezar entendiendo riesgo, plazo y liquidez antes de tomar decisiones."
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
  const primaryGoal = getPrimaryFinancialGoal(onboarding);
  const exactValues = getExactValues(profile);
  const exactMonthlyIncome = exactValues.monthlyIncome;
  const exactMonthlyExpenses = exactValues.monthlyExpenses;
  const exactCurrentSavings = exactValues.currentSavings;
  const exactGoalTargetAmount = exactValues.goalTargetAmount;

  const estimatedMonthlyIncome = estimateIncomeFromRange(onboarding.incomeRange);
  const estimatedMonthlyExpenses = estimateExpensesFromRange(onboarding.expensesRange);
  const estimatedCurrentSavings = estimateSavingsFromRange(onboarding.savingsRange);
  const estimatedGoalTargetAmount = estimateGoalTargetAmountFromRange(
    primaryGoal?.amountRange ?? onboarding.goalAmountRange
  );
  const estimatedSmallExpenses = estimateSmallExpensesFromRange(onboarding.smallExpensesRange);

  const monthlyIncome = isPositiveNumber(exactMonthlyIncome)
    ? exactMonthlyIncome
    : estimatedMonthlyIncome;
  const monthlyExpenses = isPositiveNumber(exactMonthlyExpenses)
    ? exactMonthlyExpenses
    : estimatedMonthlyExpenses;
  const currentSavings = isNonNegativeNumber(exactCurrentSavings)
    ? exactCurrentSavings
    : estimatedCurrentSavings;
  const goalTargetAmount = isPositiveNumber(primaryGoal?.targetAmount)
    ? primaryGoal.targetAmount
    : isPositiveNumber(exactGoalTargetAmount)
      ? exactGoalTargetAmount
      : estimatedGoalTargetAmount;
  const smallExpenses = estimatedSmallExpenses;
  const goalCurrentSavings = isNonNegativeNumber(primaryGoal?.currentAmount)
    ? primaryGoal.currentAmount
    : currentSavings;

  const monthlyMargin =
    monthlyIncome !== null && monthlyExpenses !== null ? monthlyIncome - monthlyExpenses : null;
  const expensesToIncomeRatio = safeDivide(monthlyExpenses, monthlyIncome);
  const marginRate = safeDivide(monthlyMargin, monthlyIncome);
  const savingsCapacityLevel = getSavingsCapacityLevel(monthlyMargin, marginRate);
  const suggestedMonthlyContribution = getSuggestedMonthlyContribution(monthlyMargin, marginRate);

  const coverageMonths = safeDivide(currentSavings, monthlyExpenses);
  const targetThreeMonths = monthlyExpenses !== null ? monthlyExpenses * 3 : null;
  const missingForThreeMonths =
    targetThreeMonths !== null && currentSavings !== null
      ? Math.max(targetThreeMonths - currentSavings, 0)
      : null;
  const emergencyFundStatus = getEmergencyFundStatus(currentSavings, monthlyExpenses);

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
  const debtLevel = getDebtLevel(onboarding.debtSituation, onboarding.debtPaymentShare);

  const baseSnapshot: Omit<FinancialSnapshot, "priority"> = {
    values: {
      monthlyIncome,
      monthlyExpenses,
      currentSavings,
      goalTargetAmount,
      smallExpenses
    },
    sourceMap: {
      monthlyIncome: isPositiveNumber(exactMonthlyIncome) ? "exact" : getSource(monthlyIncome),
      monthlyExpenses: isPositiveNumber(exactMonthlyExpenses)
        ? "exact"
        : getSource(monthlyExpenses),
      currentSavings: isNonNegativeNumber(exactCurrentSavings)
        ? "exact"
        : getSource(currentSavings),
      goalTargetAmount:
        isPositiveNumber(primaryGoal?.targetAmount) || isPositiveNumber(exactGoalTargetAmount)
          ? "exact"
          : getSource(goalTargetAmount),
      smallExpenses:
        onboarding.smallExpensesRange === "No sé" || onboarding.smallExpensesRange === "No estoy seguro"
          ? "unknown"
          : smallExpenses === null
            ? "missing"
            : "estimated"
    },
    precision: getPlanPrecisionStatus(exactValues),
    cashflow: {
      monthlyIncome,
      monthlyExpenses,
      monthlyMargin,
      expensesToIncomeRatio,
      marginRate,
      savingsCapacityLevel,
      savingsCapacityLabel: savingsCapacityLabels[savingsCapacityLevel],
      suggestedMonthlyContribution
    },
    emergencyFund: {
      coverageMonths,
      targetThreeMonths,
      missingForThreeMonths,
      status: emergencyFundStatus,
      label: emergencyFundLabels[emergencyFundStatus]
    },
    goal: {
      name: primaryGoal?.title ?? onboarding.financialGoal,
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
      label: smallExpensesLabels[smallExpensesLevel],
      recommendation: "Podrías revisar una parte de estos gastos, sin eliminarlos todos."
    },
    debt: {
      level: debtLevel,
      shouldPrioritizeDebt: debtLevel === "high",
      label: debtLabels[debtLevel]
    }
  };

  const priority = getPriority(baseSnapshot, onboarding.investmentSituation);

  return {
    ...baseSnapshot,
    priority
  };
}

function getImpactLabel(amount: number | null) {
  return amount !== null && amount > 0
    ? `Referencia educativa: ${formatCOP(amount)} aprox.`
    : "Referencia educativa, sin monto sugerido por ahora.";
}

export function generateMonthlyActions(
  snapshot: FinancialSnapshot,
  priorityKey: PriorityKey = snapshot.priority.key
): FinancialAction[] {
  const contribution = snapshot.cashflow.suggestedMonthlyContribution;
  const opportunity = snapshot.smallExpenses.opportunityAmount;

  const actionsByPriority: Record<PriorityKey, FinancialAction[]> = {
    debt_pressure: [
      {
        id: "debt-monthly-payment",
        title: "Revisar cuánto pagas al mes en deudas",
        description: "Haz una lista simple de tus pagos mensuales de deuda.",
        why: "Conocer ese valor ayuda a entender qué tanto presiona tu flujo mensual.",
        estimatedImpact: "Te dará claridad para decidir qué revisar primero.",
        difficulty: "Media",
        category: "Deudas"
      },
      {
        id: "debt-pressure-source",
        title: "Identificar la deuda que más presión genera",
        description: "Marca cuál deuda pesa más por pago mensual, interés o urgencia.",
        why: "No todas las deudas afectan tu mes de la misma manera.",
        estimatedImpact: "Puede ayudarte a priorizar sin tomar decisiones apresuradas.",
        difficulty: "Media",
        category: "Deudas"
      },
      {
        id: "avoid-new-debt",
        title: "Evitar nuevas deudas este mes si no es necesario",
        description: "Antes de comprar a crédito, revisa si puede esperar.",
        why: "Reducir presión nueva puede proteger tu margen mensual.",
        estimatedImpact: "Ayuda a no aumentar la carga mientras ordenas el plan.",
        difficulty: "Media",
        category: "Deudas"
      }
    ],
    organize_cashflow: [
      {
        id: "review-main-expenses",
        title: "Revisar tus 3 categorías principales de gasto",
        description: "Elige las tres categorías que más pesan y anota cuánto representan.",
        why: "Entender el destino del dinero es el primer paso para recuperar margen.",
        estimatedImpact: "Puede mostrar oportunidades sin hacer cambios extremos.",
        difficulty: "Baja",
        category: "Gastos"
      },
      {
        id: "weekly-limit",
        title: "Definir un límite semanal simple",
        description: "Elige una categoría variable y define un límite realista por semana.",
        why: "Un límite corto es más fácil de observar y ajustar.",
        estimatedImpact: "Puede ayudarte a ordenar el mes sin esperar al cierre.",
        difficulty: "Media",
        category: "Gastos"
      },
      {
        id: "small-automatic-separation",
        title: "Separar una cantidad pequeña al recibir ingresos",
        description: "Si puedes, aparta una cantidad mínima apenas recibas dinero.",
        why: "Separar primero puede evitar que todo se vaya en gastos del mes.",
        estimatedImpact: getImpactLabel(contribution),
        difficulty: "Media",
        category: "Ahorro"
      }
    ],
    build_emergency_fund: [
      {
        id: "initial-emergency-contribution",
        title: "Separar un aporte inicial para fondo de emergencia",
        description: "Elige un monto pequeño y sostenible para empezar o fortalecer tu base.",
        why: "Una base para imprevistos puede darte más estabilidad.",
        estimatedImpact: getImpactLabel(contribution),
        difficulty: "Media",
        category: "Ahorro"
      },
      {
        id: "separate-emergency-money",
        title: "Guardar ese dinero en un lugar separado",
        description: "Evita mezclarlo con el dinero de gastos diarios.",
        why: "Separarlo ayuda a no usarlo sin darte cuenta.",
        estimatedImpact: "Mejora la claridad de tu fondo de emergencia.",
        difficulty: "Baja",
        category: "Ahorro"
      },
      {
        id: "protect-emergency-money",
        title: "Evitar usarlo para gastos no urgentes",
        description: "Define qué cuenta como emergencia antes de necesitarlo.",
        why: "Una regla simple protege tu base financiera.",
        estimatedImpact: "Ayuda a que el fondo cumpla su propósito.",
        difficulty: "Media",
        category: "Ahorro"
      }
    ],
    review_small_expenses: [
      {
        id: "observe-small-expense-category",
        title: "Elegir una categoría de gasto pequeño para observar",
        description: "Observa una sola categoría durante una semana.",
        why: "Mirar una categoría evita que el ajuste se sienta abrumador.",
        estimatedImpact: "Puede revelar consumos repetidos fáciles de ajustar.",
        difficulty: "Baja",
        category: "Gastos hormiga"
      },
      {
        id: "small-expense-limit",
        title: "Definir un límite mensual para esa categoría",
        description: "Pon un límite realista, sin eliminar todos tus gustos.",
        why: "La idea es decidir, no castigarte.",
        estimatedImpact: getImpactLabel(opportunity),
        difficulty: "Media",
        category: "Gastos hormiga"
      },
      {
        id: "redirect-small-expenses",
        title: "Redirigir una parte de esos gastos hacia tu meta",
        description: "Aparta una parte de lo que ajustes para tu objetivo.",
        why: "Un ajuste pequeño puede convertirse en avance visible.",
        estimatedImpact: getImpactLabel(opportunity),
        difficulty: "Media",
        category: "Meta"
      }
    ],
    advance_goal: [
      {
        id: "set-goal-contribution",
        title: "Separar el aporte mensual sugerido si es posible",
        description: "Úsalo como referencia educativa, no como obligación.",
        why: "Un aporte realista ayuda a avanzar sin desordenar el mes.",
        estimatedImpact: getImpactLabel(contribution),
        difficulty: "Media",
        category: "Meta"
      },
      {
        id: "review-goal-target",
        title: "Revisar si el monto objetivo sigue siendo realista",
        description: "Compara tu objetivo con tu margen y tu horizonte.",
        why: "Ajustar la meta puede hacer el plan más sostenible.",
        estimatedImpact: "Te ayuda a mantener una meta clara y viable.",
        difficulty: "Baja",
        category: "Meta"
      },
      {
        id: "compare-goal-contribution",
        title: "Comparar cuánto cambia la meta al ajustar el aporte",
        description: "Prueba mentalmente un aporte menor y uno mayor.",
        why: "Ver escenarios ayuda a decidir con más calma.",
        estimatedImpact:
          snapshot.goal.estimatedMonthsToGoal !== null
            ? `Con estos datos, podría tomar cerca de ${snapshot.goal.estimatedMonthsToGoal} meses.`
            : "Necesitamos margen mensual para estimar meses.",
        difficulty: "Baja",
        category: "Meta"
      }
    ],
    learn_investing: [
      {
        id: "learn-risk-time",
        title: "Leer una explicación corta sobre riesgo y plazo",
        description: "Dedica 10 minutos a entender esos dos conceptos.",
        why: "Antes de invertir, conviene saber qué puede variar y en cuánto tiempo.",
        estimatedImpact: "Mejora tu claridad antes de tomar decisiones.",
        difficulty: "Baja",
        category: "Educación"
      },
      {
        id: "define-investing-horizon",
        title: "Definir si tu meta es de corto o largo plazo",
        description: "Anota si necesitarás ese dinero pronto o puedes esperar.",
        why: "El plazo cambia el tipo de riesgo que podrías asumir.",
        estimatedImpact: "Te ayuda a ordenar expectativas.",
        difficulty: "Baja",
        category: "Educación"
      },
      {
        id: "protect-emergency-before-investing",
        title: "Evitar invertir dinero que necesitas para emergencias",
        description: "Mantén separado tu fondo de emergencia.",
        why: "La base de emergencia no debería depender de resultados inciertos.",
        estimatedImpact: "Protege tu estabilidad antes de explorar inversión.",
        difficulty: "Media",
        category: "Ahorro"
      }
    ],
    keep_tracking: [
      {
        id: "review-financial-data",
        title: "Revisar tus datos financieros una vez este mes",
        description: "Confirma si tus ingresos, gastos y ahorro siguen parecidos.",
        why: "Actualizar datos mejora la claridad del plan.",
        estimatedImpact: "Te ayuda a tomar mejores decisiones.",
        difficulty: "Baja",
        category: "Seguimiento"
      },
      {
        id: "confirm-goal-priority",
        title: "Confirmar si tu meta sigue siendo la prioridad",
        description: "Revisa si tu objetivo actual todavía es el más importante.",
        why: "Las prioridades cambian, y el plan debe seguir tu realidad.",
        estimatedImpact: "Mantiene el plan alineado contigo.",
        difficulty: "Baja",
        category: "Meta"
      },
      {
        id: "complete-optional-data",
        title: "Completar los datos opcionales para mejorar el plan",
        description: "Agrega ingreso, gasto, ahorro o monto objetivo si los tienes claros.",
        why: "Más datos claros permiten cálculos más útiles.",
        estimatedImpact: "Mejora la precisión del Dashboard y del plan mensual.",
        difficulty: "Baja",
        category: "Datos"
      }
    ]
  };

  return actionsByPriority[priorityKey];
}
