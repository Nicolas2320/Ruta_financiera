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
  type OnboardingData
} from "../types/financial";
import { initialOnboarding } from "../types/financial";
import { isDebtPaid } from "./debtPayments";

export type MonthlyPlanData = {
  ageRange: string | null;
  country: string | null;
  city: string | null;
  incomeRange: string | null;
  expensesRange: string | null;
  expenseCategoryAmounts: ExpenseCategoryAmounts;
  expensesFeeling: string | null;
  smallExpensesRange: string | null;
  smallExpensesIntention: string | null;
  hasSmallExpenses: string | null;
  smallExpenseCategories: string[];
  savingsRange: string | null;
  emergencyCoverage: string | null;
  debtSituation: string | null;
  debtPaymentShare: string | null;
  debts: DebtRecord[];
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
    return `Aporte asignado a esta meta: ${formatCOP(contribution)} aprox.`;
  }

  return "Esta meta aún no tiene un aporte mensual asignado.";
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
        why: "Ajustar monto, plazo o aporte puede hacer la meta más sostenible."
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
            ? `Elige un escenario para ${goalTitle}. Con el aporte asignado, podría tomar cerca de ${goalContext.estimatedMonthsToGoal} meses.`
            : `Elige un escenario para ${goalTitle} sin cambiar tu aporte automáticamente.`
      };
    }

    return action;
  });
}

function getDebtTitle(debt: DebtRecord) {
  const debtTypeLabels: Record<string, string> = {
    "Tarjeta de credito": "Tarjeta de crédito",
    "Prestamo personal": "Préstamo personal",
    Vehiculo: "Vehículo",
    Educacion: "Educación"
  };

  return debt.name?.trim() || debtTypeLabels[debt.type] || debt.type;
}

export function getPriorityDebt(debts: DebtRecord[]) {
  return debts.filter((debt) => !isDebtPaid(debt)).sort((left, right) => {
    const overdueDifference =
      Number(right.status === "overdue") - Number(left.status === "overdue");

    if (overdueDifference !== 0) {
      return overdueDifference;
    }

    const pressureDifference =
      Number(right.status === "sometimes_heavy") -
      Number(left.status === "sometimes_heavy");

    if (pressureDifference !== 0) {
      return pressureDifference;
    }

    const interestDifference =
      (right.annualInterestRate ?? -1) - (left.annualInterestRate ?? -1);

    if (interestDifference !== 0) {
      return interestDifference;
    }

    const paymentDifference = right.monthlyPayment - left.monthlyPayment;

    if (paymentDifference !== 0) {
      return paymentDifference;
    }

    return (right.remainingAmount ?? 0) - (left.remainingAmount ?? 0);
  })[0] ?? null;
}

function getDebtPriorityReason(debt: DebtRecord) {
  if (debt.status === "overdue") {
    return "La marcaste con pagos atrasados, por eso conviene revisarla antes que las demás.";
  }

  if (debt.status === "sometimes_heavy") {
    return "Indicaste que algunos meses esta cuota se siente pesada.";
  }

  if (debt.annualInterestRate !== null && debt.annualInterestRate !== undefined) {
    return `Tiene la tasa anual más alta que registraste: ${debt.annualInterestRate}% E.A.`;
  }

  return "Es la cuota mensual más alta entre las deudas registradas.";
}

function personalizeDebtActions(actions: MonthlyAction[], debts: DebtRecord[]) {
  const priorityDebt = getPriorityDebt(debts);

  return actions.map((action) => {
    if (action.id === "debt-monthly-payment") {
      return debts.length === 0
        ? {
            ...action,
            title: "Agregar el detalle de tus deudas",
            description:
              "Registra saldo, cuota mensual, tasa anual si la conoces y estado del pago.",
            why: "Con esos datos la app podrá proponerte una primera deuda para revisar.",
            estimatedImpact: "Puedes empezar solo con la cuota mensual y completar lo demás después."
          }
        : {
            ...action,
            title: "Confirmar cuotas y saldos registrados",
            description: `Tienes ${debts.length} ${debts.length === 1 ? "deuda registrada" : "deudas registradas"}. Revisa que sus datos sigan vigentes.`,
            estimatedImpact: "Los cambios actualizarán la prioridad inicial de tu plan."
          };
    }

    if (action.id !== "debt-pressure-source" || !priorityDebt) {
      return action;
    }

    const details = [
      `cuota ${formatCOP(priorityDebt.monthlyPayment)}`,
      priorityDebt.remainingAmount !== null && priorityDebt.remainingAmount !== undefined
        ? `saldo ${formatCOP(priorityDebt.remainingAmount)}`
        : null,
      priorityDebt.annualInterestRate !== null &&
      priorityDebt.annualInterestRate !== undefined
        ? `tasa ${priorityDebt.annualInterestRate}% E.A.`
        : null
    ].filter((detail): detail is string => detail !== null);

    return {
      ...action,
      title: `Revisar primero: ${getDebtTitle(priorityDebt)}`,
      description: getDebtPriorityReason(priorityDebt),
      why:
        "Es una prioridad inicial basada únicamente en los datos registrados; puedes cambiarla si conoces otras condiciones.",
      estimatedImpact: details.join(" · ")
    };
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
    expenseCategoryAmounts = {},
    expensesFeeling = null,
    smallExpensesRange = null,
    smallExpensesIntention = null,
    hasSmallExpenses = null,
    smallExpenseCategories = [],
    savingsRange = null,
    emergencyCoverage = null,
    debtSituation = null,
    debtPaymentShare = null,
    debts = [],
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
    expenseCategoryAmounts:
      expenseCategoryAmounts && typeof expenseCategoryAmounts === "object" && !Array.isArray(expenseCategoryAmounts)
        ? expenseCategoryAmounts
        : {},
    expensesFeeling,
    smallExpensesRange,
    smallExpensesIntention,
    hasSmallExpenses,
    smallExpenseCategories: Array.isArray(smallExpenseCategories) ? smallExpenseCategories : [],
    savingsRange,
    emergencyCoverage,
    debtSituation,
    debtPaymentShare,
    debts: Array.isArray(debts) ? debts : [],
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
  data: MonthlyPlanData,
  metrics: MonthlyPlanMetrics,
  priorityKey = metrics.snapshot.priority.key,
  goalContext?: MonthlyGoalContext
): MonthlyAction[] {
  const actions = getGoalAwareActions(
    generateMonthlyActions(metrics.snapshot, priorityKey),
    priorityKey,
    goalContext
  );

  return priorityKey === "debt_pressure"
    ? personalizeDebtActions(actions, data.debts)
    : actions;
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
