import type {
  DebtPaymentStatus,
  DebtRecord,
  ExpenseCategoryAmounts
} from "../types/financial";
import { isDebtPaid } from "./debtPayments";
import { formatCOP, getDebtMonthlyPaymentRangeEstimate } from "./financialRanges";

export type DebtLevel = "none" | "low" | "medium" | "high" | "unknown";
export type DebtDataSource = "registered" | "category" | "reported" | "none";
export type ReportedDebtPaymentKind = "exact" | "range" | "share";
export type NewDebtViability = "possible" | "tight" | "risky" | "missing";

export type ReportedDebtPaymentRatioRange = {
  kind: "bounded" | "minimum_only" | "none" | "unknown";
  maximum: number | null;
  minimum: number | null;
};

export const DEBT_EXPENSE_CATEGORY = "Deudas";
export const RENT_EXPENSE_CATEGORY = "Arriendo";

export type RegisteredDebtSummary = {
  count: number;
  source: DebtDataSource;
  monthlyPaymentTotal: number;
  categoryMonthlyPaymentTotal: number;
  remainingTotal: number | null;
  debtToIncomeRatio: number | null;
  reportedPaymentShare: string | null;
  reportedMonthlyPaymentRange: string | null;
  reportedPaymentKind: ReportedDebtPaymentKind | null;
  reportedPaymentBounds: {
    maximum: number | null;
    minimum: number | null;
  } | null;
  isPaymentEstimated: boolean;
  level: DebtLevel;
  label: string;
  shouldPrioritizeDebt: boolean;
  hasCategoryDebtReference: boolean;
  hasPossibleDuplicate: boolean;
};

export type NewDebtEvaluation = {
  viability: NewDebtViability;
  label: string;
  message: string;
  marginAfterNewPayment: number | null;
  totalDebtPayment: number | null;
  totalDebtToIncomeRatio: number | null;
};

export const debtPaymentStatusLabels: Record<DebtPaymentStatus, string> = {
  on_track: "La pago sin problema",
  sometimes_heavy: "A veces queda pesada",
  overdue: "Estoy atrasado/a",
  not_sure: "No estoy seguro/a"
};

const registeredDebtLabels: Record<DebtLevel, string> = {
  none: "Sin deudas registradas",
  low: "Carga mensual manejable",
  medium: "Carga mensual por vigilar",
  high: "Presión de deuda alta",
  unknown: "Falta ingreso para calcular"
};

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isDebtExpenseCategory(category: string) {
  return normalizeText(category).includes("deuda");
}

function normalizeRecurringExpenseCategory(category: string) {
  const trimmedCategory = category.trim();

  return normalizeText(trimmedCategory) === "vivienda"
    ? RENT_EXPENSE_CATEGORY
    : trimmedCategory;
}

export function getRecurringExpenseCategories(categories: string[] | null | undefined) {
  return [
    ...new Set(
      (categories ?? [])
        .filter((category) => !isDebtExpenseCategory(category))
        .map(normalizeRecurringExpenseCategory)
        .filter(Boolean)
    )
  ];
}

function getDebtLevelFromRatio(ratio: number | null): DebtLevel {
  if (ratio === null) {
    return "unknown";
  }

  if (ratio <= 0) {
    return "none";
  }

  if (ratio < 0.1) {
    return "low";
  }

  if (ratio < 0.2) {
    return "medium";
  }

  return "high";
}

export function getReportedDebtPaymentRatio(debtPaymentShare: string | null | undefined) {
  const normalizedShare = normalizeText(debtPaymentShare ?? "");

  if (
    !normalizedShare ||
    normalizedShare.includes("no estoy seguro") ||
    normalizedShare.includes("prefiero")
  ) {
    return null;
  }

  if (normalizedShare.includes("no pago")) {
    return 0;
  }

  if (normalizedShare.includes("menos") && normalizedShare.includes("10")) {
    return 0.05;
  }

  if (normalizedShare.includes("10") && normalizedShare.includes("20")) {
    return 0.15;
  }

  if (normalizedShare.includes("20") && normalizedShare.includes("40")) {
    return 0.3;
  }

  if (normalizedShare.includes("mas") && normalizedShare.includes("40")) {
    return 0.4;
  }

  return null;
}

