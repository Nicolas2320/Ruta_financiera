import type { ComponentType } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeftRight,
  Ban,
  CreditCard,
  IdCard,
  KeyRound,
  LockKeyhole,
  ShieldCheck
} from "lucide-react-native";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

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
  const { session } = useAuth();
  const { screenPadding } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <StepHeader
            currentStep={1}
            nextAccessibilityLabel="Continuar hacia el perfil financiero"
            onBack={() => router.replace("/")}
            onNext={() => router.push("/profile")}
            title="Privacidad y confianza"
            totalSteps={6}
          />

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
                {session
                  ? "Tus respuestas se guardarán en tu cuenta."
                  : "Sin una cuenta, tus respuestas se guardan temporalmente solo en este dispositivo."}
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
              accessibilityLabel="Volver a la pantalla de inicio"
              icon={null}
              onPress={() => router.replace("/")}
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
