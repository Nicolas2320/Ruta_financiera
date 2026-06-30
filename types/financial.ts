export type OnboardingData = {
  ageRange: string | null;
  country: string | null;
  city: string;
  incomeRange: string | null;
  incomeType: string | null;
  incomeFrequency: string | null;
  expensesRange: string | null;
  expenseCategories: string[];
  expensesFeeling: string | null;
  hasSmallExpenses: string | null;
  smallExpenseCategories: string[];
  smallExpensesRange: string | null;
  smallExpensesIntention: string | null;
  savingsRange: string | null;
  emergencyCoverage: string | null;
  debtSituation: string | null;
  debtPaymentShare: string | null;
  investmentSituation: string | null;
  financialGoal: string | null;
  goalHorizon: string | null;
  goalPriority: string | null;
  goalAmountRange: string | null;
};

export type CompletedActionsState = Record<string, boolean>;

export const exactFinancialValueKeys = [
  "monthlyIncome",
  "monthlyExpenses",
  "currentSavings",
  "goalTargetAmount"
] as const;

export type ExactFinancialValueKey = (typeof exactFinancialValueKeys)[number];

export type ExactFinancialValues = Partial<Record<ExactFinancialValueKey, number>>;

export const initialOnboarding: OnboardingData = {
  ageRange: null,
  country: null,
  city: "",
  incomeRange: null,
  incomeType: null,
  incomeFrequency: null,
  expensesRange: null,
  expenseCategories: [],
  expensesFeeling: null,
  hasSmallExpenses: null,
  smallExpenseCategories: [],
  smallExpensesRange: null,
  smallExpensesIntention: null,
  savingsRange: null,
  emergencyCoverage: null,
  debtSituation: null,
  debtPaymentShare: null,
  investmentSituation: null,
  financialGoal: null,
  goalHorizon: null,
  goalPriority: null,
  goalAmountRange: null
};

export function hasCompletedOnboarding(onboarding: OnboardingData) {
  const hasRequiredSmallExpenseCategories =
    onboarding.hasSmallExpenses !== "Sí" || onboarding.smallExpenseCategories.length > 0;

  return Boolean(
    onboarding.ageRange &&
      onboarding.country &&
      onboarding.incomeRange &&
      onboarding.incomeType &&
      onboarding.incomeFrequency &&
      onboarding.expensesRange &&
      onboarding.expenseCategories.length > 0 &&
      onboarding.expensesFeeling &&
      onboarding.hasSmallExpenses &&
      hasRequiredSmallExpenseCategories &&
      onboarding.smallExpensesRange &&
      onboarding.smallExpensesIntention &&
      onboarding.savingsRange &&
      onboarding.emergencyCoverage &&
      onboarding.debtSituation &&
      onboarding.debtPaymentShare &&
      onboarding.investmentSituation &&
      onboarding.financialGoal &&
      onboarding.goalHorizon &&
      onboarding.goalPriority
  );
}
