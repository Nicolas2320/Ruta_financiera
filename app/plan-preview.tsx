import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ClipboardCheck,
  LockKeyhole,
  Sparkles,
  Target,
  WalletCards
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { getPlanPreviewData } from "../utils/planPreview";

export default function PlanPreviewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { exactValues, onboarding } = useOnboarding();
  const preview = useMemo(
    () => getPlanPreviewData(onboarding, exactValues),
    [exactValues, onboarding]
  );
  const goalTitle = preview.goalTitle?.trim() || "tu meta financiera";
  const hasSuggestedContribution = preview.contributionLabel !== "Por definir";
  const lockedActionCount = preview.lockedActionTitles.length;

  const handleContinue = () => {
    if (session) {
      router.push("/action-plan");
      return;
    }

    router.push({
      pathname: "/auth",
      params: {
        intent: "save-plan",
        returnTo: "/action-plan"
      }
    });
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
          <View style={styles.heroCard}>
            <View style={styles.sparkleWrap}>
              <Sparkles color={colors.primary} size={27} strokeWidth={2.5} />
            </View>
            <Text style={styles.eyebrow}>RESULTADO PERSONALIZADO</Text>
            <Text style={styles.title}>Tu plan para {goalTitle} está listo</Text>
            <Text style={styles.subtitle}>
              Convertimos tu diagnóstico en {preview.actionCount} acciones concretas para
              comenzar este mes.
            </Text>
            {preview.selectedReferenceLabel ? (
              <View
                style={[
                  styles.selectedReference,
                  preview.selectedStrategy === "prioritize_goal" &&
                    styles.selectedReferenceGoal,
                  !preview.selectedReferenceIsApplicable &&
                    styles.selectedReferenceUnavailable
                ]}
              >
                <Text style={styles.selectedReferenceLabel}>
                  {preview.selectedReferenceIsApplicable
                    ? "REFERENCIA ELEGIDA"
                    : "REFERENCIA ANTERIOR"}
                </Text>
                <Text style={styles.selectedReferenceText}>
                  {preview.selectedReferenceLabel}
                </Text>
                {!preview.selectedReferenceIsApplicable ? (
                  <Text style={styles.selectedReferenceNotice}>
                    Ya no puede aplicarse con tus datos actuales; esta vista usa la
                    recomendación automática.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <ClipboardCheck color={colors.primary} size={25} strokeWidth={2.5} />
              </View>
              <View style={styles.planTitleGroup}>
                <Text style={styles.planKicker}>TU PLAN DE ESTE MES</Text>
                <Text style={styles.planTitle}>{preview.focusTitle}</Text>
              </View>
              <View style={styles.visibleBadge}>
                <Text style={styles.visibleBadgeText}>
                  1 de {preview.actionCount} visible
                </Text>
              </View>
            </View>

            <View style={styles.conclusionCard}>
              <View style={styles.conclusionIcon}>
                {hasSuggestedContribution ? (
                  <WalletCards color={colors.support} size={22} strokeWidth={2.5} />
                ) : (
                  <Target color={colors.primary} size={22} strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.conclusionCopy}>
                <Text style={styles.conclusionLabel}>
                  {hasSuggestedContribution
                    ? "APORTE MENSUAL DE REFERENCIA"
                    : "PRIMER OBJETIVO DEL PLAN"}
                </Text>
                {hasSuggestedContribution ? (
                  <>
                    <Text style={styles.contributionValue}>
                      {preview.contributionLabel}
                    </Text>
                    <Text style={styles.conclusionText}>
                      {preview.contributionPurpose}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.conclusionTitle}>
                      Definir un aporte sostenible
                    </Text>
                    <Text style={styles.conclusionText}>
                      para empezar a avanzar hacia {goalTitle}.
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.actionSection}>
              <Text style={styles.actionSectionTitle}>Tus acciones</Text>

              <View style={styles.visibleAction}>
                <View style={styles.visibleActionNumber}>
                  <Text style={styles.visibleActionNumberText}>1</Text>
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.visibleActionLabel}>PRIMERA ACCIÓN</Text>
                  <Text style={styles.visibleActionTitle}>
                    {preview.firstActionTitle}
                  </Text>
                  <Text style={styles.visibleActionDescription}>
                    {preview.firstActionDescription}
                  </Text>
                </View>
              </View>

              <View style={styles.lockedActions}>
                {preview.lockedActionTitles.map((actionTitle, index) => (
                  <View key={`${index}-${actionTitle}`} style={styles.lockedAction}>
                    <View style={styles.lockedActionNumber}>
                      <Text style={styles.lockedActionNumberText}>{index + 2}</Text>
                    </View>
                    <View style={styles.lockedActionCopy}>
                      <Text numberOfLines={1} style={styles.lockedActionTitle}>
                        {actionTitle}
                      </Text>
                      <Text style={styles.lockedActionHint}>
                        Detalle disponible al crear tu cuenta
                      </Text>
                    </View>
                    <View style={styles.lockedActionIcon}>
                      <LockKeyhole color="#7C3AED" size={17} strokeWidth={2.5} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.unlockMessage}>
              <View style={styles.unlockIcon}>
                <LockKeyhole color="#6D28D9" size={22} strokeWidth={2.5} />
              </View>
              <View style={styles.unlockCopy}>
                <Text style={styles.unlockTitle}>
                  Continúa con {lockedActionCount} acciones más
                </Text>
                <Text style={styles.unlockText}>
                  Crea tu cuenta para ver las {preview.actionCount} acciones y guardar tu
                  avance.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel={
                session ? "Ver mi plan mensual" : "Registrarme para ver mi plan completo"
              }
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={
                session ? "Ver mi plan mensual" : "Registrarme para ver mi plan completo"
              }
            />
            <PrimaryButton
              accessibilityLabel="Seguir revisando mi simulación"
              icon={null}
              onPress={() => router.back()}
              style={styles.secondaryButton}
              title="Seguir revisando mi simulación"
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
    backgroundColor: "#F3F7FC",
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 620,
    width: "100%"
  },
  heroCard: {
    ...shadows.card,
    alignItems: "flex-start",
    backgroundColor: "#EAF2FF",
    borderColor: "#BFD5FF",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  sparkleWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 52
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    letterSpacing: 0.8,
    lineHeight: typography.lineHeight.badge
  },
  title: {
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body
  },
  selectedReference: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.supportBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  selectedReferenceGoal: {
    borderColor: colors.primaryBorder
  },
  selectedReferenceUnavailable: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA"
  },
  selectedReferenceLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.small
  },
  selectedReferenceText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  selectedReferenceNotice: {
    color: "#92400E",
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  planCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#D6E4F7",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  planHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  planIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  planTitleGroup: {
    flex: 1,
    minWidth: 180
  },
  planKicker: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.6,
    lineHeight: typography.lineHeight.small
  },
  planTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sectionTitle
  },
  visibleBadge: {
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  visibleBadgeText: {
    color: colors.support,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  conclusionCard: {
    alignItems: "flex-start",
    backgroundColor: "#F5FCF8",
    borderColor: "#CDEFE0",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  conclusionIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  conclusionCopy: {
    flex: 1,
    gap: 2
  },
  conclusionLabel: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
    lineHeight: typography.lineHeight.small
  },
  contributionValue: {
    color: colors.support,
    fontSize: typography.cardTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.cardTitle
  },
  conclusionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  conclusionText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  actionSection: {
    gap: spacing.sm
  },
  actionSectionTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  visibleAction: {
    alignItems: "flex-start",
    backgroundColor: "#F8FBFF",
    borderColor: "#CFE0FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  visibleActionNumber: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  visibleActionNumberText: {
    color: colors.support,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  actionCopy: {
    flex: 1,
    gap: 2
  },
  visibleActionLabel: {
    color: colors.support,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    letterSpacing: 0.4,
    lineHeight: typography.lineHeight.small
  },
  visibleActionTitle: {
    color: colors.text,
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  visibleActionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  lockedActions: {
    gap: spacing.sm
  },
  lockedAction: {
    alignItems: "center",
    backgroundColor: "#F8F7FB",
    borderColor: "#E4DDF2",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 66,
    opacity: 0.82,
    padding: spacing.sm
  },
  lockedActionNumber: {
    alignItems: "center",
    backgroundColor: "#EEEAF5",
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  lockedActionNumberText: {
    color: "#7A6D91",
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  lockedActionCopy: {
    flex: 1,
    minWidth: 0
  },
  lockedActionTitle: {
    color: "#5C526C",
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
  },
  lockedActionHint: {
    color: "#8B7CA3",
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  lockedActionIcon: {
    alignItems: "center",
    backgroundColor: "#F1E8FF",
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  unlockMessage: {
    alignItems: "flex-start",
    backgroundColor: "#F7F1FF",
    borderColor: "#DCCBFF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  unlockIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  unlockCopy: {
    flex: 1,
    gap: 2
  },
  unlockTitle: {
    color: "#5B21B6",
    fontSize: typography.option,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.option
  },
  unlockText: {
    color: "#6D4D8D",
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption
  },
  actions: {
    gap: spacing.sm
  },
  primaryButton: {
    borderRadius: 17,
    minHeight: 58
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: "#CFE0FF",
    borderRadius: 17,
    minHeight: 54
  }
});
