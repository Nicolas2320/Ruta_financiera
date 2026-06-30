import type { ComponentType } from "react";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bot,
  Flag,
  Home,
  LineChart,
  PieChart,
  Store,
  CarTaxiFront,
  CircleEllipsis,
  MessageCircleQuestionMark,
  Hamburger,
  CreditCard,
  ArrowDown,
  Gamepad2,
  Leaf,
  Search,
  ShoppingBag,
  Smartphone,
  HandCoins,
  Target,
  Timer,
  PiggyBank
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { CategoryChip } from "../components/ui/CategoryChip";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

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

const smallExpenseCategories: Array<{
  label: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
}> = [
  {
    label: "Cafés, snacks y salidas",
    icon: Hamburger,
    color: "#9A5B20",
    backgroundColor: "#FFF3E4"
  },
  {
    label: "Domicilios o comida rápida",
    icon: Store,
    color: "#F97316",
    backgroundColor: "#FFF1E7"
  },
  {
    label: "Transporte extra",
    icon: CarTaxiFront,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    label: "Suscripciones y apps",
    icon: Smartphone,
    color: "#6D28D9",
    backgroundColor: "#F1E8FF"
  },
  {
    label: "Pequeñas compras",
    icon: ShoppingBag,
    color: colors.support,
    backgroundColor: colors.supportSoft
  },
  {
    label: "Entretenimiento digital",
    icon: Gamepad2,
    color: "#4F46E5",
    backgroundColor: "#EEF2FF"
  },
  {
    label: "Comisiones o recargos",
    icon: CreditCard,
    color: "#0E7490",
    backgroundColor: "#E6F7FB"
  },
  {
    label: "Otros",
    icon: CircleEllipsis,
    color: "#64748B",
    backgroundColor: "#EEF2F7"
  }
];

const smallExpenseCategoryAliases: Record<string, string> = {
  "Cafés o snacks": "Cafés, snacks y salidas",
  "Salidas": "Cafés, snacks y salidas",
  "Antojos": "Cafés, snacks y salidas",
  "Domicilios": "Domicilios o comida rápida",
  "Suscripciones": "Suscripciones y apps",
  "Apps o servicios digitales": "Suscripciones y apps",
  "Compras pequeñas": "Pequeñas compras",
  "Juegos o entretenimiento digital": "Entretenimiento digital"
};

function normalizeSmallExpenseCategories(categories: string[]) {
  const availableCategories = smallExpenseCategories.map((category) => category.label);

  return categories.reduce<string[]>((normalizedCategories, category) => {
    const normalizedCategory = smallExpenseCategoryAliases[category] ?? category;

    if (
      availableCategories.includes(normalizedCategory) &&
      !normalizedCategories.includes(normalizedCategory)
    ) {
      normalizedCategories.push(normalizedCategory);
    }

    return normalizedCategories;
  }, []);
}

