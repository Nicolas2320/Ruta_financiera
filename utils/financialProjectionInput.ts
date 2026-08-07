import type {
  DebtMonthlyPaymentType,
  DebtPaymentFlexibility,
  ExactFinancialValues,
  FinancialGoal,
  OnboardingData
} from "../types/financial";
import { getOnboardingGoals } from "../types/financial";
import { isDebtPaid } from "./debtPayments";
import { calculateFinancialSnapshot, type SnapshotSource } from "./financialCalculations";
import { getMonthsUntilTargetMonth } from "./monthYear";

export type ProjectionDataOwner = "income" | "expenses" | "debts" | "goals" | "planning";

export type ProjectionOwnerRoute =
  | "/income"
  | "/expenses"
  | "/improve-plan"
  | "/debts"
  | "/goals-overview";

export type ProjectionExpenseSource =
  | "exact"
  | "estimated_range"
  | "missing";

export type ProjectionDataIssue = {
  code:
    | "missing_income"
    | "missing_expenses"
    | "missing_goal_target"
    | "missing_goal_target_month"
    | "goal_target_month_in_past"
    | "unknown_debt_payment_type"
    | "unknown_debt_flexibility"
    | "missing_debt_interest_rate";
  entityId?: string;
  message: string;
  owner: ProjectionDataOwner;
  ownerRoute: ProjectionOwnerRoute;
  severity: "blocking" | "review";
};

export type ProjectionDebtInput = {
  id: string;
  title: string;
  remainingAmount: number | null;
  plannedMonthlyPayment: number;
  requiredMonthlyPayment: number | null;
  monthlyPaymentType: DebtMonthlyPaymentType;
  paymentFlexibility: DebtPaymentFlexibility;
  annualInterestRate: number | null;
  paymentDay: number | null;
  status: OnboardingData["debts"][number]["status"];
};

export type ProjectionGoalInput = {
  id: string;
  title: string;
  targetAmount: number | null;
  currentAmount: number;
  manualMonthlyContribution: number | null;
  targetMonth: string | null;
  isPrimary: boolean;
  status: FinancialGoal["status"];
};

export type FinancialProjectionInput = {
  asOfDate: string;
  cashflow: {
    monthlyIncome: number | null;
    monthlyIncomeSource: SnapshotSource;
    totalMonthlyExpenses: number | null;
    totalMonthlyExpensesSource: SnapshotSource;
    baselineMonthlyExpenses: number | null;
    baselineMonthlyExpensesSource: ProjectionExpenseSource;
    smallMonthlyExpenses: number | null;
    plannedDebtPaymentsTotal: number;
    knownRequiredDebtPaymentsTotal: number;
    hasCompleteRequiredDebtPayments: boolean;
    availableAfterPlannedPayments: number | null;
    availableAfterRequiredPayments: number | null;
  };
  debts: ProjectionDebtInput[];
  goals: ProjectionGoalInput[];
  issues: ProjectionDataIssue[];
};

function getDebtTitle(debt: OnboardingData["debts"][number]) {
  return debt.name?.trim() || debt.lender?.trim() || debt.type;
}

function getRequiredMonthlyPayment(
  debt: OnboardingData["debts"][number],
  monthlyPaymentType: DebtMonthlyPaymentType
) {
  if (monthlyPaymentType === "self_selected") {
    return 0;
  }

  if (typeof debt.minimumMonthlyPayment === "number" && debt.minimumMonthlyPayment >= 0) {
    return debt.minimumMonthlyPayment;
  }

  return monthlyPaymentType === "minimum_required" || monthlyPaymentType === "agreed"
    ? debt.monthlyPayment
    : null;
}

function toProjectionGoal(goal: FinancialGoal): ProjectionGoalInput {
  return {
    id: goal.id,
    title: goal.title,
    targetAmount: goal.targetAmount ?? null,
    currentAmount: goal.currentAmount ?? 0,
    manualMonthlyContribution: goal.manualMonthlyContribution ?? null,
    targetMonth: goal.targetMonth ?? null,
    isPrimary: goal.isPrimary === true,
    status: goal.status
  };
}

