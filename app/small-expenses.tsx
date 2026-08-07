import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bot,
  Flag,
  Home,
  LineChart,
  PieChart,
  MessageCircleQuestionMark,
  ArrowDown,
  Leaf,
  Search,
  HandCoins,
  Target,
  Timer,
  PiggyBank
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { ExactAmountField } from "../components/ui/ExactAmountField";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  formatCOP,
  getSmallExpenseRangeForAmount,
  hasExactFinancialValue,
  parseCOPInput
} from "../utils/financialRanges";

const smallExpensesImage = require("../assets/illustrations/small-expenses.png");

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

const smallExpensePresence = [
  {
    title: "Sí",
    subtitle: "Sí, me pasa seguido.",
    icon: HandCoins,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "No",
    subtitle: "No creo que gaste en cosas pequeñas.",
    icon: PiggyBank,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "No estoy seguro",
    subtitle: "No lo tengo claro.",
    icon: MessageCircleQuestionMark,
    color: "#8B5CF6",
    backgroundColor: "#F1E8FF"
  }
] as const;

const smallExpenseRanges = [
  "Menos de $100.000",
  "$100.000 – $250.000",
  "$250.000 – $500.000",
  "Más de $500.000",
  "No sé"
] as const;

const exactSmallExpenseOption = "Ingresar cifra";

function normalizeSmallExpenseRange(range: string | null) {
  return smallExpenseRanges.includes(range as (typeof smallExpenseRanges)[number])
    ? range
    : null;
}

const smallExpenseIntentions = [
  {
    title: "Mantenerlos como están",
    icon: Leaf,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    title: "Establecer un límite mensual",
    icon: Timer,
    color: "#F59E0B",
    backgroundColor: colors.warningSoft
  },
  {
    title: "Reducir algunos",
    icon: ArrowDown,
    color: "#7C9EFF",
    backgroundColor: "#EEF4FF"
  },
  {
    title: "Redirigir una parte a una meta",
    icon: Target,
    color: "#7C3AED",
    backgroundColor: "#F1E8FF"
  },
  {
    title: "Primero quiero entenderlos mejor",
    icon: Search,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  }
] as const;

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

