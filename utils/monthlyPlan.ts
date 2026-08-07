import {
  calculateFinancialSnapshot,
  generateMonthlyActions,
  type FinancialSnapshot,
  type PriorityKey
} from "./financialCalculations";
import { formatCOP } from "./financialRanges";
import {
  getActionProgressStatus,
  isActionProgressCompleted,
  type ActionProgressStatus,
  type CompletedActionsState,
  type DebtRecord,
  type ExactFinancialValues,
  type ExpenseCategoryAmounts,
  type FinancialGoal,
  type OnboardingData
} from "../types/financial";
import { initialOnboarding } from "../types/financial";
import { getDebtPaymentTotalForPeriod, isDebtPaid } from "./debtPayments";
import { getRecurringExpenseCategories } from "./debtCalculations";
import { isDebtGoal, isEmergencyGoal } from "./goalPlanning";
import { getGoalContributionPeriodSummary } from "./goalContributions";

export type MonthlyPlanData = {
  incomeRange: string | null;
  expensesRange: string | null;
  expenseCategories: string[];
  expenseCategoryAmounts: ExpenseCategoryAmounts;
  expensesFeeling: string | null;
  monthlyExpensesIncludesSmallExpenses: boolean | null;
  smallExpensesRange: string | null;
  smallExpensesIntention: string | null;
  hasSmallExpenses: string | null;
  savingsRange: string | null;
  hasDebts: boolean | null;
  debtMonthlyPaymentRange: string | null;
  debtSituation: string | null;
  debtPaymentShare: string | null;
  debts: DebtRecord[];
  financialGoal: string | null;
  goalAmountRange: string | null;
  goals: FinancialGoal[];
};

export type MonthlyPlanMetrics = {
  incomeMidpoint: number | null;
  expenseMidpoint: number | null;
  estimatedMargin: number | null;
  expensePercentage: number | null;
  currentSavings: number | null;
  goalTargetAmount: number | null;
  smallExpenseMidpoint: number | null;
  balancedScenarioAmount: number;
  snapshot: FinancialSnapshot;
};

export type MonthlyFocus = {
  title: string;
  text: string;
};

export type MonthlyAction = {
  id: string;
  title: string;
  description: string;
  why: string;
  estimatedImpact: string;
  difficulty: "Baja" | "Media" | "Alta";
  category: string;
};

export type MonthlyGoalContext = {
  title?: string | null;
  monthlyContribution?: number | null;
  estimatedMonthsToGoal?: number | null;
  activeGoalCount?: number;
  hasRegisteredContribution?: boolean;
  monthlyContributionTotal?: number | null;
};

const monthlyPlanProgressVersion = "monthly-plan-v0.2";
const monthlyPlanProgressKeyPrefix = `${monthlyPlanProgressVersion}:`;
const monthlyPlanPriorityKeys: PriorityKey[] = [
  "debt_pressure",
  "organize_cashflow",
  "build_emergency_fund",
  "review_small_expenses",
  "advance_goal",
  "learn_investing",
  "keep_tracking"
];

const monthlyFocusByPriority: Record<PriorityKey, MonthlyFocus> = {
  debt_pressure: {
    title: "Reducir presión de deudas",
    text: "Antes de acelerar otras metas, conviene entender cuánto pesan tus deudas en el mes."
  },
  organize_cashflow: {
    title: "Ordenar ingresos y gastos",
    text: "Tu primera oportunidad está en recuperar margen mensual."
  },
  build_emergency_fund: {
    title: "Construir fondo de emergencia",
    text:
      "Crear una base para imprevistos puede darte más estabilidad antes de avanzar a metas grandes."
  },
  review_small_expenses: {
    title: "Estás al día",
    text: "No tienes acciones financieras pendientes por ahora."
  },
  advance_goal: {
    title: "Avanzar hacia tus metas",
    text: "Tu plan puede enfocarse en registrar aportes reales y comparar cómo distribuir tu dinero."
  },
  learn_investing: {
    title: "Estás al día",
    text: "No tienes acciones financieras pendientes por ahora."
  },
  keep_tracking: {
    title: "Estás al día",
    text: "¡Buen trabajo! Completaste lo necesario y tu plan mensual está actualizado."
  }
};

function getGoalContributionImpact(goalContext?: MonthlyGoalContext) {
  const contribution =
    goalContext?.monthlyContributionTotal ?? goalContext?.monthlyContribution ?? null;
  const activeGoalCount = goalContext?.activeGoalCount ?? 0;

  if (contribution !== null && contribution > 0) {
    return activeGoalCount > 1
      ? `Tu estrategia distribuye ${formatCOP(contribution)} aprox. al mes entre ${activeGoalCount} metas.`
      : `Tu estrategia asigna ${formatCOP(contribution)} aprox. al mes a tus metas.`;
  }

  return "La estrategia actual no reparte un monto mensual a tus metas.";
}

