import type { ComponentType } from "react";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Apple,
  Bot,
  BusFront,
  Cable,
  CalendarCheck,
  CircleEllipsis,
  CreditCard,
  Flag,
  Frown,
  Gamepad2,
  GraduationCap,
  HandHeart,
  Home,
  House,
  LineChart,
  Meh,
  PieChart,
  ShoppingBag,
  Smile,
  Users
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { CategoryChip } from "../components/ui/CategoryChip";
import { ContextHeader } from "../components/ui/ContextHeader";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { normalizeExpenseCategoryAmounts } from "../types/financial";

const expensesCupReceipt = require("../assets/illustrations/expenses-cup-receipt.png");

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

const expenseRanges = [
  "Menos de $1.000.000",
  "$1.000.000 – $2.000.000",
  "$2.000.000 – $4.000.000",
  "$4.000.000 – $6.000.000",
  "Más de $6.000.000"
] as const;

function normalizeExpenseRange(expensesRange: string | null) {
  return expenseRanges.includes(expensesRange as (typeof expenseRanges)[number])
    ? expensesRange
    : null;
}

const expenseCategories: Array<{
  label: string;
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
}> = [
  {
    label: "Vivienda",
    icon: House,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  {
    label: "Alimentación",
    icon: Apple,
    color: "#2F9E57",
    backgroundColor: "#E8F8EF"
  },
  {
    label: "Transporte",
    icon: BusFront,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    label: "Servicios públicos",
    icon: Cable,
    color: "#1C7ED6",
    backgroundColor: "#E5F2FF"
  },
  {
    label: "Deudas",
    icon: CreditCard,
    color: "#2563EB",
    backgroundColor: "#EAF1FF"
  },
  {
    label: "Educación",
    icon: GraduationCap,
    color: "#2563EB",
    backgroundColor: "#EAF1FF"
  },
  {
    label: "Salud",
    icon: HandHeart,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  {
    label: "Familia",
    icon: Users,
    color: "#7C3AED",
    backgroundColor: "#EFE7FF"
  },
  {
    label: "Entretenimiento",
    icon: Gamepad2,
    color: "#F59E0B",
    backgroundColor: "#FFF5E7"
  },
  {
    label: "Suscripciones",
    icon: CalendarCheck,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    label: "Compras",
    icon: ShoppingBag,
    color: "#EF4444",
    backgroundColor: "#FFE8E8"
  },
  {
    label: "Otros",
    icon: CircleEllipsis,
    color: "#64748B",
    backgroundColor: "#EEF2F7"
  }
];

const expenseFeelings = [
  {
    title: "Los tengo bajo control",
    value: "Los tengo bajo control",
    icon: Smile,
    color: colors.support,
    backgroundColor: "#F0FBF4",
    borderColor: "#CDEFE0"
  },
  {
    title: "Gasto más de lo planeado",
    value: "Gasto más de lo planeado",
    icon: Meh,
    color: "#C88416",
    backgroundColor: "#FFF8E8",
    borderColor: "#F5E2B9"
  },
  {
    title: "No sé en qué se me va el dinero",
    value: "No sé en qué se va mi dinero",
    icon: Frown,
    color: "#E5484D",
    backgroundColor: "#FFF0F1",
    borderColor: "#F7D0D4"
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

export default function ExpensesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const { width } = useWindowDimensions();
  const { onboarding, updateOnboarding } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isSpendingEditMode = source === "spending";
  const isProfileEditMode = source === "profile";
  const isEditMode = isSpendingEditMode || isProfileEditMode;
  const navigate = (route: Route) => router.push(route);
  const [selectedExpenseRange, setSelectedExpenseRange] = useState<string | null>(
    normalizeExpenseRange(onboarding.expensesRange)
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    onboarding.expenseCategories
  );
  const [selectedExpenseFeeling, setSelectedExpenseFeeling] = useState<string | null>(
    onboarding.expensesFeeling
  );

  const canContinue = Boolean(
    selectedExpenseRange && selectedCategories.length > 0 && selectedExpenseFeeling
  );
  const showSideBySide = width >= 390;

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category]
    );
  };

  const handleContinue = () => {
    if (!selectedExpenseRange || selectedCategories.length === 0 || !selectedExpenseFeeling) {
      return;
    }

    updateOnboarding({
      expensesRange: selectedExpenseRange,
      expenseCategories: selectedCategories,
      expenseCategoryAmounts: normalizeExpenseCategoryAmounts(
        onboarding.expenseCategoryAmounts,
        selectedCategories
      ),
      expensesFeeling: selectedExpenseFeeling
    });
    router.push(
      isSpendingEditMode
        ? "/spending"
        : isProfileEditMode
          ? { pathname: "/summary", params: { mode: "edit" } }
          : "/small-expenses"
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
          {isEditMode ? (
            <ContextHeader
              onBack={() =>
                router.push(
                  isSpendingEditMode
                    ? "/spending"
                    : { pathname: "/summary", params: { mode: "edit" } }
                )
              }
              subtitle={isSpendingEditMode ? "Volveras a Gastos." : "Volveras al perfil financiero."}
              title="Editar gastos"
            />
          ) : null}
          {!isEditMode ? (
          <StepHeader
            currentStep={5}
            nextAccessibilityLabel="Continuar hacia gastos hormiga"
            nextDisabled={!canContinue}
            onBack={() => router.push("/income")}
            onNext={handleContinue}
            title="Gastos"
            totalSteps={8}
          />
          ) : null}

          <HeroInfoCard
            badge="Podrás ajustar tus gastos más adelante."
            image={expensesCupReceipt}
            imageStyle={styles.heroImage}
            text="No necesitas calcular cada peso. Con un rango aproximado podemos entender cómo se distribuye tu dinero."
            title="Tus gastos mensuales"
          />

          <View style={[styles.midsection, showSideBySide && styles.midsectionRow]}>
            <View style={[styles.card, showSideBySide && styles.rangePanel]}>
              <Text style={styles.questionTitle}>¿Cuál es tu rango de gastos mensuales?</Text>
              <View style={styles.compactList}>
                {expenseRanges.map((expenseRange) => (
                  <SelectableCard
                    key={expenseRange}
                    onPress={() => setSelectedExpenseRange(expenseRange)}
                    selected={selectedExpenseRange === expenseRange}
                    style={styles.compactOption}
                    title={expenseRange}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.card, showSideBySide && styles.categoryPanel]}>
              <Text style={styles.questionTitle}>¿Cuáles son tus gastos principales?</Text>
              <Text style={styles.helperText}>Puedes elegir varias categorías.</Text>
              <View style={styles.categoryGrid}>
                {expenseCategories.map((category) => (
                  <CategoryChip
                    key={category.label}
                    backgroundColor={category.backgroundColor}
                    color={category.color}
                    icon={category.icon}
                    label={category.label}
                    onPress={() => toggleCategory(category.label)}
                    selected={selectedCategories.includes(category.label)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cómo sientes tus gastos actualmente?</Text>
            <View style={styles.feelingGrid}>
              {expenseFeelings.map((feeling) => (
                <FeelingCard
                  key={feeling.value}
                  feeling={feeling}
                  onPress={() => setSelectedExpenseFeeling(feeling.value)}
                  selected={selectedExpenseFeeling === feeling.value}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                isEditMode ? "Guardar cambios de gastos" : "Continuar hacia gastos hormiga"
              }
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isEditMode ? "Guardar cambios" : "Continuar"}
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

function FeelingCard({
  feeling,
  selected,
  onPress
}: {
  feeling: (typeof expenseFeelings)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = feeling.icon;

  return (
    <Pressable
      accessibilityLabel={feeling.title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.feelingCard,
        {
          backgroundColor: feeling.backgroundColor,
          borderColor: selected ? colors.primary : feeling.borderColor
        },
        selected && styles.feelingCardSelected
      ]}
    >
      <Icon color={feeling.color} size={46} strokeWidth={2.4} />
      <Text style={[styles.feelingText, selected && styles.feelingTextSelected]}>
        {feeling.title}
      </Text>
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
    height: 126,
    width: 126
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
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
  helperText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginTop: -spacing.xs
  },
  midsection: {
    gap: spacing.md
  },
  midsectionRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm
  },
  rangePanel: {
    flex: 0.82,
    paddingHorizontal: spacing.sm
  },
  categoryPanel: {
    flex: 1.22,
    paddingHorizontal: spacing.sm
  },
  compactList: {
    gap: spacing.xs
  },
  compactOption: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  feelingGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  feelingCard: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    minHeight: 150,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  feelingCardSelected: {
    borderWidth: 2
  },
  feelingText: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option,
    textAlign: "center"
  },
  feelingTextSelected: {
    color: colors.primary
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
