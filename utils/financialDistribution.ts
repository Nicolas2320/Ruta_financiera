import type {
  FinancialProjectionInput,
  ProjectionDebtInput,
  ProjectionGoalInput
} from "./financialProjectionInput";

export type ProtectedMarginPreference =
  | { mode: "automatic" }
  | { mode: "use_all" }
  | { amount: number; mode: "custom" };

export type DistributionStrategyId =
  | "current_reference"
  | "reduce_interest"
  | "accelerate_goal"
  | "split_debt_goal";

export type DistributionScenarioStatus =
  | "ready"
  | "incomplete"
  | "no_surplus"
  | "not_applicable";

export type DistributionIssueCode =
  | "missing_cashflow"
  | "missing_required_debt_payments"
  | "invalid_protected_margin"
  | "unknown_interest_rate"
  | "missing_debt_balance"
  | "no_interest_bearing_debt"
  | "missing_goal"
  | "missing_goal_target";

export type DistributionIssue = {
  code: DistributionIssueCode;
  entityId?: string;
  message: string;
};

export type ProtectedMarginResult = {
  amount: number;
  mode: ProtectedMarginPreference["mode"];
  requestedAmount: number | null;
};

export type DistributionPoolBreakdown = {
  unassignedMonthlyMargin: number;
  voluntaryDebtPayments: number;
  voluntaryGoalContributions: number;
  overcommittedAmount: number;
  total: number;
};

export type DebtMonthlyAllocation = {
  annualInterestRate: number | null;
  basePayment: number;
  debtId: string;
  extraPayment: number;
  title: string;
  totalPayment: number;
};

export type GoalMonthlyAllocation = {
  amount: number;
  goalId: string;
  title: string;
};

export type DistributionScenario = {
  debtAllocations: DebtMonthlyAllocation[];
  debtShare: number | null;
  distributableAmount: number;
  goalAllocations: GoalMonthlyAllocation[];
  id: DistributionStrategyId;
  issues: DistributionIssue[];
  label: string;
  monthlyBalance: number | null;
  protectedMargin: ProtectedMarginResult;
  poolBreakdown: DistributionPoolBreakdown | null;
  status: DistributionScenarioStatus;
  surplusBeforeProtection: number | null;
  unassignedAmount: number;
};

export type DistributionScenarioSet = {
  accelerateGoal: DistributionScenario;
  currentReference: DistributionScenario;
  reduceInterest: DistributionScenario;
  splitDebtGoal: DistributionScenario;
};

const strategyLabels: Record<DistributionStrategyId, string> = {
  current_reference: "Así estás hoy",
  reduce_interest: "Reducir intereses",
  accelerate_goal: "Acelerar una meta",
  split_debt_goal: "Avanzar en deuda y meta"
};

