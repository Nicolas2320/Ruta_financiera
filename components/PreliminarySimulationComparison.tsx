import { Check, Target, TrendingUp } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import type { SimulationPlanStrategy } from "../types/financial";
import type { ProjectionGoalInput } from "../utils/financialProjectionInput";
import { formatCOP, formatSignedCOP } from "../utils/financialRanges";
import { formatTargetMonth } from "../utils/monthYear";
import type {
  SimulationAmountRange,
  SimulationExperience
} from "../utils/simulationExperience";
import { PreliminaryGoalTimeline } from "./PreliminaryGoalTimeline";

function formatAmountRange(
  range: SimulationAmountRange,
  { signed = false }: { signed?: boolean } = {}
) {
  const formatValue = signed ? formatSignedCOP : formatCOP;

  if (range.minimum === null && range.maximum === null) {
    return "Por estimar";
  }

  if (range.minimum !== null && range.maximum === null) {
    return `Más de ${formatValue(range.minimum)}`;
  }

  if (range.minimum === null && range.maximum !== null) {
    return `Hasta ${formatValue(range.maximum)}`;
  }

  if (range.minimum === range.maximum) {
    return formatValue(range.minimum ?? 0);
  }

  return `${formatValue(range.minimum ?? 0)} – ${formatValue(range.maximum ?? 0)}`;
}

