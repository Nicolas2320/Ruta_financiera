export type OnboardingData = {
  ageRange: string | null;
  country: string | null;
  city: string;
  incomeRange: string | null;
  incomeType: string | null;
  incomeFrequency: string | null;
  expensesRange: string | null;
  expenseCategories: string[];
  expenseCategoryAmounts: ExpenseCategoryAmounts;
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
  goalMonthlyBudget: number | null;
  goals: FinancialGoal[];
};

export type ExpenseCategoryAmounts = Record<string, number>;

export type FinancialGoalStatus = "active" | "paused" | "completed";

export type FinancialGoalContribution = {
  id: string;
  amount: number;
  date: string;
};

export type FinancialGoal = {
  id: string;
  title: string;
  type: string;
  iconKey?: string | null;
  horizon: string | null;
  priority: string | null;
  amountRange: string | null;
  targetAmount?: number | null;
  currentAmount?: number | null;
  manualMonthlyContribution?: number | null;
  status?: FinancialGoalStatus;
  contributions?: FinancialGoalContribution[];
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  expenseCategoryAmounts: {},
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
  goalAmountRange: null,
  goalMonthlyBudget: null,
  goals: []
};

function normalizeGoalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeGoalAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(/\D/g, ""));
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
  }

  return null;
}

export function normalizeGoalMonthlyBudget(value: unknown) {
  return normalizeGoalAmount(value);
}

export function normalizeExpenseCategoryAmounts(
  value: unknown,
  selectedCategories?: string[]
): ExpenseCategoryAmounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const allowedCategories = selectedCategories ? new Set(selectedCategories) : null;

  return Object.entries(value).reduce<ExpenseCategoryAmounts>((amounts, [category, amount]) => {
    if (allowedCategories && !allowedCategories.has(category)) {
      return amounts;
    }

    const normalizedAmount = normalizeGoalAmount(amount);

    if (normalizedAmount !== null) {
      amounts[category] = normalizedAmount;
    }

    return amounts;
  }, {});
}

function normalizeGoalStatus(value: unknown): FinancialGoalStatus {
  return value === "paused" || value === "completed" ? value : "active";
}

function normalizeGoalContributions(value: unknown): FinancialGoalContribution[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<FinancialGoalContribution[]>((contributions, contribution, index) => {
    if (!contribution || typeof contribution !== "object") {
      return contributions;
    }

    const rawContribution = contribution as Partial<FinancialGoalContribution>;
    const amount = normalizeGoalAmount(rawContribution.amount);

    if (amount === null || amount <= 0) {
      return contributions;
    }

    contributions.push({
      id: normalizeGoalString(rawContribution.id) ?? `contribution-${index + 1}`,
      amount,
      date: normalizeGoalString(rawContribution.date) ?? new Date().toISOString()
    });

    return contributions;
  }, []);
}

export function getGoalTypeFromTitle(title: string | null | undefined) {
  const normalizedTitle = (title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedTitle.includes("emergencia")) {
    return "security";
  }

  if (normalizedTitle.includes("deuda")) {
    return "debt";
  }

  if (normalizedTitle.includes("vivienda")) {
    return "home";
  }

  if (normalizedTitle.includes("estudi")) {
    return "education";
  }

  if (normalizedTitle.includes("viaj")) {
    return "wellbeing";
  }

  if (normalizedTitle.includes("invert")) {
    return "investment";
  }

  if (normalizedTitle.includes("negocio")) {
    return "business";
  }

  if (normalizedTitle.includes("futuro")) {
    return "future";
  }

  if (normalizedTitle.includes("gasto")) {
    return "cashflow";
  }

  return "financial";
}

export function getGoalIconKeyFromTitle(title: string | null | undefined) {
  const normalizedTitle = (title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedTitle.includes("emergencia")) {
    return "emergency";
  }

  if (normalizedTitle.includes("deuda")) {
    return "debt";
  }

  if (normalizedTitle.includes("vivienda")) {
    return "home";
  }

  if (normalizedTitle.includes("estudi")) {
    return "education";
  }

  if (normalizedTitle.includes("viaj")) {
    return "travel";
  }

  if (normalizedTitle.includes("invert")) {
    return "investment";
  }

  if (normalizedTitle.includes("negocio")) {
    return "business";
  }

  if (normalizedTitle.includes("futuro")) {
    return "future";
  }

  if (normalizedTitle.includes("gasto")) {
    return "expenses";
  }

  if (normalizedTitle.includes("salud")) {
    return "custom-health";
  }

  if (normalizedTitle.includes("vehiculo") || normalizedTitle.includes("carro")) {
    return "custom-vehicle";
  }

  if (normalizedTitle.includes("celebracion") || normalizedTitle.includes("regalo")) {
    return "custom-gift";
  }

  if (normalizedTitle.includes("carrera")) {
    return "custom-career";
  }

  if (normalizedTitle.includes("bienestar")) {
    return "custom-wellness";
  }

  if (normalizedTitle.includes("familia")) {
    return "custom-family";
  }

  return "other";
}

