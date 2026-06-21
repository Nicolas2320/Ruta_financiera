import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CircleQuestionMark,
  BookOpen,
  Calendar,
  CalendarArrowDown,
  CalendarCheck2,
  ChartColumnIncreasing,
  ChartPie,
  GraduationCap,
  Shield,
  Sprout,
  CalendarArrowUp,
  Ban
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const financialFoundation = require("../assets/illustrations/financial-foundation.png");

const defaultOptionIconColor = "#6A7892";
const defaultOptionIconBackground = "#EEF2F7";
const uncertaintyIconColor = "#8B5CF6";
const uncertaintyIconBackground = "#F1E8FF";
const statusIconColors = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
  strong: "#047857"
};
const statusIconBackgrounds = {
  critical: "#FEE2E2",
  high: "#FFEDD5",
  medium: "#FEF3C7",
  low: "#DCFCE7",
  strong: "#D1FAE5"
};
const debtIconColors = {
  none: statusIconColors.strong,
  low: statusIconColors.low,
  medium: statusIconColors.medium,
  high: statusIconColors.high,
  critical: statusIconColors.critical
};
const debtIconBackgrounds = {
  none: statusIconBackgrounds.strong,
  low: statusIconBackgrounds.low,
  medium: statusIconBackgrounds.medium,
  high: statusIconBackgrounds.high,
  critical: statusIconBackgrounds.critical
};

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

const savingsRanges = [
  "No tengo ahorros",
  "Menos de $500.000",
  "$500.000 – $2.000.000",
  "$2.000.000 – $5.000.000",
  "$5.000.000 – $10.000.000",
  "Más de $10.000.000",
  "Prefiero no responder"
] as const;

const emergencyCoverageOptions = [
  {
    title: "No podría cubrirlos",
    icon: Shield,
    color: statusIconColors.critical,
    backgroundColor: statusIconBackgrounds.critical
  },
  {
    title: "Menos de 1 mes",
    icon: CalendarArrowDown,
    color: statusIconColors.high,
    backgroundColor: statusIconBackgrounds.high
  },
  {
    title: "1 – 3 meses",
    icon: Calendar,
    color: statusIconColors.medium,
    backgroundColor: statusIconBackgrounds.medium
  },
  {
    title: "3 – 6 meses",
    icon: CalendarCheck2,
    color: statusIconColors.low,
    backgroundColor: statusIconBackgrounds.low
  },
  {
    title: "Más de 6 meses",
    icon: CalendarArrowUp,
    color: statusIconColors.strong,
    backgroundColor: statusIconBackgrounds.strong
  },
  {
    title: "No estoy seguro",
    icon: CircleQuestionMark,
    color: uncertaintyIconColor,
    backgroundColor: uncertaintyIconBackground
  }
] as const;

const debtSituations = [
  "No tengo deudas",
  "Tengo deudas, pero las pago sin problema",
  "A veces me cuesta pagarlas",
  "Son una preocupación importante",
  "Prefiero no responder"
] as const;

const debtPaymentShares = [
  {
    title: "No pago deudas",
    icon: ChartPie,
    color: debtIconColors.none,
    backgroundColor: debtIconBackgrounds.none
  },
  {
    title: "Menos del 10%",
    icon: ChartPie,
    color: debtIconColors.low,
    backgroundColor: debtIconBackgrounds.low
  },
  {
    title: "10% – 20%",
    icon: ChartPie,
    color: debtIconColors.medium,
    backgroundColor: debtIconBackgrounds.medium
  },
  {
    title: "20% – 40%",
    icon: ChartPie,
    color: debtIconColors.high,
    backgroundColor: debtIconBackgrounds.high
  },
  {
    title: "Más del 40%",
    icon: ChartPie,
    color: debtIconColors.critical,
    backgroundColor: debtIconBackgrounds.critical
  },
  {
    title: "No estoy seguro",
    icon: CircleQuestionMark,
    color: uncertaintyIconColor,
    backgroundColor: uncertaintyIconBackground
  },
  {
    title: "Prefiero no responder",
    icon: Ban,
    color: defaultOptionIconColor,
    backgroundColor: defaultOptionIconBackground
  }
] as const;