function safeNonNegative(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeSplitDebtShare(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(0.9, Math.max(0.1, Math.round(value * 20) / 20));
}

function getEffectivePayment(debt: ProjectionDebtInput, payment: number) {
  const remainingAmount = safeNonNegative(debt.remainingAmount);
  return remainingAmount === null ? Math.max(0, payment) : Math.min(remainingAmount, Math.max(0, payment));
}

function getOperatingCosts(input: FinancialProjectionInput) {
  const mainExpenses = safeNonNegative(input.cashflow.baselineMonthlyExpenses);
  const smallExpenses = safeNonNegative(input.cashflow.smallMonthlyExpenses);

  return mainExpenses === null || smallExpenses === null
    ? null
    : mainExpenses + smallExpenses;
}

function getActiveGoal(
  goals: ProjectionGoalInput[],
  selectedGoalId: string | null | undefined
) {
  const activeGoals = goals.filter(
    (goal) => goal.status !== "completed" && goal.status !== "paused"
  );

  if (selectedGoalId) {
    return activeGoals.find((goal) => goal.id === selectedGoalId) ?? null;
  }

  return activeGoals.find((goal) => goal.isPrimary) ?? activeGoals[0] ?? null;
}

function getGoalRemainingAmount(goal: ProjectionGoalInput) {
  const targetAmount = safeNonNegative(goal.targetAmount);
  return targetAmount === null ? null : Math.max(0, targetAmount - goal.currentAmount);
}

export function calculateProtectedMargin({
  preference,
  surplusBeforeProtection
}: {
  preference: ProtectedMarginPreference;
  surplusBeforeProtection: number;
}): { issues: DistributionIssue[]; result: ProtectedMarginResult } {
  const availableSurplus = Math.max(0, surplusBeforeProtection);

  if (preference.mode === "use_all") {
    return {
      issues: [],
      result: { amount: 0, mode: preference.mode, requestedAmount: 0 }
    };
  }

  if (preference.mode === "automatic") {
    return {
      issues: [],
      result: {
        amount: Math.round(availableSurplus * 0.1),
        mode: preference.mode,
        requestedAmount: null
      }
    };
  }

  const requestedAmount = safeNonNegative(preference.amount);

  if (requestedAmount === null) {
    return {
      issues: [
        {
          code: "invalid_protected_margin",
          message: "El margen protegido personalizado debe ser un monto válido."
        }
      ],
      result: { amount: 0, mode: preference.mode, requestedAmount: null }
    };
  }

  return {
    issues: [],
    result: {
      amount: Math.min(availableSurplus, requestedAmount),
      mode: preference.mode,
      requestedAmount
    }
  };
}

function getBaseDebtAllocations(
  debts: ProjectionDebtInput[],
  paymentKind: "planned" | "required"
) {
  return debts.map<DebtMonthlyAllocation>((debt) => {
    const requestedPayment =
      paymentKind === "planned" ? debt.plannedMonthlyPayment : debt.requiredMonthlyPayment ?? 0;
    const basePayment = getEffectivePayment(debt, requestedPayment);

    return {
      annualInterestRate: debt.annualInterestRate,
      basePayment,
      debtId: debt.id,
      extraPayment: 0,
      title: debt.title,
      totalPayment: basePayment
    };
  });
}

function getManualGoalAllocations(goals: ProjectionGoalInput[]) {
  return goals.reduce<GoalMonthlyAllocation[]>((allocations, goal) => {
    if (goal.status === "completed" || goal.status === "paused") {
      return allocations;
    }

    const manualAmount = safeNonNegative(goal.manualMonthlyContribution);

    if (manualAmount === null || manualAmount <= 0) {
      return allocations;
    }

    const remainingAmount = getGoalRemainingAmount(goal);
    const amount = remainingAmount === null ? manualAmount : Math.min(manualAmount, remainingAmount);

    allocations.push({
      amount,
      goalId: goal.id,
      title: goal.title
    });

    return allocations;
  }, []);
}

function sumDebtPayments(allocations: DebtMonthlyAllocation[]) {
  return allocations.reduce((total, allocation) => total + allocation.totalPayment, 0);
}

function sumGoalContributions(allocations: GoalMonthlyAllocation[]) {
  return allocations.reduce((total, allocation) => total + allocation.amount, 0);
}

function getDistributionPoolBreakdown(
  input: FinancialProjectionInput,
  distributableAmount: number
): DistributionPoolBreakdown {
  const voluntaryDebtPayments = input.debts.reduce((total, debt) => {
    const plannedPayment = getEffectivePayment(debt, debt.plannedMonthlyPayment);
    const requiredPayment = getEffectivePayment(
      debt,
      debt.requiredMonthlyPayment ?? debt.plannedMonthlyPayment
    );
    return total + Math.max(0, plannedPayment - requiredPayment);
  }, 0);
  const voluntaryGoalContributions = sumGoalContributions(
    getManualGoalAllocations(input.goals)
  );
  const registeredFlexibleTotal = voluntaryDebtPayments + voluntaryGoalContributions;

  return {
    unassignedMonthlyMargin: Math.max(0, distributableAmount - registeredFlexibleTotal),
    voluntaryDebtPayments,
    voluntaryGoalContributions,
    overcommittedAmount: Math.max(0, registeredFlexibleTotal - distributableAmount),
    total: distributableAmount
  };
}

function getReferenceScenario(
  input: FinancialProjectionInput,
  preference: ProtectedMarginPreference
): DistributionScenario {
  const operatingCosts = getOperatingCosts(input);
  const monthlyIncome = safeNonNegative(input.cashflow.monthlyIncome);
  const debtAllocations = getBaseDebtAllocations(input.debts, "planned");
  const goalAllocations = getManualGoalAllocations(input.goals);

  if (operatingCosts === null || monthlyIncome === null) {
    return {
      debtAllocations,
      debtShare: null,
      distributableAmount: 0,
      goalAllocations,
      id: "current_reference",
      issues: [{ code: "missing_cashflow", message: "Faltan ingresos o gastos mensuales." }],
      label: strategyLabels.current_reference,
      monthlyBalance: null,
      protectedMargin: { amount: 0, mode: preference.mode, requestedAmount: null },
      poolBreakdown: null,
      status: "incomplete",
      surplusBeforeProtection: null,
      unassignedAmount: 0
    };
  }

  const monthlyBalance =
    monthlyIncome -
    operatingCosts -
    sumDebtPayments(debtAllocations) -
    sumGoalContributions(goalAllocations);
  const surplusBeforeProtection = Math.max(0, monthlyBalance);
  const protectedMarginResult = calculateProtectedMargin({
    preference,
    surplusBeforeProtection
  });
  const unassignedAmount = Math.max(
    0,
    surplusBeforeProtection - protectedMarginResult.result.amount
  );

  return {
    debtAllocations,
    debtShare: null,
    distributableAmount: unassignedAmount,
    goalAllocations,
    id: "current_reference",
    issues: protectedMarginResult.issues,
    label: strategyLabels.current_reference,
    monthlyBalance,
    protectedMargin: protectedMarginResult.result,
    poolBreakdown: null,
    status: monthlyBalance <= 0 ? "no_surplus" : "ready",
    surplusBeforeProtection,
    unassignedAmount
  };
}

type StrategyBase = {
  debtAllocations: DebtMonthlyAllocation[];
  distributableAmount: number;
  issues: DistributionIssue[];
  monthlyIncome: number | null;
  operatingCosts: number | null;
  protectedMargin: ProtectedMarginResult;
  poolBreakdown: DistributionPoolBreakdown | null;
  status: DistributionScenarioStatus;
  surplusBeforeProtection: number | null;
};

function getStrategyBase(
  input: FinancialProjectionInput,
  preference: ProtectedMarginPreference
): StrategyBase {
  const operatingCosts = getOperatingCosts(input);
  const monthlyIncome = safeNonNegative(input.cashflow.monthlyIncome);
  const debtAllocations = getBaseDebtAllocations(input.debts, "required");
  const emptyProtectedMargin: ProtectedMarginResult = {
    amount: 0,
    mode: preference.mode,
    requestedAmount: null
  };

  if (operatingCosts === null || monthlyIncome === null) {
    return {
      debtAllocations,
      distributableAmount: 0,
      issues: [{ code: "missing_cashflow", message: "Faltan ingresos o gastos mensuales." }],
      monthlyIncome,
      operatingCosts,
      protectedMargin: emptyProtectedMargin,
      poolBreakdown: null,
      status: "incomplete",
      surplusBeforeProtection: null
    };
  }

  if (!input.cashflow.hasCompleteRequiredDebtPayments) {
    return {
      debtAllocations,
      distributableAmount: 0,
      issues: [
        {
          code: "missing_required_debt_payments",
          message: "Falta confirmar el pago mínimo de una o más deudas."
        }
      ],
      monthlyIncome,
      operatingCosts,
      protectedMargin: emptyProtectedMargin,
      poolBreakdown: null,
      status: "incomplete",
      surplusBeforeProtection: null
    };
  }

  const surplusBeforeProtection =
    monthlyIncome - operatingCosts - sumDebtPayments(debtAllocations);
  const protectedMarginResult = calculateProtectedMargin({
    preference,
    surplusBeforeProtection
  });
  const distributableAmount = Math.max(
    0,
    surplusBeforeProtection - protectedMarginResult.result.amount
  );

  return {
    debtAllocations,
    distributableAmount,
    issues: protectedMarginResult.issues,
    monthlyIncome,
    operatingCosts,
    protectedMargin: protectedMarginResult.result,
    poolBreakdown: getDistributionPoolBreakdown(input, distributableAmount),
    status:
      protectedMarginResult.issues.length > 0
        ? "incomplete"
        : distributableAmount <= 0
          ? "no_surplus"
          : "ready",
    surplusBeforeProtection
  };
}

function getDebtStrategyIssues(input: FinancialProjectionInput) {
  return input.debts.reduce<DistributionIssue[]>((issues, debt) => {
    if (debt.annualInterestRate === null) {
      issues.push({
        code: "unknown_interest_rate",
        entityId: debt.id,
        message: `Falta confirmar la tasa de ${debt.title}.`
      });
    }

    if (debt.remainingAmount === null) {
      issues.push({
        code: "missing_debt_balance",
        entityId: debt.id,
        message: `Falta confirmar el saldo de ${debt.title}.`
      });
    }

    return issues;
  }, []);
}

function allocateExtraToInterestDebts({
  allocations,
  amount,
  debts
}: {
  allocations: DebtMonthlyAllocation[];
  amount: number;
  debts: ProjectionDebtInput[];
}) {
  let remainingAmount = Math.max(0, amount);
  const nextAllocations = allocations.map((allocation) => ({ ...allocation }));
  const allocationByDebtId = new Map(
    nextAllocations.map((allocation) => [allocation.debtId, allocation])
  );
  const eligibleDebts = debts
    .filter(
      (debt) =>
        debt.annualInterestRate !== null &&
        debt.annualInterestRate > 0 &&
        debt.remainingAmount !== null &&
        debt.remainingAmount > 0
    )
    .sort((left, right) => {
      const rateDifference =
        (right.annualInterestRate ?? 0) - (left.annualInterestRate ?? 0);

      if (rateDifference !== 0) {
        return rateDifference;
      }

      if (left.status === "overdue" && right.status !== "overdue") return -1;
      if (right.status === "overdue" && left.status !== "overdue") return 1;
      return left.id.localeCompare(right.id);
    });

  eligibleDebts.forEach((debt) => {
    if (remainingAmount <= 0) {
      return;
    }

    const allocation = allocationByDebtId.get(debt.id);

    if (!allocation || debt.remainingAmount === null) {
      return;
    }

    const capacity = Math.max(0, debt.remainingAmount - allocation.totalPayment);
    const extraPayment = Math.min(remainingAmount, capacity);
    allocation.extraPayment += extraPayment;
    allocation.totalPayment += extraPayment;
    remainingAmount -= extraPayment;
  });

  return { allocations: nextAllocations, unallocatedAmount: remainingAmount };
}

function allocateToGoal({
  amount,
  goal
}: {
  amount: number;
  goal: ProjectionGoalInput;
}) {
  const remainingGoalAmount = getGoalRemainingAmount(goal);

  if (remainingGoalAmount === null) {
    return { allocation: null, unallocatedAmount: amount };
  }

  const allocatedAmount = Math.min(Math.max(0, amount), remainingGoalAmount);

  return {
    allocation: {
      amount: allocatedAmount,
      goalId: goal.id,
      title: goal.title
    } satisfies GoalMonthlyAllocation,
    unallocatedAmount: Math.max(0, amount - allocatedAmount)
  };
}

function getMonthlyBalance({
  base,
  debtAllocations,
  goalAllocations
}: {
  base: StrategyBase;
  debtAllocations: DebtMonthlyAllocation[];
  goalAllocations: GoalMonthlyAllocation[];
}) {
  if (base.monthlyIncome === null || base.operatingCosts === null) {
    return null;
  }

  return (
    base.monthlyIncome -
    base.operatingCosts -
    sumDebtPayments(debtAllocations) -
    sumGoalContributions(goalAllocations)
  );
}

function createBaseScenario(
  id: Exclude<DistributionStrategyId, "current_reference">,
  base: StrategyBase
): DistributionScenario {
  return {
    debtAllocations: base.debtAllocations,
    debtShare: null,
    distributableAmount: base.distributableAmount,
    goalAllocations: [],
    id,
    issues: base.issues,
    label: strategyLabels[id],
    monthlyBalance: getMonthlyBalance({
      base,
      debtAllocations: base.debtAllocations,
      goalAllocations: []
    }),
    protectedMargin: base.protectedMargin,
    poolBreakdown: base.poolBreakdown,
    status: base.status,
    surplusBeforeProtection: base.surplusBeforeProtection,
    unassignedAmount: base.distributableAmount
  };
}

function getReduceInterestScenario(
  input: FinancialProjectionInput,
  base: StrategyBase
): DistributionScenario {
  const scenario = createBaseScenario("reduce_interest", base);

  if (base.status !== "ready") {
    return scenario;
  }

  const debtIssues = getDebtStrategyIssues(input);
  const hasInterestBearingDebt = input.debts.some(
    (debt) => (debt.annualInterestRate ?? 0) > 0 && (debt.remainingAmount ?? 0) > 0
  );

  if (!hasInterestBearingDebt) {
    return {
      ...scenario,
      issues: [
        ...base.issues,
        ...debtIssues,
        {
          code: "no_interest_bearing_debt",
          message: "No hay una deuda con tasa conocida mayor que cero para priorizar."
        }
      ],
      status: "not_applicable"
    };
  }

  const allocated = allocateExtraToInterestDebts({
    allocations: base.debtAllocations,
    amount: base.distributableAmount,
    debts: input.debts
  });

  return {
    ...scenario,
    debtAllocations: allocated.allocations,
    issues: [...base.issues, ...debtIssues],
    monthlyBalance: getMonthlyBalance({
      base,
      debtAllocations: allocated.allocations,
      goalAllocations: []
    }),
    unassignedAmount: allocated.unallocatedAmount
  };
}

function getAccelerateGoalScenario({
  base,
  input,
  selectedGoalId
}: {
  base: StrategyBase;
  input: FinancialProjectionInput;
  selectedGoalId?: string | null;
}): DistributionScenario {
  const scenario = createBaseScenario("accelerate_goal", base);

  if (base.status !== "ready") {
    return scenario;
  }

  const goal = getActiveGoal(input.goals, selectedGoalId);

  if (!goal) {
    return {
      ...scenario,
      issues: [{ code: "missing_goal", message: "Elige una meta activa para acelerarla." }],
      status: "not_applicable"
    };
  }

  if (getGoalRemainingAmount(goal) === null) {
    return {
      ...scenario,
      issues: [
        {
          code: "missing_goal_target",
          entityId: goal.id,
          message: `Falta definir el monto objetivo de ${goal.title}.`
        }
      ],
      status: "incomplete"
    };
  }

  const goalResult = allocateToGoal({ amount: base.distributableAmount, goal });
  const goalAllocations = goalResult.allocation ? [goalResult.allocation] : [];

  return {
    ...scenario,
    goalAllocations,
    monthlyBalance: getMonthlyBalance({
      base,
      debtAllocations: base.debtAllocations,
      goalAllocations
    }),
    unassignedAmount: goalResult.unallocatedAmount
  };
}

function getSplitScenario({
  base,
  debtShare,
  input,
  selectedGoalId
}: {
  base: StrategyBase;
  debtShare: number;
  input: FinancialProjectionInput;
  selectedGoalId?: string | null;
}): DistributionScenario {
  const normalizedDebtShare = normalizeSplitDebtShare(debtShare);
  const scenario = {
    ...createBaseScenario("split_debt_goal", base),
    debtShare: normalizedDebtShare
  };

  if (base.status !== "ready") {
    return scenario;
  }

  const goal = getActiveGoal(input.goals, selectedGoalId);
  const hasEligibleDebt = input.debts.some(
    (debt) => (debt.annualInterestRate ?? 0) > 0 && (debt.remainingAmount ?? 0) > 0
  );
  const goalRemainingAmount = goal ? getGoalRemainingAmount(goal) : null;

  if (!goal) {
    return {
      ...scenario,
      issues: [
        { code: "missing_goal", message: "Elige una meta activa para repartir el dinero." }
      ],
      status: "not_applicable"
    };
  }

  if (goalRemainingAmount === null) {
    return {
      ...scenario,
      issues: [
        {
          code: "missing_goal_target",
          entityId: goal.id,
          message: `Falta definir el monto objetivo de ${goal.title}.`
        }
      ],
      status: "incomplete"
    };
  }

  if (!hasEligibleDebt) {
    return {
      ...scenario,
      issues: [
        {
          code: "no_interest_bearing_debt",
          message: "No hay una deuda con tasa conocida mayor que cero para repartir."
        }
      ],
      status: "not_applicable"
    };
  }

  const debtBudget = base.distributableAmount * normalizedDebtShare;
  const goalBudget = base.distributableAmount - debtBudget;
  let debtResult = allocateExtraToInterestDebts({
    allocations: base.debtAllocations,
    amount: debtBudget,
    debts: input.debts
  });
  let goalResult = goal
    ? allocateToGoal({ amount: goalBudget + debtResult.unallocatedAmount, goal })
    : { allocation: null, unallocatedAmount: goalBudget + debtResult.unallocatedAmount };

  if (goalResult.unallocatedAmount > 0 && hasEligibleDebt) {
    debtResult = allocateExtraToInterestDebts({
      allocations: debtResult.allocations,
      amount: goalResult.unallocatedAmount,
      debts: input.debts
    });
    goalResult = { ...goalResult, unallocatedAmount: debtResult.unallocatedAmount };
  }

  const goalAllocations = goalResult.allocation ? [goalResult.allocation] : [];

  return {
    ...scenario,
    debtAllocations: debtResult.allocations,
    goalAllocations,
    issues: [...base.issues, ...getDebtStrategyIssues(input)],
    monthlyBalance: getMonthlyBalance({
      base,
      debtAllocations: debtResult.allocations,
      goalAllocations
    }),
    unassignedAmount: goalResult.unallocatedAmount
  };
}

export function buildDistributionScenarios({
  input,
  protectedMarginPreference = { mode: "automatic" },
  selectedGoalId,
  splitDebtShare = 0.5
}: {
  input: FinancialProjectionInput;
  protectedMarginPreference?: ProtectedMarginPreference;
  selectedGoalId?: string | null;
  splitDebtShare?: number;
}): DistributionScenarioSet {
  const base = getStrategyBase(input, protectedMarginPreference);

  return {
    accelerateGoal: getAccelerateGoalScenario({ base, input, selectedGoalId }),
    currentReference: getReferenceScenario(input, protectedMarginPreference),
    reduceInterest: getReduceInterestScenario(input, base),
    splitDebtGoal: getSplitScenario({ base, debtShare: splitDebtShare, input, selectedGoalId })
  };
}
