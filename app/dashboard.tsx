import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowDownCircle,
  BarChart3,
  Bot,
  CalendarCheck,
  ChartColumnIncreasing,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  Flag,
  Home,
  LineChart,
  PencilLine,
  PieChart,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { formatCOP } from "../utils/financialRanges";
import {
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  goalNeedsAmount,
  hasLowEmergencyCoverage,
  type MonthlyAction
} from "../utils/monthlyPlan";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Tone = "primary" | "support" | "warning" | "purple" | "neutral" | "danger";

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getDefinedLabel(value: string | null | undefined, fallback = "No definido") {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value;
}

function getAmountLabel(value: number | null) {
  return value !== null ? `${formatCOP(value)} aprox.` : "No disponible";
}

function getMarginLabel(value: number | null) {
  if (value === null) {
    return "No disponible";
  }

  if (value <= 0) {
    return "Margen ajustado";
  }

  return `${formatCOP(value)} aprox.`;
}

function getExpensePercentageLabel(value: number | null) {
  return value !== null ? `${value}% aprox.` : "No disponible";
}

function getEmergencyStatus(emergencyCoverage: string | null): {
  state: string;
  text: string;
  tone: Tone;
} {
  if (emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes") {
    return {
      state: "Prioridad alta",
      text: "Construir una base para imprevistos puede darte más tranquilidad.",
      tone: "warning"
    };
  }

  if (emergencyCoverage === "1 – 3 meses") {
    return {
      state: "Base inicial",
      text: "Ya tienes una base, pero podrías fortalecerla.",
      tone: "support"
    };
  }

  if (emergencyCoverage === "3 – 6 meses" || emergencyCoverage === "Más de 6 meses") {
    return {
      state: "Cobertura saludable",
      text: "Tienes una protección más sólida frente a imprevistos.",
      tone: "support"
    };
  }

  return {
    state: "Por calcular",
    text: "Puedes empezar calculando tus gastos esenciales.",
    tone: "neutral"
  };
}

function getGoalStatus({
  financialGoal,
  goalHorizon,
  goalAmountRange,
  emergencyCoverage
}: {
  financialGoal: string | null;
  goalHorizon: string | null;
  goalAmountRange: string | null;
  emergencyCoverage: string | null;
}) {
  if (financialGoal === "Empezar a invertir" && hasLowEmergencyCoverage(emergencyCoverage)) {
    return "Primero fortalece tu base financiera";
  }

  if (goalNeedsAmount(goalAmountRange)) {
    return "Falta concretar una cifra";
  }

  if (financialGoal && goalHorizon && goalAmountRange) {
    return "Lista para revisar escenarios";
  }

  return "En definición";
}

function getActionTone(action: MonthlyAction): Tone {
  if (action.category === "Ahorro") {
    return "support";
  }

  if (action.category === "Gastos hormiga" || action.category === "Meta") {
    return "purple";
  }

  if (action.category === "Gastos" || action.category === "Deudas") {
    return "warning";
  }

  return "primary";
}

function getToneColors(tone: Tone) {
  if (tone === "support") {
    return {
      background: colors.supportSoft,
      border: "#B9E9CD",
      text: colors.support
    };
  }

  if (tone === "warning") {
    return {
      background: colors.warningSoft,
      border: "#FED7AA",
      text: "#B45309"
    };
  }

  if (tone === "purple") {
    return {
      background: "#F1E8FF",
      border: "#D8C7FF",
      text: "#6D28D9"
    };
  }

  if (tone === "danger") {
    return {
      background: "#FFF0F1",
      border: "#F7D0D4",
      text: "#C2410C"
    };
  }

  if (tone === "neutral") {
    return {
      background: "#EEF2F7",
      border: colors.border,
      text: colors.textSubtle
    };
  }

  return {
    background: colors.primarySoft,
    border: "#CFE0FF",
    text: colors.primary
  };
}

function Chip({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <Text style={[styles.chipText, { color: toneColors.text }]}>{label}</Text>
    </View>
  );
}

