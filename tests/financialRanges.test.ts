import { describe, expect, it } from "vitest";

import {
  getExpenseRangeForAmount,
  getIncomeRangeForAmount,
  getSavingsRangeForAmount,
  getSmallExpenseRangeForAmount
} from "../utils/financialRanges";

describe("exact values mapped to onboarding ranges", () => {
  it("keeps income and main-expense ranges consistent with exact answers", () => {
    expect(getIncomeRangeForAmount(4_800_000)).toBe("$3.000.000 – $5.000.000");
    expect(getExpenseRangeForAmount(920_000)).toBe("Menos de $1.000.000");
  });

  it("keeps savings and small-expense ranges consistent with exact answers", () => {
    expect(getSavingsRangeForAmount(0)).toBe("No tengo ahorros");
    expect(getSavingsRangeForAmount(1_250_000)).toBe("$500.000 – $2.000.000");
    expect(getSmallExpenseRangeForAmount(175_000)).toBe("$100.000 – $250.000");
  });
});
