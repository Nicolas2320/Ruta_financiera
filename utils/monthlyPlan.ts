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
    text: "Tu plan puede enfocarse en separar un monto mensual realista para tu objetivo."
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
        description: "Usa el aporte asignado como referencia educativa, no como obligacion.",
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
        title: `Comparar escenarios para ${goalTitle}`,
        estimatedImpact:
          goalContext?.estimatedMonthsToGoal !== null &&
          goalContext?.estimatedMonthsToGoal !== undefined
            ? `Con el aporte asignado, podria tomar cerca de ${goalContext.estimatedMonthsToGoal} meses.`
            : getGoalContributionImpact(goalContext)
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

function hasGoalAmountReference(data: MonthlyPlanData, metrics: MonthlyPlanMetrics) {
  return metrics.goalTargetAmount !== null || !goalNeedsAmount(data.goalAmountRange);
}

function hasDebtPressure(debtSituation: string | null, debtPaymentShare: string | null) {
  return (
    debtSituation === "A veces me cuesta pagarlas" ||
    debtSituation === "Son una preocupación importante" ||
    debtPaymentShare === "Más del 40%"
  );
}

function hasHighDebtPressure(debtSituation: string | null, debtPaymentShare: string | null) {
  return debtSituation === "Son una preocupación importante" || debtPaymentShare === "Más del 40%";
}

function hasExpensePressure(data: MonthlyPlanData, metrics: MonthlyPlanMetrics) {
  return (
    (metrics.expensePercentage !== null && metrics.expensePercentage >= 85) ||
    data.expensesFeeling === "Gasto más de lo planeado" ||
    data.expensesFeeling === "No sé en qué se va mi dinero" ||
    data.expensesFeeling === "Me preocupa no poder ahorrar"
  );
}

function hasSmallExpensesPlan(data: MonthlyPlanData) {
  return (
    data.hasSmallExpenses === "Sí" &&
    (data.smallExpensesIntention === "Reducir algunos" ||
      data.smallExpensesIntention === "Establecer un límite mensual")
  );
}

function hasSmallExpensesAction(data: MonthlyPlanData) {
  return (
    data.hasSmallExpenses === "Sí" &&
    (data.smallExpensesIntention === "Reducir algunos" ||
      data.smallExpensesIntention === "Establecer un límite mensual" ||
      data.smallExpensesIntention === "Primero quiero entenderlos mejor")
  );
}

function wantsInvestmentEducation(investmentSituation: string | null) {
  return (
    investmentSituation === "No, pero quiero aprender" ||
    investmentSituation === "Sí, pero no entiendo bien cómo funcionan"
  );
}