export function buildFinancialProjectionInput({
  asOfDate = new Date().toISOString().slice(0, 10),
  exactValues,
  onboarding
}: {
  asOfDate?: string;
  exactValues?: ExactFinancialValues | null;
  onboarding: OnboardingData;
}): FinancialProjectionInput {
  const snapshot = calculateFinancialSnapshot({ onboarding, exactValues });
  const issues: ProjectionDataIssue[] = [];
  const activeDebts = onboarding.debts.filter((debt) => !isDebtPaid(debt));
  const debts = activeDebts.map<ProjectionDebtInput>((debt) => {
    const monthlyPaymentType = debt.monthlyPaymentType ?? "unknown";
    const paymentFlexibility = debt.paymentFlexibility ?? "unknown";
    const requiredMonthlyPayment = getRequiredMonthlyPayment(debt, monthlyPaymentType);
    const title = getDebtTitle(debt);

    if (monthlyPaymentType === "unknown") {
      issues.push({
        code: "unknown_debt_payment_type",
        entityId: debt.id,
        message: `Confirma qué representa el pago mensual de ${title}.`,
        owner: "debts",
        ownerRoute: "/debts",
        severity: "review"
      });
    }

    if (monthlyPaymentType === "agreed" && paymentFlexibility === "unknown") {
      issues.push({
        code: "unknown_debt_flexibility",
        entityId: debt.id,
        message: `Confirma si el acuerdo mensual de ${title} se puede negociar.`,
        owner: "debts",
        ownerRoute: "/debts",
        severity: "review"
      });
    }

    if (debt.annualInterestRate === null || debt.annualInterestRate === undefined) {
      issues.push({
        code: "missing_debt_interest_rate",
        entityId: debt.id,
        message: `La tasa de ${title} falta; la proyección de intereses será limitada.`,
        owner: "debts",
        ownerRoute: "/debts",
        severity: "review"
      });
    }

    return {
      id: debt.id,
      title,
      remainingAmount: debt.remainingAmount ?? null,
      plannedMonthlyPayment: debt.monthlyPayment,
      requiredMonthlyPayment,
      monthlyPaymentType,
      paymentFlexibility,
      annualInterestRate: debt.annualInterestRate ?? null,
      paymentDay: debt.paymentDay ?? null,
      status: debt.status
    };
  });
  const goals = getOnboardingGoals(onboarding).map(toProjectionGoal);
  const projectionDate = new Date(`${asOfDate}T12:00:00`);

  if (snapshot.cashflow.monthlyIncome === null) {
    issues.push({
      code: "missing_income",
      message: "Registra un ingreso mensual para proyectar escenarios.",
      owner: "income",
      ownerRoute: "/income",
      severity: "blocking"
    });
  }

  goals.forEach((goal) => {
    if (goal.targetAmount === null) {
      issues.push({
        code: "missing_goal_target",
        entityId: goal.id,
        message: `Define el monto objetivo de ${goal.title}.`,
        owner: "goals",
        ownerRoute: "/goals-overview",
        severity: "blocking"
      });
    }

    if (goal.targetMonth === null) {
      issues.push({
        code: "missing_goal_target_month",
        entityId: goal.id,
        message: `Elige el mes y año objetivo de ${goal.title}.`,
        owner: "goals",
        ownerRoute: "/goals-overview",
        severity: "review"
      });
    } else if (
      !Number.isNaN(projectionDate.getTime()) &&
      (getMonthsUntilTargetMonth(goal.targetMonth, projectionDate) ?? 0) < 0
    ) {
      issues.push({
        code: "goal_target_month_in_past",
        entityId: goal.id,
        message: `El mes objetivo de ${goal.title} ya pasó. Elige uno nuevo.`,
        owner: "goals",
        ownerRoute: "/goals-overview",
        severity: "blocking"
      });
    }
  });

  const plannedDebtPaymentsTotal = debts.reduce(
    (total, debt) => total + debt.plannedMonthlyPayment,
    0
  );
  const knownRequiredDebtPaymentsTotal = debts.reduce(
    (total, debt) => total + (debt.requiredMonthlyPayment ?? 0),
    0
  );
  const hasCompleteRequiredDebtPayments = debts.every(
    (debt) => debt.requiredMonthlyPayment !== null
  );
  const monthlyIncome = snapshot.cashflow.monthlyIncome;
  const baselineMonthlyExpenses = snapshot.cashflow.monthlyExpenses;
  const smallMonthlyExpenses = snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
    ? 0
    : snapshot.values.smallExpenses;
  const totalMonthlyExpenses =
    baselineMonthlyExpenses !== null && smallMonthlyExpenses !== null
      ? baselineMonthlyExpenses + smallMonthlyExpenses + plannedDebtPaymentsTotal
      : null;
  let baselineMonthlyExpensesSource: ProjectionExpenseSource = "missing";

  if (baselineMonthlyExpenses !== null) {
    baselineMonthlyExpensesSource =
      snapshot.sourceMap.monthlyExpenses === "estimated" ? "estimated_range" : "exact";
  } else {
    issues.push({
      code: "missing_expenses",
      message: snapshot.cashflow.monthlyExpensesIncludesSmallExpenses
        ? "Registra tus gastos mensuales para proyectar escenarios."
        : "Registra tus gastos principales al mes para proyectar escenarios.",
      owner: "expenses",
      ownerRoute: "/improve-plan",
      severity: "blocking"
    });
  }

  return {
    asOfDate,
    cashflow: {
      monthlyIncome,
      monthlyIncomeSource: snapshot.sourceMap.monthlyIncome,
      totalMonthlyExpenses,
      totalMonthlyExpensesSource: snapshot.sourceMap.monthlyExpenses,
      baselineMonthlyExpenses,
      baselineMonthlyExpensesSource,
      smallMonthlyExpenses,
      plannedDebtPaymentsTotal,
      knownRequiredDebtPaymentsTotal,
      hasCompleteRequiredDebtPayments,
      availableAfterPlannedPayments:
        monthlyIncome !== null &&
        baselineMonthlyExpenses !== null &&
        smallMonthlyExpenses !== null
        ? monthlyIncome - baselineMonthlyExpenses - smallMonthlyExpenses - plannedDebtPaymentsTotal
        : null,
      availableAfterRequiredPayments:
        monthlyIncome !== null &&
        baselineMonthlyExpenses !== null &&
        smallMonthlyExpenses !== null &&
        hasCompleteRequiredDebtPayments
          ? monthlyIncome -
            baselineMonthlyExpenses -
            smallMonthlyExpenses -
            knownRequiredDebtPaymentsTotal
          : null
    },
    debts,
    goals,
    issues
  };
}
