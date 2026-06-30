import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronRight, ClipboardList, LineChart, LogOut, Settings, UserRound } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { isSupabaseConfigured, signOut, user } = useAuth();
  const { onboardingSyncStatus } = useOnboarding();
  const { planSyncStatus } = usePlan();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Settings color={colors.primary} size={28} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>Configuracion</Text>
            <Text style={styles.subtitle}>
              Gestiona la sesion de prueba y revisa el estado de sincronizacion.
            </Text>
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

          <Pressable
            accessibilityLabel="Mejorar mi plan financiero"
            accessibilityRole="button"
            onPress={() => router.push("/improve-plan")}
            style={({ pressed }) => [styles.settingsLinkCard, pressed && styles.pressed]}
          >
            <View style={styles.settingsLinkIcon}>
              <LineChart color={colors.primary} size={24} strokeWidth={2.4} />
            </View>
            <View style={styles.settingsLinkBody}>
              <Text style={styles.settingsLinkTitle}>Mejorar mi plan financiero</Text>
              <Text style={styles.settingsLinkText}>
                Edita ingreso, gasto mensual, ahorro general y gastos pequeños para mejorar tus cálculos.
              </Text>
            </View>
            <ChevronRight color={colors.primary} size={22} strokeWidth={2.5} />
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
                Actualiza edad, país, tipo de ingreso, hábitos, deudas, inversiones y respuestas iniciales.
              </Text>
            </View>
            <ChevronRight color={colors.primary} size={22} strokeWidth={2.5} />
          </Pressable>

          <PrimaryButton
            accessibilityLabel="Volver al inicio"
            icon={null}
            onPress={() => router.push("/dashboard")}
            title="Volver al inicio"
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle
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
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
