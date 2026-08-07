export type SpendingBarSegments = {
  debtPayments: number;
  mainExpenses: number;
  separateSmallExpenses: number;
};

function getIncomeShare(amount: number | null, monthlyIncome: number | null) {
  if (amount === null || monthlyIncome === null || monthlyIncome <= 0) {
    return 0;
  }

  return Math.max(0, (amount / monthlyIncome) * 100);
}

export function getSpendingBarSegments({
  debtPayments,
  mainExpenses,
  monthlyExpensesIncludesSmallExpenses,
  monthlyIncome,
  smallExpenses
}: {
  debtPayments: number;
  mainExpenses: number | null;
  monthlyExpensesIncludesSmallExpenses: boolean;
  monthlyIncome: number | null;
  smallExpenses: number | null;
}): SpendingBarSegments {
  const mainExpensesShare = getIncomeShare(mainExpenses, monthlyIncome);
  const separateSmallExpensesShare = monthlyExpensesIncludesSmallExpenses
    ? 0
    : getIncomeShare(smallExpenses, monthlyIncome);
  const debtPaymentsShare = getIncomeShare(debtPayments, monthlyIncome);
  const totalOutflowShare =
    mainExpensesShare + separateSmallExpensesShare + debtPaymentsShare;
  const displayScale = totalOutflowShare > 100 ? 100 / totalOutflowShare : 1;

  return {
    debtPayments: debtPaymentsShare * displayScale,
    mainExpenses: mainExpensesShare * displayScale,
    separateSmallExpenses: separateSmallExpensesShare * displayScale
  };
}