function getGoalsFocus(goalContext?: MonthlyGoalContext): MonthlyFocus {
  const contribution =
    goalContext?.monthlyContributionTotal ?? goalContext?.monthlyContribution ?? null;
  const activeGoalCount = goalContext?.activeGoalCount ?? 0;

  return {
    title: "Avanzar hacia tus metas",
    text:
      contribution !== null && contribution > 0
        ? activeGoalCount > 1
          ? `Tu estrategia distribuye ${formatCOP(contribution)} aprox. al mes entre ${activeGoalCount} metas. Registra únicamente los aportes que realmente hagas.`
          : `Tu estrategia asigna ${formatCOP(contribution)} aprox. al mes a tus metas. Registra únicamente los aportes que realmente hagas.`
        : "Registra desde Metas los aportes que realmente hagas y compara alternativas antes de distribuir tu dinero."
  };
}

function getGeneralGoalActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  const activeGoals = data.goals.filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );

  if (activeGoals.length === 0) {
    return [];
  }

  const periodKey = getMonthlyPlanPeriodKey();
  const contributedGoalCount = activeGoals.filter(
    (goal) => getGoalContributionPeriodSummary(goal, periodKey).amount > 0
  ).length;

  const actions: MonthlyAction[] = [
    {
      id: "set-goal-contribution",
      title: "Registrar aportes a mis metas",
      description: `${contributedGoalCount} de ${activeGoals.length} ${activeGoals.length === 1 ? "meta" : "metas"} con aporte registrado este mes.`,
      why: "Cada aporte actualiza el progreso y la fecha proyectada de la meta correspondiente.",
      estimatedImpact: getGoalContributionImpact({
        ...goalContext,
        activeGoalCount: goalContext?.activeGoalCount ?? activeGoals.length
      }),
      difficulty: "Media",
      category: "Meta"
    }
  ];

  if ((metrics.snapshot.cashflow.monthlyMargin ?? 0) > 0) {
    actions.push({
      id: "compare-goal-contribution",
      title: "Comparar escenarios en Simulación",
      description: "Compara cómo repartir el dinero disponible entre tus deudas y metas.",
      why: "Ver la distribución completa ayuda a decidir antes de mover tu dinero.",
      estimatedImpact: `La simulación usará tu margen mensual de ${formatCOP(metrics.snapshot.cashflow.monthlyMargin ?? 0)} aprox.`,
      difficulty: "Baja",
      category: "Meta"
    });
  }

  return actions;
}

function hasEmergencyGoal(data: MonthlyPlanData) {
  return data.goals.some(isEmergencyGoal);
}

function needsEmergencyGoal(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey: PriorityKey
) {
  return (
    (metrics.snapshot.priority.key === "build_emergency_fund" ||
      priorityKey === "build_emergency_fund") &&
    !hasEmergencyGoal(data)
  );
}

