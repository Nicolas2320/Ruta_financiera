import { useMemo, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Sparkles
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FinancialEducationModal } from "../components/FinancialEducationModal";
import {
  FinancialEducationStory,
  type FinancialEducationStoryTone
} from "../components/FinancialEducationStory";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  calculateFinancialSnapshot,
  getSmallExpensesMonthlySummary,
  type FinancialSnapshot,
  type SnapshotSource
} from "../utils/financialCalculations";
import {
  formatCOP,
  formatSignedCOP,
  type FinancialRangeEstimate
} from "../utils/financialRanges";
import type { ExactFinancialValues } from "../types/financial";

type OnboardingSnapshot = ReturnType<typeof useOnboarding>["onboarding"];

type FinancialDisplay = {
  label: string;
  value: string;
  source: "exact" | "range" | "empty";
  helper: string;
};

type PriorityKey = "debt" | "emergency" | "expenses" | "smallExpenses" | "goal";

type MainPriority = {
  key: PriorityKey;
  title: string;
  text: string;
};

type FinancialMetrics = {
  snapshot: FinancialSnapshot;
  incomeDisplay: FinancialDisplay;
  expenseDisplay: FinancialDisplay;
  currentSavingsDisplay: FinancialDisplay;
  incomeValue: number | null;
  expenseValue: number | null;
  totalOutflowValue: number | null;
  currentSavingsValue: number | null;
  smallExpenseEstimate: FinancialRangeEstimate;
  estimatedMargin: number | null;
  expensePercentage: number | null;
  smallExpensePercentage: number | null;
  estimatedMarginLabel: string;
  expensePercentageLabel: string;
  expenseRatioInterpretation: string;
  smallExpensesMetricLabel: string;
  smallExpensesDetail: string;
  debtPaymentLabel: string;
  debtPaymentInterpretation: string;
  canEstimateMonthlyFlow: boolean;
  isCashflowExact: boolean;
};

