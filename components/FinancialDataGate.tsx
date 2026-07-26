import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { FinancialDataStatusScreen } from "./FinancialDataStatusScreen";

export function FinancialDataGate({ children }: PropsWithChildren) {
  const { isAuthReady, session } = useAuth();
  const { onboardingSyncStatus } = useOnboarding();
  const { planSyncStatus } = usePlan();
  let statusScreen: ReactNode = null;

  if (!isAuthReady) {
    statusScreen = (
      <FinancialDataStatusScreen
        text="Estamos comprobando si tienes una sesión guardada."
        title="Preparando Ruta Financiera"
      />
    );
  } else {
    const isLoadingGuestDraft = !session && onboardingSyncStatus === "loading";
    const isLoadingAccountData =
      Boolean(session) &&
      (onboardingSyncStatus === "loading" ||
        onboardingSyncStatus === "migrating" ||
        planSyncStatus === "loading");

    if (isLoadingGuestDraft || isLoadingAccountData) {
      statusScreen = (
        <FinancialDataStatusScreen
          text={
            onboardingSyncStatus === "migrating"
              ? "Estamos guardando el diagnóstico que hiciste antes de crear tu cuenta."
              : isLoadingGuestDraft
                ? "Estamos recuperando el diagnóstico guardado en este dispositivo."
                : "Estamos recuperando tu diagnóstico, metas y avances guardados."
          }
          title={
            onboardingSyncStatus === "migrating"
              ? "Guardando tu ruta financiera"
              : isLoadingGuestDraft
                ? "Recuperando tu diagnóstico"
                : "Cargando tu información"
          }
        />
      );
    } else if (
      session &&
      (onboardingSyncStatus === "error" || planSyncStatus === "error")
    ) {
      statusScreen = (
        <FinancialDataStatusScreen
          mode="error"
          text="No pudimos recuperar tus datos. Revisa tu conexión y vuelve a cargar la aplicación para intentarlo de nuevo."
          title="No pudimos cargar tu información"
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      {children}
      {statusScreen ? <View style={styles.overlay}>{statusScreen}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100
  }
});
