import { useWindowDimensions } from "react-native";

import { getResponsiveLayout } from "../utils/responsiveLayout";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return getResponsiveLayout(width);
}