function toPercentWidth(value: number): `${number}%` {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function getExpenseRatioInterpretation(expensePercentage: number | null) {
  if (expensePercentage === null) {
    return "No disponible";
  }

  if (expensePercentage < 60) {
    return "Tienes buen margen potencial.";
  }

  if (expensePercentage <= 80) {
    return "Tienes algo de margen, pero conviene vigilar gastos.";
  }

  if (expensePercentage <= 100) {
    return "Tus salidas están cerca de tus ingresos.";
  }

  return "Tus salidas podrían superar tus ingresos.";
}

function getDebtPaymentInterpretation(debt: FinancialSnapshot["debt"]) {
  if (debt.level === "none") {
    return "Sin peso mensual de deuda.";
  }

  if (debt.level === "low") {
    return "Peso bajo.";
  }

  if (debt.level === "medium") {
    return "Peso moderado.";
  }

  if (debt.level === "high") {
    return "Peso alto.";
  }

  return "Por evaluar.";
}

function getDebtPaymentLabel(debt: FinancialSnapshot["debt"]) {
  if (debt.monthlyPaymentTotal > 0) {
    return `${formatCOP(debt.monthlyPaymentTotal)}${debt.isPaymentEstimated ? " aprox." : ""}`;
  }

  return debt.level === "none" ? "Sin pagos de deuda" : "Por calcular";
}

function toFinancialDisplaySource(source: SnapshotSource): FinancialDisplay["source"] {
  if (source === "exact") {
    return "exact";
  }

  if (source === "estimated") {
    return "range";
  }

  return "empty";
}

function getSnapshotDisplay({
  exactLabel,
  estimatedLabel,
  source,
  value
}: {
  exactLabel: string;
  estimatedLabel: string;
  source: SnapshotSource;
  value: number | null;
}): FinancialDisplay {
  if (source === "withheld") {
    return {
      label: estimatedLabel,
      value: "No compartido",
      source: "empty",
      helper: "Elegiste no compartir este dato."
    };
  }

  if (value === null) {
    return {
      label: estimatedLabel,
      value: "No disponible",
      source: "empty",
      helper: "Aún no tenemos suficiente información para estimar este dato."
    };
  }

  const isExact = source === "exact";

  return {
    label: isExact ? exactLabel : estimatedLabel,
    value: isExact ? formatCOP(value) : `${formatCOP(value)} aprox.`,
    source: toFinancialDisplaySource(source),
    helper: isExact
      ? "Basado en tus datos ingresados."
      : "Estimado a partir del rango seleccionado."
  };
}

function getFinancialMetrics(
  onboarding: OnboardingSnapshot,
  exactValues: ExactFinancialValues
): FinancialMetrics {
  const snapshot = calculateFinancialSnapshot({ onboarding, exactValues });
  const incomeDisplay = getSnapshotDisplay({
    exactLabel: "Ingreso mensual",
    estimatedLabel: "Rango de ingresos",
    source: snapshot.sourceMap.monthlyIncome,
    value: snapshot.cashflow.monthlyIncome
  });
  const expenseDisplay = getSnapshotDisplay({
    exactLabel: "Gastos principales al mes",
    estimatedLabel: "Rango de gastos principales",
    source: snapshot.sourceMap.monthlyExpenses,
    value: snapshot.cashflow.monthlyExpenses
  });
  const currentSavingsDisplay = getSnapshotDisplay({
    exactLabel: "Ahorro actual",
    estimatedLabel: "Rango de ahorros",
    source: snapshot.sourceMap.currentSavings,
    value: snapshot.values.currentSavings
  });
  const smallExpenseEstimate: FinancialRangeEstimate = {
    min: null,
    max: null,
    midpoint: snapshot.values.smallExpenses,
    label:
      snapshot.values.smallExpenses !== null
        ? snapshot.sourceMap.smallExpenses === "exact"
          ? formatCOP(snapshot.values.smallExpenses)
          : `${formatCOP(snapshot.values.smallExpenses)} aprox.`
        : "No disponible"
  };
  const incomeMidpoint = snapshot.cashflow.monthlyIncome;
  const expenseMidpoint = snapshot.cashflow.monthlyExpenses;
  const currentSavingsValue = snapshot.values.currentSavings;
  const smallExpenseMidpoint = snapshot.values.smallExpenses;
  const estimatedMargin = snapshot.cashflow.monthlyMargin;
  const expensePercentage =
    snapshot.cashflow.expensesToIncomeRatio !== null
      ? Math.round(snapshot.cashflow.expensesToIncomeRatio * 100)
      : null;
  const smallExpensePercentage =
    incomeMidpoint !== null && incomeMidpoint > 0 && smallExpenseMidpoint !== null
      ? Math.round((smallExpenseMidpoint / incomeMidpoint) * 100)
      : null;
  const isCashflowExact =
    snapshot.sourceMap.monthlyIncome === "exact" &&
    snapshot.sourceMap.monthlyExpenses === "exact" &&
    (snapshot.cashflow.monthlyExpensesIncludesSmallExpenses ||
      snapshot.sourceMap.smallExpenses === "exact" ||
      snapshot.sourceMap.smallExpenses === "reported_none") &&
    !snapshot.debt.isPaymentEstimated;

  let estimatedMarginLabel = "No disponible";

  if (estimatedMargin !== null) {
    estimatedMarginLabel = isCashflowExact
      ? formatSignedCOP(estimatedMargin)
      : `${formatSignedCOP(estimatedMargin)} aprox.`;
  }

  const smallExpensesMetricLabel =
    snapshot.cashflow.monthlyExpensesIncludesSmallExpenses && smallExpenseMidpoint === null
      ? "Incluidos en gastos mensuales"
      : onboarding.hasSmallExpenses === "No"
      ? "No identificados"
      : snapshot.sourceMap.smallExpenses === "exact" && smallExpenseMidpoint !== null
        ? formatCOP(smallExpenseMidpoint)
        : onboarding.smallExpensesRange ?? "No disponible";
  const smallExpensesDetail =
    snapshot.cashflow.monthlyExpensesIncludesSmallExpenses && smallExpenseMidpoint === null
      ? "No se suman aparte porque ya forman parte del total mensual que ingresaste."
      : onboarding.hasSmallExpenses === "No"
      ? "No usamos gastos pequeños para estimar aportes o escenarios."
      : smallExpensePercentage !== null
      ? snapshot.sourceMap.smallExpenses === "exact"
        ? `Según el valor ingresado: cerca del ${smallExpensePercentage}% de tus ingresos mensuales.`
        : `Cerca del ${smallExpensePercentage}% de tus ingresos mensuales.`
      : onboarding.smallExpensesRange
        ? "Rango seleccionado, sin porcentaje calculado."
        : "No disponible";

  return {
    snapshot,
    incomeDisplay,
    expenseDisplay,
    currentSavingsDisplay,
    incomeValue: incomeMidpoint,
    expenseValue: expenseMidpoint,
    totalOutflowValue: snapshot.cashflow.totalMonthlyOutflow,
    currentSavingsValue,
    smallExpenseEstimate,
    estimatedMargin,
    expensePercentage,
    smallExpensePercentage,
    estimatedMarginLabel,
    expensePercentageLabel:
      expensePercentage !== null
        ? isCashflowExact
          ? `${expensePercentage}%`
          : `${expensePercentage}% aprox.`
        : "No disponible",
    expenseRatioInterpretation: getExpenseRatioInterpretation(expensePercentage),
    smallExpensesMetricLabel,
    smallExpensesDetail,
    debtPaymentLabel: getDebtPaymentLabel(snapshot.debt),
    debtPaymentInterpretation: getDebtPaymentInterpretation(snapshot.debt),
    canEstimateMonthlyFlow: estimatedMargin !== null && expensePercentage !== null,
    isCashflowExact
  };
}

function getDeclaredGoalContext(
  onboarding: OnboardingSnapshot,
  metrics: FinancialMetrics,
  priority: MainPriority
) {
  const goalName = metrics.snapshot.goal.name;

  if (!goalName || priority.key === "debt") {
    return null;
  }

  const normalizedGoal = goalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!normalizedGoal.includes("deuda")) {
    return null;
  }

  const withheldDebtData =
    onboarding.debtSituation === "Prefiero no responder" ||
    onboarding.debtPaymentShare === "Prefiero no responder";

  return withheldDebtData
    ? `Tu meta declarada sigue siendo “${goalName}”. Como preferiste no compartir algunos datos de deuda, esta prioridad organiza el paso previo sin reemplazar tu meta.`
    : `Tu meta declarada sigue siendo “${goalName}”. Esta prioridad funciona como un paso previo para construir un plan de pago sostenible.`;
}