export default function SmallExpensesScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ source?: string }>();
  const {
    exactValues,
    onboarding,
    onboardingSyncStatus,
    saveOnboardingAndExactValues
  } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isSpendingEditMode = source === "spending";
  const isProfileEditMode = source === "profile";
  const isDashboardEditMode = source === "dashboard";
  const isImprovePlanEditMode = source === "improve-plan";
  const isStandaloneMode = !source;
  const navigate = (route: Route) => router.push(route);
  const [selectedPresence, setSelectedPresence] = useState<string | null>(
    onboarding.hasSmallExpenses
  );
  const [selectedRange, setSelectedRange] = useState<string | null>(
    normalizeSmallExpenseRange(onboarding.smallExpensesRange)
  );
  const [selectedIntention, setSelectedIntention] = useState<string | null>(
    onboarding.smallExpensesIntention
  );
  const [usesExactSmallExpenses, setUsesExactSmallExpenses] = useState(
    onboarding.hasSmallExpenses !== "No" && hasExactFinancialValue(exactValues.smallExpenses)
  );
  const [exactSmallExpensesInput, setExactSmallExpensesInput] = useState(
    hasExactFinancialValue(exactValues.smallExpenses)
      ? formatCOP(exactValues.smallExpenses)
      : ""
  );
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    setSelectedPresence(onboarding.hasSmallExpenses);
    setSelectedRange(normalizeSmallExpenseRange(onboarding.smallExpensesRange));
    setSelectedIntention(onboarding.smallExpensesIntention);
    setUsesExactSmallExpenses(
      onboarding.hasSmallExpenses !== "No" &&
        hasExactFinancialValue(exactValues.smallExpenses)
    );
    setExactSmallExpensesInput(
      hasExactFinancialValue(exactValues.smallExpenses)
        ? formatCOP(exactValues.smallExpenses)
        : ""
    );
  }, [exactValues.smallExpenses, onboarding, onboardingSyncStatus]);

  const shouldShowDetails = selectedPresence !== "No";
  const parsedExactSmallExpenses = parseCOPInput(exactSmallExpensesInput);
  const canContinue = Boolean(
    selectedPresence &&
      (selectedPresence === "No" ||
        ((usesExactSmallExpenses
          ? parsedExactSmallExpenses !== null && parsedExactSmallExpenses > 0
          : selectedRange) &&
          selectedIntention))
  );

  const handlePresenceSelect = (presence: string) => {
    setSelectedPresence(presence);

    if (presence === "No") {
      setSelectedRange(null);
      setSelectedIntention(null);
      setUsesExactSmallExpenses(false);
    }
  };

  const handleExactSmallExpensesChange = (value: string) => {
    const parsedValue = parseCOPInput(value);
    setExactSmallExpensesInput(parsedValue === null ? "" : formatCOP(parsedValue));
  };

  const handleContinue = async () => {
    if (!selectedPresence) {
      return;
    }

    if (
      selectedPresence !== "No" &&
      (!selectedIntention ||
        (usesExactSmallExpenses
          ? parsedExactSmallExpenses === null || parsedExactSmallExpenses <= 0
          : !selectedRange))
    ) {
      return;
    }

    const nextExactValues = { ...exactValues };
    const smallExpensesRange =
      selectedPresence === "No"
        ? null
        : usesExactSmallExpenses && parsedExactSmallExpenses !== null
          ? getSmallExpenseRangeForAmount(parsedExactSmallExpenses)
          : selectedRange;

    if (
      selectedPresence !== "No" &&
      usesExactSmallExpenses &&
      parsedExactSmallExpenses !== null
    ) {
      nextExactValues.smallExpenses = parsedExactSmallExpenses;
    } else {
      delete nextExactValues.smallExpenses;
    }

    const saved = await saveOnboardingAndExactValues(
      {
        hasSmallExpenses: selectedPresence,
        smallExpensesRange,
        smallExpensesIntention: selectedPresence === "No" ? null : selectedIntention
      },
      nextExactValues
    );

    if (!saved) {
      return;
    }

    router.push(
      isSpendingEditMode
        ? "/spending"
        : isDashboardEditMode
          ? "/dashboard"
          : isImprovePlanEditMode
            ? "/improve-plan"
            : isProfileEditMode
              ? { pathname: "/summary", params: { mode: "edit" } }
              : "/spending"
    );
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
          <ContextHeader
            onBack={() =>
              router.push(
                isSpendingEditMode || isStandaloneMode
                  ? "/spending"
                  : isDashboardEditMode
                    ? "/dashboard"
                    : isImprovePlanEditMode
                      ? "/improve-plan"
                      : { pathname: "/summary", params: { mode: "edit" } }
              )
            }
            subtitle={
              isSpendingEditMode || isStandaloneMode
                ? "Volverás a Gastos."
                : isDashboardEditMode
                  ? "Volverás al Dashboard."
                  : isImprovePlanEditMode
                    ? "Volverás a Mejorar mi plan."
                    : "Volverás al perfil financiero."
            }
            title="Gastos pequeños"
          />

          <HeroInfoCard
            badge="Tú decides qué gastos conservar y cuáles ajustar."
            image={smallExpensesImage}
            imageStyle={styles.heroImage}
            text="No todos los gastos pequeños son malos. La idea es entenderlos y decidir cuáles quieres mantener, limitar o redirigir a una meta."
            title="Pequeños gastos frecuentes"
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿Sientes que tienes gastos pequeños frecuentes?
            </Text>
            <View style={styles.presenceGrid}>
              {smallExpensePresence.map((presence) => {
                const Icon = presence.icon;

                return (
                  <SelectableCard
                    key={presence.title}
                    leading={
                      <View style={[styles.softIcon, { backgroundColor: presence.backgroundColor }]}>
                        <Icon color={presence.color} size={23} strokeWidth={2.5} />
                      </View>
                    }
                    onPress={() => handlePresenceSelect(presence.title)}
                    selected={selectedPresence === presence.title}
                    style={styles.presenceCard}
                    subtitle={presence.subtitle}
                    title={presence.title}
                    variant="tile"
                  />
                );
              })}
            </View>
          </View>

          {!shouldShowDetails ? (
            <View style={styles.softCard}>
              <Text style={styles.questionTitle}>Puedes dejarlo así por ahora</Text>
              <Text style={styles.softText}>
                Si más adelante notas consumos pequeños repetidos, puedes volver y revisarlos sin
                problema.
              </Text>
            </View>
          ) : null}

          {shouldShowDetails ? (
            <View style={styles.twoColumnSection}>
              <View style={styles.card}>
                <Text style={styles.questionTitle}>
                  ¿Cuánto crees que gastas al mes en estos consumos?
                </Text>
                <View style={styles.optionList}>
                  {smallExpenseRanges.map((range) => (
                    <SelectableCard
                      key={range}
                      onPress={() => {
                        setUsesExactSmallExpenses(false);
                        setSelectedRange(range);
                      }}
                      selected={!usesExactSmallExpenses && selectedRange === range}
                      title={range}
                    />
                  ))}
                  <SelectableCard
                    onPress={() => setUsesExactSmallExpenses(true)}
                    selected={usesExactSmallExpenses}
                    title={exactSmallExpenseOption}
                  />
                </View>
                {usesExactSmallExpenses ? (
                  <ExactAmountField
                    accessibilityLabel="Gastos pequeños al mes"
                    onChangeText={handleExactSmallExpensesChange}
                    value={exactSmallExpensesInput}
                  />
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.questionTitle}>¿Qué te gustaría hacer con estos gastos?</Text>
                <View style={styles.optionList}>
                  {smallExpenseIntentions.map((intention) => {
                    const Icon = intention.icon;

                    return (
                      <SelectableCard
                        key={intention.title}
                        leading={
                          <View
                            style={[
                              styles.rowIcon,
                              { backgroundColor: intention.backgroundColor }
                            ]}
                          >
                            <Icon color={intention.color} size={20} strokeWidth={2.5} />
                          </View>
                        }
                        onPress={() => setSelectedIntention(intention.title)}
                        selected={selectedIntention === intention.title}
                        title={intention.title}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Guardar cambios de gastos pequeños"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title="Guardar cambios"
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
      {isSpendingEditMode || isDashboardEditMode || isStandaloneMode ? (
        <>
        <BottomNavigation activeRoute={isDashboardEditMode ? "/dashboard" : "/spending"} />
        <View style={styles.hidden}>
          <BottomNavItem icon={Home} onNavigate={navigate} route="/dashboard" title="Inicio" />
          <BottomNavItem active icon={PieChart} onNavigate={navigate} route="/spending" title="Gastos" />
          <BottomNavItem icon={Flag} onNavigate={navigate} route="/goals-overview" title="Metas" />
          <BottomNavItem icon={LineChart} onNavigate={navigate} route="/simulation" title="Simulación" />
          <BottomNavItem icon={Bot} onNavigate={navigate} route="/assistant" title="Asistente" />
        </View>
        </>
      ) : null}
    </SafeAreaView>
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
    height: 126,
    width: 126,
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
  softCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  questionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  softText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  presenceGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  presenceCard: {
    minHeight: 130
  },
  softIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  twoColumnSection: {
    gap: spacing.md
  },
  optionList: {
    gap: spacing.sm
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
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
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  hidden: {
    display: "none"
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