function addMonthsToProjection(asOfDate: string, months: number) {
  const date = new Date(`${asOfDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(date.getMonth() + Math.max(0, months));
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function getGoalProjection({
  asOfDate,
  goal,
  monthlyContribution
}: {
  asOfDate: string;
  goal: ProjectionGoalInput | null;
  monthlyContribution: number | null;
}) {
  if (
    !goal ||
    goal.targetAmount === null ||
    monthlyContribution === null ||
    monthlyContribution <= 0
  ) {
    return null;
  }

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const estimatedMonths = remainingAmount <= 0 ? 0 : Math.ceil(remainingAmount / monthlyContribution);

  if (estimatedMonths > 120) {
    return "Más de 10 años";
  }

  const completionMonth = addMonthsToProjection(asOfDate, estimatedMonths);
  return completionMonth ? formatTargetMonth(completionMonth) : null;
}

function getEstimateExplanation(experience: SimulationExperience) {
  if (experience.mode === "goal_only") {
    return "Como indicaste que no pagas deudas, esta vista se concentra en tu margen y tu meta.";
  }

  if (experience.debtDataSource === "category") {
    return "Usamos temporalmente el pago mensual que registraste dentro de tus gastos. No calculamos saldos, tasas ni fechas de terminación.";
  }

  if (experience.reportedRatioRange.kind === "minimum_only") {
    return "Tu respuesta no tiene un límite superior. Para no inventar una capacidad mensual, evitamos asignar dinero hasta tener una referencia un poco más precisa.";
  }

  if (experience.reportedRatioRange.kind === "unknown") {
    return "Sabemos que las deudas forman parte de tu situación, pero no inventamos una cuota ni un margen disponible.";
  }

  return `Tus pagos de deuda podrían estar entre ${formatAmountRange(
    experience.debtPaymentRange
  )}. Para esta exploración usamos el extremo prudente del rango.`;
}

export function PreliminarySimulationComparison({
  asOfDate,
  distributableAmount,
  experience,
  goal,
  onSelect,
  selectedStrategy
}: {
  asOfDate: string;
  distributableAmount: number | null;
  experience: SimulationExperience;
  goal: ProjectionGoalInput | null;
  onSelect: (strategy: SimulationPlanStrategy) => void;
  selectedStrategy: SimulationPlanStrategy;
}) {
  const exploredGoalContribution =
    goal && goal.targetAmount !== null && distributableAmount !== null
      ? Math.min(
          distributableAmount,
          Math.max(0, goal.targetAmount - goal.currentAmount)
        )
      : distributableAmount;
  const goalProjection = getGoalProjection({
    asOfDate,
    goal,
    monthlyContribution: exploredGoalContribution
  });
  const canEstimate = experience.planningMonthlyMargin !== null;
  const canSelectGoal = Boolean(
    goal &&
      canEstimate &&
      exploredGoalContribution !== null &&
      exploredGoalContribution > 0
  );
  const prudentMonthlyMargin =
    experience.planningMonthlyMargin === null
      ? null
      : Math.max(0, experience.planningMonthlyMargin);
  const explorationProtectedAmount =
    prudentMonthlyMargin === null || distributableAmount === null
      ? null
      : Math.max(0, prudentMonthlyMargin - distributableAmount);
  const goalSelected = selectedStrategy === "prioritize_goal" && canSelectGoal;
  const timelineGoal = goalSelected ? goal : null;
  const timelineMonthlyContribution = goalSelected
    ? exploredGoalContribution
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.orientationBanner}>
        <View style={styles.orientationIcon}>
          <TrendingUp color={colors.primary} size={21} strokeWidth={2.5} />
        </View>
        <View style={styles.orientationCopy}>
          <Text style={styles.orientationTag}>ESTIMACIÓN INICIAL</Text>
          <Text style={styles.orientationTitle}>
            {experience.mode === "goal_only"
              ? "Una simulación centrada en tu meta"
              : "Una simulación sin pedirte cada deuda"}
          </Text>
          <Text style={styles.orientationText}>{getEstimateExplanation(experience)}</Text>
        </View>
      </View>

      <View style={styles.rangeGrid}>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>
            {experience.mode === "goal_only" ? "Pagos de deuda" : "Pagos de deuda estimados"}
          </Text>
          <Text style={styles.rangeValue}>
            {formatAmountRange(experience.debtPaymentRange)}
          </Text>
        </View>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>Margen mensual posible</Text>
          <Text style={styles.rangeValue}>
            {formatAmountRange(experience.monthlyMarginRange, { signed: true })}
          </Text>
        </View>
        <View style={[styles.rangeItem, styles.rangeItemPrimary]}>
          <Text style={styles.rangeLabel}>Referencia prudente</Text>
          <Text style={[styles.rangeValue, styles.rangeValuePrimary]}>
            {experience.planningMonthlyMargin === null
              ? "Por estimar"
              : formatSignedCOP(experience.planningMonthlyMargin)}
          </Text>
        </View>
      </View>

      <Text style={styles.comparisonIntro}>
        Esta proyección organiza el dinero disponible alrededor de la meta principal que elegiste.
        Podrás ajustar el aporte después sin registrar pagos ni mover dinero.
      </Text>

      <View style={styles.options}>
        <Pressable
          accessibilityLabel={
            goal ? `Usar la referencia para priorizar ${goal.title}` : "Priorizar una meta"
          }
          accessibilityRole="radio"
          accessibilityState={{ disabled: !canSelectGoal, selected: goalSelected }}
          disabled={!canSelectGoal}
          onPress={() => onSelect("prioritize_goal")}
          style={({ pressed }) => [
            styles.option,
            goalSelected && styles.optionSelectedPrimary,
            !canSelectGoal && styles.optionDisabled,
            pressed && canSelectGoal && styles.optionPressed
          ]}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionIcon}>
              <Target color={colors.primary} size={22} strokeWidth={2.5} />
            </View>
            <View style={styles.optionHeaderCopy}>
              <Text style={styles.optionTag}>PROYECCIÓN DE TU META</Text>
              <Text style={styles.optionTitle}>
                {goal ? `Avanzar hacia ${goal.title}` : "Define tu meta principal"}
              </Text>
            </View>
            <View
              style={[
                styles.selectionIndicator,
                goalSelected && styles.selectionIndicatorPrimary
              ]}
            >
              {goalSelected ? (
                <Check color={colors.surface} size={15} strokeWidth={3} />
              ) : null}
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Usa para la meta lo disponible después de cubrir gastos, deudas estimadas y el margen
            protegido que elegiste.
          </Text>
          <View style={styles.optionResult}>
            <Text style={styles.optionResultLabel}>Aporte mensual explorado</Text>
            <Text style={styles.optionResultValue}>
              {exploredGoalContribution === null
                ? "Por estimar"
                : formatCOP(exploredGoalContribution)}
            </Text>
          </View>
          <Text style={styles.optionFootnote}>
            {!goal
              ? "Primero necesitas una meta con un monto definido."
              : !canEstimate
                ? "Necesitamos acotar un poco el peso de tus deudas para proyectarla."
                : goalProjection
                  ? `Con este ritmo la completarías aproximadamente en ${goalProjection}.`
                  : "Define el valor de la meta para estimar cuándo podrías completarla."}
          </Text>
          {explorationProtectedAmount !== null ? (
            <Text style={styles.optionBalance}>
              Conserva {formatCOP(explorationProtectedAmount)} como margen protegido.
            </Text>
          ) : null}
        </Pressable>
      </View>

      {timelineGoal &&
      timelineMonthlyContribution !== null &&
      timelineMonthlyContribution > 0 ? (
        <PreliminaryGoalTimeline
          asOfDate={asOfDate}
          goal={timelineGoal}
          hasReportedDebt={experience.mode === "reported_debt"}
          isEmergencyReference={timelineGoal.id === "emergency-fund-reference"}
          monthlyContribution={timelineMonthlyContribution}
        />
      ) : null}

      <Text style={styles.disclaimer}>
        {experience.mode === "goal_only"
          ? "La selección se guardará cuando continúes. No supone que ya separaste el dinero."
          : "La selección se guardará cuando continúes. No supone que ya separaste el dinero; cuando registres el detalle de tus deudas, aparecerá la comparación completa."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  orientationBanner: {
    alignItems: "flex-start",
    backgroundColor: "#F8FBFF",
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  orientationIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  orientationCopy: {
    flex: 1,
    gap: 3
  },
  orientationTag: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.badge
  },
  orientationTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  orientationText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  rangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rangeItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 170,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  rangeItemPrimary: {
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder
  },
  rangeLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  rangeValue: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  rangeValuePrimary: {
    color: colors.support
  },
  comparisonIntro: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  priorityExplanation: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  priorityExplanationTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  priorityExplanationText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: 280,
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  optionRecommended: {
    backgroundColor: "#F5FCF8",
    borderColor: colors.supportBorder
  },
  optionSelectedSupport: {
    borderColor: colors.support,
    borderWidth: 2
  },
  optionSelectedPrimary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  optionDisabled: {
    opacity: 0.58
  },
  optionPressed: {
    opacity: 0.82
  },
  optionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  optionIconSupport: {
    backgroundColor: colors.supportSoft
  },
  optionHeaderCopy: {
    flex: 1,
    gap: 2
  },
  selectionIndicator: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  selectionIndicatorSupport: {
    backgroundColor: colors.support,
    borderColor: colors.support
  },
  selectionIndicatorPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  optionTag: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.small
  },
  optionTagSupport: {
    color: colors.support
  },
  optionTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  optionResult: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm
  },
  optionResultLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  optionResultValue: {
    color: colors.primary,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  optionResultValueSupport: {
    color: colors.support
  },
  optionFootnote: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  optionBalance: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small
  },
  timelineNotice: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  timelineNoticeTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  timelineNoticeText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  emergencyGoalAction: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md
  },
  emergencyGoalIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  emergencyGoalCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220
  },
  emergencyGoalTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  emergencyGoalText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  emergencyGoalButton: {
    backgroundColor: colors.support,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  emergencyGoalButtonText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small
  },
  disclaimer: {
    color: colors.textSubtle,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  }
});
