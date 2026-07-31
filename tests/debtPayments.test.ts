import { describe, expect, it } from "vitest";

import {
  getDebtPaymentTotal,
  getDebtPaymentTotalForMonth,
  isDebtPaid,
  registerDebtPayment,
  removeDebtPayment
} from "../utils/debtPayments";
import { makeDebt } from "./fixtures/financial";

describe("debt payment history", () => {
  it("records a payment without changing the confirmed balance or monthly installment", () => {
    const debt = makeDebt({ monthlyPayment: 250_000, remainingAmount: 2_000_000 });
    const [updatedDebt] = registerDebtPayment([debt], debt.id, {
      amount: 250_000,
      date: "2026-07-15",
      id: "payment-1"
    });

    expect(updatedDebt).toMatchObject({
      monthlyPayment: 250_000,
      remainingAmount: 2_000_000,
      payments: [
        {
          id: "payment-1",
          amount: 250_000,
          date: "2026-07-15"
        }
      ]
    });
  });

  it("updates only the balance when the user reports a current balance", () => {
    const debt = makeDebt({ monthlyPayment: 250_000, remainingAmount: 2_000_000 });
    const [updatedDebt] = registerDebtPayment([debt], debt.id, {
      amount: 250_000,
      date: "2026-07-15",
      id: "payment-1",
      reportedRemainingAmount: 1_820_000
    });

    expect(updatedDebt.remainingAmount).toBe(1_820_000);
    expect(updatedDebt.monthlyPayment).toBe(250_000);
    expect(updatedDebt.payments?.[0]).toMatchObject({
      reportedRemainingAmount: 1_820_000,
      previousRemainingAmount: 2_000_000
    });
  });

  it("does not duplicate a payment with the same id", () => {
    const debt = makeDebt();
    const once = registerDebtPayment([debt], debt.id, {
      amount: 100_000,
      date: "2026-07-15",
      id: "payment-1"
    });
    const twice = registerDebtPayment(once, debt.id, {
      amount: 100_000,
      date: "2026-07-15",
      id: "payment-1"
    });

    expect(twice[0].payments).toHaveLength(1);
    expect(getDebtPaymentTotal(twice[0])).toBe(100_000);
  });

  it("groups civil payment dates in the correct month", () => {
    const debt = makeDebt({
      payments: [
        { id: "first", amount: 100_000, date: "2026-07-01" },
        { id: "last", amount: 150_000, date: "2026-07-31" },
        { id: "next", amount: 200_000, date: "2026-08-01" }
      ]
    });

    expect(getDebtPaymentTotalForMonth(debt, new Date(2026, 6, 15))).toBe(250_000);
    expect(getDebtPaymentTotal(debt)).toBe(450_000);
  });

  it("restores the previous balance when the latest balance-updating payment is removed", () => {
    const debt = makeDebt({ remainingAmount: 2_000_000 });
    const withFirstBalance = registerDebtPayment([debt], debt.id, {
      amount: 250_000,
      date: "2026-07-10",
      id: "payment-1",
      reportedRemainingAmount: 1_820_000
    });
    const withSecondBalance = registerDebtPayment(withFirstBalance, debt.id, {
      amount: 250_000,
      date: "2026-08-10",
      id: "payment-2",
      reportedRemainingAmount: 1_630_000
    });
    const [withoutLatest] = removeDebtPayment(
      withSecondBalance,
      debt.id,
      "payment-2"
    );

    expect(withoutLatest.remainingAmount).toBe(1_820_000);
    expect(withoutLatest.payments).toHaveLength(1);
  });

  it("recognizes a zero reported balance as paid", () => {
    const debt = makeDebt({ remainingAmount: 100_000 });
    const [paidDebt] = registerDebtPayment([debt], debt.id, {
      amount: 100_000,
      date: "2026-07-15",
      id: "final-payment",
      reportedRemainingAmount: 0
    });

    expect(isDebtPaid(paidDebt)).toBe(true);
    expect(paidDebt.payments).toHaveLength(1);
  });
});
