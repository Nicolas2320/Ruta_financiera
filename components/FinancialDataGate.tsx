import type { PropsWithChildren } from "react";

import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { usePlan } from "../context/PlanContext";
import { FinancialDataStatusScreen } from "./FinancialDataStatusScreen";

export function FinancialDataGate({ children }: PropsWithChildren) {
  const { isAuthReady, session } = useAuth();
  const { onboardingSyncStatus } = useOnboarding();
  const { planSyncStatus } = usePlan();

  if (!isAuthReady) {
    return (
      <FinancialDataStatusScreen
        text="Estamos comprobando si tienes una sesión guardada."
        title="Preparando Ruta Financiera"
      />
    );
  }

  if (
    session &&
    (onboardingSyncStatus === "loading" || planSyncStatus === "loading")
  ) {
    return (
      <FinancialDataStatusScreen
        text="Estamos recuperando tu diagnóstico, metas y avances guardados."
        title="Cargando tu información"
      />
    );
  }

  if (
    session &&
    (onboardingSyncStatus === "error" || planSyncStatus === "error")
  ) {
    return (
      <FinancialDataStatusScreen
        mode="error"
        text="No pudimos recuperar tus datos. Revisa tu conexión y vuelve a cargar la aplicación para intentarlo de nuevo."
        title="No pudimos cargar tu información"
      />
    );
  }

  return children;
}
