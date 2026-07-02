import {
  normalizeActionProgressRecord,
  type ActionProgressStatus,
  type ActionProgressValue,
  type CompletedActionsState
} from "../types/financial";
import { formatCOP } from "./financialRanges";
import {
  getMonthlyPlanKeyFromActionProgressId,
  getMonthlyPlanPeriodFromKey,
  getMonthlyPlanPeriodKey
} from "./monthlyPlan";

export type ActionImpactKind =
  | "real_contribution"
  | "limit_commitment"
  | "insight"
  | "data_signal";

export type ActionImpactTarget =
  | "cashflow"
  | "debt"
  | "education"
  | "emergency"
  | "goal"
  | "general_savings"
  | "profile"
  | "small_expenses";

export type MonthlyActionImpactItem = {
  actionId: string;
  amount: number | null;
  detail: string | null;
  kind: ActionImpactKind;
  label: string;
  periodKey: string | null;
  planProgressKey: string | null;
  progressId: string;
  status: ActionProgressStatus;
  target: ActionImpactTarget;
};

export type MonthlyActionImpactSummary = {
  completedItems: MonthlyActionImpactItem[];
  dataSignals: MonthlyActionImpactItem[];
  emergencyContributionTotal: number;
  generalSavingsContributionTotal: number;
  goalContributionTotal: number;
  hasImpact: boolean;
  insightSignals: MonthlyActionImpactItem[];
  limitCommitments: MonthlyActionImpactItem[];
  periodKey: string;
  realContributionTotal: number;
  realContributions: MonthlyActionImpactItem[];
  trackedItems: MonthlyActionImpactItem[];
};

type ImpactDefinition = {
  kind: ActionImpactKind;
  label: string;
  target: ActionImpactTarget;
};

const impactDefinitionsByActionId: Record<string, ImpactDefinition> = {
  "avoid-new-debt": {
    kind: "insight",
    label: "Regla de deuda",
    target: "debt"
  },
  "complete-optional-data": {
    kind: "data_signal",
    label: "Dato por actualizar",
    target: "profile"
  },
  "compare-goal-contribution": {
    kind: "insight",
    label: "Escenario aprendido",
    target: "goal"
  },
  "confirm-goal-priority": {
    kind: "insight",
    label: "Prioridad validada",
    target: "goal"
  },
  "debt-monthly-payment": {
    kind: "data_signal",
    label: "Pago de deuda identificado",
    target: "debt"
  },
  "debt-pressure-source": {
    kind: "insight",
    label: "Deuda priorizada",
    target: "debt"
  },
  "define-investing-horizon": {
    kind: "insight",
    label: "Horizonte definido",
    target: "education"
  },
  "initial-emergency-contribution": {
    kind: "real_contribution",
    label: "Aporte real a emergencia",
    target: "emergency"
  },
  "learn-risk-time": {
    kind: "insight",
    label: "Concepto aprendido",
    target: "education"
  },
  "observe-small-expense-category": {
    kind: "insight",
    label: "Categoria observada",
    target: "small_expenses"
  },
  "protect-emergency-before-investing": {
    kind: "insight",
    label: "Proteccion definida",
    target: "emergency"
  },
  "protect-emergency-money": {
    kind: "insight",
    label: "Regla de emergencia",
    target: "emergency"
  },
  "redirect-small-expenses": {
    kind: "real_contribution",
    label: "Aporte real a meta",
    target: "goal"
  },
  "review-financial-data": {
    kind: "data_signal",
    label: "Dato financiero revisado",
    target: "profile"
  },
  "review-goal-target": {
    kind: "insight",
    label: "Meta revisada",
    target: "goal"
  },
  "review-main-expenses": {
    kind: "insight",
    label: "Gastos revisados",
    target: "cashflow"
  },
  "separate-emergency-money": {
    kind: "insight",
    label: "Dinero separado",
    target: "emergency"
  },
  "set-goal-contribution": {
    kind: "real_contribution",
    label: "Aporte real a meta",
    target: "goal"
  },
  "small-automatic-separation": {
    kind: "real_contribution",
    label: "Ahorro real separado",
    target: "general_savings"
  },
  "small-expense-limit": {
    kind: "limit_commitment",
    label: "Limite mensual definido",
    target: "small_expenses"
  },
  "weekly-limit": {
    kind: "limit_commitment",
    label: "Limite semanal definido",
    target: "cashflow"
  }
};

function getActionIdFromProgressId(progressId: string) {
  const planProgressKey = getMonthlyPlanKeyFromActionProgressId(progressId);

  if (!planProgressKey || !progressId.startsWith(`${planProgressKey}:`)) {
    return null;
  }

  return progressId.slice(planProgressKey.length + 1);
}

function getFallbackImpactDefinition(value: ActionProgressValue | null | undefined): ImpactDefinition {
  const record = normalizeActionProgressRecord(value);

  if (record?.evidence?.type === "amount") {
    return {
      kind: "limit_commitment",
      label: record.evidence.label ?? "Monto registrado",
      target: "cashflow"
    };
  }

  if (record?.evidence?.type === "category") {
    return {
      kind: "insight",
      label: record.evidence.label ?? "Categoria registrada",
      target: "cashflow"
    };
  }

  if (record?.evidence?.type === "decision") {
    return {
      kind: "insight",
      label: record.evidence.label ?? "Decision registrada",
      target: "profile"
    };
  }

  return {
    kind: "insight",
    label: record?.evidence?.label ?? "Avance registrado",
    target: "profile"
  };
}