const createEmergencyGoalAction: MonthlyAction = {
  id: "create-emergency-goal",
  title: "Crear fondo de emergencia en Metas",
  description:
    "Crea la meta para definir su monto, fecha y registrar su avance sin mezclarla con tus otros objetivos.",
  why: "Tenerla como meta permite que la simulación y el plan mensual usen el mismo objetivo.",
  estimatedImpact:
    "La app podrá seguir su avance y ajustar la proyección con tus datos actuales.",
  difficulty: "Baja",
  category: "Ahorro"
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function reportsNoDebts(data: MonthlyPlanData) {
  return (
    data.hasDebts === false ||
    normalizeText(data.debtSituation).includes("no tengo") ||
    normalizeText(data.debtPaymentShare).includes("no pago")
  );
}

function getDebtPaymentActions(data: MonthlyPlanData): MonthlyAction[] {
  const activeDebts = data.debts.filter((debt) => !isDebtPaid(debt));

  if (activeDebts.length === 0) {
    return [];
  }

  const periodKey = getMonthlyPlanPeriodKey();
  const debtsWithPayment = activeDebts.filter(
    (debt) => getDebtPaymentTotalForPeriod(debt, periodKey) > 0
  ).length;
  const missingPaymentCount = activeDebts.length - debtsWithPayment;

  return [
    {
      id: "register-debt-payments",
      title: "Registrar pagos de mis deudas",
      description: `${debtsWithPayment} de ${activeDebts.length} ${activeDebts.length === 1 ? "deuda" : "deudas"} con pago registrado este mes.`,
      why: "Registrar cada pago mantiene actualizados el avance y los saldos de tus deudas.",
      estimatedImpact:
        missingPaymentCount === 0
          ? "Todos los pagos mensuales están registrados."
          : `Falta registrar el pago de ${missingPaymentCount} ${missingPaymentCount === 1 ? "deuda" : "deudas"}.`,
      difficulty: "Baja",
      category: "Deudas"
    }
  ];
}

function getDebtPressureActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics
): MonthlyAction[] {
  const activeDebts = data.debts.filter((debt) => !isDebtPaid(debt));
  const hasReportedDebtWithoutDetails =
    !reportsNoDebts(data) &&
    data.debts.length === 0 &&
    (data.hasDebts === true ||
      metrics.snapshot.debt.source === "reported" ||
      metrics.snapshot.debt.source === "category");
  const canCompareStrategies =
    activeDebts.some((debt) => (debt.remainingAmount ?? 0) > 0) &&
    metrics.snapshot.cashflow.monthlyIncome !== null &&
    metrics.snapshot.cashflow.monthlyExpenses !== null &&
    (metrics.snapshot.cashflow.monthlyMargin ?? 0) > 0;
  const actions: MonthlyAction[] = [];

  if (hasReportedDebtWithoutDetails) {
    actions.push({
      id: "register-debts",
      title: "Registrar mis deudas",
      description:
        "Agrega cada deuda pendiente para que la app use sus saldos y cuotas reales.",
      why: "El rango del diagnóstico no permite comparar estrategias de pago.",
      estimatedImpact: "Tus deudas registradas reemplazarán la estimación inicial.",
      difficulty: "Baja",
      category: "Deudas"
    });
  }

  if (canCompareStrategies) {
    actions.push({
      id: "compare-debt-strategies",
      title: "Comparar estrategias de pago",
      description:
        "Revisa cómo podrías repartir el dinero disponible entre tus deudas activas.",
      why: "Comparar escenarios te permite elegir una distribución antes de aplicarla.",
      estimatedImpact: "La simulación usará tus saldos, cuotas y margen mensual actuales.",
      difficulty: "Baja",
      category: "Deudas"
    });
  }

  return actions;
}

function getOrganizeCashflowActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics
): MonthlyAction[] {
  const actions: MonthlyAction[] = [];
  const recurringCategories = getRecurringExpenseCategories(data.expenseCategories);
  const hasIncompleteCategoryAmounts = recurringCategories.some(
    (category) => (data.expenseCategoryAmounts[category] ?? 0) <= 0
  );
  const categorizedAmount = recurringCategories.reduce(
    (total, category) => total + Math.max(data.expenseCategoryAmounts[category] ?? 0, 0),
    0
  );
  const categoryAmountsExceedExpenses =
    metrics.snapshot.cashflow.monthlyExpenses !== null &&
    categorizedAmount > metrics.snapshot.cashflow.monthlyExpenses;

  if (metrics.snapshot.sourceMap.monthlyIncome !== "exact") {
    actions.push({
      id: "confirm-monthly-income",
      title: "Ingresar mi ingreso mensual promedio",
      description: "Reemplaza el rango del diagnóstico por una cifra mensual aproximada.",
      why: "Un ingreso confirmado permite calcular tu margen con mayor precisión.",
      estimatedImpact: "La app actualizará el flujo de caja y las simulaciones con el valor real.",
      difficulty: "Baja",
      category: "Ingresos"
    });
  }

  if (metrics.snapshot.sourceMap.monthlyExpenses !== "exact") {
    actions.push({
      id: "confirm-monthly-expenses",
      title: "Ingresar mis gastos mensuales promedio",
      description: "Reemplaza el rango del diagnóstico por una cifra mensual aproximada.",
      why: "Un gasto confirmado ayuda a saber si realmente existe dinero disponible.",
      estimatedImpact: "La app recalculará tu margen y las recomendaciones del plan.",
      difficulty: "Baja",
      category: "Gastos"
    });
  }

  if (recurringCategories.length === 0) {
    actions.push({
      id: "select-expense-categories",
      title: "Revisar mis categorías principales de gasto",
      description: "Selecciona en Gastos las categorías que forman parte de un mes habitual.",
      why: "El diagnóstico inicial estima cuánto gastas, pero no muestra en qué se distribuye.",
      estimatedImpact: "La app podrá organizar y comparar tus gastos principales.",
      difficulty: "Baja",
      category: "Gastos"
    });
  } else if (hasIncompleteCategoryAmounts || categoryAmountsExceedExpenses) {
    actions.push({
      id: "enter-category-amounts",
      title: "Ingresar montos de mis categorías principales",
      description: "Asigna un monto mensual a cada categoría que seleccionaste en Gastos.",
      why: categoryAmountsExceedExpenses
        ? "La suma actual supera tus gastos mensuales y conviene revisarla."
        : "Los montos permiten identificar cuáles categorías tienen mayor peso.",
      estimatedImpact: "La app mostrará una distribución basada en tus datos registrados.",
      difficulty: "Baja",
      category: "Gastos"
    });
  }

  return actions;
}

