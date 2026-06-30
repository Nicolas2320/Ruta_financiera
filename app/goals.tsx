import type { ComponentType } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Baby,
  Banknote,
  BriefcaseBusiness,
  Calendar,
  Car,
  ChartColumnIncreasing,
  CircleQuestionMark,
  Clock,
  CreditCard,
  Crown,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Hourglass,
  House,
  Landmark,
  Layers,
  PenLine,
  PiggyBank,
  Plane,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import {
  createFinancialGoal,
  getLegacyFieldsFromGoal,
  getOnboardingGoals,
  getPrimaryFinancialGoal,
  type FinancialGoal
} from "../types/financial";
import { formatCOP, parseCOPInput } from "../utils/financialRanges";

const goalTargetImage = require("../assets/illustrations/goal-target.png");

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type VisualOption = {
  title: string;
  iconKey?: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
};

const financialGoals: VisualOption[] = [
  {
    title: "Organizar mis gastos",
    iconKey: "expenses",
    icon: Wallet,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Crear un fondo de emergencia",
    iconKey: "emergency",
    icon: PiggyBank,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Pagar deudas",
    iconKey: "debt",
    icon: CreditCard,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Ahorrar para vivienda",
    iconKey: "home",
    icon: House,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Ahorrar para estudiar",
    iconKey: "education",
    icon: GraduationCap,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "Ahorrar para viajar",
    iconKey: "travel",
    icon: Plane,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Empezar a invertir",
    iconKey: "investment",
    icon: ChartColumnIncreasing,
    color: "#F59E0B",
    backgroundColor: colors.warningSoft
  },
  {
    title: "Ahorrar para un negocio",
    iconKey: "business",
    icon: Store,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Prepararme para el futuro",
    iconKey: "future",
    icon: UserRound,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  }
];

const customGoalOption: VisualOption = {
  title: "Otro",
  iconKey: "other",
  icon: Sparkles,
  color: "#7C3AED",
  backgroundColor: "#F1E8FF"
};

const customGoalIconOptions: VisualOption[] = [
  {
    title: "Salud",
    iconKey: "custom-health",
    icon: HeartPulse,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Vehiculo",
    iconKey: "custom-vehicle",
    icon: Car,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Celebracion",
    iconKey: "custom-gift",
    icon: Gift,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  },
  {
    title: "Carrera",
    iconKey: "custom-career",
    icon: BriefcaseBusiness,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Bienestar",
    iconKey: "custom-wellness",
    icon: Dumbbell,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "Familia",
    iconKey: "custom-family",
    icon: Baby,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  }
];

const goalHorizons: VisualOption[] = [
  {
    title: "Menos de 6 meses",
    icon: Clock,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "6 – 12 meses",
    icon: Calendar,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "1 – 3 años",
    icon: Calendar,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "3 – 5 años",
    icon: Calendar,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Más de 5 años",
    icon: Hourglass,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "No estoy seguro",
    icon: CircleQuestionMark,
    color: "#94A3B8",
    backgroundColor: "#EEF2F7"
  }
];

const goalPriorities = ["Baja", "Media", "Alta", "Muy alta"] as const;
const manualAmountOptionTitle = "Ingresar cifra";

const goalAmountRanges: VisualOption[] = [
  {
    title: "Menos de $1.000.000",
    icon: Banknote,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "$1.000.000 – $5.000.000",
    icon: Ticket,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "$5.000.000 – $20.000.000",
    icon: Layers,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "$20.000.000 – $50.000.000",
    icon: Landmark,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Más de $50.000.000",
    icon: Crown,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  },
  {
    title: manualAmountOptionTitle,
    icon: PenLine,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  }
];

function getInitialGoalSelection(goal: FinancialGoal | null) {
  if (!goal) {
    return null;
  }

  return financialGoals.some((option) => option.title === goal.title)
    ? goal.title
    : customGoalOption.title;
}

function getCurrencyInputValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? formatCOP(value) : "";
}

function getInitialAmountSelection(goal: FinancialGoal | null) {
  if (goal?.targetAmount && goal.targetAmount > 0) {
    return manualAmountOptionTitle;
  }

  return goal?.amountRange ?? null;
}

