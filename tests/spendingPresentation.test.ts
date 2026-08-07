import { describe, expect, it } from "vitest";

import { getSpendingBarSegments } from "../utils/spendingPresentation";

describe("spending presentation", () => {
  it("shows debt payments as their own share of income", () => {
    expect(
      getSpendingBarSegments({
        debtPayments: 375_000,
        mainExpenses: 1_500_000,
        monthlyExpensesIncludesSmallExpenses: true,
        monthlyIncome: 4_000_000,
        smallExpenses: null
      })
    ).toEqual({
      debtPayments: 9.375,
      mainExpenses: 37.5,
      separateSmallExpenses: 0
    });
  });

  it("keeps legacy small expenses as a separate segment", () => {
    expect(
      getSpendingBarSegments({
        debtPayments: 200_000,
        mainExpenses: 1_000_000,
        monthlyExpensesIncludesSmallExpenses: false,
        monthlyIncome: 2_000_000,
        smallExpenses: 100_000
      })
    ).toEqual({
      debtPayments: 10,
      mainExpenses: 50,
      separateSmallExpenses: 5
    });
  });

  it("caps the visible segments at the full income bar", () => {
    expect(
      getSpendingBarSegments({
        debtPayments: 400_000,
        mainExpenses: 1_800_000,
        monthlyExpensesIncludesSmallExpenses: false,
        monthlyIncome: 2_000_000,
        smallExpenses: 300_000
      })
    ).toEqual({
      debtPayments: 16,
      mainExpenses: 72,
      separateSmallExpenses: 12
    });
  });
});
