import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Bot,
  CalendarCheck,
  ClipboardCheck,
  Lightbulb,
  PiggyBank,
  Send,
  ShieldCheck,
  Target,
  WalletCards
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import {
  AssistantApiError,
  generateAssistantResponse,
  getAssistantUsageStatus,
  type AssistantChatMessage,
  type AssistantFinancialContext
} from "../lib/assistantApi";
import { type FinancialSnapshot } from "../utils/financialCalculations";
import {
  getActiveMonthlyPlanProgressKey,
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  getMonthlyPlanProgressKey,
  isMonthlyActionCompleted,
  type MonthlyAction
} from "../utils/monthlyPlan";

type AssistantMessage = AssistantChatMessage & {
  id: string;
  status?: "error" | "loading";
};

type SuggestedQuestion = {
  icon: ReactNode;
  label: string;
  text: string;
};

type AssistantRuntimeContext = {
  actions: MonthlyAction[];
  completedCount: number;
  financialContext: AssistantFinancialContext;
  progressPercentage: number;
  snapshot: FinancialSnapshot;
};

type AssistantTextSegment = {
  bold: boolean;
  text: string;
};

type AssistantTextBlock = {
  segments: AssistantTextSegment[];
  type: "bullet" | "heading" | "paragraph";
};

const defaultDailyQuestionLimit = 5;
const defaultUsageTimeZone = "America/Bogota";

const suggestedQuestions: SuggestedQuestion[] = [
  {
    icon: <Target color="#7C3AED" size={22} strokeWidth={2.4} />,
    label: "Meta",
    text: "¿Por qué mi meta requiere ajuste?"
  },
  {
    icon: <PiggyBank color="#B45309" size={22} strokeWidth={2.4} />,
    label: "Gastos",
    text: "¿Qué gasto debería revisar primero?"
  },
  {
    icon: <WalletCards color={colors.primary} size={22} strokeWidth={2.4} />,
    label: "Ahorro",
    text: "¿Qué pasa si ahorro un poco más?"
  },
  {
    icon: <ClipboardCheck color={colors.primary} size={22} strokeWidth={2.4} />,
    label: "Diagnóstico",
    text: "Explícame mi diagnóstico"
  },
  {
    icon: <ShieldCheck color={colors.support} size={22} strokeWidth={2.4} />,
    label: "Emergencia",
    text: "¿Cómo puedo empezar un fondo de emergencia?"
  },
  {
    icon: <Lightbulb color={colors.primary} size={22} strokeWidth={2.4} />,
    label: "Concepto",
    text: "¿Qué significa inversión conservadora?"
  },
  {
    icon: <CalendarCheck color={colors.support} size={22} strokeWidth={2.4} />,
    label: "Mes",
    text: "Resume mi plan de este mes"
  }
];

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInitialAssistantMessage(
  hasCompletedOnboarding: boolean,
  snapshot: FinancialSnapshot
): AssistantMessage {
  return {
    id: "intro",
    role: "assistant",
    text: hasCompletedOnboarding
      ? `Hola. Puedo ayudarte a entender tu diagnóstico, tu meta, tus gastos y tu plan mensual. Por ahora, tu foco principal es: ${snapshot.priority.title.toLowerCase()}.`
      : "Hola. Cuando completes tu diagnóstico, podré explicarte resultados, metas, simulaciones y acciones mensuales usando el contexto de tu app."
  };
}

function getUsageTimeZoneLabel(timeZone: string) {
  if (timeZone === "America/Bogota") {
    return "hora Colombia";
  }

  return "zona horaria configurada";
}

function getDailyResetText(timeZone: string) {
  return `12:00 a. m. (${getUsageTimeZoneLabel(timeZone)})`;
}

function getHoursUntilDailyResetText(timeZone: string, now = new Date()) {
  if (timeZone !== "America/Bogota") {
    return `cuando se reinicie el conteo a las ${getDailyResetText(timeZone)}`;
  }

  const bogotaOffsetMs = 5 * 60 * 60 * 1000;
  const bogotaNow = new Date(now.getTime() - bogotaOffsetMs);
  const nextBogotaMidnightUtc = Date.UTC(
    bogotaNow.getUTCFullYear(),
    bogotaNow.getUTCMonth(),
    bogotaNow.getUTCDate() + 1,
    5,
    0,
    0,
    0
  );
  const remainingMs = Math.max(nextBogotaMidnightUtc - now.getTime(), 0);
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));

  return remainingHours === 1 ? "en 1 hora" : `en ${remainingHours} horas`;
}

