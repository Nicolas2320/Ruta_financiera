import type { FinancialGuidanceMode } from "../types/financial";

export type FinancialEducationConcept =
  | "monthlyMargin"
  | "expenseRatio"
  | "emergencyFund"
  | "debtPressure"
  | "monthlyContribution";

type FinancialGuidanceOption = {
  description: string;
  label: string;
  value: FinancialGuidanceMode;
};

type FinancialEducationConceptContent = {
  briefSummary: string;
  definition: string;
  guidedSummary: string;
};

export const financialGuidanceOptions: FinancialGuidanceOption[] = [
  {
    value: "guided",
    label: "Paso a paso",
    description: "Quiero ejemplos y explicaciones claras."
  },
  {
    value: "brief",
    label: "Breve (Recomendado)",
    description: "Explícame lo importante y déjame consultar los detalles."
  },
  {
    value: "direct",
    label: "Directo",
    description: "Muéstrame resultados y acciones; consultaré los cálculos cuando los necesite."
  }
];

export const financialEducationContent: Record<
  FinancialEducationConcept,
  FinancialEducationConceptContent
> = {
  monthlyMargin: {
    guidedSummary:
      "El margen mensual es el dinero que queda después de restar tus gastos mensuales a tus ingresos.",
    briefSummary: "Es el dinero disponible después de tus gastos mensuales.",
    definition:
      "El margen mensual es la diferencia entre tus ingresos y tus gastos de un mes."
  },
  expenseRatio: {
    guidedSummary:
      "La relación gastos/ingresos indica qué porcentaje de tus ingresos se utiliza en gastos.",
    briefSummary: "Muestra qué parte de tus ingresos se utiliza en gastos.",
    definition:
      "La relación gastos/ingresos compara tus gastos mensuales con tus ingresos mensuales."
  },
  emergencyFund: {
    guidedSummary:
      "El fondo de emergencia muestra cuántos meses de gastos podrías cubrir con tu ahorro disponible.",
    briefSummary: "Muestra cuántos meses de gastos podría cubrir tu ahorro.",
    definition:
      "La cobertura de emergencia divide tu ahorro disponible entre tus gastos mensuales."
  },
  debtPressure: {
    guidedSummary:
      "La presión de deuda considera la cuota mensual, la dificultad de pago y el peso de la deuda sobre tus ingresos.",
    briefSummary: "Muestra cuánto presionan tus deudas al presupuesto mensual.",
    definition:
      "La presión de deuda combina la situación de pago declarada con la parte del ingreso destinada a deudas."
  },
  monthlyContribution: {
    guidedSummary:
      "El aporte sugerido es una referencia para avanzar hacia una meta sin utilizar todo tu margen disponible.",
    briefSummary: "Es una referencia mensual calculada desde tu margen disponible.",
    definition:
      "El aporte sugerido es una referencia calculada desde el margen; no es una obligación ni cambia por sí solo tu plan."
  }
};

export function getFinancialGuidanceOption(mode: FinancialGuidanceMode) {
  return (
    financialGuidanceOptions.find((option) => option.value === mode) ??
    financialGuidanceOptions[1]
  );
}

export function getFinancialEducationSummary(
  concept: FinancialEducationConcept,
  mode: FinancialGuidanceMode
) {
  if (mode === "direct") {
    return null;
  }

  const content = financialEducationContent[concept];
  return mode === "guided" ? content.guidedSummary : content.briefSummary;
}
