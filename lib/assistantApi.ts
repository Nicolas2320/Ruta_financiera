import { supabase } from "./supabase";

export type AssistantChatMessage = {
  role: "assistant" | "user";
  text: string;
};

export type AssistantFinancialContext = {
  cashflow: {
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    monthlyMargin: number | null;
    expensesToIncomeRatio: number | null;
    suggestedMonthlyContribution: number;
  };
  debt: {
    label: string;
    level: string;
    shouldPrioritizeDebt: boolean;
  };
  emergencyFund: {
    coverageMonths: number | null;
    label: string;
    missingForThreeMonths: number | null;
    status: string;
  };
  goal: {
    estimatedMonthsToGoal: number | null;
    horizon: string | null;
    name: string | null;
    priority: string | null;
    progressPercentage: number | null;
    remainingAmount: number | null;
    targetAmount: number | null;
  };
  investment: {
    situation: string | null;
  };
  monthlyPlan: {
    actions: Array<{
      category: string;
      description: string;
      difficulty: string;
      estimatedImpact: string;
      title: string;
      why: string;
    }>;
    completedActions: number;
    focusText: string;
    focusTitle: string;
    progressPercentage: number;
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
  accessPin: string;
  conversation: AssistantChatMessage[];
  financialContext: AssistantFinancialContext;
  userMessage: string;
};

export type GenerateAssistantResponseResult = {
  answer: string;
  model?: string;
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
  usage?: AssistantUsageStatus;

  constructor(message: string, usage?: AssistantUsageStatus) {
    super(message);
    this.name = "AssistantApiError";
    this.usage = usage;
    Object.setPrototypeOf(this, AssistantApiError.prototype);
  }
}

function getFriendlyAssistantErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("exceeded your current quota") ||
    normalizedMessage.includes("insufficient_quota") ||
    normalizedMessage.includes("billing")
  ) {
    return "La cuenta de OpenAI no tiene cuota disponible o necesita activar billing. Revisa el plan, créditos o límite mensual en OpenAI Platform.";
  }

  if (normalizedMessage.includes("model") && normalizedMessage.includes("not found")) {
    return "El modelo configurado no está disponible para esta cuenta de OpenAI. Revisa OPENAI_MODEL en los secrets de Supabase.";
  }

  if (
    normalizedMessage.includes("incorrect api key") ||
    normalizedMessage.includes("invalid authentication") ||
    normalizedMessage.includes("api key")
  ) {
    return "La API key de OpenAI no es válida o no tiene permisos. Revisa OPENAI_API_KEY en los secrets de Supabase.";
  }

  return message;
}

async function getFunctionErrorPayload(error: unknown) {
  const fallback =
    error instanceof Error ? error.message : "No pudimos contactar al asistente.";
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
    text?: () => Promise<string>;
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
          message: getFriendlyAssistantErrorMessage((payload as { error: string }).error),
          usage:
            "usage" in payload
              ? ((payload as { usage?: AssistantUsageStatus }).usage)
              : undefined
        };
      }
    }

    if (typeof response.text === "function") {
      const text = await response.text();

      if (text.trim()) {
        return { message: getFriendlyAssistantErrorMessage(text.trim()) };
      }
    }
  } catch {
    return { message: getFriendlyAssistantErrorMessage(fallback) };
  }

  const message = response.status ? `${fallback} Estado HTTP: ${response.status}.` : fallback;
  return { message: getFriendlyAssistantErrorMessage(message) };
}

export async function getAssistantUsageStatus({
  accessPin
}: {
  accessPin: string;
}): Promise<GetAssistantUsageStatusResult> {
  if (!supabase) {
    throw new Error("Supabase no esta configurado para consultar el limite del asistente.");
  }

  const { data, error } = await supabase.functions.invoke<GetAssistantUsageStatusResult>(
    "assistant",
    {
      body: {
        accessPin,
        action: "status"
      }
    }
  );

  if (error) {
    const payload = await getFunctionErrorPayload(error);
    throw new AssistantApiError(payload.message, payload.usage);
  }

  if (!data?.usage) {
    throw new Error("No pudimos consultar el limite diario del asistente.");
  }

  return data;
}

export async function generateAssistantResponse({
  accessPin,
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
        accessPin,
        conversation,
        financialContext,
        userMessage
      }
    }
  );

  if (error) {
    const payload = await getFunctionErrorPayload(error);
    throw new AssistantApiError(payload.message, payload.usage);
  }

  if (!data?.answer) {
    throw new Error("El asistente no devolvio una respuesta valida.");
  }

  return data;
}
