import { Stack } from "expo-router";

import { OnboardingProvider } from "../context/OnboardingContext";
import { PlanProvider } from "../context/PlanContext";

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <PlanProvider>
        <Stack
          screenOptions={{
            headerShown: false
          }}
        />
      </PlanProvider>
    </OnboardingProvider>
  );
}
