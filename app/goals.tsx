import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShieldCheck, Target } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { SelectableOption } from "../components/SelectableOption";
import { StepIndicator } from "../components/StepIndicator";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const financialGoals = [
  "Organizar mis gastos",
  "Crear un fondo de emergencia",
  "Pagar deudas",
  "Ahorrar para vivienda",
  "Ahorrar para estudiar",
  "Ahorrar para viajar",
  "Empezar a invertir",
  "Ahorrar para un negocio",
  "Prepararme para el futuro",
  "No sé todavía, ayúdame a elegir"
] as const;

const goalHorizons = [
  "Menos de 6 meses",
  "6 – 12 meses",
  "1 – 3 años",
  "3 – 5 años",
  "Más de 5 años",
  "No estoy seguro"
] as const;

const goalPriorities = ["Baja", "Media", "Alta", "Muy alta"] as const;

const goalAmountRanges = [
  "No tengo una cifra todavía",
  "Menos de $1.000.000",
  "$1.000.000 – $5.000.000",
  "$5.000.000 – $20.000.000",
  "$20.000.000 – $50.000.000",
  "Más de $50.000.000",
  "Prefiero definirla después"
] as const;

const organizationDetails = [
  "Entender en qué se va mi dinero",
  "Crear un presupuesto mensual",
  "Reducir gastos variables",
  "Separar dinero para una meta",
  "Prefiero definirlo después"
] as const;

const investmentDetails = [
  "La diferencia entre ahorrar e invertir",
  "Riesgo y plazo",
  "Cuánto podría separar",
  "Cómo comparar escenarios",
  "Prefiero definirlo después"
] as const;

const undecidedGoalDetails = [
  "Ver una recomendación inicial",
  "Comparar varias metas",
  "Entender qué es más urgente",
  "Prefiero definirlo después"
] as const;

type GoalDetailQuestion = {
  question: string;
  options: readonly string[];
};

function getGoalDetailQuestion(goal: string | null): GoalDetailQuestion {
  if (goal === "Organizar mis gastos") {
    return {
      question: "¿Qué te gustaría ordenar primero?",
      options: organizationDetails
    };
  }

  if (goal === "Empezar a invertir") {
    return {
      question: "¿Qué te gustaría entender primero?",
      options: investmentDetails
    };
  }

  if (goal === "No sé todavía, ayúdame a elegir") {
    return {
      question: "¿Qué te ayudaría a decidir?",
      options: undecidedGoalDetails
    };
  }

  return {
    question: "¿Tienes una cifra aproximada en mente?",
    options: goalAmountRanges
  };
}

export default function GoalsScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(onboarding.financialGoal);
  const [selectedHorizon, setSelectedHorizon] = useState<string | null>(
    onboarding.goalHorizon
  );
  const [selectedPriority, setSelectedPriority] = useState<string | null>(
    onboarding.goalPriority
  );
  const [selectedAmountRange, setSelectedAmountRange] = useState<string | null>(
    onboarding.goalAmountRange
  );

  const canContinue = Boolean(selectedGoal && selectedHorizon && selectedPriority);
  const goalDetailQuestion = getGoalDetailQuestion(selectedGoal);

  const handleGoalSelect = (goal: string) => {
    if (goal !== selectedGoal) {
      setSelectedAmountRange(null);
    }

    setSelectedGoal(goal);
  };

  const handleContinue = () => {
    if (!selectedGoal || !selectedHorizon || !selectedPriority) {
      return;
    }

    updateOnboarding({
      financialGoal: selectedGoal,
      goalHorizon: selectedHorizon,
      goalPriority: selectedPriority,
      goalAmountRange: selectedAmountRange
    });
    router.push("/summary");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <StepIndicator currentStep={8} label="META FINANCIERA" totalSteps={8} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Target color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tu primera meta financiera</Text>

            <Text style={styles.subtitle}>
              Elige qué quieres lograr primero. Si aún no lo tienes claro, podemos ayudarte a
              descubrir una prioridad inicial.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>No necesitas tener una cifra exacta para empezar.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué quieres lograr primero?</Text>
            <View style={styles.optionsList}>
              {financialGoals.map((goal) => (
                <SelectableOption
                  key={goal}
                  label={goal}
                  onPress={() => handleGoalSelect(goal)}
                  selected={selectedGoal === goal}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿En cuánto tiempo te gustaría lograr o avanzar en esta meta?
            </Text>
            <View style={styles.optionsList}>
              {goalHorizons.map((horizon) => (
                <SelectableOption
                  key={horizon}
                  label={horizon}
                  onPress={() => setSelectedHorizon(horizon)}
                  selected={selectedHorizon === horizon}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué tan importante es esta meta para ti?</Text>
            <View style={styles.optionsList}>
              {goalPriorities.map((priority) => (
                <SelectableOption
                  key={priority}
                  label={priority}
                  onPress={() => setSelectedPriority(priority)}
                  selected={selectedPriority === priority}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>{goalDetailQuestion.question}</Text>
            <Text style={styles.optionalText}>Opcional</Text>
            <View style={styles.optionsList}>
              {goalDetailQuestion.options.map((amountRange) => (
                <SelectableOption
                  key={amountRange}
                  label={amountRange}
                  onPress={() => setSelectedAmountRange(amountRange)}
                  selected={selectedAmountRange === amountRange}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Revisar mis respuestas antes del diagnóstico"
              disabled={!canContinue}
              icon={null}
              onPress={handleContinue}
              title="Revisar mis respuestas"
            />
            <PrimaryButton
              accessibilityLabel="Volver a ahorros y deudas"
              icon={null}
              onPress={() => router.push("/savings-debts")}
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
  questionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24
  },
  optionalText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: -spacing.sm,
    textTransform: "uppercase"
  },
  optionsList: {
    gap: spacing.sm
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