export function getReportedDebtPaymentRatioRange(
  debtPaymentShare: string | null | undefined
): ReportedDebtPaymentRatioRange {
  const normalizedShare = normalizeText(debtPaymentShare ?? "");

  if (
    !normalizedShare ||
    normalizedShare.includes("no estoy seguro") ||
    normalizedShare.includes("prefiero")
  ) {
    return { kind: "unknown", maximum: null, minimum: null };
  }

  if (normalizedShare.includes("no pago")) {
    return { kind: "none", maximum: 0, minimum: 0 };
  }

  if (normalizedShare.includes("menos") && normalizedShare.includes("10")) {
    return { kind: "bounded", maximum: 0.1, minimum: 0 };
  }

  if (normalizedShare.includes("10") && normalizedShare.includes("20")) {
    return { kind: "bounded", maximum: 0.2, minimum: 0.1 };
  }

  if (normalizedShare.includes("20") && normalizedShare.includes("40")) {
    return { kind: "bounded", maximum: 0.4, minimum: 0.2 };
  }

  if (normalizedShare.includes("mas") && normalizedShare.includes("40")) {
    return { kind: "minimum_only", maximum: null, minimum: 0.4 };
  }

  return { kind: "unknown", maximum: null, minimum: null };
}

function getStatusLevel(debts: DebtRecord[]): DebtLevel {
  if (debts.some((debt) => debt.status === "overdue")) {
    return "high";
  }

  if (debts.some((debt) => debt.status === "sometimes_heavy")) {
    return "medium";
  }

  return "low";
}

function pickHigherDebtLevel(left: DebtLevel, right: DebtLevel): DebtLevel {
  const order: Record<DebtLevel, number> = {
    none: 0,
    low: 1,
    unknown: 1,
    medium: 2,
    high: 3
  };

  return order[right] > order[left] ? right : left;
}

export function getEffectiveDebtMonthlyPayment(debt: DebtRecord) {
  const monthlyPayment = Math.max(0, safeNumber(debt.monthlyPayment) ?? 0);
  const remainingAmount = safeNumber(debt.remainingAmount);

  return remainingAmount !== null && remainingAmount >= 0
    ? Math.min(monthlyPayment, remainingAmount)
    : monthlyPayment;
}

export function getDebtMonthlyPaymentTotal(debts: DebtRecord[] | null | undefined) {
  return (debts ?? []).reduce(
    (total, debt) => total + (isDebtPaid(debt) ? 0 : getEffectiveDebtMonthlyPayment(debt)),
    0
  );
}

export function getDebtRemainingTotal(debts: DebtRecord[] | null | undefined) {
  const knownRemainingAmounts = (debts ?? [])
    .map((debt) => safeNumber(debt.remainingAmount))
    .filter((amount): amount is number => amount !== null && amount >= 0);

  if (knownRemainingAmounts.length === 0) {
    return null;
  }

  return knownRemainingAmounts.reduce((total, amount) => total + amount, 0);
}

export function getDebtToIncomeRatio(
  monthlyPaymentTotal: number,
  monthlyIncome: number | null | undefined
) {
  if (!monthlyIncome || monthlyIncome <= 0) {
    return null;
  }

  return monthlyPaymentTotal / monthlyIncome;
}

export function getDebtCategoryMonthlyPaymentTotal(
  expenseCategoryAmounts: ExpenseCategoryAmounts | null | undefined
) {
  if (!expenseCategoryAmounts) {
    return 0;
  }

  return Object.entries(expenseCategoryAmounts).reduce((total, [category, amount]) => {
    if (!isDebtExpenseCategory(category)) {
      return total;
    }

    return total + Math.max(0, safeNumber(amount) ?? 0);
  }, 0);
}

