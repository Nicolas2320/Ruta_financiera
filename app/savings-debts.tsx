import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Landmark, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { SelectableOption } from "../components/SelectableOption";
import { StepIndicator } from "../components/StepIndicator";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

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
  "No podría cubrirlos",
  "Menos de 1 mes",
  "1 – 3 meses",
  "3 – 6 meses",
  "Más de 6 meses",
  "No estoy seguro"
] as const;

const debtSituations = [
  "No tengo deudas",
  "Tengo deudas, pero las pago sin problema",
  "A veces me cuesta pagarlas",
  "Son una preocupación importante",
  "Prefiero no responder"
] as const;

const debtPaymentShares = [
  "No pago deudas",
  "Menos del 10%",
  "10% – 20%",
  "20% – 40%",
  "Más del 40%",
  "No estoy seguro",
  "Prefiero no responder"
] as const;

const investmentSituations = [
  "No tengo inversiones",
  "No, pero quiero aprender",
  "Sí, pero no entiendo bien cómo funcionan",
  "Sí, y las entiendo",
  "Prefiero no responder"
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
          <StepIndicator currentStep={7} label="AHORROS Y DEUDAS" totalSteps={8} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Landmark color={colors.primary} size={28} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Tu punto de partida financiero</Text>

            <Text style={styles.subtitle}>
              No necesitas dar cifras exactas. Con rangos aproximados podemos entender si conviene
              priorizar ahorro, deudas o inversión.
            </Text>

            <View style={styles.trustMessage}>
              <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Puedes elegir “Prefiero no responder” si algún dato te incomoda.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuánto tienes ahorrado actualmente?</Text>
            <View style={styles.optionsList}>
              {savingsRanges.map((range) => (
                <SelectableOption
                  key={range}
                  label={range}
                  onPress={() => setSelectedSavingsRange(range)}
                  selected={selectedSavingsRange === range}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿Cuánto tiempo podrías cubrir tus gastos esenciales sin ingresos?
            </Text>
            <View style={styles.optionsList}>
              {emergencyCoverageOptions.map((coverage) => (
                <SelectableOption
                  key={coverage}
                  label={coverage}
                  onPress={() => setSelectedEmergencyCoverage(coverage)}
                  selected={selectedEmergencyCoverage === coverage}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cómo describirías tus deudas actualmente?</Text>
            <View style={styles.optionsList}>
              {debtSituations.map((situation) => (
                <SelectableOption
                  key={situation}
                  label={situation}
                  onPress={() => handleDebtSituationSelect(situation)}
                  selected={selectedDebtSituation === situation}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>
              ¿Qué parte de tus ingresos mensuales se va pagando deudas?
            </Text>
            <View style={styles.optionsList}>
              {debtPaymentShares.map((share) => (
                <SelectableOption
                  key={share}
                  label={share}
                  onPress={() => setSelectedDebtPaymentShare(share)}
                  selected={selectedDebtPaymentShare === share}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Tienes inversiones actualmente?</Text>
            <View style={styles.optionsList}>
              {investmentSituations.map((situation) => (
                <SelectableOption
                  key={situation}
                  label={situation}
                  onPress={() => setSelectedInvestmentSituation(situation)}
                  selected={selectedInvestmentSituation === situation}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia meta financiera"
              disabled={!canContinue}
              icon={null}
              onPress={handleContinue}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver a gastos hormiga"
              icon={null}
              onPress={() => router.push("/small-expenses")}
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
  optionsList: {
    gap: spacing.sm
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  }
});
