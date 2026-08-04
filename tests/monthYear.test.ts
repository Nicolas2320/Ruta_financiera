import { describe, expect, it } from "vitest";

import {
  formatTargetMonth,
  getMonthsUntilTargetMonth,
  getTargetMonthFromLegacyDate,
  getTargetMonthFromLegacyHorizon,
  normalizeTargetMonth
} from "../utils/monthYear";

describe("goal target month", () => {
  it("normalizes month-only values without accepting incomplete months", () => {
    expect(normalizeTargetMonth("2027-01")).toBe("2027-01");
    expect(normalizeTargetMonth("2027-13")).toBeNull();
    expect(normalizeTargetMonth("2027-1")).toBeNull();
  });

  it("converts the previous exact-date shape without preserving an unnecessary day", () => {
    expect(getTargetMonthFromLegacyDate("2027-01-15")).toBe("2027-01");
    expect(getTargetMonthFromLegacyDate("not-a-date")).toBeNull();
  });

  it("converts legacy horizon ranges once into a concrete target month", () => {
    const referenceDate = new Date(2026, 7, 1);

    expect(getTargetMonthFromLegacyHorizon("Menos de 6 meses", referenceDate)).toBe(
      "2026-11"
    );
    expect(getTargetMonthFromLegacyHorizon("6 – 12 meses", referenceDate)).toBe(
      "2027-05"
    );
  });

  it("formats and measures a target month", () => {
    const referenceDate = new Date(2026, 7, 1);

    expect(formatTargetMonth("2027-01")).toBe("Enero de 2027");
    expect(getMonthsUntilTargetMonth("2027-01", referenceDate)).toBe(5);
  });
});