const investmentSituations = [
  {
    title: "No tengo inversiones",
    icon: Sprout,
    color: statusIconColors.low,
    backgroundColor: statusIconBackgrounds.low
  },
  {
    title: "No, pero quiero aprender",
    icon: GraduationCap,
    color: "#F97316",
    backgroundColor: "#FFEDD5"
  },
  {
    title: "Sí, pero no entiendo bien cómo funcionan",
    icon: BookOpen,
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  {
    title: "Sí, y las entiendo",
    icon: ChartColumnIncreasing,
    color: statusIconColors.strong,
    backgroundColor: statusIconBackgrounds.strong
  },
  {
    title: "Prefiero no responder",
    icon: Ban,
    color: defaultOptionIconColor,
    backgroundColor: defaultOptionIconBackground
  }
] as const;

export default function SavingsDebtsScreen() {
  const router = useRouter();
  const { onboarding, updateOnboarding } = useOnboarding();
  const [selectedSavingsRange, setSelectedSavingsRange] = useState<string | null>(
    onboarding.savingsRange
  );
  const [selectedEmergencyCoverage, setSelectedEmergencyCoverage] = useState<string | null>(
    onboarding.emergencyCoverage
  );
  const [selectedDebtSituation, setSelectedDebtSituation] = useState<string | null>(
    onboarding.debtSituation
  );
  const [selectedDebtPaymentShare, setSelectedDebtPaymentShare] = useState<string | null>(
    onboarding.debtPaymentShare ??
      (onboarding.debtSituation === "No tengo deudas" ? "No pago deudas" : null)
  );
  const [selectedInvestmentSituation, setSelectedInvestmentSituation] = useState<string | null>(
    onboarding.investmentSituation
  );

  const canContinue = Boolean(
    selectedSavingsRange &&
      selectedEmergencyCoverage &&
      selectedDebtSituation &&
      selectedDebtPaymentShare &&
      selectedInvestmentSituation
  );

  const handleDebtSituationSelect = (situation: string) => {
    if (
      selectedDebtSituation === "No tengo deudas" &&
      situation !== "No tengo deudas" &&
      selectedDebtPaymentShare === "No pago deudas"
    ) {
      setSelectedDebtPaymentShare(null);
    }

    setSelectedDebtSituation(situation);

    if (situation === "No tengo deudas") {
      setSelectedDebtPaymentShare("No pago deudas");
    }
  };

  const handleContinue = () => {
    if (
      !selectedSavingsRange ||
      !selectedEmergencyCoverage ||
      !selectedDebtSituation ||
      !selectedDebtPaymentShare ||
      !selectedInvestmentSituation
    ) {
      return;
    }

    updateOnboarding({
      savingsRange: selectedSavingsRange,
      emergencyCoverage: selectedEmergencyCoverage,
      debtSituation: selectedDebtSituation,
      debtPaymentShare: selectedDebtPaymentShare,
      investmentSituation: selectedInvestmentSituation
    });
    router.push("/goals");
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
            currentStep={7}
            onBack={() => router.push("/small-expenses")}
            title="Ahorros y deudas"
            totalSteps={8}
          />

          <HeroInfoCard
            badge="Puedes elegir “Prefiero no responder” si algún dato te incomoda."
            image={financialFoundation}
            imageStyle={styles.heroImage}
            text="No necesitas dar cifras exactas. Con rangos aproximados podemos entender si conviene priorizar ahorro, deudas o inversión."
            title={"Tu punto de partida\nfinanciero"}
          />

          <SectionCard
            helper="Piensa en todo lo que tienes disponible para ti o tu familia."
            title="¿Cuánto tienes ahorrado actualmente?"
          >
            <View style={styles.moneyGrid}>
              {savingsRanges.map((range) => (
                <SelectableCard
                  key={range}
                  onPress={() => setSelectedSavingsRange(range)}
                  selected={selectedSavingsRange === range}
                  style={styles.moneyOption}
                  title={range}
                />
              ))}
            </View>
          </SectionCard>

          <SectionCard
            helper="Es tu respaldo ante imprevistos."
            title="¿Cuánto tiempo podrías cubrir tus gastos esenciales sin ingresos?"
          >
            <View style={styles.tileGrid}>
              {emergencyCoverageOptions.map((coverage) => {
                const Icon = coverage.icon;

                return (
                  <SelectableCard
                    key={coverage.title}
                    leading={
                      <OptionIcon
                        backgroundColor={coverage.backgroundColor}
                        color={coverage.color}
                        icon={Icon}
                      />
                    }
                    onPress={() => setSelectedEmergencyCoverage(coverage.title)}
                    selected={selectedEmergencyCoverage === coverage.title}
                    style={styles.compactTile}
                    title={coverage.title}
                    variant="center"
                  />
                );
              })}
            </View>
          </SectionCard>

          <SectionCard
            helper="No estás solo. Lo importante es saber cómo te sientes."
            title="¿Cómo describirías tus deudas actualmente?"
          >
            <View style={styles.moneyGrid}>
              {debtSituations.map((situation) => (
                <SelectableCard
                  key={situation}
                  onPress={() => handleDebtSituationSelect(situation)}
                  selected={selectedDebtSituation === situation}
                  style={styles.moneyOption}
                  title={situation}
                />
              ))}
            </View>
          </SectionCard>

          <SectionCard
            helper="Incluye tarjetas, préstamos o créditos."
            title="¿Qué parte de tus ingresos mensuales se va pagando deudas?"
          >
            <View style={styles.tileGrid}>
              {debtPaymentShares.map((share) => {
                const Icon = share.icon;

                return (
                  <SelectableCard
                    key={share.title}
                    leading={
                      <OptionIcon
                        backgroundColor={share.backgroundColor}
                        color={share.color}
                        icon={Icon}
                      />
                    }
                    onPress={() => setSelectedDebtPaymentShare(share.title)}
                    selected={selectedDebtPaymentShare === share.title}
                    style={
                      share.title === "Prefiero no responder"
                        ? styles.fullWidthTile
                        : styles.compactTile
                    }
                    title={share.title}
                    variant="center"
                  />
                );
              })}
            </View>
          </SectionCard>

          <SectionCard
            helper="Invertir te ayuda a hacer crecer tu dinero."
            title="¿Tienes inversiones actualmente?"
          >
            <View style={styles.tileGrid}>
              {investmentSituations.map((situation) => {
                const Icon = situation.icon;

                return (
                  <SelectableCard
                    key={situation.title}
                    leading={
                      <OptionIcon
                        backgroundColor={situation.backgroundColor}
                        color={situation.color}
                        icon={Icon}
                      />
                    }
                    onPress={() => setSelectedInvestmentSituation(situation.title)}
                    selected={selectedInvestmentSituation === situation.title}
                    style={styles.investmentTile}
                    title={situation.title}
                    variant="center"
                  />
                );
              })}
            </View>
          </SectionCard>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia meta financiera"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver a gastos hormiga"
              icon={null}
              onPress={() => router.push("/small-expenses")}
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

function SectionCard({
  title,
  helper,
  children
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionIntro}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionHelper}>{helper}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function OptionIcon({
  icon: Icon,
  color,
  backgroundColor
}: {
  icon: ComponentType<IconProps>;
  color: string;
  backgroundColor: string;
}) {
  return (
    <View style={[styles.optionIconBubble, { backgroundColor }]}>
      <Icon color={color} size={24} strokeWidth={2.3} />
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
  sectionCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  sectionIntro: {
    gap: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  sectionHelper: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption
  },
  sectionBody: {
    flex: 1
  },
  moneyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  moneyOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 50
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionIconBubble: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  compactTile: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 106
  },
  fullWidthTile: {
    flexBasis: "100%",
    minHeight: 52
  },
  investmentTile: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 122
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
