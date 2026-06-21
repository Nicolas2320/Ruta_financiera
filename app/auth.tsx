import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyRound, LogIn, Mail, Route, ShieldCheck, UserPlus } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const router = useRouter();
  const {
    authError,
    isAuthReady,
    isSupabaseConfigured,
    session,
    signInWithPassword,
    signUpWithPassword
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    isSupabaseConfigured && isAuthReady && email.trim().length > 3 && password.length >= 6;
  const isSignIn = mode === "sign-in";

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = isSignIn
      ? await signInWithPassword(email, password)
      : await signUpWithPassword(email, password);

    setIsSubmitting(false);

    if (result.error) {
      setFeedback(result.error);
      return;
    }

    if (!isSignIn && !result.session) {
      setFeedback("Usuario creado. Revisa el correo si tu proyecto exige confirmacion.");
      return;
    }

    router.replace(isSignIn ? "/" : "/privacy");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Route color={colors.primary} size={25} strokeWidth={2.7} />
            </View>
            <Text style={styles.brandName}>Ruta Financiera</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              {isSignIn ? (
                <LogIn color={colors.primary} size={28} strokeWidth={2.4} />
              ) : (
                <UserPlus color={colors.primary} size={28} strokeWidth={2.4} />
              )}
            </View>

            <View style={styles.titleGroup}>
              <Text style={styles.title}>
                {isSignIn ? "Iniciar sesion" : "Crear usuario de prueba"}
              </Text>
              <Text style={styles.subtitle}>
                {isSignIn
                  ? "Entra para recuperar la informacion guardada."
                  : "Usaremos este usuario para validar la persistencia en Supabase."}
              </Text>
            </View>

            <View style={styles.modeSwitch}>
              <ModeButton
                active={isSignIn}
                label="Entrar"
                onPress={() => setMode("sign-in")}
              />
              <ModeButton
                active={!isSignIn}
                label="Crear"
                onPress={() => setMode("sign-up")}
              />
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Mail color={colors.textSubtle} size={20} strokeWidth={2.3} />
                <TextInput
                  accessibilityLabel="Correo electronico"
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={colors.textSubtle}
                  returnKeyType="next"
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.inputWrap}>
                <KeyRound color={colors.textSubtle} size={20} strokeWidth={2.3} />
                <TextInput
                  accessibilityLabel="Contrasena"
                  autoCapitalize="none"
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  onChangeText={setPassword}
                  placeholder="Minimo 6 caracteres"
                  placeholderTextColor={colors.textSubtle}
                  returnKeyType="done"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>
            </View>

            {feedback || authError ? (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>{feedback ?? authError}</Text>
              </View>
            ) : null}

            {!isSupabaseConfigured ? (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>
                  Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
                </Text>
              </View>
            ) : null}

            {session ? (
              <View style={styles.trustMessage}>
                <ShieldCheck color={colors.support} size={18} strokeWidth={2.4} />
                <Text style={styles.supportText}>Sesion activa: {session.user.email}</Text>
              </View>
            ) : null}

            <PrimaryButton
              accessibilityLabel={isSignIn ? "Iniciar sesion" : "Crear usuario de prueba"}
              disabled={!canSubmit || isSubmitting}
              icon={isSignIn ? LogIn : UserPlus}
              iconPosition="right"
              onPress={handleSubmit}
              title={isSubmitting ? "Validando..." : isSignIn ? "Entrar" : "Crear usuario"}
            />

            <PrimaryButton
              accessibilityLabel="Volver al inicio"
              icon={null}
              onPress={() => router.push("/")}
              title="Volver"
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg
  },
  container: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  brandName: {
    color: colors.text,
    fontSize: typography.brand,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.brand
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
    height: 56,
    justifyContent: "center",
    width: 56
  },
  titleGroup: {
    gap: spacing.xs
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
  modeSwitch: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs
  },
  modeButton: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: "center",
    minHeight: 42
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  modeButtonText: {
    color: colors.textSubtle,
    fontSize: typography.button,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.button
  },
  modeButtonTextActive: {
    color: colors.primary
  },
  form: {
    gap: spacing.sm
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#F8FBFF",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
    minHeight: 52,
    paddingVertical: 0
  },
  feedbackBox: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FED7AA",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  feedbackText: {
    color: "#9A5B20",
    fontSize: typography.caption,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.caption
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
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
