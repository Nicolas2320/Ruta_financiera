import {
  getTargetMonthFromLegacyDate,
  getTargetMonthFromLegacyHorizon,
  normalizeTargetMonth
} from "../utils/monthYear";

export type DebtPaymentStatus = "on_track" | "sometimes_heavy" | "overdue" | "not_sure";

export const debtMonthlyPaymentTypes = [
  "minimum_required",
  "agreed",
  "self_selected",
  "unknown"
] as const;

export type DebtMonthlyPaymentType = (typeof debtMonthlyPaymentTypes)[number];

export const debtPaymentFlexibilities = ["fixed", "negotiable", "unknown"] as const;

export type DebtPaymentFlexibility = (typeof debtPaymentFlexibilities)[number];

export type DebtPaymentRecord = {
  id: string;
  amount: number;
  date: string;
  reportedRemainingAmount?: number | null;
  previousRemainingAmount?: number | null;
  createdAt?: string;
};

export const financialGuidanceModes = ["guided", "brief", "direct"] as const;

export type FinancialGuidanceMode = (typeof financialGuidanceModes)[number];

export function normalizeFinancialGuidanceMode(value: unknown): FinancialGuidanceMode {
  return financialGuidanceModes.includes(value as FinancialGuidanceMode)
    ? (value as FinancialGuidanceMode)
    : "brief";
}

