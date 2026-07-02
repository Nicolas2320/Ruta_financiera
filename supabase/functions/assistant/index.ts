// @ts-nocheck

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

const DEFAULT_DAILY_LIMIT = 5;
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_USAGE_TIME_ZONE = "America/Bogota";
const MAX_CONTEXT_LENGTH = 6000;
const MAX_MESSAGE_LENGTH = 1200;

type AssistantChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type AssistantRequest = {
  accessPin?: unknown;
  action?: unknown;
  conversation?: AssistantChatMessage[];
  financialContext?: unknown;
  userMessage?: unknown;
};

type AssistantUsage = {
  dailyLimit: number;
  questionCount: number;
  remainingQuestions: number;
  timeZone: string;
  usageDate: string;
};

type UsageReservation = AssistantUsage & {
  allowed: boolean;
};

class HttpError extends Error {
  status: number;
  usage?: AssistantUsage;

  constructor(message: string, status = 500, usage?: AssistantUsage) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.usage = usage;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    status
  });
}

function cleanText(value: unknown, maxLength = MAX_MESSAGE_LENGTH) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanConversation(value: unknown): AssistantChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-6)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      text: cleanText(message?.text, 700)
    }))
    .filter((message) => message.text.length > 0);
}

function serializeFinancialContext(financialContext: unknown) {
  const serialized = JSON.stringify(financialContext ?? {}, null, 2);
  return serialized.slice(0, MAX_CONTEXT_LENGTH);
}

function getDailyLimit() {
  const configuredLimit = Number(Deno.env.get("ASSISTANT_DAILY_LIMIT") ?? DEFAULT_DAILY_LIMIT);

  if (!Number.isFinite(configuredLimit) || configuredLimit < 1) {
    return DEFAULT_DAILY_LIMIT;
  }

  return Math.floor(configuredLimit);
}

function getUsageTimeZone() {
  return Deno.env.get("ASSISTANT_USAGE_TIME_ZONE") || DEFAULT_USAGE_TIME_ZONE;
}

function getUsageDate(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    if (values.year && values.month && values.day) {
      return `${values.year}-${values.month}-${values.day}`;
    }
  } catch {
    // Fall back to UTC if the configured time zone is invalid.
  }

  return new Date().toISOString().slice(0, 10);
}

function getSupabaseUrl() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!supabaseUrl) {
    throw new HttpError("SUPABASE_URL no esta configurada en la Edge Function.");
  }

  return supabaseUrl;
}

function getSupabaseAnonKey() {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!anonKey) {
    throw new HttpError("SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY no esta configurada en la Edge Function.");
  }

  return anonKey;
}

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new HttpError("SUPABASE_SERVICE_ROLE_KEY no esta configurada en la Edge Function.");
  }

  return serviceRoleKey;
}

function buildSystemInstructions() {
  return [
    "Eres el Asistente AI de Ruta Financiera, una app de planificacion financiera personal para usuarios en Colombia.",
    "Tu rol es educativo, explicativo y de acompanamiento. No eres asesor financiero profesional.",
    "Responde siempre en espanol, con lenguaje simple, cercano, breve y sin juicio.",
    "Usa solo el contexto financiero resumido que recibes. No inventes cifras, datos ni proyecciones.",
    "Los calculos financieros principales ya vienen del motor interno de la app. Tu trabajo es explicarlos, resumirlos y convertirlos en microacciones educativas.",
    "No recomiendes productos financieros especificos, bancos, fondos, acciones, CDT, criptomonedas ni inversiones concretas.",
    "No prometas resultados y no digas que una simulacion garantiza rendimientos futuros.",
    "No indiques al usuario que compre, venda, transfiera, invierta o contrate un producto.",
    "No modifiques datos del usuario ni digas que los modificaste.",
    "Si falta informacion, dilo claramente y sugiere completar o revisar datos dentro de la app.",
    "Cuando sugieras una accion, que sea una microaccion realista y educativa, explicando brevemente por que ayuda.",
    "Evita tecnicismos. Si necesitas usar uno, explicalo en una frase.",
    "No uses Markdown decorativo. Evita ###, **, tablas y separadores. Si necesitas listar pasos, usa frases cortas en lineas separadas."
  ].join("\n");
}

function buildUserInput({
  conversation,
  financialContext,
  userMessage
}: {
  conversation: AssistantChatMessage[];
  financialContext: unknown;
  userMessage: string;
}) {
  return [
    "Contexto financiero resumido calculado por la app:",
    serializeFinancialContext(financialContext),
    "",
    "Ultimos mensajes de la conversacion:",
    JSON.stringify(conversation, null, 2),
    "",
    "Pregunta actual del usuario:",
    userMessage
  ].join("\n");
}

