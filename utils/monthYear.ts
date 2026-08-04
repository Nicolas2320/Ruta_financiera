export type MonthYearValue = {
  month: number;
  year: number;
};

export const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
] as const;

export function normalizeTargetMonth(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return year >= 1900 && month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : null;
}

export function getTargetMonthFromLegacyDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value.trim());
  return match ? normalizeTargetMonth(`${match[1]}-${match[2]}`) : null;
}

export function getTargetMonthFromLegacyHorizon(
  value: unknown,
  referenceDate = new Date()
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const monthsToAdd = normalized.includes("menos de 6")
    ? 3
    : normalized.includes("6") && normalized.includes("12")
      ? 9
      : normalized.includes("1") && normalized.includes("3") && normalized.includes("ano")
        ? 24
        : normalized.includes("3") && normalized.includes("5") && normalized.includes("ano")
          ? 48
          : normalized.includes("mas de 5")
            ? 72
            : normalized.includes("mas de 3")
              ? 48
              : null;

  if (monthsToAdd === null) {
    return null;
  }

  const current = getCurrentMonthYear(referenceDate);
  const absoluteMonth = current.year * 12 + current.month + monthsToAdd;

  return serializeMonthYear({
    month: absoluteMonth % 12,
    year: Math.floor(absoluteMonth / 12)
  });
}

export function getCurrentMonthYear(referenceDate = new Date()): MonthYearValue {
  return {
    month: referenceDate.getMonth(),
    year: referenceDate.getFullYear()
  };
}

export function getMonthYearValue(value: string | null | undefined): MonthYearValue | null {
  const normalized = normalizeTargetMonth(value);

  if (!normalized) {
    return null;
  }

  const [year, month] = normalized.split("-").map(Number);
  return { month: month - 1, year };
}

export function serializeMonthYear(value: MonthYearValue) {
  return `${value.year}-${String(value.month + 1).padStart(2, "0")}`;
}

export function isBeforeMonthYear(value: MonthYearValue, minimum: MonthYearValue) {
  return value.year < minimum.year || (value.year === minimum.year && value.month < minimum.month);
}

export function formatMonthYear(value: MonthYearValue) {
  return `${monthLabels[value.month]} de ${value.year}`;
}

export function formatTargetMonth(value: string | null | undefined) {
  const monthYear = getMonthYearValue(value);
  return monthYear ? formatMonthYear(monthYear) : "No definido";
}

export function getMonthsUntilTargetMonth(
  targetMonth: string | null | undefined,
  referenceDate = new Date()
) {
  const value = getMonthYearValue(targetMonth);

  if (!value) {
    return null;
  }

  const current = getCurrentMonthYear(referenceDate);
  return (value.year - current.year) * 12 + value.month - current.month;
}
