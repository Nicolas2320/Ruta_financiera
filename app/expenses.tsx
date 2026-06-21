import type { ComponentType } from "react";
import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Apple,
  BusFront,
  Cable,
  CalendarCheck,
  CircleEllipsis,
  CreditCard,
  Frown,
  Gamepad2,
  GraduationCap,
  HandHeart,
  House,
  Meh,
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

import { PrimaryButton } from "../components/PrimaryButton";
import { CategoryChip } from "../components/ui/CategoryChip";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const expensesCupReceipt = require("../assets/illustrations/expenses-cup-receipt.png");

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

const expenseRanges = [
  "Menos de $1.000.000",
  "$1.000.000 – $2.000.000",
  "$2.000.000 – $4.000.000",
  "$4.000.000 – $6.000.000",
  "Más de $6.000.000",
  "No estoy seguro"
] as const;

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

export default function ExpensesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedExpenseRange, setSelectedExpenseRange] = useState<string | null>(
    onboarding.expensesRange
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
      expensesFeeling: selectedExpenseFeeling
    });
    router.push("/small-expenses");
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
            currentStep={5}
            onBack={() => router.push("/income")}
            title="Gastos"
            totalSteps={8}
          />

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
              accessibilityLabel="Continuar hacia gastos hormiga"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver a ingresos"
              icon={null}
              onPress={() => router.push("/income")}
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
