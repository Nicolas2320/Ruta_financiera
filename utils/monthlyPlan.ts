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
import { isDebtPaid } from "./debtPayments";
import { isDebtGoal, isEmergencyGoal } from "./goalPlanning";

export type MonthlyPlanData = {
  incomeRange: string | null;
  expensesRange: string | null;
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
  title: string | null;
  monthlyContribution: number | null;
  estimatedMonthsToGoal: number | null;
  hasRegisteredContribution?: boolean;
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
    title: "Revisar gastos pequeños",
    text:
      "Puedes redirigir una parte de tus pequeños consumos hacia tu meta sin eliminarlos todos."
  },
  advance_goal: {
    title: "Avanzar hacia tu meta",
    text: "Tu plan puede enfocarse en separar un monto mensual adecuado para tu objetivo."
  },
  learn_investing: {
    title: "Aprender antes de invertir",
    text: "Puedes empezar entendiendo riesgo, plazo y liquidez antes de tomar decisiones."
  },
  keep_tracking: {
    title: "Mantener claridad mensual",
    text: "Revisar tu plan cada mes te ayuda a tomar mejores decisiones."
  }
};

function getGoalTitle(goalContext?: MonthlyGoalContext) {
  const title = goalContext?.title?.trim();
  return title && title.length > 0 ? title : null;
}

function getGoalContributionImpact(goalContext?: MonthlyGoalContext) {
  const contribution = goalContext?.monthlyContribution ?? null;

  if (contribution !== null && contribution > 0) {
    return `Referencia mensual de tu estrategia: ${formatCOP(contribution)} aprox.`;
  }

  return "La estrategia actual no reparte un monto mensual a esta meta.";
}

function getGoalAwareFocus(
  focus: MonthlyFocus,
  priorityKey: PriorityKey,
  goalContext?: MonthlyGoalContext
): MonthlyFocus {
  const goalTitle = getGoalTitle(goalContext);

  if (priorityKey !== "advance_goal" || !goalTitle) {
    return focus;
  }

  const contribution = goalContext?.monthlyContribution ?? null;

  return {
    title: `Meta del mes: ${goalTitle}`,
    text:
      contribution !== null && contribution > 0
        ? `Tu estrategia reparte ${formatCOP(contribution)} aprox. al mes a esta meta. Registra en Metas los aportes que realmente hagas.`
        : `Tu plan puede enfocarse en registrar un aporte real para ${goalTitle} desde Metas.`
  };
}

function getGoalAwareActions(
  actions: MonthlyAction[],
  priorityKey: PriorityKey,
  goalContext?: MonthlyGoalContext
) {
  const goalTitle = getGoalTitle(goalContext);

  if (priorityKey !== "advance_goal" || !goalTitle) {
    return actions;
  }

  return actions.map((action) => {
    if (action.id === "set-goal-contribution") {
      return {
        ...action,
        title: goalContext?.hasRegisteredContribution
          ? `Registrar otro aporte para ${goalTitle}`
          : `Registrar el primer aporte para ${goalTitle}`,
        description:
          "Hazlo desde Metas para actualizar el avance real y la fecha proyectada.",
        why: "Registrar solo lo que realmente aportas mantiene el plan alineado con tu avance.",
        estimatedImpact: getGoalContributionImpact(goalContext)
      };
    }

    if (action.id === "review-goal-target") {
      return {
        ...action,
        title: `Revisar el objetivo de ${goalTitle}`,
        description: "Compara el monto objetivo con la distribución mensual actual.",
        why: "Ajustar monto, plazo o aporte puede hacer la meta más sostenible."
      };
    }

    if (action.id === "compare-goal-contribution") {
      return {
        ...action,
        title: "Comparar escenarios en Simulación",
        description:
          "Compara cómo cambia la fecha al repartir el dinero entre deudas y metas.",
        estimatedImpact:
          goalContext?.estimatedMonthsToGoal !== null &&
          goalContext?.estimatedMonthsToGoal !== undefined
            ? `Elige un escenario para ${goalTitle}. Con el aporte asignado, podría tomar cerca de ${goalContext.estimatedMonthsToGoal} meses.`
            : `Elige un escenario para ${goalTitle} sin cambiar tu aporte automáticamente.`
      };
    }

    return action;
  });
}

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

const noConcreteGoalAmountValues = [
  "",
  "No tengo una cifra todavía",
  "Prefiero definirla después"
];

export function getMonthlyPlanData(data: Partial<MonthlyPlanData>): MonthlyPlanData {
  const {
    incomeRange = null,
    expensesRange = null,
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
  _data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyFocus {
  return getGoalAwareFocus(monthlyFocusByPriority[priorityKey], priorityKey, goalContext);
}

export function getMonthlyActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  let actions =
    priorityKey === "debt_pressure"
      ? getDebtPressureActions(data, metrics)
      : getGoalAwareActions(
          generateMonthlyActions(metrics.snapshot, priorityKey),
          priorityKey,
          goalContext
        );
  const needsEmergencyGoal =
    (metrics.snapshot.priority.key === "build_emergency_fund" ||
      priorityKey === "build_emergency_fund") &&
    !data.goals.some(
      (goal) =>
        goal.status !== "completed" &&
        goal.status !== "paused" &&
        isEmergencyGoal(goal)
    );
  const createEmergencyGoalAction: MonthlyAction = {
    id: "create-emergency-goal",
    title: "Crear fondo de emergencia en Metas",
    description:
      "Crea la meta para definir su monto, fecha y registrar su avance sin mezclarla con tus otros objetivos.",
    why:
      "Tenerla como meta permite que la simulación y el plan mensual usen el mismo objetivo.",
    estimatedImpact:
      "La app podrá seguir su avance y ajustar la proyección con tus datos actuales.",
    difficulty: "Baja",
    category: "Ahorro"
  };

  if (needsEmergencyGoal && priorityKey === "build_emergency_fund") {
    actions = actions.map((action, index) =>
      index === 0
        ? createEmergencyGoalAction
        : action
    );
  } else if (needsEmergencyGoal) {
    actions = [...actions.slice(0, 2), createEmergencyGoalAction];
  }

  return actions;
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
