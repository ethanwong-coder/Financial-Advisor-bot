/**
 * Estimated quarterly tax payment calculator (IRS safe-harbor rules).
 *
 * Safe harbor = pay the SMALLER of:
 *   - 90% of the current year's estimated tax (if provided), OR
 *   - 100% of the prior year's tax (110% if prior-year AGI > $150k;
 *     $75k for married-filing-separately).
 *
 * Pure/formula-based. Due dates target the tax year; weekend/holiday shifts to
 * the next business day are noted in the UI (this returns the standard dates).
 */
import { FilingStatus, PLANNING_TAX_YEAR } from "./constants";

export interface QuarterlyTaxInput {
  priorYearTaxLiability: number;
  /** Prior-year AGI — determines the 100% vs 110% multiplier. Optional. */
  priorYearAgi?: number;
  /** Current-year projected total tax. Optional; enables the 90% test. */
  currentYearEstimatedTax?: number;
  filingStatus: FilingStatus;
  taxYear?: number;
}

export interface QuarterlyTaxResult {
  taxYear: number;
  requiredAnnualPayment: number;
  perQuarter: number;
  basis:
    | "110% of prior-year tax"
    | "100% of prior-year tax"
    | "90% of current-year estimate";
  priorYearMultiplier: 1.0 | 1.1;
  agiAssumed: boolean;
  dueDates: string[]; // ISO date-only strings
}

export function computeQuarterlyTax(input: QuarterlyTaxInput): QuarterlyTaxResult {
  const taxYear = input.taxYear ?? PLANNING_TAX_YEAR;
  const highIncomeThreshold =
    input.filingStatus === "MARRIED_FILING_SEPARATELY" ? 75000 : 150000;

  // Prior-year safe harbor.
  const agiAssumed = input.priorYearAgi == null;
  const multiplier: 1.0 | 1.1 =
    !agiAssumed && (input.priorYearAgi as number) > highIncomeThreshold
      ? 1.1
      : 1.0;
  const priorYearSafeHarbor = input.priorYearTaxLiability * multiplier;

  // Current-year test (90%) — only if provided.
  let requiredAnnualPayment = priorYearSafeHarbor;
  let basis: QuarterlyTaxResult["basis"] =
    multiplier === 1.1 ? "110% of prior-year tax" : "100% of prior-year tax";

  if (input.currentYearEstimatedTax != null) {
    const currentYear90 = input.currentYearEstimatedTax * 0.9;
    if (currentYear90 < priorYearSafeHarbor) {
      requiredAnnualPayment = currentYear90;
      basis = "90% of current-year estimate";
    }
  }

  return {
    taxYear,
    requiredAnnualPayment: round2(requiredAnnualPayment),
    perQuarter: round2(requiredAnnualPayment / 4),
    basis,
    priorYearMultiplier: multiplier,
    agiAssumed,
    dueDates: quarterlyDueDates(taxYear),
  };
}

/** Standard federal estimated-tax due dates for a tax year (Q4 lands in Jan of Y+1). */
export function quarterlyDueDates(taxYear: number): string[] {
  return [
    `${taxYear}-04-15`,
    `${taxYear}-06-15`,
    `${taxYear}-09-15`,
    `${taxYear + 1}-01-15`,
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