const noConcreteGoalAmountValues = [
  "",
  "No tengo una cifra todavía",
  "Prefiero definirla después"
];

export function getMonthlyPlanData(data: Partial<MonthlyPlanData>): MonthlyPlanData {
  const {
    incomeRange = null,
    expensesRange = null,
    expenseCategories = [],
    expenseCategoryAmounts = {},
    expensesFeeling = null,
    monthlyExpensesIncludesSmallExpenses = null,
    smallExpensesRange = null,
    smallExpensesIntention = null,
    hasSmallExpenses = null,
    savingsRange = null,
    hasDebts = null,
    debtMonthlyPaymentRange = null,
    debtSituation = null,
    debtPaymentShare = null,
    debts = [],
    goals = []
  } = data;
  const normalizedGoals = (Array.isArray(goals) ? goals : []).filter(
    (goal) => !isDebtGoal(goal)
  );
  const primaryGoal =
    normalizedGoals.find((goal) => goal.isPrimary) ?? normalizedGoals[0] ?? null;

  return {
    incomeRange,
    expensesRange,
    expenseCategories: Array.isArray(expenseCategories) ? expenseCategories : [],
    expenseCategoryAmounts:
      expenseCategoryAmounts && typeof expenseCategoryAmounts === "object" && !Array.isArray(expenseCategoryAmounts)
        ? expenseCategoryAmounts
        : {},
    expensesFeeling,
    monthlyExpensesIncludesSmallExpenses,
    smallExpensesRange,
    smallExpensesIntention,
    hasSmallExpenses,
    savingsRange,
    hasDebts,
    debtMonthlyPaymentRange,
    debtSituation,
    debtPaymentShare,
    debts: Array.isArray(debts) ? debts : [],
    financialGoal: primaryGoal?.title ?? null,
    goalAmountRange: primaryGoal?.amountRange ?? null,
    goals: normalizedGoals
  };
}

