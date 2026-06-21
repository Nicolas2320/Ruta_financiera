import type { ComponentType } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Banknote,
  Calendar,
  ChartColumnIncreasing,
  CircleQuestionMark,
  Clock,
  CreditCard,
  Crown,
  GraduationCap,
  Hourglass,
  House,
  Landmark,
  Layers,
  PenLine,
  PiggyBank,
  Plane,
  Star,
  Store,
  TextAlignJustify,
  Ticket,
  UserRound,
  Wallet
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const goalTargetImage = require("../assets/illustrations/goal-target.png");

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type VisualOption = {
  title: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
};

const financialGoals: VisualOption[] = [
  {
    title: "Organizar mis gastos",
    icon: Wallet,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Crear un fondo de emergencia",
    icon: PiggyBank,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Pagar deudas",
    icon: CreditCard,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Ahorrar para vivienda",
    icon: House,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Ahorrar para estudiar",
    icon: GraduationCap,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    title: "Ahorrar para viajar",
    icon: Plane,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    title: "Empezar a invertir",
    icon: ChartColumnIncreasing,
    color: "#F59E0B",
    backgroundColor: colors.warningSoft
  },
  {
    title: "Ahorrar para un negocio",
    icon: Store,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Prepararme para el futuro",
    icon: UserRound,
    color: "#DB2777",
    backgroundColor: "#FCE7F3"
  }
];

const undecidedGoal = {
  title: "No sé todavía, ayúdame a elegir",
  subtitle: "Responde algunas preguntas y te ayudaremos a encontrar tu mejor opción."
};

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

const goalPriorities = [
  {
    title: "Baja",
    stars: 1,
    color: "#FFC700"
  },
  {
    title: "Media",
    stars: 2,
    color: "#FFC700"
  },
  {
    title: "Alta",
    stars: 3,
    color: "#FFC700"
  },
  {
    title: "Muy alta",
    stars: 4,
    color: "#FFC700"
  }
] as const;

const goalAmountRanges: VisualOption[] = [
  {
    title: "No tengo una cifra todavía",
    icon: CircleQuestionMark,
    color: "#94A3B8",
    backgroundColor: "#EEF2F7"
  },
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
    title: "Prefiero definirla después",
    icon: PenLine,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  }
];

export default function GoalsScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(onboarding.financialGoal);
  const [selectedHorizon, setSelectedHorizon] = useState<string | null>(onboarding.goalHorizon);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(
    onboarding.goalPriority
  );
  const [selectedAmountRange, setSelectedAmountRange] = useState<string | null>(
    onboarding.goalAmountRange
  );

  const canContinue = Boolean(selectedGoal && selectedHorizon && selectedPriority);

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
          <StepHeader
            currentStep={8}
            onBack={() => router.push("/savings-debts")}
            title="Meta financiera"
            totalSteps={8}
          />

          <HeroInfoCard
            badge="No necesitas tener una cifra exacta para empezar."
            image={goalTargetImage}
            imageStyle={styles.heroImage}
            text="Elige qué quieres lograr primero. Esta es tu prioridad inicial y podrás ajustarla cuando lo necesites."
            title="Tu primera meta financiera"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Qué quieres lograr primero?</Text>
            <View style={styles.goalGrid}>
              {financialGoals.map((goal) => (
                <VisualSelectable
                  key={goal.title}
                  icon={goal.icon}
                  iconBackground={goal.backgroundColor}
                  iconColor={goal.color}
                  onPress={() => handleGoalSelect(goal.title)}
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
                  <CircleQuestionMark color="#7C3AED" size={24} strokeWidth={2.4} />
                </View>
              }
              onPress={() => handleGoalSelect(undecidedGoal.title)}
              selected={selectedGoal === undecidedGoal.title}
              style={styles.undecidedCard}
              subtitle={undecidedGoal.subtitle}
              title={undecidedGoal.title}
              titleStyle={styles.undecidedTitle}
            />
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
                key={priority.title}
                leading={<PriorityStars color={priority.color} count={priority.stars} />}
                  onPress={() => setSelectedPriority(priority.title)}
                  selected={selectedPriority === priority.title}
                  style={styles.priorityOption}
                  title={priority.title}
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
                  onPress={() => setSelectedAmountRange(range.title)}
                  selected={selectedAmountRange === range.title}
                  style={
                    range.title === "Prefiero definirla después"
                      ? styles.amountOptionFeatured
                      : styles.amountOption
                  }
                  title={range.title}
                  titleStyle={styles.amountTitle}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Revisar mis respuestas antes del diagnóstico"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title="Revisar mis respuestas"
            />
            <PrimaryButton
              accessibilityLabel="Volver a ahorros y deudas"
              icon={null}
              onPress={() => router.push("/savings-debts")}
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

function PriorityStars({ color, count }: { color: string; count: number }) {
  return (
    <View style={styles.starGroup}>
      {Array.from({ length: count }).map((_, index) => (
        <Star key={index} color={color} fill={color} size={count > 1 ? 15 : 20} strokeWidth={2.2} />
      ))}
    </View>
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
    borderRadius: 22,
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
    lineHeight: typography.lineHeight.caption,
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
  starGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minWidth: 28
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
    lineHeight: typography.lineHeight.small,
    letterSpacing: 0,
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
    flexBasis: "100%",
    minHeight: 72
  },
  amountTitle: {
    fontSize: typography.badge,
    lineHeight: typography.lineHeight.badge
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
  }
});
