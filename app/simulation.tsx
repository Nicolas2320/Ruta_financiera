import { useMemo, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ClipboardCheck,
  LineChart,
  PiggyBank,
  ShieldCheck,
  Target
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import {
  formatCOP,
  getExpenseRangeEstimate,
  getIncomeRangeEstimate,
  getSmallExpenseRangeEstimate,
  type FinancialRangeEstimate
} from "../utils/financialRanges";

type OnboardingSnapshot = ReturnType<typeof useOnboarding>["onboarding"];

type SimulationBase = {
  incomeEstimate: FinancialRangeEstimate;
  expenseEstimate: FinancialRangeEstimate;
  smallExpenseEstimate: FinancialRangeEstimate;
  estimatedMargin: number | null;
  expensePercentage: number | null;
};

type Scenario = {
  key: string;
  name: string;
  description: string;
  monthlyContribution: number | null;
  assumption: string;
  marginWasUsed: boolean;
  tags: string[];
  comment: string;
  unavailableContributionLabel?: string;
  unavailableAdvanceLabel?: string;
  unavailableExplanation?: string;
  calculationNote?: string;
  recommended?: boolean;
};

type ImpactfulVariable = {
  title: string;
  text: string;
};

const noConcreteAmountValues = [
  "No tengo una cifra todavía",
  "Prefiero definirla después"
];

const validGoalAmountRanges = [
  "No tengo una cifra todavía",
  "Menos de $1.000.000",
  "$1.000.000 – $5.000.000",
  "$5.000.000 – $20.000.000",
  "$20.000.000 – $50.000.000",
  "Más de $50.000.000",
  "Prefiero definirla después"
];

function hasLowEmergencyCoverage(emergencyCoverage: string | null) {
  return emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes";
}

function hasDebtPressure(debtSituation: string | null, debtPaymentShare: string | null) {
  return (
    debtSituation === "A veces me cuesta pagarlas" ||
    debtSituation === "Son una preocupación importante" ||
    debtPaymentShare === "Más del 40%"
  );
}

function wantsInvestmentEducation(investmentSituation: string | null) {
  return (
    investmentSituation === "No, pero quiero aprender" ||
    investmentSituation === "Sí, pero no entiendo bien cómo funcionan"
  );
}

function hasSmallExpensesPlan(onboarding: OnboardingSnapshot) {
  return (
    onboarding.hasSmallExpenses === "Sí" &&
    (onboarding.smallExpensesIntention === "Reducir algunos" ||
      onboarding.smallExpensesIntention === "Establecer un límite mensual")
  );
}

function goalAmountNeedsDefinition(goalAmountRange: string | null) {
  return (
    !goalAmountRange ||
    !validGoalAmountRanges.includes(goalAmountRange) ||
    noConcreteAmountValues.includes(goalAmountRange)
  );
}

function getGoalAmountRangeLabel(goalAmountRange: string | null) {
  if (!goalAmountRange || !validGoalAmountRanges.includes(goalAmountRange)) {
    return "No definida";
  }

  return goalAmountRange;
}

function toPercentWidth(value: number): `${number}%` {
  return `${value}%`;
}

function getSimulationBase(onboarding: OnboardingSnapshot): SimulationBase {
  const incomeEstimate = getIncomeRangeEstimate(onboarding.incomeRange);
  const expenseEstimate = getExpenseRangeEstimate(onboarding.expensesRange);
  const smallExpenseEstimate = getSmallExpenseRangeEstimate(onboarding.smallExpensesRange);
  const incomeMidpoint = incomeEstimate.midpoint;
  const expenseMidpoint = expenseEstimate.midpoint;
  const estimatedMargin =
    incomeMidpoint !== null && expenseMidpoint !== null ? incomeMidpoint - expenseMidpoint : null;
  const expensePercentage =
    incomeMidpoint !== null && incomeMidpoint > 0 && expenseMidpoint !== null
      ? Math.round((expenseMidpoint / incomeMidpoint) * 100)
      : null;

  return {
    incomeEstimate,
    expenseEstimate,
    smallExpenseEstimate,
    estimatedMargin,
    expensePercentage
  };
}

function getEstimateLabel(estimate: FinancialRangeEstimate) {
  if (estimate.midpoint !== null) {
    return `${formatCOP(estimate.midpoint)} aprox.`;
  }

  return estimate.label;
}

function getSmallExpenseLabel(onboarding: OnboardingSnapshot, estimate: FinancialRangeEstimate) {
  if (onboarding.hasSmallExpenses === "No") {
    return "No identificados";
  }

  return estimate.label;
}

function getMarginLabel(estimatedMargin: number | null) {
  if (estimatedMargin === null) {
    return "No disponible";
  }

  if (estimatedMargin <= 0) {
    return "Margen ajustado";
  }

  return `${formatCOP(estimatedMargin)} aprox.`;
}

function contributionFromPositiveValue(value: number | null, share: number) {
  if (value === null || value <= 0) {
    return null;
  }

  return value * share;
}

function sumAvailableParts(parts: Array<number | null>) {
  const availableParts = parts.filter((part): part is number => part !== null);

  if (availableParts.length === 0) {
    return null;
  }

  return availableParts.reduce((total, part) => total + part, 0);
}

function getScenarios(metrics: SimulationBase): Scenario[] {
  const marginWasUsed = metrics.estimatedMargin !== null && metrics.estimatedMargin > 0;
  const currentPaceContribution = contributionFromPositiveValue(metrics.estimatedMargin, 0.1);
  const balancedBase = contributionFromPositiveValue(metrics.estimatedMargin, 0.2);
  const balancedSmallExpenseAdjustment = contributionFromPositiveValue(
    metrics.smallExpenseEstimate.midpoint,
    0.2
  );
  const intensiveBase = contributionFromPositiveValue(metrics.estimatedMargin, 0.35);
  const intensiveSmallExpenseAdjustment = contributionFromPositiveValue(
    metrics.smallExpenseEstimate.midpoint,
    0.3
  );
  const usesOnlySmallExpenses =
    !marginWasUsed && metrics.smallExpenseEstimate.midpoint !== null;
  const smallExpensesOnlyNote = usesOnlySmallExpenses
    ? "Este cálculo usa una reducción aproximada de tus gastos pequeños frecuentes. No usamos margen mensual porque actualmente aparece ajustado."
    : undefined;

  return [
    {
      key: "current",
      name: "Mantener ritmo actual",
      description:
        "Separar una parte pequeña de tu margen mensual puede ayudarte a avanzar de forma gradual.",
      monthlyContribution: currentPaceContribution,
      assumption: "10% del margen mensual estimado.",
      marginWasUsed,
      tags: ["Esfuerzo bajo", "Avance gradual", "Riesgo bajo"],
      comment: "Avance lento, pero más fácil de sostener.",
      unavailableContributionLabel: "No disponible con tu margen actual.",
      unavailableAdvanceLabel: "No calculado con los rangos actuales.",
      unavailableExplanation:
        "Tus gastos estimados podrían estar cerca o por encima de tus ingresos estimados, por eso este escenario no calcula un aporte mensual."
    },
    {
      key: "balanced",
      name: "Ajuste equilibrado",
      description:
        "Combinar una parte de tu margen mensual con una reducción moderada de gastos pequeños puede liberar dinero para tu meta sin cambios extremos.",
      monthlyContribution: sumAvailableParts([balancedBase, balancedSmallExpenseAdjustment]),
      assumption: "20% del margen mensual estimado + 20% de gastos pequeños frecuentes.",
      marginWasUsed,
      tags: ["Recomendado", "Ajustes pequeños", "Más sostenible"],
      comment: "Pequeños cambios pueden acumularse con el tiempo.",
      calculationNote: smallExpensesOnlyNote,
      recommended: true
    },
    {
      key: "intensive",
      name: "Ajuste intensivo",
      description:
        "Un esfuerzo mayor puede acelerar tu avance, pero debe ser sostenible para tu vida diaria.",
      monthlyContribution: sumAvailableParts([intensiveBase, intensiveSmallExpenseAdjustment]),
      assumption: "35% del margen mensual estimado + 30% de gastos pequeños frecuentes.",
      marginWasUsed,
      tags: ["Esfuerzo alto", "Más exigente", "Revisar sostenibilidad"],
      comment: "Úsalo solo como referencia. Un plan exigente debe adaptarse a tu realidad.",
      calculationNote: smallExpensesOnlyNote
    }
  ];
}

function getAdvanceLabel(scenario: Scenario, months: number) {
  const { monthlyContribution } = scenario;

  if (monthlyContribution === null) {
    return scenario.unavailableAdvanceLabel ?? "No disponible con los rangos actuales.";
  }

  return `${formatCOP(monthlyContribution * months)} aprox.`;
}

function getInvestmentEducationMessage(onboarding: OnboardingSnapshot) {
  if (hasLowEmergencyCoverage(onboarding.emergencyCoverage)) {
    return "Antes de explorar inversión, podría ser mejor fortalecer tu fondo de emergencia. Tener una base para imprevistos puede ayudarte a evitar decisiones apresuradas.";
  }

  if (hasDebtPressure(onboarding.debtSituation, onboarding.debtPaymentShare)) {
    return "Antes de explorar inversión, podría ser mejor revisar tus deudas y entender cuánto pesan en tu presupuesto mensual.";
  }

  if (wantsInvestmentEducation(onboarding.investmentSituation)) {
    return "Puedes empezar aprendiendo conceptos como riesgo, plazo, liquidez y diversificación antes de tomar decisiones de inversión.";
  }

  return "Si tu base financiera está estable, el siguiente paso puede ser aprender sobre opciones de inversión de manera educativa, sin tomar decisiones apresuradas.";
}

function getMostImpactfulVariable(
  onboarding: OnboardingSnapshot,
  metrics: SimulationBase
): ImpactfulVariable {
  if (
    onboarding.debtSituation === "Son una preocupación importante" ||
    onboarding.debtPaymentShare === "Más del 40%"
  ) {
    return {
      title: "Revisar el peso de tus deudas",
      text: "Entender cuánto de tus ingresos se va en deudas puede ayudarte a recuperar margen mensual."
    };
  }

  if (hasLowEmergencyCoverage(onboarding.emergencyCoverage)) {
    return {
      title: "Construir una base para imprevistos",
      text: "Un fondo de emergencia puede darte más tranquilidad antes de asumir metas más grandes."
    };
  }

  if (metrics.expensePercentage !== null && metrics.expensePercentage >= 85) {
    return {
      title: "Revisar gastos variables",
      text: "Tus gastos parecen ocupar una parte alta de tus ingresos. Revisar categorías variables puede darte más margen."
    };
  }

  if (hasSmallExpensesPlan(onboarding)) {
    return {
      title: "Definir un límite para gastos pequeños",
      text: "Pequeños ajustes frecuentes pueden liberar dinero sin eliminar todos tus gustos."
    };
  }

  if (goalAmountNeedsDefinition(onboarding.goalAmountRange)) {
    return {
      title: "Definir una cifra más concreta",
      text: "Una cifra aproximada puede ayudarte a convertir tu meta en un plan más claro."
    };
  }

  return {
    title: "Mantener constancia mensual",
    text: "Separar una cantidad de forma frecuente puede ser más útil que hacer grandes esfuerzos ocasionales."
  };
}

function InfoCard({
  title,
  children,
  icon
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon ? <View style={styles.sectionIcon}>{icon}</View> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
}

function Tag({ label, recommended }: { label: string; recommended?: boolean }) {
  return (
    <View style={[styles.tag, recommended && styles.tagRecommended]}>
      <Text style={[styles.tagText, recommended && styles.tagTextRecommended]}>{label}</Text>
    </View>
  );
}

function ScenarioCard({
  scenario,
  maxMonthlyContribution
}: {
  scenario: Scenario;
  maxMonthlyContribution: number;
}) {
  const relativeWidth =
    scenario.monthlyContribution !== null && maxMonthlyContribution > 0
      ? Math.max(12, Math.round((scenario.monthlyContribution / maxMonthlyContribution) * 100))
      : 0;

  return (
    <View style={[styles.scenarioCard, scenario.recommended && styles.scenarioCardRecommended]}>
      <View style={styles.scenarioHeader}>
        <Text style={styles.scenarioTitle}>{scenario.name}</Text>
        {scenario.recommended ? <Tag label="Recomendado" recommended /> : null}
      </View>

      <Text style={styles.text}>{scenario.description}</Text>

      <View style={styles.contributionBox}>
        <Text style={styles.contributionLabel}>Aporte mensual estimado</Text>
        <Text style={styles.contributionValue}>
          {scenario.monthlyContribution !== null
            ? `${formatCOP(scenario.monthlyContribution)} aprox.`
            : scenario.unavailableContributionLabel ?? "No disponible"}
        </Text>
        {scenario.unavailableExplanation ? (
          <Text style={styles.contributionDetail}>{scenario.unavailableExplanation}</Text>
        ) : null}
      </View>

      <View style={styles.assumptionBox}>
        <Text style={styles.assumptionLabel}>Supuesto usado</Text>
        <Text style={styles.assumptionText}>{scenario.assumption}</Text>
        {!scenario.marginWasUsed ? (
          <Text style={styles.assumptionMuted}>
            Margen mensual no usado por estar ajustado o no disponible.
          </Text>
        ) : null}
      </View>

      {scenario.calculationNote ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{scenario.calculationNote}</Text>
        </View>
      ) : null}

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            scenario.recommended && styles.progressFillRecommended,
            { width: toPercentWidth(relativeWidth) }
          ]}
        />
      </View>

      <View style={styles.advanceRows}>
        <ValueRow label="3 meses" value={getAdvanceLabel(scenario, 3)} />
        <ValueRow label="6 meses" value={getAdvanceLabel(scenario, 6)} />
        <ValueRow label="12 meses" value={getAdvanceLabel(scenario, 12)} />
      </View>

      <View style={styles.tagsList}>
        {scenario.tags
          .filter((tag) => !(scenario.recommended && tag === "Recomendado"))
          .map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
      </View>

      <Text style={styles.helperText}>{scenario.comment}</Text>
    </View>
  );
}

