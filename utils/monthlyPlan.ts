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
  type ExactFinancialValues,
  type OnboardingData
} from "../types/financial";
import { initialOnboarding } from "../types/financial";

export type MonthlyPlanData = {
  ageRange: string | null;
  country: string | null;
  city: string | null;
  incomeRange: string | null;
  expensesRange: string | null;
  expensesFeeling: string | null;
  smallExpensesRange: string | null;
  smallExpensesIntention: string | null;
  hasSmallExpenses: string | null;
  smallExpenseCategories: string[];
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
    title: "Revisar gastos pequenos",
    text:
      "Puedes redirigir una parte de tus pequenos consumos hacia tu meta sin eliminarlos todos."
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
    return `Aporte asignado a esta meta: ${formatCOP(contribution)} aprox.`;
  }

  return "Esta meta aun no tiene un aporte mensual asignado.";
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
        ? `Tu plan puede enfocarse en separar ${formatCOP(contribution)} aprox. para esta meta.`
        : `Tu plan puede enfocarse en definir un aporte mensual sostenible para ${goalTitle}.`
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
        title: `Separar aporte para ${goalTitle}`,
        description: "Usa el aporte asignado como referencia. Puedes ajustarlo.",
        estimatedImpact: getGoalContributionImpact(goalContext)
      };
    }

    if (action.id === "review-goal-target") {
      return {
        ...action,
        title: `Revisar el objetivo de ${goalTitle}`,
        description: "Compara el monto objetivo con el aporte mensual asignado.",
        why: "Ajustar monto, plazo o aporte puede hacer la meta mas sostenible."
      };
    }

    if (action.id === "compare-goal-contribution") {
      return {
        ...action,
        title: "Comparar escenarios en Simulación",
        description: "Revisa el aporte actual, equilibrado e intensivo antes de elegir uno.",
        estimatedImpact:
          goalContext?.estimatedMonthsToGoal !== null &&
          goalContext?.estimatedMonthsToGoal !== undefined
            ? `Elige un escenario para ${goalTitle}. Con el aporte asignado, podria tomar cerca de ${goalContext.estimatedMonthsToGoal} meses.`
            : `Elige un escenario para ${goalTitle} sin cambiar tu aporte automaticamente.`
      };
    }

    return action;
  });
}

const noConcreteGoalAmountValues = [
  "",
  "No tengo una cifra todavía",
  "Prefiero definirla después"
];

export function getMonthlyPlanData(data: Partial<MonthlyPlanData>): MonthlyPlanData {
  const {
    ageRange = null,
    country = null,
    city = null,
    incomeRange = null,
    expensesRange = null,
    expensesFeeling = null,
    smallExpensesRange = null,
    smallExpensesIntention = null,
    hasSmallExpenses = null,
    smallExpenseCategories = [],
    savingsRange = null,
    emergencyCoverage = null,
    debtSituation = null,
    debtPaymentShare = null,
    investmentSituation = null,
    financialGoal = null,
    goalHorizon = null,
    goalPriority = null,
    goalAmountRange = null
  } = data;

  return {
    ageRange,
    country,
    city,
    incomeRange,
    expensesRange,
    expensesFeeling,
    smallExpensesRange,
    smallExpensesIntention,
    hasSmallExpenses,
    smallExpenseCategories: Array.isArray(smallExpenseCategories) ? smallExpenseCategories : [],
    savingsRange,
    emergencyCoverage,
    debtSituation,
    debtPaymentShare,
    investmentSituation,
    financialGoal,
    goalHorizon,
    goalPriority,
    goalAmountRange
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
    ...data,
    city: data.city ?? ""
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

export function hasLowEmergencyCoverage(emergencyCoverage: string | null) {
  return emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes";
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
  _data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  return getGoalAwareActions(generateMonthlyActions(metrics.snapshot, priorityKey), priorityKey, goalContext);
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
