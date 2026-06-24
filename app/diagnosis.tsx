import { useMemo, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ClipboardCheck,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Sparkles
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import {
  formatCOP,
  getCurrentSavingsDisplay,
  getFinancialDataSourceLabel,
  getMonthlyExpensesDisplay,
  getMonthlyIncomeDisplay,
  getPreferredCurrentSavings,
  getPreferredMonthlyExpenses,
  getPreferredMonthlyIncome,
  getSmallExpenseRangeEstimate,
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

type PriorityKey = "debt" | "emergency" | "expenses" | "smallExpenses" | "investment" | "goal";

type MainPriority = {
  key: PriorityKey;
  title: string;
  text: string;
};

type FinancialMetrics = {
  incomeDisplay: FinancialDisplay;
  expenseDisplay: FinancialDisplay;
  currentSavingsDisplay: FinancialDisplay;
  incomeValue: number | null;
  expenseValue: number | null;
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
  emergencyLabel: string;
  canEstimateMonthlyFlow: boolean;
};

function isLowEmergencyCoverage(emergencyCoverage: string | null) {
  return emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes";
}

function hasDebtConcern(debtSituation: string | null) {
  return (
    debtSituation === "Son una preocupación importante" ||
    debtSituation === "A veces me cuesta pagarlas"
  );
}

function hasHighDebtPaymentShare(debtPaymentShare: string | null) {
  return debtPaymentShare === "Más del 40%" || debtPaymentShare === "20% – 40%";
}

function hasSmallExpensePlan(onboarding: OnboardingSnapshot) {
  return (
    onboarding.hasSmallExpenses === "Sí" &&
    (onboarding.smallExpensesIntention === "Reducir algunos" ||
      onboarding.smallExpensesIntention === "Establecer un límite mensual")
  );
}

function wantsInvestmentEducation(investmentSituation: string | null) {
  return (
    investmentSituation === "No, pero quiero aprender" ||
    investmentSituation === "Sí, pero no entiendo bien cómo funcionan"
  );
}

function toPercentWidth(value: number): `${number}%` {
  return `${value}%`;
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
    return "Tus gastos están cerca de tus ingresos.";
  }

  return "Tus gastos podrían superar tus ingresos.";
}

function getDebtPaymentInterpretation(debtPaymentShare: string | null) {
  if (debtPaymentShare === "No pago deudas") {
    return "Sin peso mensual de deuda.";
  }

  if (debtPaymentShare === "Menos del 10%") {
    return "Peso bajo.";
  }

  if (debtPaymentShare === "10% – 20%") {
    return "Peso moderado.";
  }

  if (debtPaymentShare === "20% – 40%") {
    return "Peso alto.";
  }

  if (debtPaymentShare === "Más del 40%") {
    return "Peso muy alto.";
  }

  if (debtPaymentShare === "No estoy seguro") {
    return "Conviene estimarlo.";
  }

  if (debtPaymentShare === "Prefiero no responder") {
    return "No evaluado.";
  }

  return "No disponible";
}

function getDebtPaymentLabel(debtPaymentShare: string | null) {
  if (!debtPaymentShare) {
    return "No disponible";
  }

  if (
    debtPaymentShare === "No pago deudas" ||
    debtPaymentShare === "No estoy seguro" ||
    debtPaymentShare === "Prefiero no responder"
  ) {
    return debtPaymentShare;
  }

  return `${debtPaymentShare} de ingresos`;
}

function getFinancialMetrics(
  onboarding: OnboardingSnapshot,
  exactValues: ExactFinancialValues
): FinancialMetrics {
  const financialProfile = { onboarding, exactValues };
  const incomeDisplay = getMonthlyIncomeDisplay(financialProfile);
  const expenseDisplay = getMonthlyExpensesDisplay(financialProfile);
  const currentSavingsDisplay = getCurrentSavingsDisplay(financialProfile);
  const smallExpenseEstimate = getSmallExpenseRangeEstimate(onboarding.smallExpensesRange);
  const incomeMidpoint = getPreferredMonthlyIncome(financialProfile);
  const expenseMidpoint = getPreferredMonthlyExpenses(financialProfile);
  const currentSavingsValue = getPreferredCurrentSavings(financialProfile);
  const smallExpenseMidpoint = smallExpenseEstimate.midpoint;
  const estimatedMargin =
    incomeMidpoint !== null && incomeMidpoint > 0 && expenseMidpoint !== null
      ? incomeMidpoint - expenseMidpoint
      : null;
  const expensePercentage =
    incomeMidpoint !== null && incomeMidpoint > 0 && expenseMidpoint !== null
      ? Math.round((expenseMidpoint / incomeMidpoint) * 100)
      : null;
  const smallExpensePercentage =
    incomeMidpoint !== null && incomeMidpoint > 0 && smallExpenseMidpoint !== null
      ? Math.round((smallExpenseMidpoint / incomeMidpoint) * 100)
      : null;

  let estimatedMarginLabel = "No disponible";

  if (estimatedMargin !== null) {
    estimatedMarginLabel =
      estimatedMargin > 0
        ? incomeDisplay.source === "exact" && expenseDisplay.source === "exact"
          ? formatCOP(estimatedMargin)
          : `${formatCOP(estimatedMargin)} aprox.`
        : "Margen ajustado";
  }

  const smallExpensesMetricLabel =
    onboarding.hasSmallExpenses === "No"
      ? "No identificados"
      : onboarding.smallExpensesRange ?? "No disponible";
  const smallExpensesDetail =
    smallExpensePercentage !== null
      ? `Cerca del ${smallExpensePercentage}% de tus ingresos mensuales.`
      : onboarding.smallExpensesRange
        ? "Rango seleccionado, sin porcentaje calculado."
        : "No disponible";

  return {
    incomeDisplay,
    expenseDisplay,
    currentSavingsDisplay,
    incomeValue: incomeMidpoint,
    expenseValue: expenseMidpoint,
    currentSavingsValue,
    smallExpenseEstimate,
    estimatedMargin,
    expensePercentage,
    smallExpensePercentage,
    estimatedMarginLabel,
    expensePercentageLabel:
      expensePercentage !== null
        ? incomeDisplay.source === "exact" && expenseDisplay.source === "exact"
          ? `${expensePercentage}%`
          : `${expensePercentage}% aprox.`
        : "No disponible",
    expenseRatioInterpretation: getExpenseRatioInterpretation(expensePercentage),
    smallExpensesMetricLabel,
    smallExpensesDetail,
    debtPaymentLabel: getDebtPaymentLabel(onboarding.debtPaymentShare),
    debtPaymentInterpretation: getDebtPaymentInterpretation(onboarding.debtPaymentShare),
    emergencyLabel: onboarding.emergencyCoverage ?? "No disponible",
    canEstimateMonthlyFlow: estimatedMargin !== null && expensePercentage !== null
  };
}

function getMainPriority(onboarding: OnboardingSnapshot, metrics: FinancialMetrics): MainPriority {
  if (onboarding.debtSituation === "Son una preocupación importante") {
    return {
      key: "debt",
      title: "Tu prioridad podría ser revisar tus deudas",
      text:
        "Con tus respuestas actuales, puede ser útil entender qué deudas pesan más en tu presupuesto antes de avanzar hacia metas más exigentes."
    };
  }

  if (onboarding.debtSituation === "A veces me cuesta pagarlas") {
    return {
      key: "debt",
      title: "Tu prioridad podría ser revisar tus deudas",
      text: "Parece conveniente revisar tus deudas y entender cuáles tienen mayor impacto mensual."
    };
  }

  if (onboarding.debtPaymentShare === "Más del 40%") {
    return {
      key: "debt",
      title: "Tu prioridad podría ser reducir el peso de tus deudas",
      text:
        "Una parte importante de tus ingresos podría estar comprometida en pagos de deudas. Revisarlas puede ayudarte a recuperar margen mensual."
    };
  }

  if (isLowEmergencyCoverage(onboarding.emergencyCoverage)) {
    return {
      key: "emergency",
      title: "Tu prioridad podría ser fortalecer tu fondo de emergencia",
      text:
        "Con tus respuestas actuales, construir una base para imprevistos puede darte más tranquilidad antes de asumir metas más grandes."
    };
  }

  if (metrics.expensePercentage !== null && metrics.expensePercentage >= 85) {
    return {
      key: "expenses",
      title: "Tu prioridad podría ser organizar tus gastos",
      text:
        "Tus gastos parecen ocupar una parte alta de tus ingresos. Revisarlos puede ayudarte a encontrar margen para ahorrar."
    };
  }

  if (
    onboarding.expensesFeeling === "Me preocupa no poder ahorrar" ||
    onboarding.expensesFeeling === "No sé en qué se va mi dinero"
  ) {
    return {
      key: "expenses",
      title: "Tu prioridad podría ser organizar tus gastos",
      text: "Parece útil entender mejor tus gastos mensuales para encontrar oportunidades de ahorro."
    };
  }

  if (hasSmallExpensePlan(onboarding)) {
    return {
      key: "smallExpenses",
      title: "Tu prioridad podría ser controlar tus gastos pequeños",
      text:
        "Tus pequeños gastos frecuentes pueden ser una oportunidad para liberar dinero sin hacer cambios drásticos."
    };
  }

  if (wantsInvestmentEducation(onboarding.investmentSituation)) {
    return {
      key: "investment",
      title: "Tu prioridad podría ser aprender sobre inversión",
      text:
        "Antes de tomar decisiones de inversión, puede ser útil entender conceptos como riesgo, plazo y liquidez."
    };
  }

  return {
    key: "goal",
    title: "Tu prioridad podría ser avanzar hacia tu meta financiera",
    text:
      "Con tus respuestas actuales, puedes empezar a trabajar en acciones concretas para acercarte a tu meta."
  };
}

function getEmergencyMessage(emergencyCoverage: string | null) {
  if (emergencyCoverage === "No podría cubrirlos" || emergencyCoverage === "Menos de 1 mes") {
    return "Tu fondo de emergencia parece ser una prioridad inicial. Tener una base para imprevistos puede ayudarte a evitar deudas inesperadas.";
  }

  if (emergencyCoverage === "1 – 3 meses") {
    return "Ya tienes una base, pero podrías fortalecerla para cubrir más imprevistos.";
  }

  if (emergencyCoverage === "3 – 6 meses") {
    return "Tienes una cobertura saludable frente a imprevistos.";
  }

  if (emergencyCoverage === "Más de 6 meses") {
    return "Tienes una cobertura fuerte frente a imprevistos.";
  }

  if (emergencyCoverage === "No estoy seguro") {
    return "Podrías empezar calculando tus gastos esenciales mensuales.";
  }

  return "No tenemos suficiente información para orientar esta parte todavía.";
}

function getSmallExpensesMessages(onboarding: OnboardingSnapshot, metrics: FinancialMetrics) {
  if (onboarding.hasSmallExpenses === "Sí") {
    const categories =
      onboarding.smallExpenseCategories.length > 0
        ? onboarding.smallExpenseCategories.join(", ")
        : "categorías por revisar";
    const messages = [
      `Identificaste pequeños gastos frecuentes en: ${categories}.`,
      `Estimación mensual: ${onboarding.smallExpensesRange ?? "No respondido"}.`
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

function getDebtMessage(onboarding: OnboardingSnapshot) {
  if (
    onboarding.debtSituation === "Prefiero no responder" ||
    onboarding.debtPaymentShare === "Prefiero no responder"
  ) {
    return "No evaluamos tus deudas porque preferiste no responder.";
  }

  if (onboarding.debtSituation === "No tengo deudas") {
    return "No reportaste deudas actualmente.";
  }

  if (
    onboarding.debtSituation === "A veces me cuesta pagarlas" ||
    onboarding.debtSituation === "Son una preocupación importante" ||
    onboarding.debtPaymentShare === "Más del 40%"
  ) {
    return "Tus deudas podrían estar limitando tu capacidad para avanzar hacia otras metas.";
  }

  if (
    onboarding.debtSituation === "Tengo deudas, pero las pago sin problema" &&
    (onboarding.debtPaymentShare === "Menos del 10%" || onboarding.debtPaymentShare === "10% – 20%")
  ) {
    return "Tus deudas parecen manejables, pero conviene monitorear cuánto pesan cada mes.";
  }

  if (onboarding.debtPaymentShare === "No estoy seguro") {
    return "Conviene estimar cuánto pesan tus pagos de deudas dentro de tus ingresos mensuales.";
  }

  if (onboarding.debtSituation) {
    return "Tus deudas requieren seguimiento para entender cuánto margen mensual te dejan.";
  }

  return "No tenemos suficiente información sobre tus deudas todavía.";
}

function getInvestmentMessage(investmentSituation: string | null) {
  if (investmentSituation === "No tengo inversiones") {
    return "Antes de invertir, puede ser útil fortalecer tu ahorro y entender conceptos básicos.";
  }

  if (investmentSituation === "No, pero quiero aprender") {
    return "Podrías empezar aprendiendo conceptos como riesgo, plazo, liquidez y diversificación.";
  }

  if (investmentSituation === "Sí, pero no entiendo bien cómo funcionan") {
    return "Podrías revisar qué tipo de inversiones tienes y qué riesgos asumes.";
  }

  if (investmentSituation === "Sí, y las entiendo") {
    return "Puedes usar simulaciones más adelante para comparar escenarios educativos.";
  }

  if (investmentSituation === "Prefiero no responder") {
    return "No evaluamos tu situación de inversión.";
  }

  return "No tenemos suficiente información sobre inversiones todavía.";
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

  if (priority.key === "investment") {
    return "En tu caso, aprender conceptos básicos antes de tomar decisiones puede ayudarte a comparar escenarios con más calma y entender mejor el riesgo.";
  }

  return "En tu caso, ya puedes empezar a traducir tu meta en una acción concreta y pequeña para esta semana, usando tus rangos como una primera referencia.";
}

function goalNeedsConcreteAmount(
  onboarding: OnboardingSnapshot,
  exactValues: ExactFinancialValues
) {
  const goalsWithAmount = [
    "Crear un fondo de emergencia",
    "Pagar deudas",
    "Ahorrar para vivienda",
    "Ahorrar para estudiar",
    "Ahorrar para viajar",
    "Ahorrar para un negocio",
    "Prepararme para el futuro"
  ];

  return (
    onboarding.financialGoal !== null &&
    goalsWithAmount.includes(onboarding.financialGoal) &&
    exactValues.goalTargetAmount === undefined &&
    (!onboarding.goalAmountRange ||
      onboarding.goalAmountRange === "No tengo una cifra todavía" ||
      onboarding.goalAmountRange === "Prefiero definirla después")
  );
}

function getRecommendedActions(
  onboarding: OnboardingSnapshot,
  metrics: FinancialMetrics,
  exactValues: ExactFinancialValues
) {
  const actions: string[] = [];
  const addAction = (action: string) => {
    if (!actions.includes(action)) {
      actions.push(action);
    }
  };

  if (hasDebtConcern(onboarding.debtSituation) || hasHighDebtPaymentShare(onboarding.debtPaymentShare)) {
    addAction("Revisa qué deuda tiene mayor impacto en tu presupuesto.");
  }

  if (isLowEmergencyCoverage(onboarding.emergencyCoverage)) {
    addAction("Separa una cantidad fija para tu fondo de emergencia.");
  }

  if (
    (metrics.expensePercentage !== null && metrics.expensePercentage >= 85) ||
    onboarding.expensesFeeling === "Me preocupa no poder ahorrar" ||
    onboarding.expensesFeeling === "No sé en qué se va mi dinero"
  ) {
    addAction("Revisa tus gastos variables esta semana.");
  }

  if (hasSmallExpensePlan(onboarding)) {
    addAction("Define un límite mensual para tus gastos pequeños frecuentes.");
  }

  if (onboarding.debtPaymentShare === "No estoy seguro") {
    addAction("Estima qué porcentaje de tus ingresos se va en deudas.");
  }

  if (wantsInvestmentEducation(onboarding.investmentSituation)) {
    addAction("Aprende la diferencia entre ahorrar e invertir.");
  }

  if (goalNeedsConcreteAmount(onboarding, exactValues)) {
    addAction("Define una cifra más concreta para tu meta.");
  }

  if (onboarding.emergencyCoverage === "No estoy seguro") {
    addAction("Calcula tus gastos esenciales de un mes.");
  }

  addAction("Elige una acción pequeña para avanzar esta semana.");
  addAction("Calcula tus gastos esenciales de un mes.");
  addAction("Revisa tus gastos variables esta semana.");

  return actions.slice(0, 3);
}

function getMetricTone(label: string, metrics: FinancialMetrics, onboarding: OnboardingSnapshot) {
  if (label === "Margen mensual") {
    if (metrics.estimatedMargin === null) {
      return "neutral";
    }

    return metrics.estimatedMargin > 0 ? "positive" : "warning";
  }

  if (label === "Gastos frente a ingresos") {
    if (metrics.expensePercentage === null) {
      return "neutral";
    }

    return metrics.expensePercentage >= 85 ? "warning" : "positive";
  }

  if (label === "Ahorro actual" || label === "Rango de ahorros") {
    if (metrics.currentSavingsValue === null) {
      return "neutral";
    }

    if (metrics.currentSavingsValue <= 0 || isLowEmergencyCoverage(onboarding.emergencyCoverage)) {
      return "warning";
    }

    return "positive";
  }

  if (label === "Peso de deudas") {
    if (hasHighDebtPaymentShare(onboarding.debtPaymentShare) || hasDebtConcern(onboarding.debtSituation)) {
      return "warning";
    }

    return onboarding.debtPaymentShare === "No pago deudas" || onboarding.debtPaymentShare === "Menos del 10%"
      ? "positive"
      : "neutral";
  }

  return "neutral";
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

function MetricCard({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
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
      <Text style={styles.metricDetail}>{detail}</Text>
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
  const { exactValues, onboarding } = useOnboarding();
  const financialProfile = { onboarding, exactValues };
  const metrics = useMemo(
    () => getFinancialMetrics(onboarding, exactValues),
    [exactValues, onboarding]
  );
  const priority = useMemo(() => getMainPriority(onboarding, metrics), [onboarding, metrics]);
  const recommendedActions = useMemo(
    () => getRecommendedActions(onboarding, metrics, exactValues),
    [exactValues, onboarding, metrics]
  );
  const smallExpensesMessages = useMemo(
    () => getSmallExpensesMessages(onboarding, metrics),
    [onboarding, metrics]
  );
  const expenseBarWidth = Math.min(Math.max(metrics.expensePercentage ?? 0, 0), 100);
  const marginBarWidth =
    metrics.estimatedMargin !== null && metrics.estimatedMargin > 0
      ? Math.max(0, 100 - expenseBarWidth)
      : 0;
  const indicators = [
    {
      label: "Margen mensual",
      value: metrics.estimatedMarginLabel,
      detail:
        metrics.estimatedMargin !== null
          ? metrics.incomeDisplay.source === "exact" && metrics.expenseDisplay.source === "exact"
            ? "Calculado con tus datos ingresados."
            : "Calculado con datos ingresados y rangos disponibles."
          : "Requiere datos de ingresos y gastos."
    },
    {
      label: "Gastos frente a ingresos",
      value: metrics.expensePercentageLabel,
      detail: metrics.expenseRatioInterpretation
    },
    {
      label: metrics.currentSavingsDisplay.label,
      value: metrics.currentSavingsDisplay.value,
      detail: metrics.currentSavingsDisplay.helper
    },
    {
      label: "Gastos hormiga",
      value: metrics.smallExpensesMetricLabel,
      detail: metrics.smallExpensesDetail
    },
    {
      label: "Peso de deudas",
      value: metrics.debtPaymentLabel,
      detail: metrics.debtPaymentInterpretation
    }
  ];

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
              <Sparkles color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tu diagnóstico financiero</Text>

            <Text style={styles.subtitle}>
              Esta es una primera orientación basada en la información que compartiste.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Este diagnóstico es educativo. No es asesoría financiera profesional ni una promesa
                de resultados.
              </Text>
            </View>
          </View>

          <InfoCard
            icon={<Sparkles color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Prioridad sugerida"
          >
            <Text style={styles.highlightTitle}>{priority.title}</Text>
            <Text style={styles.text}>{priority.text}</Text>
          </InfoCard>

          <InfoCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Indicadores clave"
          >
            <View style={styles.metricsGrid}>
              {indicators.map((indicator) => (
                <MetricCard
                  key={indicator.label}
                  detail={indicator.detail}
                  label={indicator.label}
                  tone={getMetricTone(indicator.label, metrics, onboarding)}
                  value={indicator.value}
                />
              ))}
            </View>
            <Text style={styles.helperText}>
              {getFinancialDataSourceLabel(financialProfile)}
            </Text>
          </InfoCard>

          <InfoCard
            icon={<PiggyBank color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Lectura de tu flujo mensual"
          >
            {metrics.canEstimateMonthlyFlow ? (
              <>
                <View style={styles.valueRows}>
                  <ValueRow label={metrics.incomeDisplay.label} value={metrics.incomeDisplay.value} />
                  <ValueRow label={metrics.expenseDisplay.label} value={metrics.expenseDisplay.value} />
                  <ValueRow label="Margen mensual" value={metrics.estimatedMarginLabel} />
                  <ValueRow label="Gastos frente a ingresos" value={metrics.expensePercentageLabel} />
                </View>

                <View style={styles.flowBarTrack}>
                  <View style={[styles.flowBarExpenses, { width: toPercentWidth(expenseBarWidth) }]} />
                  {marginBarWidth > 0 ? (
                    <View style={[styles.flowBarMargin, { width: toPercentWidth(marginBarWidth) }]} />
                  ) : null}
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotExpenses]} />
                    <Text style={styles.legendText}>Gastos</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotMargin]} />
                    <Text style={styles.legendText}>Margen</Text>
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
            icon={<ShieldCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Fondo de emergencia"
          >
            <Text style={styles.text}>{getEmergencyMessage(onboarding.emergencyCoverage)}</Text>
          </InfoCard>

          <InfoCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Gastos hormiga"
          >
            {smallExpensesMessages.map((message) => (
              <Text key={message} style={styles.text}>
                {message}
              </Text>
            ))}
          </InfoCard>

          <InfoCard
            icon={<Landmark color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Deudas e inversiones"
          >
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Deudas</Text>
              <Text style={styles.text}>{getDebtMessage(onboarding)}</Text>
            </View>
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Inversiones</Text>
              <Text style={styles.text}>{getInvestmentMessage(onboarding.investmentSituation)}</Text>
            </View>
          </InfoCard>

          <InfoCard
            icon={<AlertCircle color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Qué significa esto"
          >
            <Text style={styles.text}>{getMeaningMessage(priority)}</Text>
          </InfoCard>

          <InfoCard
            icon={<ClipboardCheck color={colors.primary} size={18} strokeWidth={2.4} />}
            title="Primeras acciones recomendadas"
          >
            <View style={styles.actionsList}>
              {recommendedActions.map((action, index) => (
                <View key={action} style={styles.actionItem}>
                  <View style={styles.actionNumber}>
                    <Text style={styles.actionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          </InfoCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Ver simulación educativa"
              icon={null}
              onPress={() => router.push("/simulation")}
              title="Ver simulación"
            />
            <PrimaryButton
              accessibilityLabel="Editar respuestas del diagnóstico"
              icon={null}
              onPress={() => router.push("/summary")}
              title="Editar respuestas"
              variant="secondary"
            />
            <Pressable
              accessibilityLabel="Volver al inicio de Ruta Financiera"
              accessibilityRole="button"
              onPress={() => router.push("/")}
              style={({ pressed }) => [styles.tertiaryButton, pressed && styles.tertiaryPressed]}
            >
              <Text style={styles.tertiaryText}>Volver al inicio</Text>
            </Pressable>
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
  helperText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
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
  metricDetail: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: "row",
    height: 18,
    overflow: "hidden"
  },
  flowBarExpenses: {
    backgroundColor: colors.primary,
    height: "100%"
  },
  flowBarMargin: {
    backgroundColor: colors.support,
    height: "100%"
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
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
  legendText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
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
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg
  },
  tertiaryPressed: {
    opacity: 0.7
  },
  tertiaryText: {
    color: colors.textSubtle,
    fontSize: typography.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body
  }
});
