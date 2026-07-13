import { Stack } from "expo-router";

import { FinancialDataGate } from "../components/FinancialDataGate";
import { AuthProvider } from "../context/AuthContext";
import { OnboardingProvider } from "../context/OnboardingContext";
import { PlanProvider } from "../context/PlanContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <PlanProvider>
          <FinancialDataGate>
            <Stack
              screenOptions={{
                headerShown: false
              }}
            />
          </FinancialDataGate>
        </PlanProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
