import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  CalendarCheck,
  ChartColumnIncreasing,
  Check,
  ClipboardCheck,
  HandCoins,
  LineChart,
  PenLine,
  PiggyBank,
  Search,
  ShieldCheck,
  Target,
  Wallet
} from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { formatCOP } from "../utils/financialRanges";
import {
  getMonthlyActions,
  getMonthlyFocus,
  getMonthlyPlanData,
  getMonthlyPlanMetrics,
  type MonthlyAction
} from "../utils/monthlyPlan";

const financialFoundationImage = require("../assets/illustrations/financial-foundation.png");

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type ChipTone = "primary" | "support" | "warning" | "purple" | "neutral";

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getActionVisual(actionId: string): {
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
} {
  if (actionId === "emergency") {
    return { icon: PiggyBank, color: colors.support, backgroundColor: colors.supportSoft };
  }

  if (actionId === "variable-expenses") {
    return { icon: Search, color: "#B77900", backgroundColor: colors.warningSoft };
  }

  if (actionId === "small-expenses") {
    return { icon: HandCoins, color: "#7C3AED", backgroundColor: "#F1E8FF" };
  }

  if (actionId === "debt") {
    return { icon: Wallet, color: "#F97316", backgroundColor: "#FFF1E7" };
  }

  if (actionId === "education") {
    return { icon: BookOpen, color: colors.primary, backgroundColor: colors.primarySoft };
  }

  if (actionId === "goal-amount") {
    return { icon: Target, color: "#7C3AED", backgroundColor: "#F1E8FF" };
  }

  return { icon: CalendarCheck, color: colors.support, backgroundColor: colors.supportSoft };
}

function getCategoryTone(category: string): ChipTone {
  if (category === "Ahorro") {
    return "support";
  }

  if (category === "Gastos" || category === "Deudas") {
    return "warning";
  }

  if (category === "Gastos hormiga" || category === "Meta") {
    return "purple";
  }

  return "primary";
}

function SectionCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Chip({ label, tone = "primary" }: { label: string; tone?: ChipTone }) {
  return (
    <View
      style={[
        styles.chip,
        tone === "support" && styles.chipSupport,
        tone === "warning" && styles.chipWarning,
        tone === "purple" && styles.chipPurple,
        tone === "neutral" && styles.chipNeutral
      ]}
    >
      <Text
        style={[
          styles.chipText,
          tone === "support" && styles.chipTextSupport,
          tone === "warning" && styles.chipTextWarning,
          tone === "purple" && styles.chipTextPurple,
          tone === "neutral" && styles.chipTextNeutral
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  tone = "primary"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: ChipTone;
}) {
  return (
    <View style={styles.summaryMetric}>
      <View
        style={[
          styles.summaryMetricIcon,
          tone === "support" && styles.summaryMetricIconSupport,
          tone === "warning" && styles.summaryMetricIconWarning,
          tone === "purple" && styles.summaryMetricIconPurple
        ]}
      >
        {icon}
      </View>
      <View style={styles.summaryMetricText}>
        <Text style={styles.summaryMetricLabel}>{label}</Text>
        <Text style={styles.summaryMetricValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionCard({
  action,
  actionNumber,
  completed,
  onToggle
}: {
  action: MonthlyAction;
  actionNumber: number;
  completed: boolean;
  onToggle: () => void;
}) {
  const visual = getActionVisual(action.id);
  const Icon = visual.icon;

  return (
    <View style={[styles.actionCard, completed && styles.actionCardCompleted]}>
      <View style={styles.actionTopRow}>
        <View style={styles.actionNumber}>
          <Text style={styles.actionNumberText}>{actionNumber}</Text>
        </View>
        <View style={[styles.actionIcon, { backgroundColor: visual.backgroundColor }]}>
          <Icon color={visual.color} size={25} strokeWidth={2.4} />
        </View>
        <View style={styles.actionMainText}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
        <Pressable
          accessibilityLabel={
            completed
              ? `Marcar ${action.title} como pendiente`
              : `Marcar ${action.title} como completada`
          }
          accessibilityRole="button"
          accessibilityState={{ checked: completed }}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.checkbox,
            completed && styles.checkboxCompleted,
            pressed && styles.checkboxPressed
          ]}
        >
          {completed ? <Check color={colors.surface} size={18} strokeWidth={3} /> : null}
        </Pressable>
      </View>

      <View style={styles.actionMetaRow}>
        <Chip label={action.category} tone={getCategoryTone(action.category)} />
        <Chip
          label={`Dificultad: ${action.difficulty}`}
          tone={action.difficulty === "Baja" ? "support" : "warning"}
        />
        {completed ? <Chip label="Completada" tone="support" /> : null}
      </View>

      <View style={styles.actionDetailsGrid}>
        <View style={styles.actionDetail}>
          <Text style={styles.actionDetailLabel}>Impacto estimado</Text>
          <Text style={styles.actionImpactText}>{action.estimatedImpact}</Text>
        </View>
        <View style={styles.actionDetail}>
          <Text style={styles.actionDetailLabel}>Por qué importa</Text>
          <Text style={styles.actionDetailText}>{action.why}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ActionPlanScreen() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const { completedActions, toggleActionCompleted } = usePlan();
  const data = useMemo(() => getMonthlyPlanData(onboarding), [onboarding]);
  const metrics = useMemo(() => getMonthlyPlanMetrics(data), [data]);
  const focus = useMemo(() => getMonthlyFocus(data, metrics), [data, metrics]);
  const actions = useMemo(() => getMonthlyActions(data, metrics), [data, metrics]);
  const completedCount = actions.filter((action) => completedActions[action.id]).length;
  const progressPercentage = Math.round((completedCount / actions.length) * 100);
  const contributionLabel =
    metrics.balancedScenarioAmount > 0
      ? `${formatCOP(metrics.balancedScenarioAmount)} aprox.`
      : "Por definir";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <ClipboardCheck color={colors.primary} size={30} strokeWidth={2.4} />
            </View>

            <View style={styles.heroTextGroup}>
              <Text style={styles.title}>Tu plan mensual</Text>
              <Text style={styles.subtitle}>
                Estas son acciones simples para avanzar este mes según tu diagnóstico y simulación.
              </Text>
            </View>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes ajustar este plan a tu realidad. La idea es avanzar con pasos pequeños y
                sostenibles.
              </Text>
            </View>
          </View>

          <View style={styles.topCards}>
            <View style={styles.topCardColumn}>
              <SectionCard
                icon={<Target color={colors.primary} size={18} strokeWidth={2.4} />}
                title="Enfoque del mes"
              >
                <View style={styles.focusContent}>
                  <Text style={styles.focusTitle}>{focus.title}</Text>
                  <Text style={styles.text}>{focus.text}</Text>
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="contain"
                    source={financialFoundationImage}
                    style={styles.focusImage}
                  />
                </View>
              </SectionCard>
            </View>

            <View style={styles.topCardColumn}>
              <SectionCard
                icon={<ChartColumnIncreasing color={colors.primary} size={18} strokeWidth={2.4} />}
                title="Resumen de este mes"
              >
                <View style={styles.summaryBox}>
                  <SummaryMetric
                    icon={<ClipboardCheck color={colors.support} size={20} strokeWidth={2.4} />}
                    label="Acciones recomendadas"
                    tone="support"
                    value="3"
                  />
                  <SummaryMetric
                    icon={<Wallet color={colors.primary} size={20} strokeWidth={2.4} />}
                    label="Posible aporte mensual"
                    value={contributionLabel}
                  />
                  <SummaryMetric
                    icon={<Target color="#7C3AED" size={20} strokeWidth={2.4} />}
                    label="Enfoque"
                    tone="purple"
                    value={focus.title}
                  />
                </View>
                <Text style={styles.helperText}>
                  Los valores son aproximados y se basan en los rangos que seleccionaste.
                </Text>
              </SectionCard>
            </View>
          </View>

          <SectionCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Tus 3 acciones para este mes"
          >
            <View style={styles.actionsList}>
              {actions.map((action, index) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  actionNumber={index + 1}
                  completed={Boolean(completedActions[action.id])}
                  onToggle={() => toggleActionCompleted(action.id)}
                />
              ))}
            </View>
          </SectionCard>

          <SectionCard
            icon={<LineChart color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Progreso del mes"
          >
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {completedCount} de 3 acciones completadas
                </Text>
                <Text style={styles.progressPercent}>{progressPercentage}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: toPercentWidth(progressPercentage) }
                  ]}
                />
              </View>
              {completedCount === 3 ? (
                <Text style={styles.completedMessage}>
                  Buen trabajo. Completaste tu primer plan mensual.
                </Text>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard
            icon={<BookOpen color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Cómo usar este plan"
          >
            <View style={styles.educationRow}>
              <Text style={[styles.text, styles.educationText]}>
                No tienes que hacerlo perfecto. El objetivo es probar acciones pequeñas, revisar qué
                funcionó y ajustar el próximo mes.
              </Text>
              <View style={styles.educationIcon}>
                <PenLine color="#F59E0B" size={30} strokeWidth={2.4} />
              </View>
            </View>
          </SectionCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Ir a mi inicio"
              iconPosition="right"
              onPress={() => router.push("/dashboard")}
              title="Ir a mi inicio"
            />
            <PrimaryButton
              accessibilityLabel="Volver a simulación"
              icon={null}
              onPress={() => router.push("/simulation")}
              title="Volver a simulación"
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 620,
    width: "100%"
  },
  heroCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  heroIconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  heroTextGroup: {
    gap: spacing.xs
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
  trustMessage: {
    alignItems: "flex-start",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  supportText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  topCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  topCardColumn: {
    flexBasis: 260,
    flexGrow: 1
  },
  sectionCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  sectionTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  sectionContent: {
    gap: spacing.md
  },
  focusContent: {
    alignItems: "center",
    gap: spacing.md
  },
  focusTitle: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle,
    textAlign: "center"
  },
  focusImage: {
    height: 148,
    width: "100%"
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
  summaryBox: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  summaryMetric: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  summaryMetricIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  summaryMetricIconSupport: {
    backgroundColor: colors.supportSoft
  },
  summaryMetricIconWarning: {
    backgroundColor: colors.warningSoft
  },
  summaryMetricIconPurple: {
    backgroundColor: "#F1E8FF"
  },
  summaryMetricText: {
    flex: 1,
    gap: spacing.xs
  },
  summaryMetricLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  summaryMetricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  actionsList: {
    gap: spacing.md
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  actionCardCompleted: {
    backgroundColor: "#FBFFFC",
    borderColor: "#B9E9CD"
  },
  actionTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  actionNumber: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  actionNumberText: {
    color: colors.primary,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  actionMainText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  actionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  actionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.textSubtle,
    borderRadius: radius.sm,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  checkboxCompleted: {
    backgroundColor: colors.support,
    borderColor: colors.support
  },
  checkboxPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  actionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipSupport: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD"
  },
  chipWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  chipPurple: {
    backgroundColor: "#F1E8FF",
    borderColor: "#D8C7FF"
  },
  chipNeutral: {
    backgroundColor: "#EEF2F7",
    borderColor: colors.border
  },
  chipText: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  chipTextSupport: {
    color: colors.support
  },
  chipTextWarning: {
    color: "#9A5B20"
  },
  chipTextPurple: {
    color: "#6D28D9"
  },
  chipTextNeutral: {
    color: colors.textSubtle
  },
  actionDetailsGrid: {
    gap: spacing.sm
  },
  actionDetail: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  actionDetailLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionImpactText: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionDetailText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  progressCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  progressText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  progressPercent: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  progressTrack: {
    backgroundColor: "#DDEAF8",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  completedMessage: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  educationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  educationText: {
    flex: 1
  },
  educationIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
