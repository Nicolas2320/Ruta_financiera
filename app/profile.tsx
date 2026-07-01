import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Globe, MapPin } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ContextHeader } from "../components/ui/ContextHeader";
import { HeroInfoCard } from "../components/ui/HeroInfoCard";
import { SelectableCard } from "../components/ui/SelectableCard";
import { StepHeader } from "../components/ui/StepHeader";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useOnboarding } from "../context/OnboardingContext";

const profileContext = require("../assets/illustrations/profile-context.png");

const ageRanges = ["18–24", "25–30", "31–35", "36–40", "Más de 40"] as const;
const countries = ["Colombia", "Otro"] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const { onboarding, updateOnboarding } = useOnboarding();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isProfileEditMode = source === "profile";
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(onboarding.ageRange);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(onboarding.country);
  const [city, setCity] = useState(onboarding.city);

  const canContinue = Boolean(selectedAgeRange && selectedCountry);

  const handleContinue = () => {
    if (!selectedAgeRange || !selectedCountry) {
      return;
    }

    updateOnboarding({
      ageRange: selectedAgeRange,
      country: selectedCountry,
      city: city.trim()
    });
    router.push(isProfileEditMode ? { pathname: "/summary", params: { mode: "edit" } } : "/income");
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
          {isProfileEditMode ? (
            <ContextHeader
              onBack={() => router.push({ pathname: "/summary", params: { mode: "edit" } })}
              subtitle="Volveras al perfil financiero."
              title="Editar perfil"
            />
          ) : null}
          {!isProfileEditMode ? (
            <StepHeader
              currentStep={3}
              onBack={() => router.push("/privacy")}
              title="Perfil básico"
              totalSteps={8}
            />
          ) : null}

          <HeroInfoCard
            badge="Esta información solo ayuda a personalizar tu experiencia."
            image={profileContext}
            imageStyle={styles.profileImage}
            text="Usaremos esta información para adaptar tu diagnóstico. No necesitas dar datos exactos."
            title={"Cuéntanos un poco\nsobre ti"}
          />

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿Cuál es tu rango de edad?</Text>
            <View style={styles.ageGrid}>
              {ageRanges.map((ageRange) => (
                <SelectableCard
                  key={ageRange}
                  controlPosition="middleRight"
                  onPress={() => setSelectedAgeRange(ageRange)}
                  selected={selectedAgeRange === ageRange}
                  style={ageRange === "Más de 40" ? styles.fullWidthOption : styles.halfOption}
                  title={ageRange}
                  titleStyle={styles.ageOptionText}
                  variant="center"
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.questionTitle}>¿En qué país estás?</Text>
            <View style={styles.countryGrid}>
              {countries.map((country) => (
                <SelectableCard
                  key={country}
                  leading={country === "Colombia" ? <ColombiaFlag /> : <GlobeIcon />}
                  onPress={() => setSelectedCountry(country)}
                  selected={selectedCountry === country}
                  style={styles.countryOption}
                  title={country}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.questionRow}>
              <Text style={styles.questionTitle}>¿En qué ciudad vives?</Text>
              <Text style={styles.optionalText}>Opcional</Text>
            </View>
            <View style={styles.inputWrap}>
              <MapPin color="#4E6285" size={20} strokeWidth={2.3} />
              <TextInput
                accessibilityLabel="Ciudad en la que vives"
                autoCapitalize="words"
                onChangeText={setCity}
                placeholder="Ej: Bogotá, Medellín, Cali..."
                placeholderTextColor="#6A7892"
                returnKeyType="done"
                style={styles.cityInput}
                value={city}
              />
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
              accessibilityLabel={isProfileEditMode ? "Volver al perfil financiero" : "Volver a privacidad y confianza"}
              icon={null}
              onPress={() =>
                router.push(isProfileEditMode ? { pathname: "/summary", params: { mode: "edit" } } : "/privacy")
              }
              style={styles.secondaryButton}
              title={isProfileEditMode ? "Volver al perfil" : "Volver"}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ColombiaFlag() {
  return (
    <View style={styles.flag}>
      <View style={[styles.flagBand, styles.flagYellow]} />
      <View style={[styles.flagBand, styles.flagBlue]} />
      <View style={[styles.flagBand, styles.flagRed]} />
    </View>
  );
}

function GlobeIcon() {
  return (
    <View style={styles.countryIcon}>
      <Globe color={colors.support} size={24} strokeWidth={2.4} />
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
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  halfOption: {
    flexBasis: "40%",
    flexGrow: 1,
    minHeight: 60,
  },
  fullWidthOption: {
    flexBasis: "100%",
    minHeight: 76
  },
  ageOptionText: {
    fontSize: typography.option,
    lineHeight: typography.lineHeight.option,
    textAlign: "center"
  },
  countryGrid: {
    gap: spacing.sm
  },
  countryOption: {
    flex: 1,
    minHeight: 58
  },
  flag: {
    borderColor: "#E1EAF7",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    overflow: "hidden",
    width: 28
  },
  flagBand: {
    flex: 1
  },
  flagYellow: {
    backgroundColor: "#FCD34D",
    flex: 2
  },
  flagBlue: {
    backgroundColor: "#2563EB"
  },
  flagRed: {
    backgroundColor: "#EF4444"
  },
  countryIcon: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  questionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  optionalText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textTransform: "uppercase"
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