function extractOutputText(openAIResponse: Record<string, unknown>) {
  if (typeof openAIResponse.output_text === "string") {
    return openAIResponse.output_text.trim();
  }

  if (!Array.isArray(openAIResponse.output)) {
    return "";
  }

  const parts: string[] = [];

  for (const outputItem of openAIResponse.output) {
    const content = outputItem?.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new HttpError("Debes iniciar sesion para usar el asistente.", 401);
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: getSupabaseAnonKey()
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.id) {
    throw new HttpError("Tu sesion no esta activa. Vuelve a iniciar sesion.", 401);
  }

  return payload.id as string;
}

async function getAssistantUsageStatus({
  dailyLimit,
  timeZone,
  usageDate,
  userId
}: {
  dailyLimit: number;
  timeZone: string;
  usageDate: string;
  userId: string;
}): Promise<AssistantUsage> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/assistant_daily_usage?select=question_count&user_id=eq.${encodeURIComponent(
      userId
    )}&usage_date=eq.${encodeURIComponent(usageDate)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey
      }
    }
  );
  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    throw new HttpError("No pudimos consultar el limite diario del asistente.");
  }

  const questionCount = Number(payload?.[0]?.question_count ?? 0);

  return {
    dailyLimit,
    questionCount,
    remainingQuestions: Math.max(dailyLimit - questionCount, 0),
    timeZone,
    usageDate
  };
}

async function consumeAssistantDailyQuestion({
  dailyLimit,
  timeZone,
  usageDate,
  userId
}: {
  dailyLimit: number;
  timeZone: string;
  usageDate: string;
  userId: string;
}): Promise<UsageReservation> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/consume_assistant_daily_question`, {
    body: JSON.stringify({
      p_daily_limit: dailyLimit,
      p_usage_date: usageDate,
      p_user_id: userId
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      apikey: serviceRoleKey
    },
    method: "POST"
  });
  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    throw new HttpError("No pudimos validar el limite diario del asistente.");
  }

  const row = Array.isArray(payload) ? payload[0] : payload;
  const questionCount = Number(row?.question_count ?? dailyLimit);
  const resolvedDailyLimit = Number(row?.daily_limit ?? dailyLimit);

  return {
    allowed: Boolean(row?.allowed),
    dailyLimit: resolvedDailyLimit,
    questionCount,
    remainingQuestions: Math.max(Number(row?.remaining_questions ?? 0), 0),
    timeZone,
    usageDate
  };
}

async function generateAssistantResponse(
  userMessage: string,
  financialContext: unknown,
  conversation: AssistantChatMessage[]
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no esta configurada en la Edge Function.");
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL;
  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: buildUserInput({ conversation, financialContext, userMessage }),
      instructions: buildSystemInstructions(),
      max_output_tokens: 600,
      model
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const payload = await openAIResponse.json().catch(() => ({}));

  if (!openAIResponse.ok) {
    const message =
      payload?.error?.message ??
      "OpenAI no pudo generar una respuesta en este momento.";
    throw new Error(message);
  }

  const answer = extractOutputText(payload);

  if (!answer) {
    throw new Error("OpenAI no devolvio texto para mostrar.");
  }

  return {
    answer,
    model
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  try {
    const body = (await request.json()) as AssistantRequest;
    const configuredAccessPin = Deno.env.get("ASSISTANT_ACCESS_PIN");
    const accessPin = cleanText(body.accessPin, 20);
    const action = cleanText(body.action, 20) || "message";

    if (!configuredAccessPin) {
      return jsonResponse({ error: "ASSISTANT_ACCESS_PIN no esta configurado." }, 500);
    }

    if (accessPin !== configuredAccessPin) {
      return jsonResponse({ error: "PIN de asistente invalido." }, 401);
    }

    const userId = await getAuthenticatedUserId(request);
    const dailyLimit = getDailyLimit();
    const timeZone = getUsageTimeZone();
    const usageDate = getUsageDate(timeZone);

    if (action === "status") {
      const usage = await getAssistantUsageStatus({
        dailyLimit,
        timeZone,
        usageDate,
        userId
      });

      return jsonResponse({ usage });
    }

    if (action !== "message") {
      return jsonResponse({ error: "Accion de asistente no valida." }, 400);
    }

    const userMessage = cleanText(body.userMessage);

    if (!userMessage) {
      return jsonResponse({ error: "El mensaje del usuario es obligatorio." }, 400);
    }

    const usage = await consumeAssistantDailyQuestion({
      dailyLimit,
      timeZone,
      usageDate,
      userId
    });

    if (!usage.allowed) {
      return jsonResponse(
        {
          error: `Llegaste al limite diario de ${usage.dailyLimit} preguntas del asistente.`,
          usage
        },
        429
      );
    }

    const conversation = cleanConversation(body.conversation);

    try {
      const result = await generateAssistantResponse(
        userMessage,
        body.financialContext ?? {},
        conversation
      );

      return jsonResponse({
        ...result,
        usage
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos generar una respuesta del asistente.";

      throw new HttpError(message, 500, usage);
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos generar una respuesta del asistente.";
    const usage = error instanceof HttpError ? error.usage : undefined;

    return jsonResponse(
      {
        error: message,
        ...(usage ? { usage } : {})
      },
      status
    );
  }
});
