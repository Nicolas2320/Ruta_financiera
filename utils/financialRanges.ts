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

export function formatCOP(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}
