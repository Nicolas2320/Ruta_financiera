import { supabase } from "./supabase";

export type AssistantChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type AssistantMonthlyPlanAction = {
  category: string;
  completedAt?: string | null;
  description: string;
  difficulty: string;
  estimatedImpact: string;
  evidence?: {
    amount?: number | null;
    detail?: string | null;
    label?: string | null;
    type?: string;
  } | null;
  id: string;
  isCompleted: boolean;
  order: number;
  progressId: string;
  status: string;
  title: string;
  why: string;
};

export type AssistantFinancialContext = {
  cashflow: {
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    monthlyDebtPayments: number;
    monthlyMargin: number | null;
    totalMonthlyOutflow: number | null;
    expensesToIncomeRatio: number | null;
    suggestedMonthlyContribution: number;
    suggestedMonthlyContributionMeaning?: string;
  };
  debt: {
    debtToIncomeRatio: number | null;
    isPaymentEstimated: boolean;
    label: string;
    level: string;
    monthlyPaymentTotal: number;
    reportedMonthlyPaymentRange: string | null;
    reportedPaymentKind: "exact" | "range" | "share" | null;
    reportedPaymentShare: string | null;
    shouldPrioritizeDebt: boolean;
    source: string;
  };
  dataSources: {
    currentSavings: string;
    debt: string;
    monthlyExpenses: string;
    monthlyIncome: string;
    smallExpenses: string;
  };
  emergencyFund: {
    coverageMonths: number | null;
    label: string;
    missingForThreeMonths: number | null;
    status: string;
  };
  goal: {
    estimatedMonthsToGoal: number | null;
    name: string | null;
    progressPercentage: number | null;
    remainingAmount: number | null;
    targetAmount: number | null;
    targetMonth: string | null;
  };
  goalsPlan?: {
    activeGoals: number;
    allocations: Array<{
      isPrimary: boolean;
      monthlyContribution: number;
      progressPercentage: number | null;
      remainingAmount: number | null;
      status: string | null | undefined;
      title: string;
    }>;
    monthlyGoalBudget: number;
    monthlyGoalBudgetMode: "recommended" | "manual";
    monthlyContributionTotal: number;
    primaryGoalMonthlyContribution: number | null;
    remainingBudget: number;
  };
  monthlyPlan: {
    actions: AssistantMonthlyPlanAction[];
    completedActions: number;
    focusText: string;
    focusTitle: string;
    nextPendingAction: AssistantMonthlyPlanAction | null;
    primaryGoalMonthlyContribution: number | null;
    primaryGoalMonthlyContributionLabel: "Aporte meta";
    primaryGoalMonthlyContributionMeaning: string;
    progressPercentage: number;
    realContributionThisMonth?: number;
    referenceMonthlyContribution: number;
    referenceMonthlyContributionLabel: "Referencia mensual";
    referenceMonthlyContributionMeaning: string;
    totalActions: number;
  };
  precision: {
    label: string;
    message: string;
    status: string;
  };
  smallExpenses: {
    amount: number | null;
    categories: string[];
    intention: string | null;
    label: string;
    opportunityAmount: number | null;
  };
};

export type GenerateAssistantResponseInput = {
  conversation: AssistantChatMessage[];
  financialContext: AssistantFinancialContext;
  userMessage: string;
};

export type GenerateAssistantResponseResult = {
  answer: string;
  usage?: AssistantUsageStatus;
};

export type AssistantUsageStatus = {
  dailyLimit: number;
  questionCount: number;
  remainingQuestions: number;
  timeZone?: string;
  usageDate: string;
};

export type GetAssistantUsageStatusResult = {
  usage: AssistantUsageStatus;
};

export class AssistantApiError extends Error {
  code?: string;
  usage?: AssistantUsageStatus;

  constructor(message: string, usage?: AssistantUsageStatus, code?: string) {
    super(message);
    this.name = "AssistantApiError";
    this.code = code;
    this.usage = usage;
    Object.setPrototypeOf(this, AssistantApiError.prototype);
  }
}

async function getFunctionErrorPayload(error: unknown) {
  const fallback = "No pudimos contactar al asistente. Inténtalo de nuevo.";
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (!context || typeof context !== "object") {
    return { message: fallback };
  }

  const response = context as {
    json?: () => Promise<unknown>;
    status?: number;
  };

  try {
    if (typeof response.json === "function") {
      const payload = await response.json();

      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
      ) {
        return {
          code:
            "code" in payload && typeof (payload as { code?: unknown }).code === "string"
              ? (payload as { code: string }).code
              : undefined,
          message: (payload as { error: string }).error,
          usage:
            "usage" in payload
              ? ((payload as { usage?: AssistantUsageStatus }).usage)
              : undefined
        };
      }
    }

  } catch {
    // The gateway can return an empty or non-JSON response. Map it below by status.
  }

  if (response.status === 401 || response.status === 403) {
    return { code: "AUTH_REQUIRED", message: "Tu sesión no está activa. Vuelve a iniciar sesión." };
  }

  if (response.status === 413) {
    return { code: "REQUEST_TOO_LARGE", message: "La solicitud del asistente es demasiado grande." };
  }

  if (response.status === 429) {
    return {
      code: "REQUEST_RATE_LIMITED",
      message: "El asistente recibió demasiadas solicitudes. Inténtalo más tarde."
    };
  }

  return { message: fallback };
}

export async function getAssistantUsageStatus(): Promise<GetAssistantUsageStatusResult> {
  if (!supabase) {
    throw new Error("Supabase no esta configurado para consultar el limite del asistente.");
  }

  const { data, error } = await supabase.functions.invoke<GetAssistantUsageStatusResult>(
    "assistant",
    {
      body: {
        action: "status"
      }
    }
  );

  if (error) {
    const payload = await getFunctionErrorPayload(error);
    throw new AssistantApiError(payload.message, payload.usage, payload.code);
  }

  if (!data?.usage) {
    throw new Error("No pudimos consultar el limite diario del asistente.");
  }

  return data;
}

export async function generateAssistantResponse({
  conversation,
  financialContext,
  userMessage
}: GenerateAssistantResponseInput): Promise<GenerateAssistantResponseResult> {
  if (!supabase) {
    throw new Error("Supabase no esta configurado para invocar el asistente.");
  }

  const { data, error } = await supabase.functions.invoke<GenerateAssistantResponseResult>(
    "assistant",
    {
      body: {
        conversation,
        financialContext,
        userMessage
      }
    }
  );

  if (error) {
    const payload = await getFunctionErrorPayload(error);
    throw new AssistantApiError(payload.message, payload.usage, payload.code);
  }

  if (!data?.answer) {
    throw new Error("El asistente no devolvio una respuesta valida.");
  }

  return data;
}
