import type { DebtPaymentRecord, DebtRecord } from "../types/financial";

type DebtPaymentInput = {
  amount: number;
  date?: string;
  id?: string;
  reportedRemainingAmount?: number | null;
};

function getSafeAmount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function getSafeRemainingAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function getPaymentDate(value: string | undefined) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (value) {
    return date.toISOString().slice(0, 10);
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function sortPaymentsNewestFirst(payments: DebtPaymentRecord[]) {
  return [...payments].sort((left, right) => right.date.localeCompare(left.date));
}

export function isDebtPaid(debt: DebtRecord) {
  return getSafeRemainingAmount(debt.remainingAmount) === 0;
}

export function getDebtPaymentTotal(debt: DebtRecord) {
  return (debt.payments ?? []).reduce(
    (total, payment) => total + getSafeAmount(payment.amount),
    0
  );
}

export function getDebtPaymentTotalForMonth(debt: DebtRecord, referenceDate = new Date()) {
  const referencePeriod = `${referenceDate.getFullYear()}-${`${referenceDate.getMonth() + 1}`.padStart(2, "0")}`;

  return getDebtPaymentTotalForPeriod(debt, referencePeriod);
}

export function getDebtPaymentTotalForPeriod(debt: DebtRecord, periodKey: string) {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) {
    return 0;
  }

  return (debt.payments ?? []).reduce((total, payment) => {
    if (!payment.date.startsWith(periodKey)) {
      return total;
    }

    return total + getSafeAmount(payment.amount);
  }, 0);
}

export function registerDebtPayment(
  debts: DebtRecord[],
  debtId: string,
  input: DebtPaymentInput
) {
  const amount = getSafeAmount(input.amount);
  const date = getPaymentDate(input.date);

  if (amount <= 0 || !date) {
    return debts;
  }

  return debts.map((debt) => {
    if (debt.id !== debtId) {
      return debt;
    }

    const paymentId = input.id ?? `debt-payment-${Date.now()}`;
    const currentPayments = debt.payments ?? [];

    if (currentPayments.some((payment) => payment.id === paymentId)) {
      return debt;
    }

    const reportedRemainingAmount = getSafeRemainingAmount(input.reportedRemainingAmount);
    const createdAt = new Date().toISOString();
    const payment: DebtPaymentRecord = {
      id: paymentId,
      amount,
      date,
      createdAt,
      ...(reportedRemainingAmount !== null
        ? {
            previousRemainingAmount: getSafeRemainingAmount(debt.remainingAmount),
            reportedRemainingAmount
          }
        : {})
    };

    return {
      ...debt,
      ...(reportedRemainingAmount !== null
        ? { remainingAmount: reportedRemainingAmount }
        : {}),
      payments: sortPaymentsNewestFirst([payment, ...currentPayments]),
      updatedAt: createdAt
    };
  });
}

export function removeDebtPayment(
  debts: DebtRecord[],
  debtId: string,
  paymentId: string
) {
  return debts.map((debt) => {
    if (debt.id !== debtId) {
      return debt;
    }

    const currentPayments = debt.payments ?? [];
    const paymentToRemove = currentPayments.find((payment) => payment.id === paymentId);
    const nextPayments = currentPayments.filter((payment) => payment.id !== paymentId);

    if (nextPayments.length === currentPayments.length) {
      return debt;
    }

    const latestBalanceUpdate = [...currentPayments]
      .filter(
        (payment) =>
          payment.reportedRemainingAmount !== null &&
          payment.reportedRemainingAmount !== undefined
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt ?? right.date).getTime() -
          new Date(left.createdAt ?? left.date).getTime()
      )[0];
    const shouldRestorePreviousBalance =
      paymentToRemove?.id === latestBalanceUpdate?.id &&
      paymentToRemove.reportedRemainingAmount === getSafeRemainingAmount(debt.remainingAmount);

    return {
      ...debt,
      ...(shouldRestorePreviousBalance
        ? { remainingAmount: paymentToRemove.previousRemainingAmount ?? null }
        : {}),
      payments: nextPayments,
      updatedAt: new Date().toISOString()
    };
  });
}
