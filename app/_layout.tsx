import { Stack } from "expo-router";

import { FinancialDataGate } from "../components/FinancialDataGate";
import { AuthProvider } from "../context/AuthContext";
import { FinancialProfileProvider } from "../context/FinancialProfileContext";
import { OnboardingProvider } from "../context/OnboardingContext";
import { PlanProvider } from "../context/PlanContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <FinancialProfileProvider>
        <OnboardingProvider>
          <PlanProvider>
            <FinancialDataGate>
              <Stack
                screenOptions={{
                  headerShown: false
                }}
              >
                <Stack.Screen name="index" options={{ animation: "none" }} />
                <Stack.Screen name="dashboard" options={{ animation: "none" }} />
                <Stack.Screen name="spending" options={{ animation: "none" }} />
                <Stack.Screen name="debts" options={{ animation: "none" }} />
                <Stack.Screen name="goals-overview" options={{ animation: "none" }} />
                <Stack.Screen name="simulation" options={{ animation: "none" }} />
                <Stack.Screen name="assistant" options={{ animation: "none" }} />
              </Stack>
            </FinancialDataGate>
          </PlanProvider>
        </OnboardingProvider>
      </FinancialProfileProvider>
    </AuthProvider>
  );
}