const smallExpenseRanges = [
  "Menos de $100.000",
  "$100.000 – $250.000",
  "$250.000 – $500.000",
  "Más de $500.000"
] as const;

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
  const params = useLocalSearchParams<{ source?: string }>();
  const { onboarding, updateOnboarding } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isSpendingEditMode = source === "spending";
  const isProfileEditMode = source === "profile";
  const isDashboardEditMode = source === "dashboard";
  const isEditMode = isSpendingEditMode || isProfileEditMode || isDashboardEditMode;
  const navigate = (route: Route) => router.push(route);
  const [selectedPresence, setSelectedPresence] = useState<string | null>(
    onboarding.hasSmallExpenses
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    normalizeSmallExpenseCategories(onboarding.smallExpenseCategories)
  );
  const [selectedRange, setSelectedRange] = useState<string | null>(
    normalizeSmallExpenseRange(onboarding.smallExpensesRange)
  );
  const [selectedIntention, setSelectedIntention] = useState<string | null>(
    onboarding.smallExpensesIntention
  );

  const needsCategory = selectedPresence === "Sí";
  const shouldShowCategoryQuestion = selectedPresence !== "No";
  const canContinue = Boolean(
    selectedPresence &&
      selectedRange &&
      selectedIntention &&
      (!needsCategory || selectedCategories.length > 0)
  );

  const handlePresenceSelect = (presence: string) => {
    setSelectedPresence(presence);

    if (presence === "No") {
      setSelectedCategories([]);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const handleContinue = () => {
    if (!selectedPresence || !selectedRange || !selectedIntention) {
      return;
    }

    const categoriesToSave =
      selectedPresence === "No" ? [] : normalizeSmallExpenseCategories(selectedCategories);

    if (needsCategory && categoriesToSave.length === 0) {
      return;
    }

    updateOnboarding({
      hasSmallExpenses: selectedPresence,
      smallExpenseCategories: categoriesToSave,
      smallExpensesRange: selectedRange,
      smallExpensesIntention: selectedIntention
    });
    router.push(
      isSpendingEditMode
        ? "/spending"
        : isDashboardEditMode
          ? "/dashboard"
        : isProfileEditMode
          ? { pathname: "/summary", params: { mode: "edit" } }
          : "/savings-debts"
    );
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
          {!isEditMode ? (
          <StepHeader
            currentStep={6}
            onBack={() => router.push("/expenses")}
            title="Gastos hormiga"
            totalSteps={8}
          />
          ) : null}

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

          {shouldShowCategoryQuestion ? (
            <View style={styles.card}>
              <Text style={styles.questionTitle}>¿En qué categorías crees que se van?</Text>
              <Text style={styles.helperText}>
                Puedes elegir varias categorías. Si respondiste “Sí”, elige al menos una.
              </Text>
              <View style={styles.categoryGrid}>
                {smallExpenseCategories.map((category) => (
                  <CategoryChip
                    key={category.label}
                    backgroundColor={category.backgroundColor}
                    color={category.color}
                    icon={category.icon}
                    label={category.label}
                    onPress={() => toggleCategory(category.label)}
                    selected={selectedCategories.includes(category.label)}
                    style={styles.smallChip}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.softCard}>
              <Text style={styles.questionTitle}>No hace falta detallar categorías ahora</Text>
              <Text style={styles.softText}>
                Si más adelante notas consumos pequeños repetidos, puedes volver y revisarlos sin
                problema.
              </Text>
            </View>
          )}

          <View style={styles.twoColumnSection}>
            <View style={styles.card}>
              <Text style={styles.questionTitle}>
                ¿Cuánto crees que gastas al mes en estos consumos?
              </Text>
              <View style={styles.optionList}>
                {smallExpenseRanges.map((range) => (
                  <SelectableCard
                    key={range}
                    onPress={() => setSelectedRange(range)}
                    selected={selectedRange === range}
                    title={range}
                  />
                ))}
              </View>
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

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                isEditMode
                  ? "Guardar cambios de gastos pequeÃ±os"
                  : "Continuar hacia ahorros y deudas"
              }
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isEditMode ? "Guardar cambios" : "Continuar"}
            />
            <PrimaryButton
              accessibilityLabel={
                isDashboardEditMode
                  ? "Volver al Dashboard"
                  : isEditMode
                    ? "Volver al perfil financiero"
                    : "Volver a gastos mensuales"
              }
              icon={null}
              onPress={() =>
                router.push(
                  isSpendingEditMode
                    ? "/spending"
                    : isDashboardEditMode
                      ? "/dashboard"
                    : isProfileEditMode
                      ? { pathname: "/summary", params: { mode: "edit" } }
                    : "/expenses"
                )
              }
              style={styles.secondaryButton}
              title={isEditMode ? "Volver" : "Volver"}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
      {isSpendingEditMode ? (
        <>
        <BottomNavigation activeRoute="/spending" />
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

function NumberBadge({ value }: { value: number }) {
  return (
    <View style={styles.numberBadge}>
      <Text style={styles.numberBadgeText}>{value}</Text>
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
  numberBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  numberBadgeText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  questionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  helperText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption,
    marginTop: -spacing.sm
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  smallChip: {
    flexBasis: "46%",
    minWidth: 145
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
