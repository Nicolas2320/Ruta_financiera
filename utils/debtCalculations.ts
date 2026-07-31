import type {
  DebtPaymentStatus,
  DebtRecord,
  ExpenseCategoryAmounts
} from "../types/financial";
import { formatCOP } from "./financialRanges";

export type DebtLevel = "none" | "low" | "medium" | "high" | "unknown";
export type DebtDataSource = "registered" | "category" | "reported" | "none";
export type NewDebtViability = "possible" | "tight" | "risky" | "missing";

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

export function getDebtMonthlyPaymentTotal(debts: DebtRecord[] | null | undefined) {
  return (debts ?? []).reduce(
    (total, debt) => total + Math.max(0, safeNumber(debt.monthlyPayment) ?? 0),
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

export function hasDebtMonthlyExpenseMismatch({
  isExactMonthlyExpense,
  monthlyExpenses,
  monthlyPaymentTotal
}: {
  isExactMonthlyExpense: boolean;
  monthlyExpenses: number | null | undefined;
  monthlyPaymentTotal: number;
}) {
  const normalizedMonthlyExpenses = safeNumber(monthlyExpenses);
  const normalizedMonthlyPaymentTotal = safeNumber(monthlyPaymentTotal);

  return Boolean(
    isExactMonthlyExpense &&
      normalizedMonthlyExpenses !== null &&
      normalizedMonthlyPaymentTotal !== null &&
      normalizedMonthlyPaymentTotal > normalizedMonthlyExpenses
  );
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
      expenseCategories: [...recurringCategories, DEBT_EXPENSE_CATEGORY],
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
  expenseCategoryAmounts,
  monthlyIncome
}: {
  debts: DebtRecord[] | null | undefined;
  debtPaymentShare?: string | null;
  expenseCategoryAmounts?: ExpenseCategoryAmounts | null;
  monthlyIncome: number | null | undefined;
}): RegisteredDebtSummary {
  const validDebts = debts ?? [];
  const registeredMonthlyPaymentTotal = getDebtMonthlyPaymentTotal(validDebts);
  const categoryMonthlyPaymentTotal = getDebtCategoryMonthlyPaymentTotal(expenseCategoryAmounts);
  const hasRegisteredDebts = validDebts.length > 0 && registeredMonthlyPaymentTotal > 0;
  const hasCategoryDebtReference = categoryMonthlyPaymentTotal > 0;
  const monthlyPaymentTotal = hasRegisteredDebts
    ? registeredMonthlyPaymentTotal
    : categoryMonthlyPaymentTotal;
  const remainingTotal = getDebtRemainingTotal(validDebts);
  const debtToIncomeRatio = getDebtToIncomeRatio(monthlyPaymentTotal, monthlyIncome);
  const reportedPaymentRatio = getReportedDebtPaymentRatio(debtPaymentShare);

  if (!hasRegisteredDebts && !hasCategoryDebtReference) {
    if (reportedPaymentRatio !== null && reportedPaymentRatio > 0) {
      const reportedMonthlyPayment =
        monthlyIncome && monthlyIncome > 0
          ? Math.round(monthlyIncome * reportedPaymentRatio)
          : 0;
      const reportedLevel = getDebtLevelFromRatio(reportedPaymentRatio);

      return {
        count: 0,
        source: "reported",
        monthlyPaymentTotal: reportedMonthlyPayment,
        categoryMonthlyPaymentTotal: 0,
        remainingTotal,
        debtToIncomeRatio: reportedPaymentRatio,
        reportedPaymentShare: debtPaymentShare ?? null,
        level: reportedLevel,
        label: `Estimado por tu respuesta: ${debtPaymentShare}`,
        shouldPrioritizeDebt: reportedLevel === "high",
        hasCategoryDebtReference: false,
        hasPossibleDuplicate: false
      };
    }

    return {
      count: 0,
      source: "none",
      monthlyPaymentTotal: 0,
      categoryMonthlyPaymentTotal: 0,
      remainingTotal,
      debtToIncomeRatio,
      reportedPaymentShare: debtPaymentShare ?? null,
      level: "none",
      label: registeredDebtLabels.none,
      shouldPrioritizeDebt: false,
      hasCategoryDebtReference: false,
      hasPossibleDuplicate: false
    };
  }

  const ratioLevel = getDebtLevelFromRatio(debtToIncomeRatio);
  const statusLevel = hasRegisteredDebts ? getStatusLevel(validDebts) : "none";
  const level = pickHigherDebtLevel(ratioLevel, statusLevel);
  const source = hasRegisteredDebts ? "registered" : "category";

  return {
    count: validDebts.length,
    source,
    monthlyPaymentTotal,
    categoryMonthlyPaymentTotal,
    remainingTotal,
    debtToIncomeRatio,
    reportedPaymentShare: debtPaymentShare ?? null,
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
        "Completa ingreso y gasto mensual para calcular el margen que quedaría después de esta cuota.",
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
