import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Bot, Flag, Home, LineChart, PieChart } from "lucide-react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type Route = Parameters<ReturnType<typeof useRouter>["push"]>[0];

type NavRoute = "/dashboard" | "/spending" | "/goals-overview" | "/simulation" | "/assistant";

type NavItem = {
  icon: ComponentType<IconProps>;
  route: NavRoute;
  title: string;
};

const navItems: NavItem[] = [
  { icon: Home, route: "/dashboard", title: "Inicio" },
  { icon: PieChart, route: "/spending", title: "Gastos" },
  { icon: Flag, route: "/goals-overview", title: "Metas" },
  { icon: LineChart, route: "/simulation", title: "Simulación" },
  { icon: Bot, route: "/assistant", title: "Asistente" }
];

let lastActiveIndex = 0;

export function BottomNavigation({ activeRoute }: { activeRoute: NavRoute }) {
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.route === activeRoute)
  );
  const animatedIndex = useRef(new Animated.Value(lastActiveIndex)).current;
  const [navWidth, setNavWidth] = useState(0);
  const itemWidth = navWidth / navItems.length;

  useEffect(() => {
    if (navWidth <= 0) {
      return;
    }

    Animated.spring(animatedIndex, {
      damping: 20,
      mass: 0.8,
      stiffness: 190,
      toValue: activeIndex,
      useNativeDriver: true
    }).start();
    lastActiveIndex = activeIndex;
  }, [activeIndex, animatedIndex, navWidth]);

  const translateX = Animated.multiply(animatedIndex, itemWidth);

  return (
    <View style={styles.bottomNav}>
      <View
        onLayout={(event) => setNavWidth(event.nativeEvent.layout.width)}
        style={styles.navTrack}
      >
        {navWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.navActiveLine,
              {
                transform: [{ translateX }],
                width: itemWidth
              }
            ]}
          />
        ) : null}
        {navItems.map((item) => {
          const active = item.route === activeRoute;
          const color = active ? colors.primary : colors.textSubtle;
          const Icon = item.icon;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.route}
              onPress={() => {
                if (!active) {
                  router.push(item.route as Route);
                }
              }}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                pressed && styles.pressed
              ]}
            >
              <Icon color={color} size={23} strokeWidth={2.4} />
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    maxWidth: 760,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    width: "100%"
  },
  navTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    width: "100%"
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minHeight: 68,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs
  },
  navItemActive: {
    transform: [{ scale: 1.03 }]
  },
  navActiveLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    left: 0,
    position: "absolute",
    top: -spacing.xs
  },
  navText: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.small,
    textAlign: "center"
  },
  navTextActive: {
    color: colors.primary
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  }
});
