import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UserRound } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

const profileContext = require("../assets/illustrations/profile-context.png");

export default function ProfileScreen() {
  const router = useRouter();
  const { screenPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ source?: string }>();
  const { onboarding, onboardingSyncStatus, updateOnboarding } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isProfileEditMode = source === "profile";
  const [firstName, setFirstName] = useState(onboarding.firstName);
  const hasHydratedStoredAnswers = useRef(onboardingSyncStatus === "saved");

  useEffect(() => {
    if (onboardingSyncStatus !== "saved" || hasHydratedStoredAnswers.current) {
      return;
    }

    hasHydratedStoredAnswers.current = true;
    setFirstName(onboarding.firstName);
  }, [onboarding, onboardingSyncStatus]);

  const canContinue = Boolean(firstName.trim());

  const handleContinue = () => {
    if (!firstName.trim()) {
      return;
    }

    updateOnboarding({
      firstName: firstName.trim()
    });
    router.push(isProfileEditMode ? { pathname: "/summary", params: { mode: "edit" } } : "/income");
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
          {isProfileEditMode ? (
            <ContextHeader
              onBack={() => router.push({ pathname: "/summary", params: { mode: "edit" } })}
              subtitle="Volveras al perfil financiero."
              title="Editar perfil"
            />
          ) : null}
          {!isProfileEditMode ? (
            <StepHeader
              currentStep={2}
              nextAccessibilityLabel="Continuar hacia preguntas de ingresos"
              nextDisabled={!canContinue}
              onBack={() => router.replace("/privacy")}
              onNext={handleContinue}
              title="Perfil básico"
              totalSteps={6}
            />
          ) : null}

          <HeroInfoCard
            badge="No necesitas usar tu nombre completo."
            image={profileContext}
            imageStyle={styles.profileImage}
            text="Usaremos este nombre para personalizar tu experiencia dentro de la app."
            title={"Queremos conocerte"}
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cómo quieres que te llamemos?</Text>
            <View style={styles.nameGrid}>
              <View style={styles.inputWrap}>
                <UserRound color="#4E6285" size={20} strokeWidth={2.3} />
                <TextInput
                  accessibilityLabel="Nombre o apodo"
                  autoCapitalize="words"
                  onChangeText={setFirstName}
                  placeholder="Nombre o apodo"
                  placeholderTextColor="#6A7892"
                  returnKeyType="done"
                  style={styles.cityInput}
                  value={firstName}
                />
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia preguntas de ingresos"
              disabled={!canContinue}
              iconPosition="right"
              onPress={handleContinue}
              style={styles.primaryButton}
              title={isProfileEditMode ? "Guardar cambios" : "Continuar"}
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
  profileImage: {
    height: 126,
    width: 126
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: "#E1EAF7",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  questionTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.question,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.question
  },
  nameGrid: {
    gap: spacing.sm
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#F3F7FC",
    borderColor: "#D6E4F7",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  cityInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
    minHeight: 52,
    paddingVertical: 0
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