function getMainPriority(metrics: FinancialMetrics): MainPriority {
  const priorityKeyMap: Record<FinancialSnapshot["priority"]["key"], PriorityKey> = {
    debt_pressure: "debt",
    organize_cashflow: "expenses",
    build_emergency_fund: "emergency",
    review_small_expenses: "smallExpenses",
    advance_goal: "goal",
    learn_investing: "goal",
    keep_tracking: "goal"
  };

  return {
    key: priorityKeyMap[metrics.snapshot.priority.key],
    title: metrics.snapshot.priority.title,
    text: metrics.snapshot.priority.description
  };
}

function getSmallExpensesMessages(onboarding: OnboardingSnapshot, metrics: FinancialMetrics) {
  if (onboarding.hasSmallExpenses === "Sí") {
    const messages = [
      "Identificaste pequeños gastos frecuentes.",
      getSmallExpensesMonthlySummary({
        amount: metrics.snapshot.values.smallExpenses,
        range: onboarding.smallExpensesRange,
        source: metrics.snapshot.sourceMap.smallExpenses
      })
    ];

    if (metrics.smallExpensePercentage !== null) {
      messages.push(`Esto podría representar cerca del ${metrics.smallExpensePercentage}% de tus ingresos estimados.`);
    }

    messages.push(`Tu intención actual es: ${onboarding.smallExpensesIntention ?? "No respondido"}.`);
    messages.push(
      "No significa que debas eliminarlos. La idea es decidir cuáles quieres mantener, limitar o redirigir a una meta."
    );

    return messages;
  }

  if (onboarding.hasSmallExpenses === "No") {
    return [
      "No identificaste gastos pequeños frecuentes. Puedes revisar esta sección más adelante si notas consumos repetidos."
    ];
  }

  if (onboarding.hasSmallExpenses === "No estoy seguro") {
    return [
      "Podrías observar tus pequeños gastos durante una semana para entender si tienen impacto en tu presupuesto."
    ];
  }

  return ["No tenemos suficiente información sobre pequeños gastos frecuentes todavía."];
}

function getDebtMessage(metrics: FinancialMetrics) {
  if (metrics.snapshot.debt.level === "none") {
    return "No reportaste deudas actualmente.";
  }

  if (metrics.snapshot.debt.level === "high") {
    return "Tus deudas podrían estar limitando tu capacidad para avanzar hacia otras metas.";
  }

  if (metrics.snapshot.debt.level === "low") {
    return "Tus deudas parecen manejables, pero conviene monitorear cuánto pesan cada mes.";
  }

  if (metrics.snapshot.debt.level === "medium") {
    return "Tus deudas requieren seguimiento para entender cuánto margen mensual te dejan.";
  }

  return "No tenemos suficiente información sobre tus deudas todavía.";
}

function getDebtActionMessage(metrics: FinancialMetrics) {
  if (metrics.snapshot.debt.level === "none") {
    return null;
  }

  if (metrics.snapshot.debt.level === "medium") {
    return "Acción sugerida: este mes lista tus pagos de deuda, fecha límite y pago mínimo. Evita tomar deuda nueva hasta saber cuánto pesa realmente.";
  }

  if (metrics.snapshot.debt.level === "high") {
    return "Acción sugerida: identifica cuál deuda genera más presión por cuota, interés o urgencia y revísala antes de acelerar otras metas.";
  }

  return null;
}

