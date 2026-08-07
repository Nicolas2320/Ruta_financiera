import { describe, expect, it } from "vitest";

import {
  buildDistributionScenarios,
  calculateProtectedMargin,
  lockScenariosUntilDebtDetails
} from "../utils/financialDistribution";
import { buildFinancialProjectionInput } from "../utils/financialProjectionInput";
import { makeDebt, makeGoal, makeOnboarding } from "./fixtures/financial";

function makeExampleProjection() {
  return buildFinancialProjectionInput({
    asOfDate: "2026-08-02",
    exactValues: {
      monthlyExpenses: 920_000,
      monthlyIncome: 4_800_000,
      smallExpenses: 0
    },
    onboarding: makeOnboarding({
      debts: [
        makeDebt({
          annualInterestRate: 12,
          id: "icetex",
          monthlyPayment: 577_000,
          monthlyPaymentType: "minimum_required",
          name: "Icetex",
          remainingAmount: 30_000_000
        }),
        makeDebt({
          annualInterestRate: 0,
          id: "nikis",
          monthlyPayment: 500_000,
          monthlyPaymentType: "agreed",
          name: "Nikis",
          paymentFlexibility: "fixed",
          remainingAmount: 500_000
        }),
        makeDebt({
          annualInterestRate: 0,
          id: "friend",
          monthlyPayment: 250_000,
          monthlyPaymentType: "agreed",
          name: "Amiga",
          paymentFlexibility: "fixed",
          remainingAmount: 250_000
        }),
        makeDebt({
          annualInterestRate: 0,
          id: "alejandro",
          monthlyPayment: 500_000,
          monthlyPaymentType: "agreed",
          name: "Préstamo Alejandro",
          paymentFlexibility: "fixed",
          remainingAmount: 500_000
        }),
        makeDebt({
          annualInterestRate: 0,
          id: "suegris",
          monthlyPayment: 500_000,
          monthlyPaymentType: "agreed",
          name: "Préstamo Suegris",
          paymentFlexibility: "fixed",
          remainingAmount: 1_500_000
        }),
        makeDebt({
          annualInterestRate: 28.79,
          id: "nubank",
          monthlyPayment: 500_000,
          monthlyPaymentType: "minimum_required",
          name: "NuBank TC",
          remainingAmount: 2_000_000
        })
      ],
      goals: [
        makeGoal({
          id: "education",
          targetAmount: 6_000_000,
          targetMonth: "2027-01",
          title: "Especialización",
          type: "education"
        })
      ]
    })
  });
}

describe("protected monthly margin", () => {
  it("protects ten percent of positive surplus in automatic mode", () => {
    expect(
      calculateProtectedMargin({
        preference: { mode: "automatic" },
        surplusBeforeProtection: 1_053_000
      }).result
    ).toEqual({
      amount: 105_300,
      mode: "automatic",
      requestedAmount: null
    });
  });

  it("uses all surplus only when explicitly selected", () => {
    expect(
      calculateProtectedMargin({
        preference: { mode: "use_all" },
        surplusBeforeProtection: 1_053_000
      }).result.amount
    ).toBe(0);
  });

  it("caps a custom margin at the available surplus", () => {
    expect(
      calculateProtectedMargin({
        preference: { amount: 2_000_000, mode: "custom" },
        surplusBeforeProtection: 1_053_000
      }).result
    ).toMatchObject({ amount: 1_053_000, requestedAmount: 2_000_000 });
  });
});