export function createFinancialGoal({
  amountRange,
  horizon,
  iconKey,
  isPrimary = false,
  priority,
  targetAmount,
  title
}: {
  amountRange: string | null;
  horizon: string | null;
  iconKey?: string | null;
  isPrimary?: boolean;
  priority: string | null;
  targetAmount?: number | null;
  title: string;
}): FinancialGoal {
  const now = new Date().toISOString();

  return {
    id: `goal-${Date.now()}`,
    title,
    type: getGoalTypeFromTitle(title),
    iconKey: iconKey ?? getGoalIconKeyFromTitle(title),
    horizon,
    priority,
    amountRange,
    targetAmount: targetAmount ?? null,
    currentAmount: 0,
    manualMonthlyContribution: null,
    status: "active",
    contributions: [],
    isPrimary,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeFinancialGoals(goals: unknown): FinancialGoal[] {
  if (!Array.isArray(goals)) {
    return [];
  }

  return goals.reduce<FinancialGoal[]>((normalizedGoals, goal, index) => {
    if (!goal || typeof goal !== "object") {
      return normalizedGoals;
    }

    const rawGoal = goal as Partial<FinancialGoal>;
    const title = normalizeGoalString(rawGoal.title);

    if (!title) {
      return normalizedGoals;
    }

    normalizedGoals.push({
      id: normalizeGoalString(rawGoal.id) ?? `goal-${index + 1}`,
      title,
      type: normalizeGoalString(rawGoal.type) ?? getGoalTypeFromTitle(title),
      iconKey: normalizeGoalString(rawGoal.iconKey) ?? getGoalIconKeyFromTitle(title),
      horizon: normalizeGoalString(rawGoal.horizon),
      priority: normalizeGoalString(rawGoal.priority),
      amountRange: normalizeGoalString(rawGoal.amountRange),
      targetAmount: normalizeGoalAmount(rawGoal.targetAmount),
      currentAmount: normalizeGoalAmount(rawGoal.currentAmount) ?? 0,
      manualMonthlyContribution: normalizeGoalAmount(rawGoal.manualMonthlyContribution),
      status: normalizeGoalStatus(rawGoal.status),
      contributions: normalizeGoalContributions(rawGoal.contributions),
      isPrimary: rawGoal.isPrimary === true || (index === 0 && rawGoal.isPrimary !== false),
      createdAt: normalizeGoalString(rawGoal.createdAt) ?? undefined,
      updatedAt: normalizeGoalString(rawGoal.updatedAt) ?? undefined
    });

    return normalizedGoals;
  }, []);
}

export function getLegacyGoalFromOnboarding(
  onboarding: Pick<
    OnboardingData,
    "financialGoal" | "goalHorizon" | "goalPriority" | "goalAmountRange"
  >
): FinancialGoal | null {
  if (!onboarding.financialGoal) {
    return null;
  }

  return {
    id: "primary-goal",
    title: onboarding.financialGoal,
    type: getGoalTypeFromTitle(onboarding.financialGoal),
    iconKey: getGoalIconKeyFromTitle(onboarding.financialGoal),
    horizon: onboarding.goalHorizon,
    priority: onboarding.goalPriority,
    amountRange: onboarding.goalAmountRange,
    targetAmount: null,
    currentAmount: 0,
    manualMonthlyContribution: null,
    status: "active",
    contributions: [],
    isPrimary: true
  };
}

export function getOnboardingGoals(onboarding: OnboardingData): FinancialGoal[] {
  const goals = normalizeFinancialGoals(onboarding.goals);

  if (goals.length > 0) {
    return goals.some((goal) => goal.isPrimary)
      ? goals
      : goals.map((goal, index) => ({ ...goal, isPrimary: index === 0 }));
  }

  const legacyGoal = getLegacyGoalFromOnboarding(onboarding);
  return legacyGoal ? [legacyGoal] : [];
}

export function getPrimaryFinancialGoal(onboarding: OnboardingData) {
  const goals = getOnboardingGoals(onboarding);
  return goals.find((goal) => goal.isPrimary) ?? goals[0] ?? null;
}

export function getLegacyFieldsFromGoal(goal: FinancialGoal | null) {
  return {
    financialGoal: goal?.title ?? null,
    goalHorizon: goal?.horizon ?? null,
    goalPriority: goal?.priority ?? null,
    goalAmountRange: goal?.amountRange ?? null
  };
}

export function hasCompletedOnboarding(onboarding: OnboardingData) {
  const hasRequiredSmallExpenseCategories =
    onboarding.hasSmallExpenses !== "Sí" || onboarding.smallExpenseCategories.length > 0;
  const primaryGoal = getPrimaryFinancialGoal(onboarding);

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
      primaryGoal?.title &&
      primaryGoal.horizon &&
      primaryGoal.priority
  );
}
