import type { ComponentType } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Baby,
  BriefcaseBusiness,
  Car,
  ChartColumnIncreasing,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  Plane,
  Sparkles,
  Store,
  UserRound,
  Wallet
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { MonthYearPickerField } from "../components/ui/MonthYearPickerField";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  createFinancialGoal,
  getGoalTypeFromTitle,
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
    title: "Vehículo",
    iconKey: "custom-vehicle",
    icon: Car,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Celebración",
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

const manualAmountOptionTitle = "Escribir monto";
const unknownGoalAmountOption = "Aún no lo sé";

const goalAmountOptions = [
  { label: "Menos de $1 millón", value: "Menos de $1.000.000" },
  { label: "De $1 a $5 millones", value: "$1.000.000 – $5.000.000" },
  { label: "De $5 a $20 millones", value: "$5.000.000 – $20.000.000" },
  { label: "De $20 a $50 millones", value: "$20.000.000 – $50.000.000" },
  { label: "Más de $50 millones", value: "Más de $50.000.000" },
  { label: unknownGoalAmountOption, value: unknownGoalAmountOption }
] as const;

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

  if (goal?.amountRange) {
    return goal.amountRange;
  }

  return goal ? unknownGoalAmountOption : null;
}

export default function GoalsScreen() {
  const router = useRouter();
  const { isPhone, isSmallPhone, screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{
    mode?: string;
    suggestedTargetAmount?: string;
    template?: string;
  }>();
  const { onboarding, onboardingSyncStatus, updateOnboarding } = useOnboarding();
  const goals = getOnboardingGoals(onboarding);
  const primaryGoal = getPrimaryFinancialGoal(onboarding);
  const isAddMode = params.mode === "add";
  const isEmergencyTemplate = isAddMode && params.template === "emergency";
  const suggestedEmergencyTargetAmount = isEmergencyTemplate
    ? Number(params.suggestedTargetAmount)
    : 0;
  const hasSuggestedEmergencyTarget =
    Number.isFinite(suggestedEmergencyTargetAmount) && suggestedEmergencyTargetAmount > 0;
  const initialGoal = isAddMode ? null : primaryGoal;
  const initialGoalSelection = isEmergencyTemplate
    ? "Crear un fondo de emergencia"
    : getInitialGoalSelection(initialGoal);
  const initialAmountSelection = hasSuggestedEmergencyTarget
    ? manualAmountOptionTitle
    : getInitialAmountSelection(initialGoal);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(initialGoalSelection);
  const [customGoalName, setCustomGoalName] = useState(
    initialGoal && initialGoalSelection === customGoalOption.title ? initialGoal.title : ""
  );
  const [selectedIconKey, setSelectedIconKey] = useState<string | null>(
    initialGoal?.iconKey ?? null
  );
  const [selectedAmountRange, setSelectedAmountRange] = useState<string | null>(
    initialAmountSelection
  );
  const [targetAmountInput, setTargetAmountInput] = useState(
    hasSuggestedEmergencyTarget
      ? getCurrencyInputValue(suggestedEmergencyTargetAmount)
      : getCurrencyInputValue(initialGoal?.targetAmount)
  );
  const [targetMonth, setTargetMonth] = useState<string | null>(initialGoal?.targetMonth ?? null);
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    const storedGoal = isAddMode ? null : getPrimaryFinancialGoal(onboarding);
    const storedGoalSelection = isEmergencyTemplate
      ? "Crear un fondo de emergencia"
      : getInitialGoalSelection(storedGoal);

    setSelectedGoal(storedGoalSelection);
    setCustomGoalName(
      storedGoal && storedGoalSelection === customGoalOption.title ? storedGoal.title : ""
    );
    setSelectedIconKey(isEmergencyTemplate ? "emergency" : storedGoal?.iconKey ?? null);
    setSelectedAmountRange(
      hasSuggestedEmergencyTarget
        ? manualAmountOptionTitle
        : getInitialAmountSelection(storedGoal)
    );
    setTargetAmountInput(
      hasSuggestedEmergencyTarget
        ? getCurrencyInputValue(suggestedEmergencyTargetAmount)
        : getCurrencyInputValue(storedGoal?.targetAmount)
    );
    setTargetMonth(storedGoal?.targetMonth ?? null);
  }, [
    hasSuggestedEmergencyTarget,
    isAddMode,
    isEmergencyTemplate,
    onboarding,
    onboardingSyncStatus,
    suggestedEmergencyTargetAmount
  ]);

  const isCustomGoal = selectedGoal === customGoalOption.title;
  const finalGoalTitle = isCustomGoal ? customGoalName.trim() : selectedGoal;
  const isDebtGoalTitle = getGoalTypeFromTitle(finalGoalTitle) === "debt";
  const isManualAmount = selectedAmountRange === manualAmountOptionTitle;
  const parsedTargetAmount = isManualAmount ? parseCOPInput(targetAmountInput) : null;
  const finalIconKey =
    selectedIconKey ??
    financialGoals.find((goal) => goal.title === selectedGoal)?.iconKey ??
    customGoalOption.iconKey ??
    "other";
  const canContinue = Boolean(
    finalGoalTitle &&
      !isDebtGoalTitle &&
      targetMonth &&
      selectedAmountRange &&
      (!isManualAmount || (parsedTargetAmount !== null && parsedTargetAmount > 0))
  );

  const handleGoalSelect = (goal: VisualOption) => {
    if (goal.title !== selectedGoal) {
      setSelectedAmountRange(null);
      setTargetAmountInput("");
      setTargetMonth(null);
    }

    setSelectedGoal(goal.title);
    setSelectedIconKey(
      goal.iconKey === customGoalOption.iconKey
        ? customGoalIconOptions[0]?.iconKey ?? "other"
        : goal.iconKey ?? "other"
    );
  };

  const handleAmountSelect = (range: string) => {
    setSelectedAmountRange(range);
    setTargetAmountInput("");
  };

  const handleAmountModeChange = (mode: "range" | "manual") => {
    if (mode === "manual") {
      setSelectedAmountRange(manualAmountOptionTitle);
      return;
    }

    setSelectedAmountRange(null);
    setTargetAmountInput("");
  };

  const handleTargetAmountChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setTargetAmountInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = () => {
    if (!canContinue || !finalGoalTitle || !targetMonth || !selectedAmountRange) {
      return;
    }

    const nextGoal = createFinancialGoal({
      amountRange:
        isManualAmount || selectedAmountRange === unknownGoalAmountOption
          ? null
          : selectedAmountRange,
      iconKey: finalIconKey,
      isPrimary: !isAddMode,
      targetMonth,
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
      updateOnboarding({
        goals: nextGoals
      });
      router.push("/goals-overview");
      return;
    }

    const nextPrimaryGoal: FinancialGoal = {
      ...nextGoal,
      id: primaryGoal?.id ?? nextGoal.id,
      isPrimary: true,
      createdAt: primaryGoal?.createdAt ?? nextGoal.createdAt
    };
    const nextGoals = [
      nextPrimaryGoal,
      ...goals
        .filter((goal) => goal.id !== nextPrimaryGoal.id)
        .map((goal) => ({ ...goal, isPrimary: false }))
    ];

    updateOnboarding({
      goals: nextGoals
    });
    router.push("/summary");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {isAddMode ? (
            <ContextHeader
              onBack={() => router.push("/goals-overview")}
              subtitle="Volveras a Mis metas."
              title="Nueva meta"
            />
          ) : (
            <StepHeader
              currentStep={6}
              nextAccessibilityLabel="Continuar hacia revisión de respuestas"
              nextDisabled={!canContinue}
              onBack={() => router.replace("/savings-debts")}
              onNext={handleContinue}
              title="Meta financiera"
              totalSteps={6}
            />
          )}

          <HeroInfoCard
            badge={
              isEmergencyTemplate
                ? "Referencia calculada con tus gastos actuales."
                : "Puedes empezar con un rango y ajustarlo después."
            }
            image={goalTargetImage}
            imageStyle={styles.heroImage}
            text={
              isEmergencyTemplate
                ? `Te proponemos ${
                    hasSuggestedEmergencyTarget
                      ? formatCOP(suggestedEmergencyTargetAmount)
                      : "una base inicial"
                  }, equivalente a tres meses de gastos. Puedes cambiar el monto y elegir la fecha antes de guardarla.`
                : isAddMode
                ? "Agrega otra meta con su propio monto y mes objetivo."
                : "Elige la meta en la que quieres enfocarte ahora. Podrás crear otras metas y cambiar cuál es la principal."
            }
            title={
              isEmergencyTemplate
                ? "Crear fondo de emergencia"
                : isAddMode
                  ? "Agregar una meta"
                  : "Tu meta principal"
            }
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              {isAddMode
                ? "¿Qué quieres lograr con esta meta?"
                : "¿Cuál es tu meta principal ahora mismo?"}
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
                  style={[
                    styles.goalOption,
                    isPhone && styles.goalOptionPhone,
                    isSmallPhone && styles.optionSmallPhone
                  ]}
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
                  {isDebtGoalTitle ? (
                    <Text style={styles.inputErrorText}>
                      Las deudas se registran y proyectan desde Mis deudas.
                    </Text>
                  ) : null}
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
            <Text style={styles.questionTitle}>¿Cuánto quieres reunir?</Text>

            <View style={styles.amountModeSwitch}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !isManualAmount }}
                onPress={() => handleAmountModeChange("range")}
                style={({ pressed }) => [
                  styles.amountModeOption,
                  !isManualAmount && styles.amountModeOptionSelected,
                  pressed && styles.pressed
                ]}
              >
                <Text
                  style={[
                    styles.amountModeText,
                    !isManualAmount && styles.amountModeTextSelected
                  ]}
                >
                  Elegir un rango
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isManualAmount }}
                onPress={() => handleAmountModeChange("manual")}
                style={({ pressed }) => [
                  styles.amountModeOption,
                  isManualAmount && styles.amountModeOptionSelected,
                  pressed && styles.pressed
                ]}
              >
                <Text
                  style={[
                    styles.amountModeText,
                    isManualAmount && styles.amountModeTextSelected
                  ]}
                >
                  {manualAmountOptionTitle}
                </Text>
              </Pressable>
            </View>

            {isManualAmount ? (
              <ExactAmountField
                accessibilityLabel="Monto que quieres reunir para la meta"
                onChangeText={handleTargetAmountChange}
                value={targetAmountInput}
              />
            ) : (
              <View style={styles.amountGrid}>
                {goalAmountOptions.map((option) => (
                  <SelectableCard
                    key={option.value}
                    onPress={() => handleAmountSelect(option.value)}
                    selected={selectedAmountRange === option.value}
                    style={[styles.amountOption, isSmallPhone && styles.optionSmallPhone]}
                    title={option.label}
                    titleStyle={styles.amountTitle}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <MonthYearPickerField
              helper="Con mes y año es suficiente para calcular cuánto tiempo tienes."
              label={
                isAddMode
                  ? "¿Para qué mes quieres alcanzar esta meta?"
                  : "¿Para qué mes quieres alcanzar tu meta principal?"
              }
              onChange={setTargetMonth}
              value={targetMonth}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={isAddMode ? "Guardar nueva meta" : "Continuar hacia revisión de respuestas"}
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isAddMode ? "Guardar meta" : "Continuar"}
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
  goalOptionPhone: {
    flexBasis: "47%"
  },
  optionSmallPhone: {
    flexBasis: "100%"
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
  helperText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  inputErrorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
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
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  amountModeSwitch: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs
  },
  amountModeOption: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.sm
  },
  amountModeOptionSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary
  },
  amountModeText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  amountModeTextSelected: {
    color: colors.primary
  },
  amountOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 76
  },
  amountTitle: {
    fontSize: typography.option,
    lineHeight: typography.lineHeight.option
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
