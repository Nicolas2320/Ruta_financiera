import type { ComponentType } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CalendarCheck,
  CirclePlay,
  ClipboardList,
  Coffee,
  Route,
  ShieldCheck
} from "lucide-react-native";
import { ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

const welcomeRoute = require("../assets/illustrations/welcome-route.png");

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type Feature = {
  title: string;
  text: string;
  icon: ComponentType<IconProps>;
  accent: "blue" | "green" | "warm";
};

const features: Feature[] = [
  {
    title: "Diagnóstico simple",
    text: "Con rangos de ingresos, gastos, ahorros y deudas.",
    icon: ClipboardList,
    accent: "blue"
  },
  {
    title: "Control de gastos hormiga",
    text: "Identifica pequeños gastos frecuentes sin sentirte juzgado.",
    icon: Coffee,
    accent: "green"
  },
  {
    title: "Plan mensual personalizado",
    text: "Acciones claras para avanzar hacia tu meta.",
    icon: CalendarCheck,
    accent: "warm"
  }
];

const featureAccents = {
  blue: {
    iconBackground: colors.primarySoft,
    iconColor: colors.primary,
    border: "#CFE0FF"
  },
  green: {
    iconBackground: colors.supportSoft,
    iconColor: colors.support,
    border: "#CDEFE0"
  },
  warm: {
    iconBackground: colors.warningSoft,
    iconColor: "#C88416",
    border: "#F4DFBE"
  }
};

export default function WelcomeScreen() {
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
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Route color={colors.primary} size={25} strokeWidth={2.7} />
            </View>
            <Text style={styles.brandName}>Ruta Financiera</Text>
          </View>

          <View style={styles.headlineBlock}>
            <Text style={styles.titleLine}>Organiza tu dinero</Text>
            <Text style={styles.titleLine}>y construye un plan</Text>
            <View style={styles.goalLine}>
              <Text style={styles.titleLine}>para </Text>
              <View style={styles.goalWordWrap}>
                <Text style={[styles.titleLine, styles.highlightText]}>tus metas</Text>
                <View style={styles.highlightUnderline} />
              </View>
            </View>

            <Text style={styles.subtitle}>
              Entiende tus gastos, descubre oportunidades de ahorro y recibe acciones mensuales
              simples para mejorar tus finanzas.
            </Text>
          </View>

          <ImageBackground
            blurRadius={1.3}
            imageStyle={styles.routeImage}
            resizeMode="cover"
            source={welcomeRoute}
            style={styles.routeCard}
          >
            <View style={styles.routeTextVeil} />
            <View style={styles.routeCopy}>
              <Text style={styles.routeTitle}>Un camino claro hacia tus metas</Text>
              <Text style={styles.routeText}>Paso a paso, a tu ritmo.</Text>
            </View>

            <View style={styles.trustBadge}>
              <View style={styles.trustIcon}>
                <ShieldCheck color={colors.support} size={19} strokeWidth={2.5} />
              </View>
              <View style={styles.trustCopy}>
                <Text style={styles.trustTitle}>Sin conectar tu banco</Text>
                <Text style={styles.trustText}>No pedimos datos bancarios sensibles.</Text>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.featuresGrid}>
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityLabel="Crear mi diagnóstico financiero"
              iconPosition="right"
              onPress={() => router.push("/privacy")}
              style={styles.primaryButton}
              title="Crear mi diagnóstico"
            />
            <PrimaryButton
              accessibilityLabel="Explorar la demo de Ruta Financiera"
              icon={CirclePlay}
              iconPosition="right"
              onPress={() => router.push("/demo")}
              style={styles.secondaryButton}
              title="Explorar demo"
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const accent = featureAccents[feature.accent];
  const Icon = feature.icon;

  return (
    <View style={[styles.featureCard, { borderColor: accent.border }]}>
      <View style={[styles.featureIcon, { backgroundColor: accent.iconBackground }]}>
        <Icon color={accent.iconColor} size={21} strokeWidth={2.5} />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureText}>{feature.text}</Text>
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
    paddingTop: spacing.md
  },
  container: {
    alignSelf: "center",
    flex: 1,
    gap: 18,
    maxWidth: 520,
    width: "100%"
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.xs
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
  headlineBlock: {
    gap: spacing.sm
  },
  titleLine: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.display
  },
  goalLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap"
  },
  goalWordWrap: {
    alignItems: "flex-start"
  },
  highlightText: {
    color: colors.primary
  },
  highlightUnderline: {
    backgroundColor: "#7BB8FF",
    borderRadius: radius.pill,
    height: 4,
    marginTop: -2,
    width: "92%"
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: typography.lineHeight.body,
    maxWidth: 440,
    paddingTop: spacing.xs
  },
  routeCard: {
    ...shadows.card,
    borderColor: "#CFE0FF",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 250,
    overflow: "hidden",
    padding: 14
  },
  routeImage: {
    borderRadius: 22
  },
  routeTextVeil: {
    backgroundColor: "rgba(246, 251, 255, 0.72)",
    borderBottomRightRadius: 120,
    height: 164,
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    width: "82%"
  },
  routeCopy: {
    maxWidth: 285,
    paddingHorizontal: spacing.md,
    paddingTop: 18,
    zIndex: 1
  },
  routeTitle: {
    color: colors.text,
    fontSize: typography.heroTitle,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.heroTitle
  },
  routeText: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    lineHeight: typography.lineHeight.subtitle,
    marginTop: spacing.sm
  },
  trustBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(207, 224, 255, 0.9)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    zIndex: 1
  },
  trustIcon: {
    alignItems: "center",
    backgroundColor: colors.supportSoft,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  trustCopy: {
    flex: 1
  },
  trustTitle: {
    color: colors.text,
    fontSize: typography.badge,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.badge
  },
  trustText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small
  },
  featuresGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  featureCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: spacing.sm
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 40
  },
  featureTitle: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption
  },
  featureText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xs
  },
  actions: {
    gap: spacing.sm,
    paddingTop: 2
  },
  primaryButton: {
    borderRadius: 17,
    minHeight: 56
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 17,
    minHeight: 54
  }
});