export function syncDebtExpenseCategory({
  debts,
  expenseCategories,
  expenseCategoryAmounts,
  preserveExistingReference = false
}: {
  debts: DebtRecord[] | null | undefined;
  expenseCategories: string[] | null | undefined;
  expenseCategoryAmounts: ExpenseCategoryAmounts | null | undefined;
  preserveExistingReference?: boolean;
}) {
  const hadDebtCategory = (expenseCategories ?? []).some(isDebtExpenseCategory);
  const recurringCategories = getRecurringExpenseCategories(expenseCategories);
  const recurringCategorySet = new Set(recurringCategories);
  const recurringCategoryAmounts = Object.entries(expenseCategoryAmounts ?? {}).reduce<
    ExpenseCategoryAmounts
  >((amounts, [category, amount]) => {
    const normalizedCategory = normalizeRecurringExpenseCategory(category);

    if (!recurringCategorySet.has(normalizedCategory)) {
      return amounts;
    }

    const normalizedAmount = Math.max(0, safeNumber(amount) ?? 0);

    if (normalizedAmount > 0) {
      amounts[normalizedCategory] = Math.max(
        amounts[normalizedCategory] ?? 0,
        normalizedAmount
      );
    }

    return amounts;
  }, {});
  const registeredMonthlyPaymentTotal = getDebtMonthlyPaymentTotal(debts);
  const existingMonthlyPaymentReference = preserveExistingReference
    ? getDebtCategoryMonthlyPaymentTotal(expenseCategoryAmounts)
    : 0;
  const monthlyPaymentTotal =
    registeredMonthlyPaymentTotal > 0
      ? registeredMonthlyPaymentTotal
      : existingMonthlyPaymentReference;

  if (monthlyPaymentTotal <= 0) {
    return {
      expenseCategories: hadDebtCategory
        ? [...recurringCategories, DEBT_EXPENSE_CATEGORY]
        : recurringCategories,
      expenseCategoryAmounts: recurringCategoryAmounts
    };
  }

  return {
    expenseCategories: [...recurringCategories, DEBT_EXPENSE_CATEGORY],
    expenseCategoryAmounts: {
      ...recurringCategoryAmounts,
      [DEBT_EXPENSE_CATEGORY]: monthlyPaymentTotal
    }
  };
}

