import {
  initialOnboarding,
  type DebtRecord,
  type FinancialGoal,
  type OnboardingData
} from "../../types/financial";

export function makeOnboarding(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return {
    ...initialOnboarding,
    expenseCategories: [],
    expenseCategoryAmounts: {},
    smallExpenseCategories: [],
    goals: [],
    ...overrides
  };
}

export function makeGoal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
  return {
    id: "goal-1",
    title: "Fondo de emergencia",
    type: "security",
    amountRange: null,
    targetAmount: 3_000_000,
    targetMonth: "2027-08",
    currentAmount: 0,
    status: "active",
    contributions: [],
    isPrimary: true,
    ...overrides
  };
}

export function makeDebt(overrides: Partial<DebtRecord> = {}): DebtRecord {
  return {
    id: "debt-1",
    type: "Tarjeta de credito",
    monthlyPayment: 200_000,
    remainingAmount: 2_000_000,
    status: "on_track",
    ...overrides
  };
}