export function getMonthlyPlanPeriodKey(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}`;
}

export function getMonthlyPlanMetrics(
  data: MonthlyPlanData,
  exactValues: ExactFinancialValues = {}
): MonthlyPlanMetrics {
  const onboarding: OnboardingData = {
    ...initialOnboarding,
    ...data
  };
  const snapshot = calculateFinancialSnapshot({ onboarding, exactValues });
  const expensePercentage =
    snapshot.cashflow.expensesToIncomeRatio !== null
      ? Math.round(snapshot.cashflow.expensesToIncomeRatio * 100)
      : null;

  return {
    incomeMidpoint: snapshot.cashflow.monthlyIncome,
    expenseMidpoint: snapshot.cashflow.monthlyExpenses,
    estimatedMargin: snapshot.cashflow.monthlyMargin,
    expensePercentage,
    currentSavings: snapshot.values.currentSavings,
    goalTargetAmount: snapshot.values.goalTargetAmount,
    smallExpenseMidpoint: snapshot.values.smallExpenses,
    balancedScenarioAmount:
      snapshot.cashflow.suggestedMonthlyContribution +
      (snapshot.smallExpenses.opportunityAmount ?? 0),
    snapshot
  };
}

export function goalNeedsAmount(goalAmountRange: string | null) {
  return !goalAmountRange || noConcreteGoalAmountValues.includes(goalAmountRange);
}

export function getMonthlyFocus(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyFocus {
  const actions = getMonthlyActions(data, metrics, priorityKey, goalContext);

  if (actions.length === 0) {
    return monthlyFocusByPriority.keep_tracking;
  }

  if (
    (priorityKey === "review_small_expenses" ||
      priorityKey === "learn_investing" ||
      priorityKey === "keep_tracking") &&
    actions.some((action) => action.id === "register-debt-payments")
  ) {
    return {
      title: "Registrar pagos del mes",
      text: "Mantén al día el avance de tus deudas registrando los pagos que realizaste este mes."
    };
  }

  if (needsEmergencyGoal(data, metrics, priorityKey)) {
    return monthlyFocusByPriority.build_emergency_fund;
  }

  if (
    priorityKey === "advance_goal" ||
    (priorityKey === "build_emergency_fund" && hasEmergencyGoal(data))
  ) {
    return getGoalsFocus(goalContext);
  }

  return monthlyFocusByPriority[priorityKey];
}

export function getMonthlyActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  const debtPaymentActions = getDebtPaymentActions(data);

  if (needsEmergencyGoal(data, metrics, priorityKey)) {
    return [...debtPaymentActions, createEmergencyGoalAction];
  }

  if (priorityKey === "debt_pressure") {
    return [...debtPaymentActions, ...getDebtPressureActions(data, metrics)];
  }

  if (priorityKey === "organize_cashflow") {
    return [...debtPaymentActions, ...getOrganizeCashflowActions(data, metrics)];
  }

  if (priorityKey === "build_emergency_fund" || priorityKey === "advance_goal") {
    return [...debtPaymentActions, ...getGeneralGoalActions(data, metrics, goalContext)];
  }

  return [...debtPaymentActions, ...generateMonthlyActions(metrics.snapshot, priorityKey)];
}

export function getMonthlyPlanProgressKey(
  metrics: MonthlyPlanMetrics,
  actions: MonthlyAction[],
  priorityKey = metrics.snapshot.priority.key,
  periodKey = getMonthlyPlanPeriodKey()
) {
  const actionIds = actions.map((action) => action.id).join("|");

  return `${monthlyPlanProgressVersion}:${periodKey}:${priorityKey}:${actionIds}`;
}

export function getMonthlyPlanKeyFromActionProgressId(progressId: string) {
  if (!progressId.startsWith(monthlyPlanProgressKeyPrefix)) {
    return null;
  }

  const actionSeparatorIndex = progressId.lastIndexOf(":");

  if (actionSeparatorIndex <= monthlyPlanProgressKeyPrefix.length) {
    return null;
  }

  return progressId.slice(0, actionSeparatorIndex);
}

export function getMonthlyPlanPriorityKey(planProgressKey: string): PriorityKey | null {
  if (!planProgressKey.startsWith(monthlyPlanProgressKeyPrefix)) {
    return null;
  }

  const priorityKey = planProgressKey.split(":")[2] as PriorityKey | undefined;

  if (!priorityKey || !monthlyPlanPriorityKeys.includes(priorityKey)) {
    return null;
  }

  return priorityKey;
}

export function getMonthlyPlanPeriodFromKey(planProgressKey: string) {
  if (!planProgressKey.startsWith(monthlyPlanProgressKeyPrefix)) {
    return null;
  }

  return planProgressKey.split(":")[1] ?? null;
}

export function getActiveMonthlyPlanProgressKey(
  completedActions: CompletedActionsState,
  suggestedPlanProgressKey: string
) {
  const completedPlanCounts: Record<string, number> = {};
  const suggestedPeriodKey = getMonthlyPlanPeriodFromKey(suggestedPlanProgressKey);

  Object.entries(completedActions).forEach(([progressId, completed]) => {
    if (!isActionProgressCompleted(completed)) {
      return;
    }

    const planProgressKey = getMonthlyPlanKeyFromActionProgressId(progressId);

    if (!planProgressKey || !getMonthlyPlanPriorityKey(planProgressKey)) {
      return;
    }

    if (getMonthlyPlanPeriodFromKey(planProgressKey) !== suggestedPeriodKey) {
      return;
    }

    completedPlanCounts[planProgressKey] = (completedPlanCounts[planProgressKey] ?? 0) + 1;
  });

  if (completedPlanCounts[suggestedPlanProgressKey]) {
    return suggestedPlanProgressKey;
  }

  return Object.entries(completedPlanCounts).reduce(
    (activePlanKey, [planProgressKey, completedCount]) =>
      completedCount > (completedPlanCounts[activePlanKey] ?? 0)
        ? planProgressKey
        : activePlanKey,
    suggestedPlanProgressKey
  );
}

export function getMonthlyActionProgressId(planProgressKey: string, actionId: string) {
  return `${planProgressKey}:${actionId}`;
}

export function isMonthlyActionCompleted({
  actionId,
  completedActions,
  planProgressKey
}: {
  actionId: string;
  completedActions: CompletedActionsState;
  planProgressKey: string;
}) {
  return isActionProgressCompleted(completedActions[getMonthlyActionProgressId(planProgressKey, actionId)]);
}

export function getMonthlyActionProgressStatus({
  actionId,
  completedActions,
  planProgressKey
}: {
  actionId: string;
  completedActions: CompletedActionsState;
  planProgressKey: string;
}): ActionProgressStatus {
  return getActionProgressStatus(completedActions[getMonthlyActionProgressId(planProgressKey, actionId)]);
}
