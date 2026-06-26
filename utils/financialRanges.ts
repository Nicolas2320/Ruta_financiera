import {
  exactFinancialValueKeys,
  getPrimaryFinancialGoal,
  initialOnboarding,
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";

export type FinancialRangeEstimate = {
  min: number | null;
  max: number | null;
  midpoint: number | null;
  label: string;
};

const unavailableRange: FinancialRangeEstimate = {
  min: null,
  max: null,
  midpoint: null,
  label: "No disponible"
};

const incomeRanges: Record<string, FinancialRangeEstimate> = {
  "Menos de $1.500.000": {
    min: 0,
    max: 1500000,
    midpoint: 750000,
    label: "Menos de $1.500.000"
  },
  "$1.500.000 – $3.000.000": {
    min: 1500000,
    max: 3000000,
    midpoint: 2250000,
    label: "$1.500.000 – $3.000.000"
  },
  "$3.000.000 – $5.000.000": {
    min: 3000000,
    max: 5000000,
    midpoint: 4000000,
    label: "$3.000.000 – $5.000.000"
  },
  "$5.000.000 – $8.000.000": {
    min: 5000000,
    max: 8000000,
    midpoint: 6500000,
    label: "$5.000.000 – $8.000.000"
  },
  "Más de $8.000.000": {
    min: 8000000,
    max: null,
    midpoint: null,
    label: "Más de $8.000.000"
  }
};

const expenseRanges: Record<string, FinancialRangeEstimate> = {
  "Menos de $1.000.000": {
    min: 0,
    max: 1000000,
    midpoint: 500000,
    label: "Menos de $1.000.000"
  },
  "$1.000.000 – $2.000.000": {
    min: 1000000,
    max: 2000000,
    midpoint: 1500000,
    label: "$1.000.000 – $2.000.000"
  },
  "$2.000.000 – $4.000.000": {
    min: 2000000,
    max: 4000000,
    midpoint: 3000000,
    label: "$2.000.000 – $4.000.000"
  },
  "$4.000.000 – $6.000.000": {
    min: 4000000,
    max: 6000000,
    midpoint: 5000000,
    label: "$4.000.000 – $6.000.000"
  },
  "Más de $6.000.000": {
    min: 6000000,
    max: null,
    midpoint: null,
    label: "Más de $6.000.000"
  },
  "No estoy seguro": {
    min: null,
    max: null,
    midpoint: null,
    label: "No estoy seguro"
  }
};

const smallExpenseRanges: Record<string, FinancialRangeEstimate> = {
  "Menos de $100.000": {
    min: 0,
    max: 100000,
    midpoint: 50000,
    label: "Menos de $100.000"
  },
  "$100.000 – $250.000": {
    min: 100000,
    max: 250000,
    midpoint: 175000,
    label: "$100.000 – $250.000"
  },
  "$250.000 – $500.000": {
    min: 250000,
    max: 500000,
    midpoint: 375000,
    label: "$250.000 – $500.000"
  },
  "Más de $500.000": {
    min: 500000,
    max: null,
    midpoint: null,
    label: "Más de $500.000"
  },
  "No sé": {
    min: null,
    max: null,
    midpoint: null,
    label: "No sé"
  }
};

const savingsRanges: Record<string, FinancialRangeEstimate> = {
  "No tengo ahorros": {
    min: 0,
    max: 0,
    midpoint: 0,
    label: "No tengo ahorros"
  },
  "Menos de $500.000": {
    min: 0,
    max: 500000,
    midpoint: 250000,
    label: "Menos de $500.000"
  },
  "$500.000 – $2.000.000": {
    min: 500000,
    max: 2000000,
    midpoint: 1250000,
    label: "$500.000 – $2.000.000"
  },
  "$2.000.000 – $5.000.000": {
    min: 2000000,
    max: 5000000,
    midpoint: 3500000,
    label: "$2.000.000 – $5.000.000"
  },
  "$5.000.000 – $10.000.000": {
    min: 5000000,
    max: 10000000,
    midpoint: 7500000,
    label: "$5.000.000 – $10.000.000"
  },
  "Más de $10.000.000": {
    min: 10000000,
    max: null,
    midpoint: null,
    label: "Más de $10.000.000"
  },
  "Prefiero no responder": {
    min: null,
    max: null,
    midpoint: null,
    label: "Prefiero no responder"
  }
};

const goalAmountRanges: Record<string, FinancialRangeEstimate> = {
  "Menos de $1.000.000": {
    min: 0,
    max: 1000000,
    midpoint: 500000,
    label: "Menos de $1.000.000"
  },
  "$1.000.000 – $5.000.000": {
    min: 1000000,
    max: 5000000,
    midpoint: 3000000,
    label: "$1.000.000 – $5.000.000"
  },
  "$5.000.000 – $20.000.000": {
    min: 5000000,
    max: 20000000,
    midpoint: 12500000,
    label: "$5.000.000 – $20.000.000"
  },
  "$20.000.000 – $50.000.000": {
    min: 20000000,
    max: 50000000,
    midpoint: 35000000,
    label: "$20.000.000 – $50.000.000"
  },
  "Más de $50.000.000": {
    min: 50000000,
    max: null,
    midpoint: null,
    label: "Más de $50.000.000"
  },
  "No tengo una cifra todavía": {
    min: null,
    max: null,
    midpoint: null,
    label: "No tengo una cifra todavía"
  },
  "Prefiero definirla después": {
    min: null,
    max: null,
    midpoint: null,
    label: "Prefiero definirla después"
  }
};

type FinancialValueProfile = {
  onboarding?: Partial<OnboardingData> | null;
  exactValues?: ExactFinancialValues | null;
  exact_values?: ExactFinancialValues | null;
};

type FinancialValueDisplay = {
  label: string;
  value: string;
  source: "exact" | "range" | "empty";
  helper: string;
};

function getRangeEstimate(
  range: string | null,
  ranges: Record<string, FinancialRangeEstimate>
): FinancialRangeEstimate {
  if (!range) {
    return unavailableRange;
  }

  return ranges[range] ?? {
    min: null,
    max: null,
    midpoint: null,
    label: range
  };
}

export function getIncomeRangeEstimate(incomeRange: string | null) {
  return getRangeEstimate(incomeRange, incomeRanges);
}

export function getExpenseRangeEstimate(expensesRange: string | null) {
  return getRangeEstimate(expensesRange, expenseRanges);
}

export function getSmallExpenseRangeEstimate(smallExpensesRange: string | null) {
  return getRangeEstimate(smallExpensesRange, smallExpenseRanges);
}

export function getSavingsRangeEstimate(savingsRange: string | null) {
  return getRangeEstimate(savingsRange, savingsRanges);
}

export function getGoalAmountRangeEstimate(goalAmountRange: string | null) {
  return getRangeEstimate(goalAmountRange, goalAmountRanges);
}

export function formatCOP(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function parseCOPInput(value: string) {
  if (value.includes("-")) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const parsedValue = Number(digits);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export function hasExactFinancialValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function normalizeExactValues(
  exactValues: Partial<Record<string, unknown>> | null | undefined
): ExactFinancialValues {
  return exactFinancialValueKeys.reduce<ExactFinancialValues>((normalizedValues, key) => {
    const value = exactValues?.[key];

    if (hasExactFinancialValue(value)) {
      normalizedValues[key] = value;
      return normalizedValues;
    }

    if (typeof value === "string") {
      const parsedValue = parseCOPInput(value);

      if (parsedValue !== null) {
        normalizedValues[key] = parsedValue;
      }
    }

    return normalizedValues;
  }, {});
}

export function getExactValuesCount(exactValues: ExactFinancialValues | null | undefined) {
  return exactFinancialValueKeys.filter((key) => hasExactFinancialValue(exactValues?.[key]))
    .length;
}

export function getPlanPrecisionStatus(exactValues: ExactFinancialValues | null | undefined) {
  const count = getExactValuesCount(exactValues);

  if (count === 0) {
    return {
      count,
      state: "Estimado",
      message: "Tu plan está basado en los rangos que seleccionaste."
    };
  }

  if (count < exactFinancialValueKeys.length) {
    return {
      count,
      state: "Mejorado",
      message:
        "Tu plan ya usa algunos datos más claros. Puedes completar los demás cuando quieras."
    };
  }

  return {
    count,
    state: "Más claro",
    message:
      "Tu plan tiene una base más clara para calcular margen, meta y fondo de emergencia."
  };
}

function getProfileExactValues(profile: FinancialValueProfile) {
  return profile.exactValues ?? profile.exact_values ?? {};
}

export function getPreferredMonthlyIncome(profile: FinancialValueProfile) {
  const exactValue = getProfileExactValues(profile).monthlyIncome;

  if (hasExactFinancialValue(exactValue)) {
    return exactValue;
  }

  return getIncomeRangeEstimate(profile.onboarding?.incomeRange ?? null).midpoint;
}

export function getPreferredMonthlyExpenses(profile: FinancialValueProfile) {
  const exactValue = getProfileExactValues(profile).monthlyExpenses;

  if (hasExactFinancialValue(exactValue)) {
    return exactValue;
  }

  return getExpenseRangeEstimate(profile.onboarding?.expensesRange ?? null).midpoint;
}

export function getPreferredCurrentSavings(profile: FinancialValueProfile) {
  const exactValue = getProfileExactValues(profile).currentSavings;

  if (hasExactFinancialValue(exactValue)) {
    return exactValue;
  }

  return getSavingsRangeEstimate(profile.onboarding?.savingsRange ?? null).midpoint;
}

export function getPreferredGoalTargetAmount(profile: FinancialValueProfile) {
  const exactValue = getProfileExactValues(profile).goalTargetAmount;

  if (hasExactFinancialValue(exactValue)) {
    return exactValue;
  }

  const primaryGoal = profile.onboarding
    ? getPrimaryFinancialGoal({ ...initialOnboarding, ...profile.onboarding })
    : null;

  if (hasExactFinancialValue(primaryGoal?.targetAmount)) {
    return primaryGoal.targetAmount;
  }

  return getGoalAmountRangeEstimate(
    primaryGoal?.amountRange ?? profile.onboarding?.goalAmountRange ?? null
  ).midpoint;
}

function getExactDisplay(
  label: string,
  value: number | undefined,
  helper = "Dato ingresado por ti."
): FinancialValueDisplay | null {
  if (!hasExactFinancialValue(value)) {
    return null;
  }

  return {
    label,
    value: formatCOP(value),
    source: "exact",
    helper
  };
}

function getRangeDisplay(
  label: string,
  value: string | null | undefined,
  emptyValue = "No definido"
): FinancialValueDisplay {
  if (!value || value.trim().length === 0) {
    return {
      label,
      value: emptyValue,
      source: "empty",
      helper: "Sin dato disponible todavía."
    };
  }

  return {
    label,
    value,
    source: "range",
    helper: "Estimado por el rango seleccionado."
  };
}

export function getMonthlyIncomeDisplay(profile: FinancialValueProfile): FinancialValueDisplay {
  return (
    getExactDisplay(
      "Ingreso mensual",
      getProfileExactValues(profile).monthlyIncome,
      "Dato ingresado para mejorar tus cálculos."
    ) ?? getRangeDisplay("Rango de ingresos", profile.onboarding?.incomeRange)
  );
}

export function getMonthlyExpensesDisplay(profile: FinancialValueProfile): FinancialValueDisplay {
  return (
    getExactDisplay(
      "Gasto mensual",
      getProfileExactValues(profile).monthlyExpenses,
      "Dato ingresado para mejorar tus cálculos."
    ) ?? getRangeDisplay("Rango de gastos", profile.onboarding?.expensesRange)
  );
}

export function getCurrentSavingsDisplay(profile: FinancialValueProfile): FinancialValueDisplay {
  return (
    getExactDisplay(
      "Ahorro actual",
      getProfileExactValues(profile).currentSavings,
      "Dato ingresado para estimar tu fondo de emergencia."
    ) ?? getRangeDisplay("Rango de ahorros", profile.onboarding?.savingsRange)
  );
}

export function getGoalTargetAmountDisplay(
  profile: FinancialValueProfile
): FinancialValueDisplay {
  const primaryGoal = profile.onboarding
    ? getPrimaryFinancialGoal({ ...initialOnboarding, ...profile.onboarding })
    : null;

  return (
    getExactDisplay(
      "Monto objetivo de la meta",
      primaryGoal?.targetAmount ?? undefined,
      "Dato ingresado para estimar tu avance hacia la meta."
    ) ??
    getExactDisplay(
      "Monto objetivo de la meta",
      getProfileExactValues(profile).goalTargetAmount,
      "Dato ingresado para estimar tu avance hacia la meta."
    ) ?? getRangeDisplay("Cifra aproximada", primaryGoal?.amountRange ?? profile.onboarding?.goalAmountRange)
  );
}

export function getFinancialDataSourceLabel(profile: FinancialValueProfile) {
  const exactValuesCount = getExactValuesCount(getProfileExactValues(profile));

  if (exactValuesCount === 0) {
    return "Usamos los rangos seleccionados como una primera referencia.";
  }

  if (exactValuesCount === exactFinancialValueKeys.length) {
    return "Usamos tus datos ingresados para una lectura más clara.";
  }

  return "Usamos tus datos ingresados y completamos con rangos cuando hace falta.";
}