function sumAmounts(items: MonthlyActionImpactItem[]) {
  return items.reduce((total, item) => total + (item.amount ?? 0), 0);
}

export function getActionProgressImpactItem(
  progressId: string,
  value: ActionProgressValue | null | undefined
): MonthlyActionImpactItem | null {
  const record = normalizeActionProgressRecord(value);

  if (!record || !record.evidence || record.status === "pending" || record.status === "skipped") {
    return null;
  }

  const actionId = getActionIdFromProgressId(progressId);
  const planProgressKey = getMonthlyPlanKeyFromActionProgressId(progressId);
  const definition = actionId
    ? impactDefinitionsByActionId[actionId] ?? getFallbackImpactDefinition(value)
    : getFallbackImpactDefinition(value);
  const amount =
    typeof record.evidence.amount === "number" && Number.isFinite(record.evidence.amount)
      ? record.evidence.amount
      : null;
  const detail = record.evidence.detail?.trim() || null;

  return {
    actionId: actionId ?? progressId,
    amount,
    detail,
    kind: definition.kind,
    label: record.evidence.label ?? definition.label,
    periodKey: planProgressKey ? getMonthlyPlanPeriodFromKey(planProgressKey) : null,
    planProgressKey,
    progressId,
    status: record.status,
    target: definition.target
  };
}

export function getMonthlyActionImpactSummary(
  completedActions: CompletedActionsState,
  options: { periodKey?: string } = {}
): MonthlyActionImpactSummary {
  const periodKey = options.periodKey ?? getMonthlyPlanPeriodKey();
  const trackedItems = Object.entries(completedActions)
    .map(([progressId, value]) => getActionProgressImpactItem(progressId, value))
    .filter((item): item is MonthlyActionImpactItem => Boolean(item))
    .filter((item) => item.periodKey === periodKey);
  const completedItems = trackedItems.filter((item) => item.status === "completed");
  const realContributions = completedItems.filter((item) => item.kind === "real_contribution");
  const limitCommitments = completedItems.filter((item) => item.kind === "limit_commitment");
  const insightSignals = completedItems.filter((item) => item.kind === "insight");
  const dataSignals = completedItems.filter((item) => item.kind === "data_signal");

  return {
    completedItems,
    dataSignals,
    emergencyContributionTotal: sumAmounts(
      realContributions.filter((item) => item.target === "emergency")
    ),
    generalSavingsContributionTotal: sumAmounts(
      realContributions.filter((item) => item.target === "general_savings")
    ),
    goalContributionTotal: sumAmounts(realContributions.filter((item) => item.target === "goal")),
    hasImpact: completedItems.length > 0,
    insightSignals,
    limitCommitments,
    periodKey,
    realContributionTotal: sumAmounts(realContributions),
    realContributions,
    trackedItems
  };
}

export function getActionImpactMessage(item: MonthlyActionImpactItem | null) {
  if (!item) {
    return null;
  }

  if (item.kind === "real_contribution") {
    return null;
  }

  if (item.kind === "limit_commitment") {
    return "Queda como compromiso para revisar despues; aun no se toma como ahorro real.";
  }

  if (item.kind === "data_signal") {
    return "Sirve como senal para actualizar datos con confirmacion, no como cambio automatico.";
  }

  return null;
}

export function getMonthlyImpactHeadline(summary: MonthlyActionImpactSummary) {
  if (summary.realContributionTotal > 0) {
    return `${formatCOP(summary.realContributionTotal)} registrados como avance real este mes.`;
  }

  if (summary.limitCommitments.length > 0) {
    return `${summary.limitCommitments.length} compromiso${
      summary.limitCommitments.length === 1 ? "" : "s"
    } para revisar este mes.`;
  }

  if (summary.insightSignals.length > 0 || summary.dataSignals.length > 0) {
    const totalSignals = summary.insightSignals.length + summary.dataSignals.length;
    return `${totalSignals} senal${totalSignals === 1 ? "" : "es"} para ajustar el plan.`;
  }

  return "Aun no hay impacto registrado este mes.";
}

export function getNextPlanAdjustmentHint(summary: MonthlyActionImpactSummary) {
  if (summary.realContributionTotal > 0 && summary.limitCommitments.length > 0) {
    return "El proximo plan puede mantener el aporte real y comprobar si tus limites funcionaron.";
  }

  if (summary.goalContributionTotal > 0) {
    return "El proximo plan puede sostener este aporte o probar un aumento pequeno si el mes se sintio viable.";
  }

  if (summary.emergencyContributionTotal > 0 || summary.generalSavingsContributionTotal > 0) {
    return "El proximo plan puede repetir el aporte y enfocarse en hacerlo mas automatico.";
  }

  if (summary.limitCommitments.length > 0) {
    return "El proximo plan deberia revisar si el limite se cumplio antes de contarlo como ahorro.";
  }

  if (summary.dataSignals.length > 0) {
    return "El proximo plan puede pedir confirmacion para convertir esos datos en valores del perfil.";
  }

  if (summary.insightSignals.length > 0) {
    return "El proximo plan puede convertir lo que aprendiste en una accion con monto o decision concreta.";
  }

  return "Si no registras avances, el proximo plan deberia mantener pasos pequenos y faciles de completar.";
}
