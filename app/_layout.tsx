import { Stack } from "expo-router";

import { AuthProvider } from "../context/AuthContext";
import { OnboardingProvider } from "../context/OnboardingContext";
import { PlanProvider } from "../context/PlanContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <PlanProvider>
          <Stack
            screenOptions={{
              headerShown: false
            }}
          />
        </PlanProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