function IconBubble({
  icon,
  tone = "primary",
  size = "medium"
}: {
  icon: ReactNode;
  tone?: Tone;
  size?: "small" | "medium" | "large";
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.iconBubble,
        size === "small" && styles.iconBubbleSmall,
        size === "large" && styles.iconBubbleLarge,
        { backgroundColor: toneColors.background }
      ]}
    >
      {icon}
    </View>
  );
}

function CircleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Abrir configuración"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
    >
      <UserRound color={colors.primary} size={27} strokeWidth={2.4} />
    </Pressable>
  );
}

function HeroFocusCard({
  title,
  text,
  completedCount,
  progressPercentage,
  completed,
  onPress
}: {
  title: string;
  text: string;
  completedCount: number;
  progressPercentage: number;
  completed: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <IconBubble
        icon={<Target color={colors.primary} size={56} strokeWidth={2.5} />}
        size="large"
      />
      <View style={styles.heroBody}>
        <Text style={styles.kickerPrimary}>Enfoque del mes</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{text}</Text>
        <Text style={styles.heroProgressText}>
          {completed ? "Buen trabajo. Completaste tu primer plan mensual." : `${completedCount} de 3 acciones completadas`}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              completed && styles.progressFillComplete,
              { width: toPercentWidth(progressPercentage) }
            ]}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.heroLink, pressed && styles.pressed]}
      >
        <Text style={styles.heroLinkText}>Ver</Text>
        <ChevronRight color={colors.primary} size={22} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function NextActionCard({
  action,
  onComplete,
  onOpenPlan
}: {
  action: MonthlyAction | undefined;
  onComplete: () => void;
  onOpenPlan: () => void;
}) {
  return (
    <View style={styles.nextActionCard}>
      <IconBubble
        icon={<CalendarCheck color="#D97706" size={48} strokeWidth={2.4} />}
        size="large"
        tone="warning"
      />
      {action ? (
        <View style={styles.nextActionBody}>
          <Text style={styles.kickerWarning}>Próxima acción</Text>
          <Text style={styles.nextActionTitle}>{action.title}</Text>
          <Text style={styles.text}>{action.description}</Text>
          <View style={styles.chipRow}>
            <Chip label={action.category} tone={getActionTone(action)} />
            <Chip label={`Dificultad: ${action.difficulty}`} tone={action.difficulty === "Baja" ? "support" : "warning"} />
          </View>
          <View style={styles.impactInline}>
            <Text style={styles.impactInlineLabel}>Impacto estimado</Text>
            <Text style={styles.impactInlineText}>{action.estimatedImpact}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.nextActionBody}>
          <Text style={styles.kickerPrimary}>Plan completado</Text>
          <Text style={styles.nextActionTitle}>Tus 3 acciones están listas</Text>
          <Text style={styles.text}>
            Completaste tus acciones de este mes. Puedes revisar tu plan o ajustar tus respuestas.
          </Text>
        </View>
      )}
      <View style={styles.nextActionControls}>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={onComplete}
            style={({ pressed }) => [styles.primaryPillButton, pressed && styles.pressed]}
          >
            <CheckCircle2 color={colors.surface} size={20} strokeWidth={2.4} />
            <Text style={styles.primaryPillButtonText}>Marcar como hecha</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onOpenPlan}
          style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]}
        >
          <Text style={styles.inlineLinkText}>Ver plan mensual</Text>
          <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

function PanelCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.panelCard}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "primary"
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const toneColors = getToneColors(tone);

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border
        }
      ]}
    >
      <IconBubble icon={icon} size="small" tone={tone} />
      <View style={styles.metricTextGroup}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: toneColors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function FutureCard({
  title,
  message,
  icon
}: {
  title: string;
  message: string;
  icon: ReactNode;
}) {
  return (
    <View style={styles.futureCard}>
      <View style={styles.futureHeader}>
        <IconBubble icon={icon} size="small" />
        <Chip label="En desarrollo" tone="neutral" />
      </View>
      <Text style={styles.futureTitle}>{title}</Text>
      <Text style={styles.futureValue}>Próximamente</Text>
      <Text style={styles.futureText}>{message}</Text>
    </View>
  );
}