function getMeaningMessage(priority: MainPriority) {
  if (priority.key === "debt") {
    return "En tu caso, la prioridad no parece ser tomar decisiones financieras avanzadas de inmediato. Primero puede ser más útil entender qué deudas pesan más y cómo afectan tu flujo mensual.";
  }

  if (priority.key === "emergency") {
    return "En tu caso, fortalecer una base para imprevistos puede darte más estabilidad antes de asumir metas más grandes o compromisos nuevos.";
  }

  if (priority.key === "expenses") {
    return "En tu caso, revisar tu flujo mensual puede ayudarte a identificar qué gastos son esenciales, cuáles son variables y dónde podría aparecer margen para ahorrar.";
  }

  if (priority.key === "smallExpenses") {
    return "En tu caso, los gastos pequeños no son el problema por sí solos. La oportunidad está en decidir cuáles quieres conservar y cuáles podrías limitar para acercarte a una meta.";
  }

  return "En tu caso, ya puedes empezar a traducir tu meta en una acción concreta y pequeña para esta semana, usando tus rangos como una primera referencia.";
}

function getMetricTone(label: string, metrics: FinancialMetrics) {
  if (label === "Margen mensual") {
    if (metrics.estimatedMargin === null) {
      return "neutral";
    }

    return metrics.estimatedMargin > 0 ? "positive" : "warning";
  }

  if (label === "Salidas frente a ingresos") {
    if (metrics.expensePercentage === null) {
      return "neutral";
    }

    return metrics.expensePercentage >= 85 ? "warning" : "positive";
  }

  if (label === "Ahorro actual" || label === "Rango de ahorros") {
    if (metrics.currentSavingsValue === null) {
      return "neutral";
    }

    if (
      metrics.currentSavingsValue <= 0 ||
      metrics.snapshot.emergencyFund.status === "none" ||
      metrics.snapshot.emergencyFund.status === "starter"
    ) {
      return "warning";
    }

    return "positive";
  }

  if (label === "Peso de deudas") {
    if (metrics.snapshot.debt.level === "high" || metrics.snapshot.debt.level === "medium") {
      return "warning";
    }

    return metrics.snapshot.debt.level === "none" || metrics.snapshot.debt.level === "low"
      ? "positive"
      : "neutral";
  }

  return "neutral";
}

