import { useRouter } from "expo-router";
import { CreditCard, ReceiptText } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";

type SpendingTab = "spending" | "debts";

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

const tabs = [
  {
    key: "spending" as SpendingTab,
    label: "Gastos mensuales",
    route: "/spending",
    icon: ReceiptText
  },
  {
    key: "debts" as SpendingTab,
    label: "Deudas",
    route: "/debts",
    icon: CreditCard
  }
];

export function SpendingSectionTabs({ activeTab }: { activeTab: SpendingTab }) {
  const router = useRouter();

  return (
    <View style={styles.tabsCard}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        const Icon = tab.icon;
        const color = active ? colors.primary : colors.textSubtle;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => {
              if (!active) {
                router.push(tab.route as Route);
              }
            }}
            style={({ pressed }) => [
              styles.tabButton,
              active && styles.tabButtonActive,
              pressed && styles.pressed
            ]}
          >
            <Icon color={color} size={19} strokeWidth={2.4} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.xs
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.sm
  },
  tabButtonActive: {
    backgroundColor: colors.primarySoft
  },
  tabText: {
    color: colors.textSubtle,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.caption,
    textAlign: "center"
  },
  tabTextActive: {
    color: colors.primary
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