function parseInlineText(text: string): AssistantTextSegment[] {
  const segments: AssistantTextSegment[] = [];
  const pattern = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        bold: false,
        text: text.slice(lastIndex, match.index)
      });
    }

    if (match[1]) {
      segments.push({
        bold: true,
        text: match[1]
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      bold: false,
      text: text.slice(lastIndex)
    });
  }

  return segments.length > 0 ? segments : [{ bold: false, text }];
}

function parseAssistantText(text: string): AssistantTextBlock[] {
  const blocks: AssistantTextBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      segments: parseInlineText(paragraphLines.join(" ")),
      type: "paragraph"
    });
    paragraphLines = [];
  };

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      return;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        segments: parseInlineText(headingMatch[1]),
        type: "heading"
      });
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {
      flushParagraph();
      blocks.push({
        segments: parseInlineText(bulletMatch[1]),
        type: "bullet"
      });
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();

  return blocks;
}

function AssistantRichText({
  isError,
  isLoading,
  text
}: {
  isError: boolean;
  isLoading: boolean;
  text: string;
}) {
  const blocks = parseAssistantText(text);

  return (
    <View style={styles.richText}>
      {blocks.map((block, blockIndex) => {
        const content = (
          <Text
            style={[
              styles.richTextLine,
              block.type === "heading" && styles.richHeading,
              isLoading && styles.richTextLoading,
              isError && styles.messageTextError
            ]}
          >
            {block.segments.map((segment, segmentIndex) => (
              <Text
                key={`${blockIndex}-${segmentIndex}`}
                style={segment.bold && styles.richTextBold}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        );

        if (block.type === "bullet") {
          return (
            <View key={`${block.type}-${blockIndex}`} style={styles.richBulletRow}>
              <Text style={[styles.richBulletDot, isError && styles.messageTextError]}>•</Text>
              <View style={styles.richBulletContent}>{content}</View>
            </View>
          );
        }

        return (
          <View key={`${block.type}-${blockIndex}`} style={styles.richParagraph}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

function buildAssistantFinancialContext({
  actions,
  completedCount,
  focusText,
  focusTitle,
  onboarding,
  progressPercentage,
  snapshot
}: {
  actions: MonthlyAction[];
  completedCount: number;
  focusText: string;
  focusTitle: string;
  onboarding: ReturnType<typeof useOnboarding>["onboarding"];
  progressPercentage: number;
  snapshot: FinancialSnapshot;
}): AssistantFinancialContext {
  return {
    cashflow: {
      monthlyIncome: snapshot.cashflow.monthlyIncome,
      monthlyExpenses: snapshot.cashflow.monthlyExpenses,
      monthlyMargin: snapshot.cashflow.monthlyMargin,
      expensesToIncomeRatio: snapshot.cashflow.expensesToIncomeRatio,
      suggestedMonthlyContribution: snapshot.cashflow.suggestedMonthlyContribution
    },
    debt: {
      label: snapshot.debt.label,
      level: snapshot.debt.level,
      shouldPrioritizeDebt: snapshot.debt.shouldPrioritizeDebt
    },
    emergencyFund: {
      coverageMonths: snapshot.emergencyFund.coverageMonths,
      label: snapshot.emergencyFund.label,
      missingForThreeMonths: snapshot.emergencyFund.missingForThreeMonths,
      status: snapshot.emergencyFund.status
    },
    goal: {
      estimatedMonthsToGoal: snapshot.goal.estimatedMonthsToGoal,
      horizon: onboarding.goalHorizon,
      name: snapshot.goal.name,
      priority: onboarding.goalPriority,
      progressPercentage: snapshot.goal.progressPercentage,
      remainingAmount: snapshot.goal.remainingAmount,
      targetAmount: snapshot.goal.targetAmount
    },
    investment: {
      situation: onboarding.investmentSituation
    },
    monthlyPlan: {
      actions: actions.map((action) => ({
        category: action.category,
        description: action.description,
        difficulty: action.difficulty,
        estimatedImpact: action.estimatedImpact,
        title: action.title,
        why: action.why
      })),
      completedActions: completedCount,
      focusText,
      focusTitle,
      progressPercentage
    },
    precision: {
      label: snapshot.precision.label,
      message: snapshot.precision.message,
      status: snapshot.precision.status
    },
    smallExpenses: {
      amount: snapshot.smallExpenses.amount,
      categories: onboarding.smallExpenseCategories,
      intention: onboarding.smallExpensesIntention,
      label: snapshot.smallExpenses.label,
      opportunityAmount: snapshot.smallExpenses.opportunityAmount
    }
  };
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isLoading = message.status === "loading";

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser ? (
        <View style={[styles.messageAvatar, isError && styles.messageAvatarError]}>
          {isError ? (
            <AlertCircle color="#B42318" size={19} strokeWidth={2.5} />
          ) : (
            <Bot color={colors.primary} size={19} strokeWidth={2.5} />
          )}
        </View>
      ) : null}
      <View
        style={[
          styles.messageBubble,
          isUser && styles.messageBubbleUser,
          isError && styles.messageBubbleError,
          isLoading && styles.messageBubbleLoading
        ]}
      >
        {isUser ? (
          <Text style={[styles.messageText, styles.messageTextUser]}>{message.text}</Text>
        ) : (
          <AssistantRichText isError={isError} isLoading={isLoading} text={message.text} />
        )}
      </View>
    </View>
  );
}

export default function AssistantScreen() {
  const router = useRouter();
  const { completedActions } = usePlan();
  const { exactValues, hasCompletedOnboarding, onboarding } = useOnboarding();
  const [isChatNoteVisible, setIsChatNoteVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [dailyQuestionLimit, setDailyQuestionLimit] = useState(defaultDailyQuestionLimit);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [limitClockTick, setLimitClockTick] = useState(() => Date.now());
  const [questionCount, setQuestionCount] = useState(0);
  const [usageTimeZone, setUsageTimeZone] = useState(defaultUsageTimeZone);
  const [usageStatusError, setUsageStatusError] = useState<string | null>(null);

  const runtimeContext = useMemo<AssistantRuntimeContext>(() => {
    const data = getMonthlyPlanData(onboarding);
    const metrics = getMonthlyPlanMetrics(data, exactValues);
    const focus = getMonthlyFocus(data, metrics);
    const actions = getMonthlyActions(data, metrics);
    const suggestedProgressKey = getMonthlyPlanProgressKey(metrics, actions);
    const planProgressKey = getActiveMonthlyPlanProgressKey(
      completedActions,
      suggestedProgressKey
    );
    const completedCount = actions.filter((action) =>
      isMonthlyActionCompleted({
        actionId: action.id,
        completedActions,
        planProgressKey
      })
    ).length;
    const progressPercentage =
      actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;
    const financialContext = buildAssistantFinancialContext({
      actions,
      completedCount,
      focusText: focus.text,
      focusTitle: focus.title,
      onboarding,
      progressPercentage,
      snapshot: metrics.snapshot
    });

    return {
      actions,
      completedCount,
      financialContext,
      progressPercentage,
      snapshot: metrics.snapshot
    };
  }, [completedActions, exactValues, onboarding]);

  const initialMessage = useMemo(
    () => getInitialAssistantMessage(hasCompletedOnboarding, runtimeContext.snapshot),
    [hasCompletedOnboarding, runtimeContext.snapshot]
  );

  useEffect(() => {
    let isMounted = true;

    setIsUsageLoading(true);
    setUsageStatusError(null);

    getAssistantUsageStatus()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setDailyQuestionLimit(result.usage.dailyLimit);
        setQuestionCount(result.usage.questionCount);
        setUsageTimeZone(result.usage.timeZone ?? defaultUsageTimeZone);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof AssistantApiError && error.usage) {
          setDailyQuestionLimit(error.usage.dailyLimit);
          setQuestionCount(error.usage.questionCount);
          setUsageTimeZone(error.usage.timeZone ?? defaultUsageTimeZone);
        }

        setUsageStatusError(
          error instanceof Error
            ? error.message
            : "No pudimos consultar el limite diario del asistente."
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsUsageLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setLimitClockTick(Date.now()), 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const remainingQuestions = Math.max(dailyQuestionLimit - questionCount, 0);
  const hasReachedLimit = remainingQuestions === 0;
  const isAssistantDisabled = isResponding || hasReachedLimit || isUsageLoading;
  const dailyResetText = getDailyResetText(usageTimeZone);
  const hoursUntilDailyResetText = getHoursUntilDailyResetText(
    usageTimeZone,
    new Date(limitClockTick)
  );
  const visibleMessages = [initialMessage, ...messages];

  const askAssistant = async (question: string) => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || isAssistantDisabled) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: "user",
      text: cleanQuestion
    };
    const loadingMessage: AssistantMessage = {
      id: "loading",
      role: "assistant",
      status: "loading",
      text: "Estoy revisando tu contexto financiero..."
    };
    const conversationForApi: AssistantChatMessage[] = [...visibleMessages, userMessage].map(
      (message) => ({
        role: message.role,
        text: message.text
      })
    );

    setMessages((currentMessages) => [...currentMessages, userMessage, loadingMessage]);
    setInputValue("");
    setIsResponding(true);

    try {
      const result = await generateAssistantResponse({
        conversation: conversationForApi,
        financialContext: runtimeContext.financialContext,
        userMessage: cleanQuestion
      });

      if (result.usage) {
        setDailyQuestionLimit(result.usage.dailyLimit);
        setQuestionCount(result.usage.questionCount);
        setUsageTimeZone(result.usage.timeZone ?? defaultUsageTimeZone);
        setUsageStatusError(null);
      }

      setMessages((currentMessages) =>
        currentMessages
          .filter((message) => message.id !== "loading")
          .concat({
            id: createMessageId(),
            role: "assistant",
            text: result.answer
          })
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos contactar al asistente en este momento.";

      if (error instanceof AssistantApiError && error.usage) {
        setDailyQuestionLimit(error.usage.dailyLimit);
        setQuestionCount(error.usage.questionCount);
        setUsageTimeZone(error.usage.timeZone ?? defaultUsageTimeZone);
        setUsageStatusError(null);
      }

      setMessages((currentMessages) =>
        currentMessages
          .filter((currentMessage) => currentMessage.id !== "loading")
          .concat({
            id: createMessageId(),
            role: "assistant",
            status: "error",
            text: `${message} Puedes intentar de nuevo más tarde o revisar tu diagnóstico manualmente.`
          })
      );
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Bot color={colors.primary} size={32} strokeWidth={2.4} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Asistente AI</Text>
              <Text style={styles.subtitle}>
                Pregunta sobre tu diagnóstico, gastos, metas, simulación o plan mensual.
              </Text>
            </View>
          </View>

          {!hasCompletedOnboarding ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <ClipboardCheck color={colors.primary} size={38} strokeWidth={2.4} />
              </View>
              <View style={styles.emptyStateText}>
                <Text style={styles.emptyStateTitle}>Primero crea tu diagnóstico</Text>
                <Text style={styles.text}>
                  El asistente necesita tus rangos de ingresos, gastos, ahorros, deudas y meta
                  para responder con contexto.
                </Text>
              </View>
              <PrimaryButton
                accessibilityLabel="Crear diagnóstico"
                onPress={() => router.push("/privacy")}
                title="Crear diagnóstico"
              />
            </View>
          ) : null}

          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Preguntas sugeridas</Text>
            </View>
            <View style={styles.questionGrid}>
              {suggestedQuestions.map((question) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={isAssistantDisabled}
                  key={question.text}
                  onPress={() => askAssistant(question.text)}
                  style={({ pressed }) => [
                    styles.questionCard,
                    isAssistantDisabled && styles.questionCardDisabled,
                    pressed && styles.pressed
                  ]}
                >
                  <View style={styles.questionIcon}>{question.icon}</View>
                  <View style={styles.questionTextGroup}>
                    <Text style={styles.questionLabel}>{question.label}</Text>
                    <Text style={styles.questionText}>{question.text}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderText}>
                <Text style={styles.sectionTitle}>Chat</Text>
              </View>
              <View style={styles.chatHeaderActions}>
                <View style={styles.chatLimitBadge}>
                  <Text style={styles.chatLimitBadgeText}>
                    {isUsageLoading ? "Cargando" : `${remainingQuestions} restantes`}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Ver nota sobre el asistente"
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isChatNoteVisible }}
                  onPress={() => setIsChatNoteVisible((currentValue) => !currentValue)}
                  style={({ pressed }) => [styles.chatInfoButton, pressed && styles.pressed]}
                >
                  <AlertCircle color={colors.textSubtle} size={22} strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>

            {isChatNoteVisible ? (
              <View style={styles.chatInfoNote}>
                <Text style={styles.chatInfoNoteText}>
                  Tienes {dailyQuestionLimit} preguntas por día. El conteo se valida por usuario
                  en Supabase y se reinicia todos los días a las {dailyResetText}.
                </Text>
              </View>
            ) : null}

            {usageStatusError ? (
              <View style={styles.limitNotice}>
                <AlertCircle color="#B45309" size={20} strokeWidth={2.4} />
                <Text style={styles.limitNoticeText}>
                  No pudimos consultar el límite diario. El backend lo validará al enviar tu
                  pregunta.
                </Text>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.messagesContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.messagesScroll}
            >
              {visibleMessages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </ScrollView>

            {hasReachedLimit ? (
              <View style={styles.limitNotice}>
                <AlertCircle color="#B45309" size={20} strokeWidth={2.4} />
                <Text style={styles.limitNoticeText}>
                  Llegaste al límite diario de {dailyQuestionLimit} preguntas. Podrás volver a
                  preguntar {hoursUntilDailyResetText}.
                </Text>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="Pregunta para el asistente"
                editable={!isAssistantDisabled}
                onChangeText={setInputValue}
                onSubmitEditing={() => askAssistant(inputValue)}
                placeholder="Escribe una pregunta"
                placeholderTextColor={colors.textSubtle}
                returnKeyType="send"
                style={[
                  styles.input,
                  isAssistantDisabled && styles.inputDisabled
                ]}
                value={inputValue}
              />
              <Pressable
                accessibilityLabel="Enviar pregunta"
                accessibilityRole="button"
                disabled={inputValue.trim().length === 0 || isAssistantDisabled}
                onPress={() => askAssistant(inputValue)}
                style={({ pressed }) => [
                  styles.sendButton,
                  (inputValue.trim().length === 0 || isAssistantDisabled) &&
                    styles.sendButtonDisabled,
                  pressed && styles.pressed
                ]}
              >
                <Send color={colors.surface} size={20} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <View style={styles.boundaryCard}>
            <ShieldCheck color={colors.support} size={24} strokeWidth={2.4} />
            <Text style={styles.boundaryText}>
              Orientación educativa: no recomienda productos financieros específicos, no promete
              resultados y no reemplaza asesoría profesional.
            </Text>
          </View>

        </View>
      </ScrollView>

      <BottomNavigation activeRoute="/assistant" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 760,
    width: "100%"
  },
  header: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    padding: spacing.lg
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 82,
    justifyContent: "center",
    width: 82
  },
  headerText: {
    flexBasis: 260,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  emptyState: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  emptyStateIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 78,
    justifyContent: "center",
    width: 78
  },
  emptyStateText: {
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 520
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    textAlign: "center"
  },
  suggestionsSection: {
    gap: spacing.sm
  },
  sectionHeader: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  questionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  questionCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 168,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  questionCardDisabled: {
    opacity: 0.58
  },
  questionIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    marginTop: 2,
    width: 38
  },
  questionTextGroup: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  questionLabel: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  questionText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  chatCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  chatHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  chatHeaderText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  chatHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  chatLimitBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chatLimitBadgeText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  chatInfoButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  chatInfoNote: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  chatInfoNoteText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  messagesScroll: {
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    maxHeight: 560
  },
  messagesContent: {
    gap: spacing.sm,
    padding: spacing.md
  },
  messageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  messageRowUser: {
    justifyContent: "flex-end"
  },
  messageAvatar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  messageAvatarError: {
    backgroundColor: "#FFF0F1"
  },
  messageBubble: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: "88%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  messageBubbleError: {
    backgroundColor: "#FFF0F1",
    borderColor: "#F7D0D4"
  },
  messageBubbleLoading: {
    backgroundColor: "#F8FBFF"
  },
  messageText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  messageTextUser: {
    color: colors.surface,
    fontWeight: typography.weight.semibold
  },
  messageTextError: {
    color: "#B42318"
  },
  richText: {
    gap: spacing.xs
  },
  richParagraph: {
    marginBottom: spacing.xs
  },
  richTextLine: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  richTextLoading: {
    color: colors.textMuted,
    fontWeight: typography.weight.semibold
  },
  richHeading: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question,
    marginTop: spacing.xs
  },
  richTextBold: {
    fontWeight: typography.weight.black
  },
  richBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  richBulletDot: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    marginTop: 1
  },
  richBulletContent: {
    flex: 1,
    minWidth: 0
  },
  limitNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  limitNoticeText: {
    color: "#B45309",
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputDisabled: {
    backgroundColor: "#EEF2F7",
    color: colors.textSubtle
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSubtle
  },
  boundaryCard: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  boundaryText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
