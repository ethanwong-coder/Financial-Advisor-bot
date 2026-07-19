/**
 * Retirement income projection — "Can I retire?" illustration.
 *
 * Two deterministic steps:
 *  1. Accumulation: grow current balance + monthly contributions to the target
 *     retirement age (monthly compounding).
 *  2. Depletion: at retirement, withdraw (desired spending − Social Security)
 *     each year while the remaining balance keeps earning; count how many years
 *     it lasts (simple year-by-year model, NOT Monte Carlo).
 *
 * Optional inflation: if `annualInflation` > 0, the depletion phase uses the
 * REAL return so results are in today's dollars. Default 0 = nominal.
 *
 * This is an ILLUSTRATION based on the user's inputs/assumptions — not a
 * guarantee or a recommendation.
 */

const MAX_DEPLETION_YEARS = 60;

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  monthlyContribution: number;
  /** Nominal annual return, e.g. 0.06. */
  expectedAnnualReturn: number;
  /** Optional; default 0 (results stay nominal). */
  annualInflation?: number;
  /** Estimated annual Social Security income in retirement. */
  estimatedAnnualSocialSecurity: number;
  desiredAnnualSpending: number;
}

export interface RetirementResult {
  yearsToRetirement: number;
  projectedBalanceAtRetirement: number;
  annualWithdrawalNeeded: number;
  socialSecurityCoversSpending: boolean;
  /** null => the balance does not deplete within the modeled horizon (60+ yrs). */
  yearsBalanceLasts: number | null;
  depletionAge: number | null;
  realReturnUsed: number;
  assumptions: {
    expectedAnnualReturn: number;
    annualInflation: number;
    modeledHorizonYears: number;
  };
}

export function projectRetirement(input: RetirementInput): RetirementResult {
  const inflation = input.annualInflation ?? 0;
  const yearsToRetirement = Math.max(0, input.retirementAge - input.currentAge);

  // --- Accumulation (monthly compounding) ---
  const months = Math.round(yearsToRetirement * 12);
  const i = input.expectedAnnualReturn / 12;
  let projected: number;
  if (i === 0) {
    projected = input.currentBalance + input.monthlyContribution * months;
  } else {
    const growth = Math.pow(1 + i, months);
    projected =
      input.currentBalance * growth +
      input.monthlyContribution * ((growth - 1) / i);
  }

  // --- Depletion (annual) ---
  // Use the real return when inflation is supplied, so results are today's dollars.
  const realReturn =
    inflation > 0
      ? (1 + input.expectedAnnualReturn) / (1 + inflation) - 1
      : input.expectedAnnualReturn;

  const annualWithdrawalNeeded = Math.max(
    0,
    input.desiredAnnualSpending - input.estimatedAnnualSocialSecurity,
  );

  let yearsBalanceLasts: number | null;
  let socialSecurityCoversSpending = false;

  if (annualWithdrawalNeeded <= 0) {
    socialSecurityCoversSpending = true;
    yearsBalanceLasts = null; // never depletes
  } else {
    let balance = projected;
    let years = 0;
    while (years < MAX_DEPLETION_YEARS) {
      balance = balance * (1 + realReturn) - annualWithdrawalNeeded;
      years += 1;
      if (balance <= 0) break;
    }
    yearsBalanceLasts = balance <= 0 ? years : null;
  }

  return {
    yearsToRetirement,
    projectedBalanceAtRetirement: round2(projected),
    annualWithdrawalNeeded: round2(annualWithdrawalNeeded),
    socialSecurityCoversSpending,
    yearsBalanceLasts,
    depletionAge:
      yearsBalanceLasts == null ? null : input.retirementAge + yearsBalanceLasts,
    realReturnUsed: realReturn,
    assumptions: {
      expectedAnnualReturn: input.expectedAnnualReturn,
      annualInflation: inflation,
      modeledHorizonYears: MAX_DEPLETION_YEARS,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