function InfoCard({
  title,
  children,
  icon,
  headerAction
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon ? <View style={styles.sectionIcon}>{icon}</View> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {headerAction}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning";
}) {
  return (
    <View
      style={[
        styles.metricCard,
        tone === "positive" && styles.metricCardPositive,
        tone === "warning" && styles.metricCardWarning
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

export default function DiagnosisScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const { session } = useAuth();
  const { exactValues, onboarding } = useOnboarding();
  const guidanceMode = onboarding.financialGuidanceMode;
  const metrics = useMemo(
    () => getFinancialMetrics(onboarding, exactValues),
    [exactValues, onboarding]
  );
  const priority = useMemo(() => getMainPriority(metrics), [metrics]);
  const declaredGoalContext = useMemo(
    () => getDeclaredGoalContext(onboarding, metrics, priority),
    [metrics, onboarding, priority]
  );
  const smallExpensesMessages = useMemo(
    () => getSmallExpensesMessages(onboarding, metrics),
    [onboarding, metrics]
  );
  const expenseBarWidth = metrics.expensePercentage ?? 0;
  const smallExpensesBarWidth = Math.min(
    metrics.smallExpensePercentage ?? 0,
    expenseBarWidth,
    100
  );
  const otherExpensesPercentage = Math.max(
    0,
    expenseBarWidth - (metrics.smallExpensePercentage ?? 0)
  );
  const marginPercentage = 100 - expenseBarWidth;
  const expensesAreHigh = metrics.expensePercentage !== null && metrics.expensePercentage >= 85;
  const hasPositiveMargin = metrics.estimatedMargin !== null && metrics.estimatedMargin > 0;
  const hasNoMargin = metrics.estimatedMargin !== null && metrics.estimatedMargin <= 0;
  const flowEducationTone: FinancialEducationStoryTone =
    metrics.estimatedMargin === null
      ? "neutral"
      : metrics.estimatedMargin < 0
        ? "critical"
        : metrics.estimatedMargin === 0
          ? "warning"
          : "positive";
  const flowResultLabel =
    metrics.estimatedMargin === null
      ? "Margen por calcular"
      : metrics.estimatedMargin < 0
        ? "Déficit mensual estimado"
        : metrics.estimatedMargin === 0
          ? "Sin margen estimado"
          : "Margen mensual disponible";
  const flowResultDescription =
    metrics.expensePercentage !== null
      ? `Tus salidas representan aproximadamente el ${metrics.expensePercentage}% de tus ingresos.`
      : "Comparamos tus ingresos con tus salidas mensuales.";
  const flowPlainLanguage =
    metrics.expensePercentage !== null
      ? metrics.expensePercentage > 100
        ? `Por cada $100 que entra, salen cerca de $${metrics.expensePercentage}.`
        : metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
          ? `Por cada $100 que entra, aproximadamente $${metrics.expensePercentage} se utiliza en gastos mensuales y deudas.`
          : `Por cada $100 que entra, aproximadamente $${metrics.expensePercentage} se utiliza en gastos principales, gastos pequeños y deudas.`
      : metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
        ? "Compara lo que entra durante el mes con tus gastos mensuales y cuotas de deuda."
        : "Compara lo que entra durante el mes con tus gastos principales, gastos pequeños y cuotas de deuda.";
  const indicators = [
    {
      label: "Margen mensual",
      value: metrics.estimatedMarginLabel,
      detail:
        metrics.estimatedMargin !== null
          ? metrics.estimatedMargin < 0
            ? "Tus salidas estimadas superan tus ingresos; el signo negativo muestra cuánto falta en el mes."
            : metrics.isCashflowExact
              ? "Calculado con tus datos ingresados."
              : "Calculado con datos ingresados y rangos disponibles."
          : "Requiere datos de ingresos y salidas."
    },
    {
      label: "Salidas frente a ingresos",
      value: metrics.expensePercentageLabel,
      detail: metrics.expenseRatioInterpretation
    },
    {
      label: metrics.currentSavingsDisplay.label,
      value: metrics.currentSavingsDisplay.value,
      detail: metrics.currentSavingsDisplay.helper
    },
    {
      label: "Pequeños gastos",
      value: metrics.smallExpensesMetricLabel,
      detail: metrics.smallExpensesDetail
    },
    {
      label: "Peso de deudas",
      value: metrics.debtPaymentLabel,
      detail: metrics.debtPaymentInterpretation
    }
  ];
  const emergencyMessage =
    metrics.snapshot.emergencyFund.coverageMonths !== null
      ? `${metrics.snapshot.emergencyFund.label}. Con estos datos, tu ahorro cubre cerca de ${metrics.snapshot.emergencyFund.coverageMonths.toFixed(1).replace(".0", "")} meses de gastos principales.`
      : metrics.snapshot.emergencyFund.label;
  const emergencyCoverageLabel =
    metrics.snapshot.emergencyFund.coverageMonths !== null
      ? `${metrics.snapshot.emergencyFund.coverageMonths
          .toFixed(1)
          .replace(".0", "")} meses`
      : "Por calcular";
  const emergencyTone: FinancialEducationStoryTone =
    metrics.snapshot.emergencyFund.status === "solid" ||
    metrics.snapshot.emergencyFund.status === "strong"
      ? "positive"
      : metrics.snapshot.emergencyFund.status === "building"
        ? "neutral"
        : metrics.snapshot.emergencyFund.status === "none" ||
            metrics.snapshot.emergencyFund.status === "starter"
          ? "warning"
          : "neutral";
  const emergencyPlainLanguage =
    metrics.snapshot.emergencyFund.coverageMonths === null
      ? "Necesitamos tu ahorro actual y tus gastos principales para estimar cuántos meses podrías cubrir."
      : metrics.snapshot.emergencyFund.coverageMonths < 1
        ? "Tu ahorro todavía no cubriría un mes completo de gastos."
        : `Si tus ingresos se interrumpieran, tu ahorro podría cubrir cerca de ${emergencyCoverageLabel}.`;
  const debtMessage = getDebtMessage(metrics);
  const debtActionMessage = getDebtActionMessage(metrics);
  const debtLevelLabel =
    metrics.snapshot.debt.level === "none"
      ? "Sin presión de deuda reportada"
      : metrics.snapshot.debt.level === "low"
        ? "Presión de deuda baja"
        : metrics.snapshot.debt.level === "medium"
          ? "Presión de deuda moderada"
          : metrics.snapshot.debt.level === "high"
            ? "Presión de deuda alta"
            : "Presión de deuda por evaluar";
  const debtTone: FinancialEducationStoryTone =
    metrics.snapshot.debt.level === "none" || metrics.snapshot.debt.level === "low"
      ? "positive"
      : metrics.snapshot.debt.level === "medium"
        ? "warning"
        : metrics.snapshot.debt.level === "high"
          ? "critical"
          : "neutral";
  const debtRatioLabel =
    metrics.snapshot.debt.debtToIncomeRatio !== null
      ? `${Math.round(metrics.snapshot.debt.debtToIncomeRatio * 100)}% del ingreso`
      : metrics.debtPaymentLabel;
  const debtPlainLanguage =
    metrics.snapshot.debt.level === "none"
      ? "No reportaste pagos de deuda que presionen tu presupuesto mensual."
      : metrics.snapshot.debt.level === "low"
        ? "Tus pagos de deuda parecen ocupar una parte manejable de tu presupuesto."
        : metrics.snapshot.debt.level === "medium"
          ? "Tus deudas necesitan considerarse antes de aumentar otros compromisos mensuales."
          : metrics.snapshot.debt.level === "high"
            ? "Una parte importante de tu presupuesto podría estar comprometida por pagos de deuda."
            : "Necesitamos conocer tu situación y el peso mensual de los pagos para estimar esta presión.";
  const shouldShowDebtDetailsCta =
    metrics.snapshot.debt.level === "medium" ||
    metrics.snapshot.debt.level === "high" ||
    (metrics.snapshot.debt.source === "reported" &&
      metrics.snapshot.debt.registeredDebtCount === 0);
  const debtDetailsCtaLabel =
    metrics.snapshot.debt.registeredDebtCount > 0
      ? "Ver deudas registradas"
      : "Agregar deudas para calcular mejor";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Sparkles color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tu diagnóstico financiero</Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Esta es una primera orientación basada en la información que compartiste.
              </Text>
            </View>
          </View>

          <InfoCard
            icon={<Sparkles color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Prioridad sugerida"
          >
            <Text style={styles.highlightTitle}>{priority.title}</Text>
            <Text style={styles.text}>{priority.text}</Text>
            {declaredGoalContext ? <Text style={styles.text}>{declaredGoalContext}</Text> : null}
          </InfoCard>

          <InfoCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Indicadores clave"
          >
            <View style={styles.metricsGrid}>
              {indicators.map((indicator) => (
                <MetricCard
                  key={indicator.label}
                  label={indicator.label}
                  tone={getMetricTone(indicator.label, metrics)}
                  value={indicator.value}
                />
              ))}
            </View>
          </InfoCard>

          <InfoCard
            headerAction={
              metrics.canEstimateMonthlyFlow ? (
                <FinancialEducationModal
                  accessibilityLabel="Explicar el flujo mensual"
                  guidanceMode={guidanceMode}
                  icon={<PiggyBank color={colors.primary} size={23} strokeWidth={2.4} />}
                  title="Tu flujo mensual"
                >
                  <FinancialEducationStory
                    calculationItems={[
                      {
                        label: "Ingresos",
                        value:
                          metrics.incomeValue !== null
                            ? formatCOP(metrics.incomeValue)
                            : metrics.incomeDisplay.value
                      },
                      {
                        label: "Salidas mensuales",
                        operator: "−",
                        value:
                          metrics.totalOutflowValue !== null
                            ? formatCOP(metrics.totalOutflowValue)
                            : "No disponible"
                      },
                      {
                        emphasis: true,
                        label: "Margen",
                        operator: "=",
                        value:
                          metrics.estimatedMargin !== null
                            ? formatSignedCOP(metrics.estimatedMargin)
                            : metrics.estimatedMarginLabel
                      }
                    ]}
                    closeLabel="Cerrar"
                    definition={
                      metrics.snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
                        ? "El margen mensual es lo que queda al restar gastos mensuales y cuotas de deuda de los ingresos. Los gastos pequeños ya están incluidos en el total mensual."
                        : "El margen mensual es lo que queda al restar gastos principales, gastos pequeños y cuotas de deuda de los ingresos."
                    }
                    guidanceMode={guidanceMode}
                    plainLanguage={flowPlainLanguage}
                    resultDescription={flowResultDescription}
                    resultLabel={flowResultLabel}
                    resultValue={
                      metrics.estimatedMargin !== null
                        ? formatSignedCOP(metrics.estimatedMargin)
                        : metrics.estimatedMarginLabel
                    }
                    tone={flowEducationTone}
                  />
                </FinancialEducationModal>
              ) : undefined
            }
            icon={<PiggyBank color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Lectura de tu flujo mensual"
          >
            {metrics.canEstimateMonthlyFlow ? (
              <>
                <View style={styles.valueRows}>
                  <ValueRow label={metrics.incomeDisplay.label} value={metrics.incomeDisplay.value} />
                  <ValueRow label={metrics.expenseDisplay.label} value={metrics.expenseDisplay.value} />
                  <ValueRow label="Gastos pequeños" value={metrics.smallExpensesMetricLabel} />
                  <ValueRow
                    label="Cuotas de deuda"
                    value={`${formatCOP(metrics.snapshot.cashflow.monthlyDebtPayments)}${
                      metrics.snapshot.debt.isPaymentEstimated ? " aprox." : ""
                    }`}
                  />
                  <ValueRow
                    label="Salidas mensuales"
                    value={
                      metrics.totalOutflowValue !== null
                        ? `${formatCOP(metrics.totalOutflowValue)}${
                            metrics.isCashflowExact ? "" : " aprox."
                          }`
                        : "No disponible"
                    }
                  />
                  <ValueRow label="Margen mensual" value={metrics.estimatedMarginLabel} />
                  <ValueRow label="Salidas frente a ingresos" value={metrics.expensePercentageLabel} />
                </View>

                {metrics.estimatedMargin !== null && metrics.estimatedMargin < 0 ? (
                  <Text style={styles.warningText}>
                    Tus salidas superan tus ingresos. El signo negativo muestra cuánto faltaría en
                    un mes.
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.flowBarTrack,
                    hasPositiveMargin && styles.flowBarTrackMargin,
                    hasNoMargin && styles.flowBarTrackWarning
                  ]}
                >
                  <View
                    style={[
                      styles.flowBarExpenses,
                      expensesAreHigh && styles.flowBarExpensesWarning,
                      { width: toPercentWidth(expenseBarWidth) }
                    ]}
                  />
                  {smallExpensesBarWidth > 0 ? (
                    <View
                      style={[
                        styles.flowBarSmallExpenses,
                        expensesAreHigh && styles.flowBarSmallExpensesWarning,
                        { width: toPercentWidth(smallExpensesBarWidth) }
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotExpenses]} />
                    <Text style={styles.legendText}>Gastos ({otherExpensesPercentage}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotSmallExpenses]} />
                    <Text style={styles.legendText}>
                      Pequeños gastos ({metrics.smallExpensePercentage ?? 0}%)
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotMargin]} />
                    <Text style={styles.legendText}>Margen ({marginPercentage}%)</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.text}>
                No tenemos suficiente información para estimar tu flujo mensual. Puedes ajustar tus
                rangos para obtener una lectura más clara.
              </Text>
            )}
          </InfoCard>

          <InfoCard
            headerAction={
              <FinancialEducationModal
                accessibilityLabel="Explicar el fondo de emergencia"
                guidanceMode={guidanceMode}
                icon={<ShieldCheck color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Tu fondo de emergencia"
              >
                <FinancialEducationStory
                  calculationItems={[
                    {
                      label: "Ahorro actual",
                      value:
                        metrics.currentSavingsValue !== null
                          ? formatCOP(metrics.currentSavingsValue)
                          : metrics.currentSavingsDisplay.value
                    },
                    {
                      label: "Gastos principales",
                      operator: "÷",
                      value:
                        metrics.expenseValue !== null
                          ? formatCOP(metrics.expenseValue)
                          : metrics.expenseDisplay.value
                    },
                    {
                      emphasis: true,
                      label: "Cobertura",
                      operator: "=",
                      value: emergencyCoverageLabel
                    }
                  ]}
                  calculationTitle="Cómo estimamos tu cobertura"
                  closeLabel="Cerrar"
                  definition="El fondo de emergencia indica cuántos meses de gastos podrías cubrir con el ahorro que tienes disponible."
                  guidanceMode={guidanceMode}
                  plainLanguage={emergencyPlainLanguage}
                  plainLanguageBadge={
                    metrics.snapshot.emergencyFund.coverageMonths !== null
                      ? `${metrics.snapshot.emergencyFund.coverageMonths
                          .toFixed(1)
                          .replace(".0", "")}m`
                      : "Meses"
                  }
                  resultDescription={metrics.snapshot.emergencyFund.label}
                  resultLabel="Cobertura de emergencia"
                  resultValue={emergencyCoverageLabel}
                  tone={emergencyTone}
                />
              </FinancialEducationModal>
            }
            icon={<ShieldCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Fondo de emergencia"
          >
            <Text style={styles.text}>{emergencyMessage}</Text>
          </InfoCard>

          <InfoCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Pequeños gastos"
          >
            {smallExpensesMessages.map((message) => (
              <Text key={message} style={styles.text}>
                {message}
              </Text>
            ))}
          </InfoCard>

          <InfoCard
            headerAction={
              <FinancialEducationModal
                accessibilityLabel="Explicar la presión de deuda"
                guidanceMode={guidanceMode}
                icon={<Landmark color={colors.primary} size={23} strokeWidth={2.4} />}
                title="Presión de tus deudas"
              >
                <FinancialEducationStory
                  calculationItems={[
                    {
                      label: "Pago mensual",
                      value: metrics.debtPaymentLabel
                    },
                    {
                      label: "Frente a tus ingresos",
                      operator: "+",
                      value: debtRatioLabel
                    },
                    {
                      emphasis: true,
                      label: "Resultado",
                      operator: "=",
                      value: debtLevelLabel
                    }
                  ]}
                  calculationTitle="Qué usamos para evaluarla"
                  closeLabel="Cerrar"
                  definition="La presión de deuda compara los pagos mensuales de deuda con tus ingresos y considera el estado de las deudas que hayas detallado."
                  estimateLabel={
                    metrics.snapshot.debt.source === "none"
                      ? "Según tus respuestas"
                      : "Con tus deudas registradas"
                  }
                  guidanceMode={guidanceMode}
                  plainLanguage={debtPlainLanguage}
                  plainLanguageBadge={
                    metrics.snapshot.debt.debtToIncomeRatio !== null
                      ? `${Math.round(metrics.snapshot.debt.debtToIncomeRatio * 100)}%`
                      : "Deuda"
                  }
                  resultDescription={metrics.snapshot.debt.label}
                  resultLabel={debtLevelLabel}
                  resultValue={debtRatioLabel}
                  tone={debtTone}
                />
              </FinancialEducationModal>
            }
            icon={<Landmark color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Deudas"
          >
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Deudas</Text>
              <Text style={styles.text}>{debtMessage}</Text>
              {debtActionMessage ? <Text style={styles.text}>{debtActionMessage}</Text> : null}
              {shouldShowDebtDetailsCta && session ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/debts")}
                  style={({ pressed }) => [styles.debtCta, pressed && styles.pressed]}
                >
                  <Text style={styles.debtCtaText}>{debtDetailsCtaLabel}</Text>
                  <ChevronRight color={colors.primary} size={20} strokeWidth={2.5} />
                </Pressable>
              ) : shouldShowDebtDetailsCta ? (
                <View style={styles.debtGuestNote}>
                  <ShieldCheck color={colors.primary} size={18} strokeWidth={2.4} />
                  <Text style={styles.debtGuestNoteText}>
                    Podrás agregar el detalle de tus deudas después de iniciar sesión para
                    mejorar los cálculos.
                  </Text>
                </View>
              ) : null}
            </View>
          </InfoCard>

          <InfoCard
            icon={<AlertCircle color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Qué significa esto"
          >
            <Text style={styles.text}>{getMeaningMessage(priority)}</Text>
          </InfoCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Ver simulación"
              iconPosition="right"
              onPress={() => router.push({ pathname: "/simulation", params: { source: "flow" } })}
              title="Ver simulación"
            />
            <PrimaryButton
              accessibilityLabel="Volver a la pantalla anterior"
              icon={null}
              onPress={() => router.back()}
              style={styles.secondaryButton}
              title="Volver"
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
  highlightTitle: {
    color: colors.primaryDark,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  warningText: {
    color: "#9A5B20",
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 170,
    padding: spacing.md
  },
  metricCardPositive: {
    backgroundColor: colors.supportSoft,
    borderColor: "#B9E9CD"
  },
  metricCardWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textTransform: "uppercase"
  },
  valueText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  flowBarTrack: {
    backgroundColor: "#E4EAF2",
    borderRadius: radius.pill,
    height: 12,
    overflow: "hidden",
    position: "relative"
  },
  flowBarTrackMargin: {
    backgroundColor: colors.support
  },
  flowBarTrackWarning: {
    backgroundColor: "#FED7AA"
  },
  flowBarExpenses: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0
  },
  flowBarExpensesWarning: {
    backgroundColor: "#F97316"
  },
  flowBarSmallExpenses: {
    backgroundColor: "#F59E0B",
    borderBottomLeftRadius: radius.pill,
    borderTopLeftRadius: radius.pill,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0
  },
  flowBarSmallExpensesWarning: {
    backgroundColor: "#B45309"
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between"
  },
  legendItem: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  legendDotExpenses: {
    backgroundColor: colors.primary
  },
  legendDotMargin: {
    backgroundColor: colors.support
  },
  legendDotSmallExpenses: {
    backgroundColor: "#F59E0B"
  },
  legendText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small
  },
  subsection: {
    gap: spacing.xs
  },
  subsectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  actionsList: {
    gap: spacing.sm
  },
  actionItem: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  actionNumber: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  actionNumberText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  actionText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  debtCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  debtCtaText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  debtGuestNote: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  debtGuestNoteText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
});
