import type {
  DebtPaymentStatus,
  DebtRecord,
  ExpenseCategoryAmounts
} from "../types/financial";
import { formatCOP } from "./financialRanges";

export type DebtLevel = "none" | "low" | "medium" | "high" | "unknown";
export type NewDebtViability = "possible" | "tight" | "risky" | "missing";

export type RegisteredDebtSummary = {
  count: number;
  source: "registered" | "category" | "none";
  monthlyPaymentTotal: number;
  categoryMonthlyPaymentTotal: number;
  remainingTotal: number | null;
  debtToIncomeRatio: number | null;
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
  high: "Presion de deuda alta",
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

export function getDebtCategoryMonthlyPaymentTotal(
  expenseCategoryAmounts: ExpenseCategoryAmounts | null | undefined
) {
  if (!expenseCategoryAmounts) {
    return 0;
  }

  return Object.entries(expenseCategoryAmounts).reduce((total, [category, amount]) => {
    if (!normalizeText(category).includes("deuda")) {
      return total;
    }

    return total + Math.max(0, safeNumber(amount) ?? 0);
  }, 0);
}

export function getRegisteredDebtSummary({
  debts,
  expenseCategoryAmounts,
  monthlyIncome
}: {
  debts: DebtRecord[] | null | undefined;
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

  if (!hasRegisteredDebts && !hasCategoryDebtReference) {
    return {
      count: 0,
      source: "none",
      monthlyPaymentTotal: 0,
      categoryMonthlyPaymentTotal: 0,
      remainingTotal,
      debtToIncomeRatio,
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

export function getDebtRatioLabel(ratio: number | null) {
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
        "Completa ingreso y gasto mensual para calcular el margen que quedaria despues de esta cuota.",
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
        "Esta cuota podria dejar tu margen negativo o subir demasiado el peso de tus deudas.",
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
        "La cuota podria caber, pero dejaria poco espacio para imprevistos, ahorro u otras metas.",
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