export type DebtRecord = {
  id: string;
  type: string;
  name?: string | null;
  lender?: string | null;
  remainingAmount?: number | null;
  monthlyPayment: number;
  monthlyPaymentType?: DebtMonthlyPaymentType;
  minimumMonthlyPayment?: number | null;
  paymentFlexibility?: DebtPaymentFlexibility;
  annualInterestRate?: number | null;
  status: DebtPaymentStatus;
  paymentDay?: number | null;
  payments?: DebtPaymentRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type OnboardingData = {
  firstName: string;
  lastName: string;
  financialGuidanceMode: FinancialGuidanceMode;
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
  debts: DebtRecord[];
  investmentSituation: string | null;
  financialGoal: string | null;
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
  source?: "manual" | "monthly_plan";
  sourceProgressId?: string | null;
};

export type FinancialGoal = {
  id: string;
  title: string;
  type: string;
  iconKey?: string | null;
  priority: string | null;
  amountRange: string | null;
  targetAmount?: number | null;
  targetMonth?: string | null;
  currentAmount?: number | null;
  manualMonthlyContribution?: number | null;
  status?: FinancialGoalStatus;
  contributions?: FinancialGoalContribution[];
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ActionProgressStatus = "pending" | "in_progress" | "completed" | "skipped";

export type ActionProgressEvidence = {
  type?: "amount" | "category" | "decision" | "note";
  amount?: number | null;
  detail?: string | null;
  label?: string | null;
};

export type ActionProgressRecord = {
  status: ActionProgressStatus;
  evidence?: ActionProgressEvidence;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
};

export type ActionProgressValue = boolean | ActionProgressRecord;

export type CompletedActionsState = Record<string, ActionProgressValue>;

export type ActionProgressPatch = {
  status?: ActionProgressStatus;
  evidence?: ActionProgressEvidence;
  clearEvidence?: boolean;
};

export function isActionProgressRecord(value: ActionProgressValue | null | undefined): value is ActionProgressRecord {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value) && "status" in value;
}

export function getActionProgressStatus(value: ActionProgressValue | null | undefined): ActionProgressStatus {
  if (value === true) {
    return "completed";
  }

  if (isActionProgressRecord(value)) {
    return value.status;
  }

  return "pending";
}

export function isActionProgressCompleted(value: ActionProgressValue | null | undefined) {
  return getActionProgressStatus(value) === "completed";
}

export function normalizeActionProgressRecord(
  value: ActionProgressValue | null | undefined
): ActionProgressRecord | null {
  if (value === true) {
    return {
      status: "completed",
      completedAt: null,
      updatedAt: new Date().toISOString()
    };
  }

  if (!isActionProgressRecord(value)) {
    return null;
  }

  const status: ActionProgressStatus =
    value.status === "completed" ||
    value.status === "in_progress" ||
    value.status === "skipped" ||
    value.status === "pending"
      ? value.status
      : "pending";

  return {
    status,
    evidence:
      value.evidence && typeof value.evidence === "object" && !Array.isArray(value.evidence)
        ? value.evidence
        : undefined,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

export function createActionProgressRecord(
  currentValue: ActionProgressValue | null | undefined,
  patch: ActionProgressPatch
): ActionProgressRecord {
  const now = new Date().toISOString();
  const currentRecord = normalizeActionProgressRecord(currentValue);
  const status = patch.status ?? currentRecord?.status ?? "in_progress";
  const evidence = patch.clearEvidence ? undefined : patch.evidence ?? currentRecord?.evidence;
  const hasStarted = status === "in_progress" || status === "completed";

  return {
    status,
    ...(evidence ? { evidence } : {}),
    startedAt: currentRecord?.startedAt ?? (hasStarted ? now : null),
    completedAt:
      status === "completed" ? currentRecord?.completedAt ?? now : null,
    updatedAt: now
  };
}

export function normalizeCompletedActionsState(
  completedActions: CompletedActionsState | null | undefined
): CompletedActionsState {
  if (!completedActions || typeof completedActions !== "object" || Array.isArray(completedActions)) {
    return {};
  }

  return Object.entries(completedActions).reduce<CompletedActionsState>((actions, [key, value]) => {
    if (value === true || value === false) {
      actions[key] = value;
      return actions;
    }

    const normalizedRecord = normalizeActionProgressRecord(value);

    if (normalizedRecord) {
      actions[key] = normalizedRecord;
    }

    return actions;
  }, {});
}

export const exactFinancialValueKeys = [
  "monthlyIncome",
  "monthlyExpenses",
  "currentSavings",
  "smallExpenses"
] as const;

export type ExactFinancialValueKey = (typeof exactFinancialValueKeys)[number];

export type ExactFinancialValues = Partial<Record<ExactFinancialValueKey, number>>;

export const initialOnboarding: OnboardingData = {
  firstName: "",
  lastName: "",
  financialGuidanceMode: "brief",
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
  debts: [],
  investmentSituation: null,
  financialGoal: null,
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

function normalizeDebtPaymentStatus(value: unknown): DebtPaymentStatus {
  if (
    value === "on_track" ||
    value === "sometimes_heavy" ||
    value === "overdue" ||
    value === "not_sure"
  ) {
    return value;
  }

  return "not_sure";
}

function normalizeDebtMonthlyPaymentType(value: unknown): DebtMonthlyPaymentType {
  return debtMonthlyPaymentTypes.includes(value as DebtMonthlyPaymentType)
    ? (value as DebtMonthlyPaymentType)
    : "unknown";
}

function normalizeDebtPaymentFlexibility(value: unknown): DebtPaymentFlexibility {
  return debtPaymentFlexibilities.includes(value as DebtPaymentFlexibility)
    ? (value as DebtPaymentFlexibility)
    : "unknown";
}

function normalizeDebtString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizePaymentDay(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31) {
    return value;
  }

  if (typeof value === "string") {
    const parsedDay = Number(value.replace(/\D/g, ""));
    return Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : null;
  }

  return null;
}

function normalizeAnnualInterestRate(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  const normalizedValue =
    typeof value === "string" ? Number(value.replace(",", ".")) : value;

  return typeof normalizedValue === "number" &&
    Number.isFinite(normalizedValue) &&
    normalizedValue >= 0 &&
    normalizedValue <= 100
    ? normalizedValue
    : null;
}

function normalizeDebtPaymentDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeDebtPaymentTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDebtPayments(value: unknown): DebtPaymentRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const paymentIds = new Set<string>();

  return value
    .reduce<DebtPaymentRecord[]>((payments, payment, index) => {
      if (!payment || typeof payment !== "object") {
        return payments;
      }

      const rawPayment = payment as Partial<DebtPaymentRecord>;
      const amount = normalizeGoalAmount(rawPayment.amount);
      const date = normalizeDebtPaymentDate(rawPayment.date);
      const id = normalizeDebtString(rawPayment.id) ?? `debt-payment-${index + 1}`;

      if (amount === null || amount <= 0 || !date || paymentIds.has(id)) {
        return payments;
      }

      paymentIds.add(id);

      payments.push({
        id,
        amount,
        date,
        reportedRemainingAmount: normalizeGoalAmount(rawPayment.reportedRemainingAmount),
        previousRemainingAmount: normalizeGoalAmount(rawPayment.previousRemainingAmount),
        createdAt:
          normalizeDebtPaymentTimestamp(rawPayment.createdAt) ?? `${date}T12:00:00.000Z`
      });

      return payments;
    }, [])
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function normalizeDebtRecords(value: unknown): DebtRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<DebtRecord[]>((debts, debt, index) => {
    if (!debt || typeof debt !== "object") {
      return debts;
    }

    const rawDebt = debt as Partial<DebtRecord>;
    const type = normalizeDebtString(rawDebt.type);
    const monthlyPayment = normalizeGoalAmount(rawDebt.monthlyPayment);

    if (!type || monthlyPayment === null || monthlyPayment <= 0) {
      return debts;
    }

    const remainingAmount = normalizeGoalAmount(rawDebt.remainingAmount);
    const now = new Date().toISOString();

    debts.push({
      id: normalizeDebtString(rawDebt.id) ?? `debt-${index + 1}`,
      type,
      name: normalizeDebtString(rawDebt.name),
      lender: normalizeDebtString(rawDebt.lender),
      remainingAmount,
      monthlyPayment,
      monthlyPaymentType: normalizeDebtMonthlyPaymentType(rawDebt.monthlyPaymentType),
      minimumMonthlyPayment: normalizeGoalAmount(rawDebt.minimumMonthlyPayment),
      paymentFlexibility: normalizeDebtPaymentFlexibility(rawDebt.paymentFlexibility),
      annualInterestRate: normalizeAnnualInterestRate(rawDebt.annualInterestRate),
      status: normalizeDebtPaymentStatus(rawDebt.status),
      paymentDay: normalizePaymentDay(rawDebt.paymentDay),
      payments: normalizeDebtPayments(rawDebt.payments),
      createdAt: normalizeDebtString(rawDebt.createdAt) ?? now,
      updatedAt: normalizeDebtString(rawDebt.updatedAt) ?? now
    });

    return debts;
  }, []);
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
      date: normalizeGoalString(rawContribution.date) ?? new Date().toISOString(),
      source: rawContribution.source === "monthly_plan" ? "monthly_plan" : "manual",
      sourceProgressId: normalizeGoalString(rawContribution.sourceProgressId)
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
  iconKey,
  isPrimary = false,
  priority,
  targetMonth,
  targetAmount,
  title
}: {
  amountRange: string | null;
  iconKey?: string | null;
  isPrimary?: boolean;
  priority: string | null;
  targetMonth?: string | null;
  targetAmount?: number | null;
  title: string;
}): FinancialGoal {
  const now = new Date().toISOString();
  const normalizedTargetMonth = normalizeTargetMonth(targetMonth);

  return {
    id: `goal-${Date.now()}`,
    title,
    type: getGoalTypeFromTitle(title),
    iconKey: iconKey ?? getGoalIconKeyFromTitle(title),
    priority,
    amountRange,
    targetAmount: targetAmount ?? null,
    targetMonth: normalizedTargetMonth,
    currentAmount: 0,
    manualMonthlyContribution: null,
    status: "active",
    contributions: [],
    isPrimary,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeFinancialGoals(goals: unknown, referenceDate = new Date()): FinancialGoal[] {
  if (!Array.isArray(goals)) {
    return [];
  }

  return goals.reduce<FinancialGoal[]>((normalizedGoals, goal, index) => {
    if (!goal || typeof goal !== "object") {
      return normalizedGoals;
    }

    const rawGoal = goal as Partial<FinancialGoal> & {
      horizon?: unknown;
      targetDate?: unknown;
    };
    const title = normalizeGoalString(rawGoal.title);

    if (!title) {
      return normalizedGoals;
    }

    const targetMonth =
      normalizeTargetMonth(rawGoal.targetMonth) ??
      getTargetMonthFromLegacyDate(rawGoal.targetDate) ??
      getTargetMonthFromLegacyHorizon(rawGoal.horizon, referenceDate);

    normalizedGoals.push({
      id: normalizeGoalString(rawGoal.id) ?? `goal-${index + 1}`,
      title,
      type: normalizeGoalString(rawGoal.type) ?? getGoalTypeFromTitle(title),
      iconKey: normalizeGoalString(rawGoal.iconKey) ?? getGoalIconKeyFromTitle(title),
      priority: normalizeGoalString(rawGoal.priority),
      amountRange: normalizeGoalString(rawGoal.amountRange),
      targetAmount: normalizeGoalAmount(rawGoal.targetAmount),
      targetMonth,
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
  onboarding: Pick<OnboardingData, "financialGoal" | "goalPriority" | "goalAmountRange"> & {
    goalHorizon?: unknown;
  },
  referenceDate = new Date()
): FinancialGoal | null {
  if (!onboarding.financialGoal) {
    return null;
  }

  return {
    id: "primary-goal",
    title: onboarding.financialGoal,
    type: getGoalTypeFromTitle(onboarding.financialGoal),
    iconKey: getGoalIconKeyFromTitle(onboarding.financialGoal),
    priority: onboarding.goalPriority,
    amountRange: onboarding.goalAmountRange,
    targetAmount: null,
    targetMonth: getTargetMonthFromLegacyHorizon(onboarding.goalHorizon, referenceDate),
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
    goalPriority: goal?.priority ?? null,
    goalAmountRange: goal?.amountRange ?? null
  };
}

export function hasCompletedOnboarding(onboarding: OnboardingData) {
  const skipsSmallExpenseDetails = onboarding.hasSmallExpenses === "No";
  const hasRecurringExpenseCategory = onboarding.expenseCategories.some((category) => {
    const normalizedCategory = category
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return normalizedCategory.length > 0 && !normalizedCategory.includes("deuda");
  });
  const hasRequiredSmallExpenseCategories =
    onboarding.hasSmallExpenses !== "Sí" || onboarding.smallExpenseCategories.length > 0;
  const hasRequiredSmallExpensePlan =
    skipsSmallExpenseDetails ||
    Boolean(onboarding.smallExpensesRange && onboarding.smallExpensesIntention);
  const primaryGoal = getPrimaryFinancialGoal(onboarding);

  return Boolean(
    onboarding.firstName.trim() &&
      onboarding.ageRange &&
      onboarding.country &&
      onboarding.incomeRange &&
      onboarding.incomeType &&
      onboarding.incomeFrequency &&
      onboarding.expensesRange &&
      hasRecurringExpenseCategory &&
      onboarding.expensesFeeling &&
      onboarding.hasSmallExpenses &&
      hasRequiredSmallExpenseCategories &&
      hasRequiredSmallExpensePlan &&
      onboarding.savingsRange &&
      onboarding.emergencyCoverage &&
      onboarding.debtSituation &&
      onboarding.debtPaymentShare &&
      onboarding.investmentSituation &&
      primaryGoal?.title &&
      primaryGoal.targetMonth &&
      primaryGoal.priority
  );
}