export function getRegisteredDebtSummary({
  debts,
  debtPaymentShare,
  hasDebts,
  expenseCategoryAmounts,
  reportedMonthlyPayment,
  reportedMonthlyPaymentRange,
  monthlyIncome
}: {
  debts: DebtRecord[] | null | undefined;
  debtPaymentShare?: string | null;
  hasDebts?: boolean | null;
  expenseCategoryAmounts?: ExpenseCategoryAmounts | null;
  reportedMonthlyPayment?: number | null;
  reportedMonthlyPaymentRange?: string | null;
  monthlyIncome: number | null | undefined;
}): RegisteredDebtSummary {
  const validDebts = debts ?? [];
  const activeDebts = validDebts.filter((debt) => !isDebtPaid(debt));
  const registeredMonthlyPaymentTotal = getDebtMonthlyPaymentTotal(validDebts);
  const categoryMonthlyPaymentTotal = getDebtCategoryMonthlyPaymentTotal(expenseCategoryAmounts);
  const hasRegisteredDebts = activeDebts.length > 0 && registeredMonthlyPaymentTotal > 0;
  const hasDetailedDebtRecords = validDebts.length > 0;
  const hasCategoryDebtReference = categoryMonthlyPaymentTotal > 0;
  const remainingTotal = getDebtRemainingTotal(validDebts);
  const normalizedReportedMonthlyPayment = Math.max(
    0,
    safeNumber(reportedMonthlyPayment) ?? 0
  );
  const reportedRangeEstimate = getDebtMonthlyPaymentRangeEstimate(
    reportedMonthlyPaymentRange ?? null
  );
  const reportedPaymentRatio = getReportedDebtPaymentRatio(debtPaymentShare);

  if (hasRegisteredDebts || hasCategoryDebtReference) {
    const monthlyPaymentTotal = hasRegisteredDebts
      ? registeredMonthlyPaymentTotal
      : categoryMonthlyPaymentTotal;
    const debtToIncomeRatio = getDebtToIncomeRatio(monthlyPaymentTotal, monthlyIncome);
    const ratioLevel = getDebtLevelFromRatio(debtToIncomeRatio);
    const statusLevel = hasRegisteredDebts ? getStatusLevel(activeDebts) : "none";
    const level = pickHigherDebtLevel(ratioLevel, statusLevel);
    const source = hasRegisteredDebts ? "registered" : "category";

    return {
      count: activeDebts.length,
      source,
      monthlyPaymentTotal,
      categoryMonthlyPaymentTotal,
      remainingTotal,
      debtToIncomeRatio,
      reportedPaymentShare: debtPaymentShare ?? null,
      reportedMonthlyPaymentRange: reportedMonthlyPaymentRange ?? null,
      reportedPaymentKind: null,
      reportedPaymentBounds: null,
      isPaymentEstimated: false,
      level,
      label: source === "category" ? "Referencia desde gastos" : registeredDebtLabels[level],
      shouldPrioritizeDebt: level === "high",
      hasCategoryDebtReference,
      hasPossibleDuplicate:
        hasRegisteredDebts &&
        hasCategoryDebtReference &&
        Math.abs(categoryMonthlyPaymentTotal - registeredMonthlyPaymentTotal) > 0
    };
  }

  if (!hasDetailedDebtRecords && hasDebts !== false) {
    let paymentTotal = 0;
    let paymentKind: ReportedDebtPaymentKind | null = null;
    let paymentBounds: RegisteredDebtSummary["reportedPaymentBounds"] = null;
    let isPaymentEstimated = false;
    let label = registeredDebtLabels.none;

    if (normalizedReportedMonthlyPayment > 0) {
      paymentTotal = normalizedReportedMonthlyPayment;
      paymentKind = "exact";
      paymentBounds = {
        maximum: normalizedReportedMonthlyPayment,
        minimum: normalizedReportedMonthlyPayment
      };
      label = `Pago mensual informado: ${formatCOP(normalizedReportedMonthlyPayment)}`;
    } else if ((reportedRangeEstimate.midpoint ?? 0) > 0) {
      paymentTotal = reportedRangeEstimate.midpoint as number;
      paymentKind = "range";
      paymentBounds = {
        maximum: reportedRangeEstimate.max,
        minimum: reportedRangeEstimate.min
      };
      isPaymentEstimated = true;
      label = `Estimado por tu rango: ${reportedMonthlyPaymentRange}`;
    } else if (reportedPaymentRatio !== null && reportedPaymentRatio > 0) {
      paymentTotal =
        monthlyIncome && monthlyIncome > 0
          ? Math.round(monthlyIncome * reportedPaymentRatio)
          : 0;
      paymentKind = "share";
      isPaymentEstimated = true;
      label = `Estimado por tu respuesta: ${debtPaymentShare}`;
    }

    if (paymentKind) {
      const debtToIncomeRatio =
        paymentKind === "share"
          ? reportedPaymentRatio
          : getDebtToIncomeRatio(paymentTotal, monthlyIncome);
      const level = getDebtLevelFromRatio(debtToIncomeRatio);

      return {
        count: 0,
        source: "reported",
        monthlyPaymentTotal: paymentTotal,
        categoryMonthlyPaymentTotal: 0,
        remainingTotal,
        debtToIncomeRatio,
        reportedPaymentShare: debtPaymentShare ?? null,
        reportedMonthlyPaymentRange: reportedMonthlyPaymentRange ?? null,
        reportedPaymentKind: paymentKind,
        reportedPaymentBounds: paymentBounds,
        isPaymentEstimated,
        level,
        label,
        shouldPrioritizeDebt: level === "high",
        hasCategoryDebtReference: false,
        hasPossibleDuplicate: false
      };
    }
  }

  return {
    count: 0,
    source: "none",
    monthlyPaymentTotal: 0,
    categoryMonthlyPaymentTotal: 0,
    remainingTotal,
    debtToIncomeRatio: getDebtToIncomeRatio(0, monthlyIncome),
    reportedPaymentShare: debtPaymentShare ?? null,
    reportedMonthlyPaymentRange: reportedMonthlyPaymentRange ?? null,
    reportedPaymentKind: null,
    reportedPaymentBounds: null,
    isPaymentEstimated: false,
    level: "none",
    label: registeredDebtLabels.none,
    shouldPrioritizeDebt: false,
    hasCategoryDebtReference: false,
    hasPossibleDuplicate: false
  };
}