export default function SimulationScreen() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const metrics = useMemo(() => getSimulationBase(onboarding), [onboarding]);
  const scenarios = useMemo(() => getScenarios(metrics), [metrics]);
  const impactfulVariable = useMemo(
    () => getMostImpactfulVariable(onboarding, metrics),
    [onboarding, metrics]
  );
  const maxMonthlyContribution = Math.max(
    ...scenarios.map((scenario) => scenario.monthlyContribution ?? 0),
    0
  );
  const canCalculateMargin = metrics.estimatedMargin !== null;
  const needsGoalAmountDefinition = goalAmountNeedsDefinition(onboarding.goalAmountRange);
  const goalAmountRangeLabel = getGoalAmountRangeLabel(onboarding.goalAmountRange);
  const isInvestmentGoal = onboarding.financialGoal === "Empezar a invertir";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <LineChart color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Simulación de escenarios</Text>

            <Text style={styles.subtitle}>
              Compara caminos posibles según tus respuestas. Estas proyecciones son educativas y
              aproximadas.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Estas simulaciones usan rangos aproximados. Sirven para entender escenarios, no
                para predecir resultados exactos.
              </Text>
            </View>
          </View>

          <InfoCard
            icon={<Target color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Meta simulada"
          >
            <View style={styles.valueRows}>
              <ValueRow label="Meta principal" value={onboarding.financialGoal ?? "No definida"} />
              <ValueRow label="Horizonte" value={onboarding.goalHorizon ?? "No definido"} />
              <ValueRow
                label="Cifra aproximada"
                value={goalAmountRangeLabel}
              />
            </View>

            {needsGoalAmountDefinition ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  No definiste una cifra exacta. Por ahora simularemos avances mensuales
                  aproximados, no una fecha exacta de llegada.
                </Text>
              </View>
            ) : null}

            {isInvestmentGoal ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Como tu meta es empezar a invertir, estos escenarios muestran cuánto podrías
                  liberar o separar antes de tomar decisiones de inversión. No estamos simulando
                  rentabilidad ni productos financieros.
                </Text>
              </View>
            ) : null}
          </InfoCard>

          <InfoCard
            icon={<PiggyBank color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Punto de partida"
          >
            <View style={styles.valueRows}>
              <ValueRow label="Ingreso estimado" value={getEstimateLabel(metrics.incomeEstimate)} />
              <ValueRow label="Gasto estimado" value={getEstimateLabel(metrics.expenseEstimate)} />
              <ValueRow
                label="Margen mensual estimado"
                value={getMarginLabel(metrics.estimatedMargin)}
              />
              <ValueRow
                label="Gastos pequeños estimados"
                value={getSmallExpenseLabel(onboarding, metrics.smallExpenseEstimate)}
              />
            </View>

            {canCalculateMargin ? (
              <Text style={styles.helperText}>
                Los cálculos usan puntos medios de los rangos seleccionados. Son aproximaciones,
                no cifras exactas.
              </Text>
            ) : (
              <Text style={styles.text}>
                No tenemos suficiente información para calcular un margen mensual estimado. Aun
                así, puedes revisar escenarios cualitativos.
              </Text>
            )}
          </InfoCard>

          <View style={styles.scenariosSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />
              </View>
              <Text style={styles.sectionTitle}>Escenarios educativos</Text>
            </View>

            <Text style={styles.helperText}>
              Los avances a 3, 6 y 12 meses solo multiplican el aporte mensual estimado. No
              prometen resultados ni fechas exactas.
            </Text>

            <View style={styles.scenariosList}>
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.key}
                  maxMonthlyContribution={maxMonthlyContribution}
                  scenario={scenario}
                />
              ))}
            </View>
          </View>

          <InfoCard
            icon={<ShieldCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Antes de pensar en invertir"
          >
            <Text style={styles.text}>{getInvestmentEducationMessage(onboarding)}</Text>
          </InfoCard>

          <InfoCard
            icon={<AlertCircle color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Variable con más impacto"
          >
            <Text style={styles.highlightTitle}>{impactfulVariable.title}</Text>
            <Text style={styles.text}>{impactfulVariable.text}</Text>
          </InfoCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Crear plan mensual"
              icon={null}
              onPress={() => router.push("/action-plan")}
              title="Crear plan mensual"
            />
            <PrimaryButton
              accessibilityLabel="Volver al diagnóstico financiero"
              icon={null}
              onPress={() => router.push("/diagnosis")}
              title="Volver al diagnóstico"
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
    maxWidth: 520,
    width: "100%"
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: 24
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
    fontWeight: "700",
    lineHeight: 20
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
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  sectionContent: {
    gap: spacing.md
  },
  highlightTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 18
  },
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  warningText: {
    color: "#9A3412",
    fontSize: typography.caption,
    fontWeight: "800",
    lineHeight: 19
  },
  valueRows: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  valueRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  valueLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  valueText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    lineHeight: 22
  },
  scenariosList: {
    gap: spacing.md
  },
  scenariosSection: {
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  scenarioCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  scenarioCardRecommended: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  scenarioHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  scenarioTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    minWidth: 170
  },
  contributionBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  contributionLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  contributionValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  contributionDetail: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 19
  },
  assumptionBox: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  assumptionLabel: {
    color: colors.support,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  assumptionText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22
  },
  assumptionMuted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 19
  },
  noticeBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  noticeText: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
    lineHeight: 19
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 14,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%"
  },
  progressFillRecommended: {
    backgroundColor: colors.support
  },
  advanceRows: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tag: {
    backgroundColor: colors.primarySoft,
    borderColor: "#D7E7FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  tagRecommended: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD"
  },
  tagText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900"
  },
  tagTextRecommended: {
    color: colors.support
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
