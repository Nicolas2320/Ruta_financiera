import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";

type OnboardingData = {
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

type OnboardingContextValue = {
  onboarding: OnboardingData;
  updateOnboarding: (data: Partial<OnboardingData>) => void;
};

const initialOnboarding: OnboardingData = {
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

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [onboarding, setOnboarding] = useState<OnboardingData>(initialOnboarding);

  const value = useMemo(
    () => ({
      onboarding,
      updateOnboarding: (data: Partial<OnboardingData>) => {
        setOnboarding((current) => ({
          ...current,
          ...data
        }));
      }
    }),
    [onboarding]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
