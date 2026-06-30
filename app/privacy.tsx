import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

const excludedData = [
  "Cédula",
  "Claves bancarias",
  "Número de cuenta",
  "Movimientos bancarios"
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
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <ShieldCheck color={colors.support} size={26} strokeWidth={2.4} />
            </View>

            <Text style={styles.title}>Privacidad y confianza</Text>

            <Text style={styles.mainText}>
              Usaremos rangos aproximados para darte una primera orientación.
            </Text>

            <View style={styles.trustMessage}>
              <LockKeyhole color={colors.support} size={18} strokeWidth={2.4} />
              <Text style={styles.supportText}>
                Tus datos sensibles no hacen parte de este primer paso.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos que no pedimos</Text>

            <View style={styles.dataList}>
              {excludedData.map((item) => (
                <View key={item} style={styles.dataItem}>
                  <View style={styles.dataIcon}>
                    <CheckCircle2 color={colors.support} size={18} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.dataText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Continuar hacia el perfil financiero"
              icon={null}
              onPress={() => router.push("/profile")}
              title="Continuar"
            />
            <PrimaryButton
              accessibilityLabel="Volver al inicio de Ruta Financiera"
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
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 36
  },
  mainText: {
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
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  dataList: {
    gap: spacing.sm
  },
  dataItem: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D7E7FF",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  dataIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  dataText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "800"
  },
  actions: {
    gap: spacing.sm
  }
});