function RowCard({
  icon,
  title,
  value,
  text,
  tone = "primary",
  actionLabel,
  onPress,
  children
}: {
  icon: ReactNode;
  title: string;
  value: string;
  text: string;
  tone?: Tone;
  actionLabel?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.rowCard}>
      <IconBubble icon={icon} size="medium" tone={tone} />
      <View style={styles.rowCardBody}>
        <Text style={styles.rowCardTitle}>{title}</Text>
        <View style={styles.rowCardValueLine}>
          <Text style={[styles.rowCardValue, { color: getToneColors(tone).text }]}>{value}</Text>
          {children}
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
      {actionLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.rowCardAction, pressed && styles.pressed]}
        >
          <Text style={styles.rowCardActionText}>{actionLabel}</Text>
          <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
        </Pressable>
      ) : (
        <ChevronRight color={colors.textSubtle} size={24} strokeWidth={2.2} />
      )}
    </View>
  );
}

function QuickAccessCard({
  title,
  route,
  icon,
  tone,
  onNavigate
}: {
  title: string;
  route: Route;
  icon: ReactNode;
  tone: Tone;
  onNavigate: (route: Route) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onNavigate(route)}
      style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
    >
      <IconBubble icon={icon} size="large" tone={tone} />
      <Text style={styles.quickTitle}>{title}</Text>
    </Pressable>
  );
}

