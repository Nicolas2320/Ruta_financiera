import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  LineChart,
  LogOut,
  Settings,
  Trash2,
  UserRound
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FinancialGuidancePreference } from "../components/FinancialGuidancePreference";
import { PrimaryButton } from "../components/PrimaryButton";
import { getFinancialGuidanceOption } from "../constants/financialEducation";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export default function SettingsScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const { isSupabaseConfigured, signOut, user } = useAuth();
  const {
    onboarding,
    onboardingSyncError,
    onboardingSyncStatus,
    resetFinancialData,
    updateOnboarding
  } = useOnboarding();
  const { planSyncError, planSyncStatus, resetPlanProgress } = usePlan();
  const [isEditingGuidance, setIsEditingGuidance] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const guidanceOption = getFinancialGuidanceOption(onboarding.financialGuidanceMode);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleResetFinancialData = async () => {
    setIsResetting(true);
    setResetFeedback(null);

    const onboardingReset = await resetFinancialData();
    const planReset = await resetPlanProgress();

    setIsResetting(false);

    if (onboardingReset && planReset) {
      setConfirmingReset(false);
      setResetFeedback("Datos financieros borrados. Tu cuenta sigue activa.");
      return;
    }

    setResetFeedback(
      onboardingSyncError ??
        planSyncError ??
        "No pudimos borrar todos los datos. Intentalo de nuevo."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Settings color={colors.primary} size={28} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>Configuración</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.accountRow}>
              <View style={styles.accountIcon}>
                <UserRound color={colors.primary} size={22} strokeWidth={2.4} />
              </View>
              <View style={styles.accountText}>
                <Text style={styles.accountLabel}>Usuario</Text>
                <Text style={styles.accountValue}>{user?.email ?? "Sin sesion activa"}</Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <StatusPill
                label="Supabase"
                value={isSupabaseConfigured ? "Configurado" : "Pendiente"}
              />
              <StatusPill label="Onboarding" value={onboardingSyncStatus} />
              <StatusPill label="Plan" value={planSyncStatus} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.experienceHeader}>
              <View style={styles.experienceIcon}>
                <BookOpen color={colors.primary} size={23} strokeWidth={2.4} />
              </View>
              <View style={styles.settingsLinkBody}>
                <Text style={styles.settingsLinkTitle}>Acompañamiento de resultados</Text>
                <Text style={styles.settingsLinkText}>
                  Define cuánta explicación quieres ver en tu diagnóstico y simulación.
                </Text>
              </View>
            </View>

            <View style={styles.guidanceSummary}>
              <View style={styles.settingsLinkBody}>
                <Text style={styles.guidanceSummaryLabel}>Modo actual</Text>
                <Text style={styles.guidanceSummaryValue}>{guidanceOption.label}</Text>
              </View>
              <Pressable
                accessibilityLabel={
                  isEditingGuidance
                    ? "Cerrar opciones de acompañamiento"
                    : "Cambiar acompañamiento de resultados"
                }
                accessibilityRole="button"
                accessibilityState={{ expanded: isEditingGuidance }}
                onPress={() => setIsEditingGuidance((current) => !current)}
                style={({ pressed }) => [
                  styles.guidanceChangeButton,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.guidanceChangeButtonText}>
                  {isEditingGuidance ? "Cerrar" : "Cambiar"}
                </Text>
              </Pressable>
            </View>

            {isEditingGuidance ? (
              <FinancialGuidancePreference
                onChange={(financialGuidanceMode) => {
                  updateOnboarding({ financialGuidanceMode });
                  setIsEditingGuidance(false);
                }}
                value={onboarding.financialGuidanceMode}
              />
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="Mejorar mi plan financiero"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.settingsLinkCard, styles.settingsLinkCardDisabled]}
          >
            <View style={styles.settingsLinkIcon}>
              <LineChart color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <View style={styles.settingsLinkBody}>
              <Text style={styles.settingsLinkTitle}>Mejorar mi plan financiero</Text>
              <Text style={styles.settingsLinkText}>
                Edita ingreso, gastos mensuales y ahorro general. El detalle de gastos pequeños es opcional.
              </Text>
            </View>
            <ChevronRight color={colors.textSubtle} size={22} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            accessibilityLabel="Editar perfil financiero"
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/summary", params: { mode: "edit" } })}
            style={({ pressed }) => [styles.settingsLinkCard, pressed && styles.pressed]}
          >
            <View style={styles.settingsLinkIcon}>
              <ClipboardList color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <View style={styles.settingsLinkBody}>
              <Text style={styles.settingsLinkTitle}>Editar perfil financiero</Text>
              <Text style={styles.settingsLinkText}>
                Actualiza nombre, ingresos, gastos, ahorro y deudas usados en tu diagnóstico.
              </Text>
            </View>
            <ChevronRight color={colors.primary} size={22} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.resetSection}>
            {confirmingReset ? (
              <View style={styles.resetConfirmBox}>
                <Text style={styles.resetConfirmTitle}>Confirmar borrado</Text>
                <Text style={styles.settingsLinkText}>
                  Tendrás que crear de nuevo tu diagnóstico financiero para ver el dashboard,
                  simulación y plan mensual.
                </Text>
                <View style={styles.resetActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isResetting}
                    onPress={() => {
                      setConfirmingReset(false);
                      setResetFeedback(null);
                    }}
                    style={({ pressed }) => [
                      styles.resetCancelButton,
                      pressed && !isResetting && styles.pressed
                    ]}
                  >
                    <Text style={styles.resetCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isResetting }}
                    disabled={isResetting}
                    onPress={handleResetFinancialData}
                    style={({ pressed }) => [
                      styles.resetDangerButton,
                      isResetting && styles.resetDisabled,
                      pressed && !isResetting && styles.pressed
                    ]}
                  >
                    <Text style={styles.resetDangerText}>
                      {isResetting ? "Borrando..." : "Borrar mis datos"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Borrar mis datos financieros"
                accessibilityRole="button"
                onPress={() => {
                  setConfirmingReset(true);
                  setResetFeedback(null);
                }}
                style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
              >
                <Trash2 color={colors.danger} size={20} strokeWidth={2.4} />
                <Text style={styles.resetButtonText}>Borrar mis datos</Text>
              </Pressable>
            )}

            {resetFeedback ? <Text style={styles.resetFeedback}>{resetFeedback}</Text> : null}
          </View>

          <PrimaryButton
            accessibilityLabel="Volver al dashboard"
            icon={null}
            onPress={() => router.replace("/dashboard")}
            style={styles.secondaryButton}
            title="Volver"
            variant="secondary"
          />

          {user ? (
            <PrimaryButton
              accessibilityLabel="Cerrar sesion"
              icon={LogOut}
              iconPosition="right"
              onPress={handleSignOut}
              title="Cerrar sesion"
              variant="secondary"
            />
          ) : (
            <PrimaryButton
              accessibilityLabel="Iniciar sesion"
              icon={UserRound}
              iconPosition="right"
              onPress={() => router.push("/auth")}
              title="Iniciar sesion"
              variant="secondary"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
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
    justifyContent: "center",
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
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.title
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  accountIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  accountText: {
    flex: 1,
    gap: spacing.xs
  },
  accountLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textTransform: "uppercase"
  },
  accountValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md
  },
  statusLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  statusValue: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  experienceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  experienceIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  guidanceSummary: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  guidanceSummaryLabel: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
  },
  guidanceSummaryValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  guidanceChangeButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  guidanceChangeButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  settingsLinkCard: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  settingsLinkCardDisabled: {
    opacity: 0.5
  },
  settingsLinkIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  settingsLinkBody: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  settingsLinkTitle: {
    color: colors.text,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  settingsLinkText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption
  },
  resetSection: {
    gap: spacing.sm
  },
  resetButton: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  resetButtonText: {
    color: colors.danger,
    fontSize: typography.button,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.button
  },
  resetConfirmBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  resetConfirmTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.body
  },
  resetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  resetCancelButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  resetCancelText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  resetDangerButton: {
    alignItems: "center",
    backgroundColor: "#B42318",
    borderRadius: radius.md,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  resetDangerText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  resetDisabled: {
    opacity: 0.64
  },
  resetFeedback: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
