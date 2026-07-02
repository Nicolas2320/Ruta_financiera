import type { ComponentType } from "react";
import type { DimensionValue } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowRight,
  ArrowLeftRight,
  Ban,
  ChevronLeft,
  CreditCard,
  IdCard,
  KeyRound,
  LockKeyhole,
  ShieldCheck
} from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

const privacyShield = require("../assets/illustrations/privacy-shield.png");

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type ExcludedDataItem = {
  label: string;
  icon: ComponentType<IconProps>;
};

const excludedData: ExcludedDataItem[] = [
  {
    label: "Cédula",
    icon: IdCard
  },
  {
    label: "Claves bancarias",
    icon: KeyRound
  },
  {
    label: "Número de cuenta",
    icon: CreditCard
  },
  {
    label: "Movimientos bancarios",
    icon: ArrowLeftRight
  }
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.stepHeader}>
            <Pressable
              accessibilityLabel="Volver a la pantalla anterior"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <ChevronLeft color="#0B1B3F" size={22} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>Paso 2 de 8</Text>
            </View>

            <Pressable
              accessibilityLabel="Continuar hacia el perfil financiero"
              accessibilityRole="button"
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            >
              <ArrowRight color={colors.primary} size={21} strokeWidth={2.5} />
            </Pressable>
          </View>

          <StepProgress currentStep={2} totalSteps={8} />

          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroCopy}>
                <View style={styles.heroIcon}>
                  <ShieldCheck color={colors.support} size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.title}>Privacidad{"\n"}y confianza</Text>
                <Text style={styles.mainText}>
                  Usaremos rangos aproximados para darte una primera orientación. No pedimos datos
                  bancarios sensibles.
                </Text>
              </View>

              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={privacyShield}
                style={styles.shieldImage}
              />
            </View>

            <View style={styles.trustMessage}>
              <View style={styles.trustIcon}>
                <LockKeyhole color={colors.support} size={18} strokeWidth={2.4} />
              </View>
              <Text style={styles.supportText}>
                Tus datos sensibles no hacen parte de este primer paso.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Lo que <Text style={styles.greenText}>nunca</Text> te pedimos
            </Text>
            <View style={styles.accentMark}>
              <View style={styles.accentRayTall} />
              <View style={styles.accentRayWide} />
              <View style={styles.accentRayShort} />
            </View>
          </View>

          <View style={styles.dataCard}>
            {excludedData.map((item, index) => (
              <DataRow
                key={item.label}
                item={item}
                showDivider={index < excludedData.length - 1}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia el perfil financiero"
              iconPosition="right"
              onPress={() => router.push("/profile")}
              style={styles.primaryButton}
              title="Continuar"
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

function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progressWidth = `${((currentStep - 1) / (totalSteps - 1)) * 100}%` as DimensionValue;

  return (
    <View
      accessibilityLabel={`Progreso del paso ${currentStep} de ${totalSteps}`}
      accessible
      style={styles.progressWrap}
    >
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <View style={styles.progressDots}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const isCompleted = step <= currentStep;
          const isActive = step === currentStep;

          return (
            <View
              key={step}
              style={[
                styles.progressDot,
                isCompleted && styles.progressDotComplete,
                isActive && styles.progressDotActive
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function DataRow({
  item,
  showDivider
}: {
  item: ExcludedDataItem;
  showDivider: boolean;
}) {
  const Icon = item.icon;

  return (
    <View style={[styles.dataRow, showDivider && styles.dataRowDivider]}>
      <View style={styles.dataIcon}>
        <Icon color={colors.support} size={19} strokeWidth={2.4} />
      </View>
      <Text style={styles.dataText}>{item.label}</Text>
      <Ban color="#A0B2D5" size={23} strokeWidth={2.1} />
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  stepHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  },
  stepPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: spacing.sm
  },
  stepPillText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  progressWrap: {
    height: 18,
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  progressTrack: {
    backgroundColor: "#DDE9F8",
    borderRadius: radius.pill,
    height: 3,
    left: 10,
    overflow: "hidden",
    position: "absolute",
    right: 10
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 3,
    left: 0,
    position: "absolute"
  },
  progressDots: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  progressDot: {
    backgroundColor: "#DDE9F8",
    borderRadius: radius.pill,
    height: 9,
    width: 9
  },
  progressDotComplete: {
    backgroundColor: colors.primary
  },
  progressDotActive: {
    height: 11,
    width: 11
  },
  heroCard: {
    ...shadows.card,
    backgroundColor: "#F0FBF6",
    borderColor: "#CDEFE0",
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md
  },
  heroContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
    paddingLeft: 2
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#DFF7E9",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  title: {
    color: colors.text,
    fontSize: typography.heroTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.heroTitle
  },
  mainText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  shieldImage: {
    height: 178,
    maxWidth: 190,
    minWidth: 122,
    width: "40%"
  },
  trustMessage: {
    alignItems: "center",
    backgroundColor: "#DFF7E9",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  trustIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  supportText: {
    color: colors.support,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  greenText: {
    color: colors.support
  },
  accentMark: {
    height: 24,
    marginTop: -8,
    width: 24
  },
  accentRayTall: {
    backgroundColor: colors.support,
    borderRadius: radius.pill,
    height: 9,
    left: 7,
    position: "absolute",
    top: 0,
    transform: [{ rotate: "0deg" }],
    width: 2
  },
  accentRayWide: {
    backgroundColor: colors.support,
    borderRadius: radius.pill,
    height: 9,
    left: 12,
    position: "absolute",
    top: 9,
    transform: [{ rotate: "0deg" }],
    width: 2
  },
  accentRayShort: {
    backgroundColor: colors.support,
    borderRadius: radius.pill,
    height: 9,
    left: 2,
    position: "absolute",
    top: 13,
    transform: [{ rotate: "0deg" }],
    width: 2
  },
  dataCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden"
  },
  dataRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 62,
    paddingHorizontal: spacing.md
  },
  dataRowDivider: {
    borderBottomColor: "#DDE8F7",
    borderBottomWidth: 1
  },
  dataIcon: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  dataText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.xs
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
