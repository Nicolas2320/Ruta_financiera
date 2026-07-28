export const responsiveBreakpoints = {
  phone: 600,
  tablet: 900,
  smallPhone: 360
} as const;

export type ResponsiveLayout = {
  contentWidth: number;
  isDesktop: boolean;
  isPhone: boolean;
  isSmallPhone: boolean;
  isTablet: boolean;
  screenPadding: number;
  width: number;
};

export function getResponsiveLayout(width: number): ResponsiveLayout {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const isPhone = safeWidth < responsiveBreakpoints.phone;
  const isSmallPhone = safeWidth < responsiveBreakpoints.smallPhone;
  const isTablet =
    safeWidth >= responsiveBreakpoints.phone && safeWidth < responsiveBreakpoints.tablet;
  const screenPadding = isSmallPhone ? 12 : isPhone ? 16 : 24;

  return {
    contentWidth: Math.max(0, safeWidth - screenPadding * 2),
    isDesktop: safeWidth >= responsiveBreakpoints.tablet,
    isPhone,
    isSmallPhone,
    isTablet,
    screenPadding,
    width: safeWidth
  };
}
