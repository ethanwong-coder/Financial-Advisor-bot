/**
 * Mortgage / refinance calculator — standard amortization math.
 * Pure/deterministic.
 */

/** Fixed monthly payment to amortize `principal` at `annualRate` over `termMonths`. */
export function monthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return round2(principal / termMonths);
  const payment = (principal * r) / (1 - Math.pow(1 + r, -termMonths));
  return round2(payment);
}

export interface RefiInput {
  currentBalance: number;
  currentAnnualRate: number;
  currentRemainingMonths: number;
  /** New loan terms. */
  newAnnualRate: number;
  newTermMonths: number;
  closingCosts: number;
}
export interface RefiResult {
  currentPayment: number;
  newPayment: number;
  monthlySavings: number; // positive => refi lowers the payment
  /** Months to recoup closing costs from monthly savings; null if no savings. */
  breakevenMonths: number | null;
}

export function compareRefinance(input: RefiInput): RefiResult {
  const currentPayment = monthlyPayment(
    input.currentBalance,
    input.currentAnnualRate,
    input.currentRemainingMonths,
  );
  const newPayment = monthlyPayment(
    input.currentBalance,
    input.newAnnualRate,
    input.newTermMonths,
  );
  const monthlySavings = round2(currentPayment - newPayment);
  return {
    currentPayment,
    newPayment,
    monthlySavings,
    breakevenMonths:
      monthlySavings > 0 ? Math.ceil(input.closingCosts / monthlySavings) : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
