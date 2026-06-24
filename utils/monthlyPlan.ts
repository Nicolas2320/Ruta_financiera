import {
  formatCOP,
  getPreferredCurrentSavings,
  getPreferredGoalTargetAmount,
  getPreferredMonthlyExpenses,
  getPreferredMonthlyIncome,
  getSmallExpenseRangeEstimate
} from "./financialRanges";
import type { ExactFinancialValues } from "../types/financial";

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

export function getMonthlyPlanMetrics(
  data: MonthlyPlanData,
  exactValues: ExactFinancialValues = {}
): MonthlyPlanMetrics {
  const financialProfile = {
    onboarding: data,
    exactValues
  };
  const smallExpenseEstimate = getSmallExpenseRangeEstimate(data.smallExpensesRange);
  const incomeMidpoint = getPreferredMonthlyIncome(financialProfile);
  const expenseMidpoint = getPreferredMonthlyExpenses(financialProfile);
  const currentSavings = getPreferredCurrentSavings(financialProfile);
  const goalTargetAmount = getPreferredGoalTargetAmount(financialProfile);
  const smallExpenseMidpoint = smallExpenseEstimate.midpoint;
  const estimatedMargin =
    incomeMidpoint !== null && expenseMidpoint !== null ? incomeMidpoint - expenseMidpoint : null;
  const expensePercentage =
    incomeMidpoint !== null && incomeMidpoint > 0 && expenseMidpoint !== null
      ? Math.round((expenseMidpoint / incomeMidpoint) * 100)
      : null;
  const safeMarginContribution =
    estimatedMargin !== null && estimatedMargin > 0 ? estimatedMargin * 0.2 : 0;
  const smallExpenseContribution =
    smallExpenseMidpoint !== null && smallExpenseMidpoint > 0 ? smallExpenseMidpoint * 0.2 : 0;

  return {
    incomeMidpoint,
    expenseMidpoint,
    estimatedMargin,
    expensePercentage,
    currentSavings,
    goalTargetAmount,
    smallExpenseMidpoint,
    balancedScenarioAmount: safeMarginContribution + smallExpenseContribution
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
  metrics: MonthlyPlanMetrics
): MonthlyFocus {
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

  if (metrics.expensePercentage !== null && metrics.expensePercentage >= 85) {
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
  metrics: MonthlyPlanMetrics
): MonthlyAction[] {
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