export default function GoalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { onboarding, updateOnboarding } = useOnboarding();
  const goals = getOnboardingGoals(onboarding);
  const primaryGoal = getPrimaryFinancialGoal(onboarding);
  const isAddMode = params.mode === "add";
  const initialGoal = isAddMode ? null : primaryGoal;
  const initialGoalSelection = getInitialGoalSelection(initialGoal);
  const initialAmountSelection = getInitialAmountSelection(initialGoal);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(initialGoalSelection);
  const [customGoalName, setCustomGoalName] = useState(
    initialGoal && initialGoalSelection === customGoalOption.title ? initialGoal.title : ""
  );
  const [selectedIconKey, setSelectedIconKey] = useState<string | null>(
    initialGoal?.iconKey ?? null
  );
  const [selectedHorizon, setSelectedHorizon] = useState<string | null>(initialGoal?.horizon ?? null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(
    initialGoal?.priority ?? null
  );
  const [selectedAmountRange, setSelectedAmountRange] = useState<string | null>(
    initialAmountSelection
  );
  const [targetAmountInput, setTargetAmountInput] = useState(
    getCurrencyInputValue(initialGoal?.targetAmount)
  );

  const isCustomGoal = selectedGoal === customGoalOption.title;
  const finalGoalTitle = isCustomGoal ? customGoalName.trim() : selectedGoal;
  const isManualAmount = selectedAmountRange === manualAmountOptionTitle;
  const parsedTargetAmount = isManualAmount ? parseCOPInput(targetAmountInput) : null;
  const finalIconKey =
    selectedIconKey ??
    financialGoals.find((goal) => goal.title === selectedGoal)?.iconKey ??
    customGoalOption.iconKey ??
    "other";
  const canContinue = Boolean(
    finalGoalTitle &&
      selectedHorizon &&
      selectedPriority &&
      (!isManualAmount || (parsedTargetAmount !== null && parsedTargetAmount > 0))
  );

  const handleGoalSelect = (goal: VisualOption) => {
    if (goal.title !== selectedGoal) {
      setSelectedAmountRange(null);
      setTargetAmountInput("");
    }

    setSelectedGoal(goal.title);
    setSelectedIconKey(
      goal.iconKey === customGoalOption.iconKey
        ? customGoalIconOptions[0]?.iconKey ?? "other"
        : goal.iconKey ?? "other"
    );
  };

  const handleAmountSelect = (range: VisualOption) => {
    setSelectedAmountRange(range.title);

    if (range.title !== manualAmountOptionTitle) {
      setTargetAmountInput("");
    }
  };

  const handleTargetAmountChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setTargetAmountInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = () => {
    if (!canContinue || !finalGoalTitle || !selectedHorizon || !selectedPriority) {
      return;
    }

    const nextGoal = createFinancialGoal({
      amountRange: isManualAmount ? null : selectedAmountRange,
      horizon: selectedHorizon,
      iconKey: finalIconKey,
      isPrimary: !isAddMode,
      priority: selectedPriority,
      targetAmount: parsedTargetAmount,
      title: finalGoalTitle
    });

    if (isAddMode) {
      const hasPrimaryGoal = goals.some((goal) => goal.isPrimary);
      const nextGoals: FinancialGoal[] = [
        ...goals.map((goal, index) => ({
          ...goal,
          isPrimary: hasPrimaryGoal ? goal.isPrimary : index === 0
        })),
        {
          ...nextGoal,
          isPrimary: !hasPrimaryGoal && goals.length === 0
        }
      ];
      const nextPrimaryGoal = nextGoals.find((goal) => goal.isPrimary) ?? nextGoals[0] ?? null;

      updateOnboarding({
        goals: nextGoals,
        ...getLegacyFieldsFromGoal(nextPrimaryGoal)
      });
      router.push("/goals-overview");
      return;
    }

    const nextPrimaryGoal: FinancialGoal = {
      ...nextGoal,
      id: primaryGoal?.id ?? nextGoal.id,
      isPrimary: true,
      manualMonthlyContribution: primaryGoal?.manualMonthlyContribution ?? null,
      createdAt: primaryGoal?.createdAt ?? nextGoal.createdAt
    };
    const nextGoals = [
      nextPrimaryGoal,
      ...goals
        .filter((goal) => goal.id !== nextPrimaryGoal.id)
        .map((goal) => ({ ...goal, isPrimary: false }))
    ];

    updateOnboarding({
      goals: nextGoals,
      ...getLegacyFieldsFromGoal(nextPrimaryGoal)
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
          <StepHeader
            currentStep={8}
            onBack={() => router.push(isAddMode ? "/goals-overview" : "/savings-debts")}
            title={isAddMode ? "Nueva meta" : "Meta financiera"}
            totalSteps={8}
          />

          <HeroInfoCard
            badge="No necesitas tener una cifra exacta para empezar."
            image={goalTargetImage}
            imageStyle={styles.heroImage}
            text={
              isAddMode
                ? "Agrega otra meta para repartir tu bolsa mensual entre objetivos con distintos horizontes e importancia."
                : "Elige qué quieres lograr primero. Esta es tu prioridad inicial y podrás ajustarla cuando lo necesites."
            }
            title={isAddMode ? "Agregar una meta" : "Tu primera meta financiera"}
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              {isAddMode ? "¿Qué quieres lograr con esta meta?" : "¿Qué quieres lograr primero?"}
            </Text>
            <View style={styles.goalGrid}>
              {financialGoals.map((goal) => (
                <VisualSelectable
                  key={goal.title}
                  icon={goal.icon}
                  iconBackground={goal.backgroundColor}
                  iconColor={goal.color}
                  onPress={() => handleGoalSelect(goal)}
                  selected={selectedGoal === goal.title}
                  style={styles.goalOption}
                  title={goal.title}
                  titleStyle={styles.goalTitle}
                />
              ))}
            </View>

            <SelectableCard
              leading={
                <View style={[styles.rowIcon, styles.purpleIcon]}>
                  <Sparkles color="#7C3AED" size={24} strokeWidth={2.4} />
                </View>
              }
              onPress={() => handleGoalSelect(customGoalOption)}
              selected={selectedGoal === customGoalOption.title}
              style={styles.undecidedCard}
              subtitle="Escribe tu propia meta y elige un icono para reconocerla."
              title={customGoalOption.title}
              titleStyle={styles.undecidedTitle}
            />

            {isCustomGoal ? (
              <View style={styles.customGoalBox}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre de la meta</Text>
                  <TextInput
                    accessibilityLabel="Nombre de la meta personalizada"
                    onChangeText={setCustomGoalName}
                    placeholder="Ej. Comprar computador, salud, mudanza"
                    placeholderTextColor={colors.textSubtle}
                    returnKeyType="done"
                    style={styles.input}
                    value={customGoalName}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Icono de la meta</Text>
                  <View style={styles.customIconGrid}>
                    {customGoalIconOptions.map((goal) => (
                      <IconSelectable
                        key={goal.iconKey ?? goal.title}
                        onPress={() => setSelectedIconKey(goal.iconKey ?? "other")}
                        option={goal}
                        selected={selectedIconKey === goal.iconKey}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿En cuánto tiempo te gustaría lograr o avanzar en esta meta?
            </Text>
            <View style={styles.horizonGrid}>
              {goalHorizons.map((horizon) => (
                <VisualSelectable
                  key={horizon.title}
                  icon={horizon.icon}
                  iconBackground={horizon.backgroundColor}
                  iconColor={horizon.color}
                  onPress={() => setSelectedHorizon(horizon.title)}
                  selected={selectedHorizon === horizon.title}
                  style={styles.horizonOption}
                  title={horizon.title}
                  titleStyle={styles.compactTitle}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué tan importante es esta meta para ti?</Text>
            <View style={styles.priorityGrid}>
              {goalPriorities.map((priority) => (
                <SelectableCard
                  key={priority}
                  onPress={() => setSelectedPriority(priority)}
                  selected={selectedPriority === priority}
                  style={styles.priorityOption}
                  title={priority}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.questionRow}>
              <Text style={styles.questionTitle}>¿Tienes una cifra aproximada en mente?</Text>
              <Text style={styles.optionalText}>Opcional</Text>
            </View>
            <View style={styles.amountGrid}>
              {goalAmountRanges.map((range) => (
                <VisualSelectable
                  key={range.title}
                  icon={range.icon}
                  iconBackground={range.backgroundColor}
                  iconColor={range.color}
                  onPress={() => handleAmountSelect(range)}
                  selected={selectedAmountRange === range.title}
                  style={
                    range.title === manualAmountOptionTitle
                      ? styles.amountOptionFeatured
                      : styles.amountOption
                  }
                  title={range.title}
                  titleStyle={styles.amountTitle}
                />
              ))}
            </View>

            {isManualAmount ? (
              <View style={styles.manualAmountBox}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monto objetivo</Text>
                  <TextInput
                    accessibilityLabel="Monto objetivo de la meta"
                    inputMode="numeric"
                    keyboardType="numeric"
                    onChangeText={handleTargetAmountChange}
                    placeholder="$0"
                    placeholderTextColor={colors.textSubtle}
                    returnKeyType="done"
                    style={styles.input}
                    value={targetAmountInput}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={isAddMode ? "Guardar nueva meta" : "Revisar mis respuestas antes del diagnóstico"}
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isAddMode ? "Guardar meta" : "Revisar mis respuestas"}
            />
            <PrimaryButton
              accessibilityLabel={isAddMode ? "Volver a mis metas" : "Volver a ahorros y deudas"}
              icon={null}
              onPress={() => router.push(isAddMode ? "/goals-overview" : "/savings-debts")}
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

function VisualSelectable({
  title,
  icon: Icon,
  iconColor,
  iconBackground,
  selected,
  onPress,
  style,
  titleStyle
}: {
  title: string;
  icon: ComponentType<IconProps>;
  iconColor: string;
  iconBackground: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <SelectableCard
      leading={
        <View style={[styles.iconBubble, { backgroundColor: iconBackground }]}>
          <Icon color={iconColor} size={24} strokeWidth={2.4} />
        </View>
      }
      onPress={onPress}
      selected={selected}
      style={style}
      title={title}
      titleStyle={titleStyle}
      variant="tile"
    />
  );
}

function IconSelectable({
  option,
  selected,
  onPress
}: {
  option: VisualOption;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = option.icon;

  return (
    <Pressable
      accessibilityLabel={`Icono ${option.title}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.customIconOption,
        selected && styles.customIconOptionSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.customIconBubble, { backgroundColor: option.backgroundColor }]}>
        <Icon color={option.color} size={24} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F3F7FC",
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  heroImage: {
    height: 132,
    width: 142
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  questionTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  goalOption: {
    flexBasis: "31%",
    flexGrow: 1,
    minHeight: 110,
    paddingHorizontal: spacing.xs
  },
  goalTitle: {
    fontSize: typography.badge,
    lineHeight: typography.lineHeight.badge
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  purpleIcon: {
    backgroundColor: "#F1E8FF"
  },
  undecidedCard: {
    backgroundColor: "#FBF8FF",
    borderColor: "#D8C7FF",
    minHeight: 72
  },
  undecidedTitle: {
    color: "#5B45D9",
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  customGoalBox: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  inputGroup: {
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
    minHeight: 50,
    paddingHorizontal: spacing.md
  },
  customIconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  customIconOption: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    height: 64,
    justifyContent: "center",
    minWidth: 64
  },
  customIconOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  customIconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  horizonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  horizonOption: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 98,
    paddingHorizontal: spacing.xs
  },
  compactTitle: {
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  priorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  priorityOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 52
  },
  questionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionalText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  amountOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 104,
    paddingHorizontal: spacing.xs
  },
  amountOptionFeatured: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 104,
    paddingHorizontal: spacing.xs
  },
  amountTitle: {
    fontSize: typography.badge,
    lineHeight: typography.lineHeight.badge
  },
  manualAmountBox: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  primaryButton: {
    borderRadius: 17,
    minHeight: 56
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: "#CFE0FF",
    borderRadius: 17,
    minHeight: 54
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  }
});