export function getDebtRatioLabel(ratio: number | null, reportedPaymentShare?: string | null) {
  if (reportedPaymentShare && ratio !== null) {
    return `${reportedPaymentShare} de ingresos (estimado)`;
  }

  if (ratio === null) {
    return "Por calcular";
  }

  return `${Math.round(ratio * 100)}% de ingresos`;
}

export function getDebtTotalLabel(value: number) {
  return value > 0 ? formatCOP(value) : "$0";
}

export function evaluateNewDebt({
  currentMonthlyDebtPayment,
  monthlyIncome,
  monthlyMargin,
  newMonthlyPayment
}: {
  currentMonthlyDebtPayment: number;
  monthlyIncome: number | null | undefined;
  monthlyMargin: number | null | undefined;
  newMonthlyPayment: number | null;
}): NewDebtEvaluation {
  if (!newMonthlyPayment || newMonthlyPayment <= 0) {
    return {
      viability: "missing",
      label: "Agrega una cuota",
      message: "La cuota mensual estimada es el dato clave para evaluar si cabe en tu mes.",
      marginAfterNewPayment: null,
      totalDebtPayment: null,
      totalDebtToIncomeRatio: null
    };
  }

  const totalDebtPayment = currentMonthlyDebtPayment + newMonthlyPayment;
  const totalDebtToIncomeRatio = getDebtToIncomeRatio(totalDebtPayment, monthlyIncome);
  const marginAfterNewPayment =
    monthlyMargin !== null && monthlyMargin !== undefined
      ? monthlyMargin - newMonthlyPayment
      : null;

  if (!monthlyIncome || monthlyIncome <= 0 || marginAfterNewPayment === null) {
    return {
      viability: "missing",
      label: "Faltan ingresos y gastos",
      message:
        "Completa ingreso y gastos mensuales para calcular el margen que quedaría después de esta cuota.",
      marginAfterNewPayment,
      totalDebtPayment,
      totalDebtToIncomeRatio
    };
  }

  if (marginAfterNewPayment < 0 || (totalDebtToIncomeRatio ?? 0) >= 0.4) {
    return {
      viability: "risky",
      label: "Riesgoso",
      message:
        "Esta cuota podría dejar tu margen negativo o subir demasiado el peso de tus deudas.",
      marginAfterNewPayment,
      totalDebtPayment,
      totalDebtToIncomeRatio
    };
  }

  if (
    marginAfterNewPayment <= monthlyIncome * 0.05 ||
    (totalDebtToIncomeRatio ?? 0) >= 0.2
  ) {
    return {
      viability: "tight",
      label: "Ajustado",
      message:
        "La cuota podría caber, pero dejaría poco espacio para imprevistos, ahorro u otras metas.",
      marginAfterNewPayment,
      totalDebtPayment,
      totalDebtToIncomeRatio
    };
  }

  return {
    viability: "possible",
    label: "Posible",
    message:
      "Con tus datos actuales, esta cuota parece caber mejor dentro del mes. Igual conviene revisar condiciones reales antes de decidir.",
    marginAfterNewPayment,
    totalDebtPayment,
    totalDebtToIncomeRatio
  };
}
