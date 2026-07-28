import { useState } from "react";
import { useLocalSearchParams, useRouter, type Route as ExpoRoute } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyRound, LogIn, Mail, Route, ShieldCheck, UserPlus } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    intent?: string;
    mode?: string;
    returnTo?: string;
  }>();
  const { screenPadding } = useResponsiveLayout();
  const intent = Array.isArray(params.intent) ? params.intent[0] : params.intent;
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const requestedReturnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;
  const isSavePlanFlow = intent === "save-plan";
  const returnTo: ExpoRoute =
    requestedReturnTo === "/dashboard"
      ? "/dashboard"
      : requestedReturnTo === "/action-plan"
        ? "/action-plan"
        : isSavePlanFlow
          ? "/action-plan"
          : "/";
  const {
    authError,
    isAuthReady,
    isSupabaseConfigured,
    session,
    signInWithPassword,
    signUpWithPassword
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>(
    isSavePlanFlow || requestedMode === "sign-up" ? "sign-up" : "sign-in"
  );
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
      setFeedback(
        isSavePlanFlow
          ? "Cuenta creada. Revisa tu correo para confirmarla. Tu diagnóstico seguirá guardado en este dispositivo."
          : "Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión."
      );
      return;
    }

    router.replace(
      isSavePlanFlow || requestedReturnTo
        ? returnTo
        : isSignIn
          ? "/"
          : "/privacy"
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}
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
                {isSignIn
                  ? "Iniciar sesión"
                  : isSavePlanFlow
                    ? "Guarda tu ruta financiera"
                    : "Crear una cuenta"}
              </Text>
              <Text style={styles.subtitle}>
                {isSignIn
                  ? isSavePlanFlow
                    ? "Entra para continuar con los datos guardados en tu cuenta. Si ya tenías un plan, lo conservaremos."
                    : "Entra para recuperar la información guardada."
                  : isSavePlanFlow
                    ? "Ya viste tu diagnóstico y simulación. Crea una cuenta para guardar tus respuestas y abrir tu plan mensual."
                    : "Crea tu cuenta y después comenzaremos tu diagnóstico."}
              </Text>
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
                  accessibilityLabel="Contraseña"
                  autoCapitalize="none"
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
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
                <Text style={styles.supportText}>Sesión activa: {session.user.email}</Text>
              </View>
            ) : null}

            <PrimaryButton
              accessibilityLabel={isSignIn ? "Iniciar sesión" : "Crear una cuenta"}
              disabled={!canSubmit || isSubmitting}
              icon={isSignIn ? LogIn : UserPlus}
              iconPosition="right"
              onPress={handleSubmit}
              title={isSubmitting ? "Validando..." : isSignIn ? "Entrar" : "Crear cuenta"}
            />

            <Pressable
              accessibilityLabel={
                isSignIn ? "Crear una cuenta" : "Iniciar sesión en una cuenta existente"
              }
              accessibilityRole="button"
              onPress={() => {
                setFeedback(null);
                setMode(isSignIn ? "sign-up" : "sign-in");
              }}
              style={({ pressed }) => [styles.modePrompt, pressed && styles.pressed]}
            >
              <Text style={styles.modePromptText}>
                {isSignIn ? "¿No tienes una cuenta? " : "¿Ya tienes una cuenta? "}
                <Text style={styles.modePromptLink}>
                  {isSignIn ? "Crear una" : "Iniciar sesión"}
                </Text>
              </Text>
            </Pressable>

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
  modePrompt: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm
  },
  modePromptText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  modePromptLink: {
    color: colors.primary,
    fontWeight: typography.weight.black
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