export function getMonthlyFocus(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyFocus {
  return getGoalAwareFocus(monthlyFocusByPriority[priorityKey], priorityKey, goalContext);

  if (hasHighDebtPressure(data.debtSituation, data.debtPaymentShare)) {
    return {
      title: "Revisar el peso de tus deudas",
      text:
        "Este mes conviene entender cuánto de tus ingresos se va en deudas antes de asumir metas más exigentes."
    };
  }

  if (data.debtSituation === "A veces me cuesta pagarlas") {
    return {
      title: "Ordenar tus pagos de deuda",
      text: "Este mes puede ser útil identificar qué pagos pesan más en tu presupuesto."
    };
  }

  if (hasLowEmergencyCoverage(data.emergencyCoverage)) {
    return {
      title: "Construir una base para imprevistos",
      text: "Este mes el foco puede ser empezar o fortalecer tu fondo de emergencia."
    };
  }

  if ((metrics.expensePercentage ?? 0) >= 85) {
    return {
      title: "Recuperar margen mensual",
      text:
        "Tus gastos parecen ocupar una parte alta de tus ingresos. Este mes conviene revisar gastos variables."
    };
  }

  if (hasSmallExpensesPlan(data)) {
    return {
      title: "Ajustar pequeños gastos",
      text: "Este mes puedes probar un límite simple para algunos gastos frecuentes."
    };
  }

  if (wantsInvestmentEducation(data.investmentSituation)) {
    return {
      title: "Aprender antes de invertir",
      text:
        "Este mes puedes empezar por conceptos básicos antes de tomar decisiones de inversión."
    };
  }

  if (!hasGoalAmountReference(data, metrics)) {
    return {
      title: "Aterrizar tu meta",
      text: "Este mes puedes convertir tu meta en una cifra aproximada y un primer paso."
    };
  }

  return {
    title: "Avanzar con constancia",
    text:
      "Este mes puedes separar una cantidad pequeña y sostenible para avanzar hacia tu meta."
  };
}

function getActionCatalog(metrics: MonthlyPlanMetrics): MonthlyAction[] {
  return [
    {
      id: "emergency",
      title: "Separar una base para imprevistos",
      description:
        "Aparta una cantidad pequeña y realista para iniciar o fortalecer tu fondo de emergencia.",
      why:
        "Un fondo de emergencia puede ayudarte a cubrir imprevistos sin desorganizar tus otras metas.",
      estimatedImpact:
        metrics.balancedScenarioAmount > 0
          ? `Empieza con una cantidad cercana a ${formatCOP(Math.min(metrics.balancedScenarioAmount, 150000))} aprox.`
          : "Empieza con una cantidad pequeña que puedas sostener.",
      difficulty: "Media",
      category: "Ahorro"
    },
    {
      id: "variable-expenses",
      title: "Revisar tus gastos variables",
      description: "Elige una categoría de gasto variable y observa cuánto representa esta semana.",
      why:
        "Entender en qué se va tu dinero puede ayudarte a encontrar margen sin hacer cambios extremos.",
      estimatedImpact: "Puede ayudarte a identificar ajustes para el próximo mes.",
      difficulty: "Baja",
      category: "Gastos"
    },
    {
      id: "small-expenses",
      title: "Definir un límite para gastos pequeños",
      description:
        "Elige una o dos categorías de gastos frecuentes y define un límite mensual simple.",
      why: "Pequeños ajustes frecuentes pueden liberar dinero sin eliminar todos tus gustos.",
      estimatedImpact:
        metrics.smallExpenseMidpoint !== null
          ? `Reducir cerca del 20% podría liberar ${formatCOP(metrics.smallExpenseMidpoint * 0.2)} aprox.`
          : "Puede ayudarte a liberar dinero de forma gradual.",
      difficulty: "Media",
      category: "Gastos hormiga"
    },
    {
      id: "debt",
      title: "Identificar qué deuda pesa más",
      description: "Haz una lista simple de tus deudas y estima cuánto pagas al mes por cada una.",
      why: "Conocer el peso mensual de tus deudas puede ayudarte a recuperar margen.",
      estimatedImpact: "Te dará claridad para decidir qué revisar primero.",
      difficulty: "Media",
      category: "Deudas"
    },
    {
      id: "education",
      title: "Aprender un concepto antes de invertir",
      description:
        "Dedica 10 minutos a entender la diferencia entre ahorrar e invertir, y conceptos como riesgo, plazo y liquidez.",
      why: "Antes de invertir, es importante entender qué riesgos estás asumiendo.",
      estimatedImpact: "Mejora tu claridad antes de tomar decisiones financieras.",
      difficulty: "Baja",
      category: "Educación"
    },
    {
      id: "goal-amount",
      title: "Definir una cifra aproximada para tu meta",
      description: "Convierte tu meta en un rango de dinero más concreto.",
      why: "Una cifra aproximada hace más fácil crear un plan mensual.",
      estimatedImpact: "Te ayudará a simular escenarios más claros.",
      difficulty: "Baja",
      category: "Meta"
    },
    {
      id: "constancy",
      title: "Separar una cantidad fija este mes",
      description: "Elige una cantidad pequeña y sostenible para apartar este mes.",
      why: "La constancia puede ser más útil que hacer grandes esfuerzos ocasionales.",
      estimatedImpact:
        metrics.balancedScenarioAmount > 0
          ? `Podrías probar con ${formatCOP(Math.min(metrics.balancedScenarioAmount, 200000))} aprox.`
          : "Empieza con una cantidad que no afecte tus gastos esenciales.",
      difficulty: "Baja",
      category: "Ahorro"
    }
  ];
}

export function getMonthlyActions(
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  return getGoalAwareActions(generateMonthlyActions(metrics.snapshot, priorityKey), priorityKey, goalContext);

  const catalog = getActionCatalog(metrics);
  const actions: MonthlyAction[] = [];
  const addAction = (id: string) => {
    const action = catalog.find((catalogAction) => catalogAction.id === id);

    if (action && !actions.some((currentAction) => currentAction.id === action.id)) {
      actions.push(action);
    }
  };

  if (hasLowEmergencyCoverage(data.emergencyCoverage)) {
    addAction("emergency");
  }

  if (hasDebtPressure(data.debtSituation, data.debtPaymentShare)) {
    addAction("debt");
  }

  if (hasExpensePressure(data, metrics)) {
    addAction("variable-expenses");
  }

  if (hasSmallExpensesAction(data)) {
    addAction("small-expenses");
  }

  if (wantsInvestmentEducation(data.investmentSituation)) {
    addAction("education");
  }

  if (!hasGoalAmountReference(data, metrics)) {
    addAction("goal-amount");
  }

  addAction("constancy");

  ["variable-expenses", "emergency", "goal-amount", "education"].forEach((id) => {
    if (actions.length < 3) {
      addAction(id);
    }
  });

  return actions.slice(0, 3);
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
