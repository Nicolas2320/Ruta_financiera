export const colors = {
  background: "#F6F9FC",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF5FF",
  primary: "#155EEF",
  primaryDark: "#0F3EA8",
  primarySoft: "#E7F0FF",
  support: "#14905D",
  supportSoft: "#E8F8EF",
  warningSoft: "#FFF5E7",
  text: "#0F172A",
  textMuted: "#475569",
  textSubtle: "#64748B",
  border: "#E2E8F0",
  shadow: "#1E293B"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
  pill: 999
};

export const typography = {
  display: 35,
  title: 30,
  heroTitle: 27,
  cardTitle: 24,
  brand: 21,
  sectionTitle: 20,
  question: 17,
  option: 15,
  button: 16,
  subtitle: 16,
  body: 15,
  caption: 13,
  badge: 12,
  small: 11,
  lineHeight: {
    display: 41,
    title: 36,
    heroTitle: 32,
    cardTitle: 29,
    brand: 26,
    sectionTitle: 26,
    question: 23,
    button: 22,
    subtitle: 24,
    body: 22,
    option: 20,
    caption: 18,
    badge: 17,
    small: 15
  },
  weight: {
    regular: "400",
    medium: "600",
    semibold: "700",
    bold: "800",
    black: "900"
  } as const
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4
  }
};