function BottomNavItem({
  title,
  route,
  icon: Icon,
  active,
  onNavigate
}: {
  title: string;
  route: Route;
  icon: ComponentType<IconProps>;
  active?: boolean;
  onNavigate: (route: Route) => void;
}) {
  const color = active ? colors.primary : colors.textSubtle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onNavigate(route)}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
    >
      {active ? <View style={styles.navActiveLine} /> : null}
      <Icon color={color} size={23} strokeWidth={2.4} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{title}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const { completedActions, toggleActionCompleted } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data), [data]);
  const focus = useMemo(() => getMonthlyFocus(data, metrics), [data, metrics]);
  const actions = useMemo(() => getMonthlyActions(data, metrics), [data, metrics]);
  const completedCount = actions.filter((action) => completedActions[action.id]).length;
  const progressPercentage = Math.round((completedCount / actions.length) * 100);
  const nextAction = actions.find((action) => !completedActions[action.id]);
  const emergencyStatus = getEmergencyStatus(data.emergencyCoverage);
  const goalStatus = getGoalStatus({
    financialGoal: data.financialGoal,
    goalHorizon: data.goalHorizon,
    goalAmountRange: data.goalAmountRange,
    emergencyCoverage: data.emergencyCoverage
  });
  const expenseBarWidth =
    metrics.expensePercentage !== null ? Math.min(metrics.expensePercentage, 100) : 0;
  const expensesMayExceedIncome =
    metrics.expensePercentage !== null && metrics.expensePercentage > 100;
  const categoryLabels = data.smallExpenseCategories.slice(0, 4);
  const navigate = (route: Route) => router.push(route);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Inicio</Text>
              <Text style={styles.subtitle}>
                Hola, este es tu panorama financiero de este mes.
              </Text>
            </View>
            <CircleButton onPress={() => router.push("/settings")} />
          </View>

          <HeroFocusCard
            completed={completedCount === 3}
            completedCount={completedCount}
            onPress={() => router.push("/action-plan")}
            progressPercentage={progressPercentage}
            text={focus.text}
            title={focus.title}
          />

          <NextActionCard
            action={nextAction}
            onComplete={() => {
              if (nextAction) {
                toggleActionCompleted(nextAction.id);
              }
            }}
            onOpenPlan={() => router.push("/action-plan")}
          />

          <View style={styles.twoColumnGrid}>
            <PanelCard
              subtitle="Basado en los rangos que seleccionaste."
              title="Resumen financiero estimado"
            >
              <View style={styles.metricsGrid}>
                <MetricCard
                  icon={<PiggyBank color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Ingreso estimado"
                  tone="support"
                  value={getAmountLabel(metrics.incomeMidpoint)}
                />
                <MetricCard
                  icon={<ArrowDownCircle color="#C2410C" size={23} strokeWidth={2.4} />}
                  label="Gasto estimado"
                  tone="danger"
                  value={getAmountLabel(metrics.expenseMidpoint)}
                />
                <MetricCard
                  icon={<TrendingUp color={colors.support} size={23} strokeWidth={2.4} />}
                  label="Margen mensual"
                  tone={metrics.estimatedMargin !== null && metrics.estimatedMargin > 0 ? "support" : "warning"}
                  value={getMarginLabel(metrics.estimatedMargin)}
                />
                <MetricCard
                  icon={<PieChart color={colors.primary} size={23} strokeWidth={2.4} />}
                  label="Gastos / ingresos"
                  tone={metrics.expensePercentage !== null && metrics.expensePercentage >= 85 ? "warning" : "primary"}
                  value={getExpensePercentageLabel(metrics.expensePercentage)}
                />
              </View>

              <View style={styles.comparisonBox}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonTitle}>Comparación gastos vs ingresos</Text>
                  <Text style={styles.comparisonValue}>
                    {getExpensePercentageLabel(metrics.expensePercentage)}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.expenseFill,
                      expensesMayExceedIncome && styles.expenseFillWarning,
                      { width: toPercentWidth(expenseBarWidth) }
                    ]}
                  />
                </View>
                <Text style={styles.helperText}>
                  {expensesMayExceedIncome
                    ? "Tus gastos podrían superar tus ingresos estimados."
                    : "Tus gastos representan aproximadamente esta parte de tus ingresos."}
                </Text>
              </View>
            </PanelCard>

            <PanelCard
              subtitle="Estas métricas estarán disponibles cuando puedas ingresar valores exactos o actualizar tu información con más detalle."
              title="Cifras exactas"
            >
              <View style={styles.futureGrid}>
                <FutureCard
                  icon={<PiggyBank color={colors.primary} size={22} strokeWidth={2.4} />}
                  message="Podrás registrar una cifra exacta de ahorro."
                  title="Ahorro actual exacto"
                />
                <FutureCard
                  icon={<Target color={colors.primary} size={22} strokeWidth={2.4} />}
                  message="Podrás definir un monto objetivo más preciso."
                  title="Meta financiera exacta"
                />
                <FutureCard
                  icon={<LineChart color={colors.primary} size={22} strokeWidth={2.4} />}
                  message="Mostraremos tu avance cuando exista una cifra objetivo."
                  title="Progreso hacia la meta"
                />
                <FutureCard
                  icon={<Wallet color={colors.primary} size={22} strokeWidth={2.4} />}
                  message="Podrás comparar ahorros, deudas e inversiones."
                  title="Patrimonio neto estimado"
                />
              </View>
            </PanelCard>
          </View>

          <RowCard
            icon={<ShieldCheck color={colors.support} size={36} strokeWidth={2.4} />}
            text={emergencyStatus.text}
            title="Fondo de emergencia"
            tone={emergencyStatus.tone}
            value={getDefinedLabel(data.emergencyCoverage)}
          >
            <Chip label={emergencyStatus.state} tone={emergencyStatus.tone} />
          </RowCard>

          <RowCard
            actionLabel="Revisar gastos"
            icon={<Coffee color="#B45309" size={36} strokeWidth={2.4} />}
            onPress={() => router.push("/small-expenses")}
            text="No significa que debas eliminarlos. La idea es decidir cuáles mantener, limitar o redirigir."
            title="Gastos pequeños"
            tone="warning"
            value={`Rango: ${getDefinedLabel(data.smallExpensesRange)}`}
          >
            <View style={styles.categoryChipLine}>
              <Text style={styles.rowInlineText}>
                Intención: {getDefinedLabel(data.smallExpensesIntention, "No definida")}
              </Text>
              {categoryLabels.map((category) => (
                <Chip key={category} label={category} tone="warning" />
              ))}
            </View>
          </RowCard>

          <RowCard
            actionLabel="Ver simulación"
            icon={<Flag color={colors.primary} size={36} strokeWidth={2.4} />}
            onPress={() => router.push("/simulation")}
            text={`Horizonte: ${getDefinedLabel(data.goalHorizon)}. Cifra aproximada: ${getDefinedLabel(data.goalAmountRange, "No definida")}.`}
            title="Meta principal"
            tone="primary"
            value={`Meta: ${getDefinedLabel(data.financialGoal, "No definida")}`}
          >
            <Chip
              label={goalStatus}
              tone={goalStatus === "Lista para revisar escenarios" ? "support" : "warning"}
            />
          </RowCard>

          <View style={styles.quickSection}>
            <Text style={styles.sectionTitleStandalone}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              <QuickAccessCard
                icon={<ClipboardCheck color={colors.primary} size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/diagnosis"
                title="Diagnóstico"
                tone="primary"
              />
              <QuickAccessCard
                icon={<ChartColumnIncreasing color={colors.support} size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/simulation"
                title="Simulación"
                tone="support"
              />
              <QuickAccessCard
                icon={<CalendarCheck color="#7C3AED" size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/action-plan"
                title="Plan mensual"
                tone="purple"
              />
              <QuickAccessCard
                icon={<PencilLine color="#B45309" size={31} strokeWidth={2.4} />}
                onNavigate={navigate}
                route="/summary"
                title="Editar respuestas"
                tone="warning"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <BottomNavItem active icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
        <BottomNavItem icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
        <BottomNavItem icon={Flag} onNavigate={navigate} route="/goals-overview" title="Metas" />
        <BottomNavItem icon={LineChart} onNavigate={navigate} route="/simulation" title="Simulación" />
        <BottomNavItem icon={Bot} onNavigate={navigate} route="/assistant" title="Asistente" />
      </View>
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
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingBottom: spacing.xs
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.display
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
  },
  profileButton: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  heroCard: {
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
  heroBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  kickerPrimary: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  kickerWarning: {
    color: "#B45309",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  heroText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  heroProgressText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs
  },
  heroLink: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm
  },
  heroLinkText: {
    color: colors.primary,
    fontSize: typography.button,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.button
  },
  nextActionCard: {
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
  nextActionBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  nextActionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  nextActionControls: {
    alignItems: "flex-end",
    flexBasis: 170,
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 170
  },
  primaryPillButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  primaryPillButtonText: {
    color: colors.surface,
    fontSize: typography.button,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.button
  },
  inlineLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  inlineLinkText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  impactInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  impactInlineLabel: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  impactInlineText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  panelCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 320,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  panelHeader: {
    gap: spacing.xs
  },
  panelTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  panelSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 140,
    padding: spacing.md
  },
  metricTextGroup: {
    gap: spacing.xs
  },
  metricLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  metricValue: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  comparisonBox: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  comparisonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  comparisonTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  comparisonValue: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  progressTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  progressFillComplete: {
    backgroundColor: colors.support
  },
  expenseFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  expenseFillWarning: {
    backgroundColor: "#F97316"
  },
  futureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  futureCard: {
    backgroundColor: "#FBFCFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 150,
    padding: spacing.md
  },
  futureHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  futureTitle: {
    color: colors.text,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  futureValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  futureText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  rowCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg
  },
  rowCardBody: {
    flexBasis: 240,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  rowCardTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  rowCardValueLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rowCardValue: {
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  rowCardAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44
  },
  rowCardActionText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  rowInlineText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  categoryChipLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  quickSection: {
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  sectionTitleStandalone: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  quickCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 116,
    minWidth: 130,
    padding: spacing.md
  },
  quickTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body,
    textAlign: "center"
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 66,
    justifyContent: "center",
    width: 66
  },
  iconBubbleSmall: {
    height: 42,
    width: 42
  },
  iconBubbleLarge: {
    height: 124,
    width: 124
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipText: {
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  bottomNav: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 760,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    width: "100%"
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minHeight: 68,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    position: "relative"
  },
  navActiveLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    position: "absolute",
    top: -spacing.xs,
    width: "100%"
  },
  navText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  navTextActive: {
    color: colors.primary
  }
});