describe("monthly distribution strategies", () => {
  it("keeps registered goal contributions out of the recurring reference scenario", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: 0,
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 5_000_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const reference = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).currentReference;

    expect(reference.goalAllocations).toEqual([]);
    expect(reference.distributableAmount).toBe(1_500_000);
    expect(reference.unassignedAmount).toBe(1_500_000);
  });

  it("distributes the goal portion across every active goal", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 2_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        hasDebts: false,
        debts: [],
        goals: [
          makeGoal({ id: "primary", title: "Principal" }),
          makeGoal({ id: "secondary", isPrimary: false, title: "Secundaria" })
        ]
      })
    });
    const scenario = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    }).accelerateGoal;

    expect(scenario.goalAllocations).toEqual([
      { amount: 600_000, goalId: "primary", title: "Principal" },
      { amount: 400_000, goalId: "secondary", title: "Secundaria" }
    ]);
  });

  it("keeps only the goals strategy available until debts are itemized", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyDebtPayments: 1_200_000,
        monthlyExpenses: 1_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        hasDebts: true,
        debts: [],
        goals: [makeGoal()]
      })
    });
    const scenarios = lockScenariosUntilDebtDetails(
      buildDistributionScenarios({ input })
    );

    expect(scenarios.accelerateGoal.status).toBe("ready");
    expect(scenarios.currentReference.status).toBe("not_applicable");
    expect(scenarios.reduceInterest.status).toBe("not_applicable");
    expect(scenarios.splitDebtGoal.status).toBe("not_applicable");
    expect(scenarios.currentReference.issues[0]?.code).toBe(
      "missing_debt_details"
    );
  });

  it("builds concrete comparisons from the example without allocating every peso", () => {
    const scenarios = buildDistributionScenarios({ input: makeExampleProjection() });

    expect(scenarios.currentReference).toMatchObject({
      distributableAmount: 947_700,
      monthlyBalance: 1_053_000,
      protectedMargin: { amount: 105_300, mode: "automatic" },
      status: "ready",
      unassignedAmount: 947_700
    });

    expect(scenarios.reduceInterest).toMatchObject({
      distributableAmount: 947_700,
      monthlyBalance: 105_300,
      protectedMargin: { amount: 105_300 },
      status: "ready",
      unassignedAmount: 0
    });
    expect(
      scenarios.reduceInterest.debtAllocations.find(
        (allocation) => allocation.debtId === "nubank"
      )
    ).toMatchObject({
      basePayment: 500_000,
      extraPayment: 947_700,
      totalPayment: 1_447_700
    });

    expect(scenarios.accelerateGoal.goalAllocations[0]).toMatchObject({
      amount: 947_700,
      goalId: "education"
    });
    expect(scenarios.accelerateGoal.monthlyBalance).toBe(105_300);

    expect(
      scenarios.splitDebtGoal.debtAllocations.find(
        (allocation) => allocation.debtId === "nubank"
      )
    ).toMatchObject({ extraPayment: 473_850 });
    expect(scenarios.splitDebtGoal.goalAllocations[0]).toMatchObject({ amount: 473_850 });
    expect(scenarios.splitDebtGoal.monthlyBalance).toBe(105_300);
  });

  it("allows the debt and goal split to move in five-point steps", () => {
    const scenarios = buildDistributionScenarios({
      input: makeExampleProjection(),
      splitDebtShare: 0.4
    });

    expect(scenarios.splitDebtGoal.debtShare).toBe(0.4);
    expect(
      scenarios.splitDebtGoal.debtAllocations.find(
        (allocation) => allocation.debtId === "nubank"
      )
    ).toMatchObject({ extraPayment: 379_080 });
    expect(scenarios.splitDebtGoal.goalAllocations[0]).toMatchObject({ amount: 568_620 });
  });

  it("redistributes a self-selected payment because it has no fixed monthly floor", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: 25,
            monthlyPaymentType: "self_selected",
            minimumMonthlyPayment: null
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenarios = buildDistributionScenarios({ input });

    expect(scenarios.currentReference.status).toBe("ready");
    expect(scenarios.reduceInterest).toMatchObject({
      distributableAmount: 1_800_000,
      status: "ready"
    });
    expect(scenarios.accelerateGoal.status).toBe("ready");
    expect(scenarios.splitDebtGoal.status).toBe("ready");
    expect(scenarios.reduceInterest.poolBreakdown).toMatchObject({
      total: 1_800_000,
      voluntaryDebtPayments: 200_000,
      unassignedMonthlyMargin: 1_600_000
    });
  });

  it("advances debts and allows a combined split when the interest rate is unknown", () => {
    const input = buildFinancialProjectionInput({
      asOfDate: "2026-08-02",
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 3_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: null,
            monthlyPayment: 300_000,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 2_000_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenarios = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    });

    expect(scenarios.reduceInterest).toMatchObject({
      status: "ready",
      unassignedAmount: 0
    });
    expect(scenarios.reduceInterest.issues).toContainEqual(
      expect.objectContaining({ code: "unknown_interest_rate" })
    );
    expect(scenarios.reduceInterest.debtAllocations[0]).toMatchObject({
      basePayment: 300_000,
      extraPayment: 1_700_000,
      totalPayment: 2_000_000
    });
    expect(scenarios.splitDebtGoal.status).toBe("ready");
    expect(scenarios.splitDebtGoal.debtAllocations[0].extraPayment).toBe(850_000);
    expect(scenarios.splitDebtGoal.goalAllocations[0].amount).toBe(850_000);
  });

  it("keeps every agreement as required and only exposes self-selected payments as movable", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 4_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            id: "required",
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required"
          }),
          makeDebt({
            id: "negotiable-agreement",
            monthlyPayment: 300_000,
            monthlyPaymentType: "agreed",
            paymentFlexibility: "negotiable"
          }),
          makeDebt({
            id: "fixed-agreement",
            monthlyPayment: 250_000,
            monthlyPaymentType: "agreed",
            paymentFlexibility: "fixed"
          }),
          makeDebt({
            id: "self-selected",
            monthlyPayment: 200_000,
            monthlyPaymentType: "self_selected"
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenarios = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    });

    expect(input.cashflow.knownRequiredDebtPaymentsTotal).toBe(1_050_000);
    expect(scenarios.reduceInterest.poolBreakdown).toEqual({
      overcommittedAmount: 0,
      total: 1_950_000,
      unassignedMonthlyMargin: 1_750_000,
      voluntaryDebtPayments: 200_000,
      voluntaryGoalContributions: 0
    });
  });

  it("caps a final debt payment at its remaining balance", () => {
    const input = buildFinancialProjectionInput({
      exactValues: {
        monthlyExpenses: 1_000_000,
        monthlyIncome: 2_000_000,
        smallExpenses: 0
      },
      onboarding: makeOnboarding({
        debts: [
          makeDebt({
            annualInterestRate: 30,
            monthlyPayment: 500_000,
            monthlyPaymentType: "minimum_required",
            remainingAmount: 100_000
          })
        ],
        goals: [makeGoal()]
      })
    });
    const scenarios = buildDistributionScenarios({
      input,
      protectedMarginPreference: { mode: "use_all" }
    });

    expect(scenarios.currentReference.debtAllocations[0]).toMatchObject({
      basePayment: 100_000,
      totalPayment: 100_000
    });
    expect(scenarios.reduceInterest.debtAllocations[0]).toMatchObject({
      basePayment: 100_000,
      extraPayment: 0,
      totalPayment: 100_000
    });
    expect(scenarios.reduceInterest.unassignedAmount).toBe(900_000);
  });
});
