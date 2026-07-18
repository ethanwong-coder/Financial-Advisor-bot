/**
 * Qualified Charitable Distribution (QCD) tracker math.
 *
 * A QCD is a distribution from an IRA, made directly to charity by someone age
 * 70½ or older, that can count toward that IRA's Required Minimum Distribution
 * (RMD) while being excluded from taxable income.
 *
 * This module is pure math. The RMD amount it cross-references is READ from the
 * existing compliance engine (src/lib/rules) at the call site — it is never
 * computed or modified here. It shows how much of the RMD the logged QCDs
 * satisfy and whether the annual QCD exclusion limit is exceeded.
 */

/** Annual QCD exclusion limit — TAX YEAR 2025 figure (indexed; verify yearly). */
export const QCD_ANNUAL_LIMIT_2025 = 108000;

export interface QcdSummaryInput {
  /** The account's RMD for the year (from the existing engine or entered by the user). */
  rmdAmount: number;
  /** Total QCDs logged for the year for this account. */
  qcdTotal: number;
  /** Annual QCD exclusion limit; defaults to the current constant. */
  annualLimit?: number;
}

export interface QcdSummary {
  rmdAmount: number;
  qcdTotal: number;
  qcdAppliedToRmd: number;
  rmdRemaining: number;
  rmdFullySatisfied: boolean;
  annualLimit: number;
  exceedsAnnualLimit: boolean;
}

export function summarizeQcd(input: QcdSummaryInput): QcdSummary {
  const annualLimit = input.annualLimit ?? QCD_ANNUAL_LIMIT_2025;
  const rmd = Math.max(0, input.rmdAmount);
  const qcd = Math.max(0, input.qcdTotal);
  const qcdAppliedToRmd = Math.min(qcd, rmd);
  const rmdRemaining = Math.max(0, rmd - qcd);

  return {
    rmdAmount: round2(rmd),
    qcdTotal: round2(qcd),
    qcdAppliedToRmd: round2(qcdAppliedToRmd),
    rmdRemaining: round2(rmdRemaining),
    rmdFullySatisfied: rmd > 0 && qcd >= rmd,
    annualLimit,
    exceedsAnnualLimit: qcd > annualLimit,
  };
}

/**
 * QCD eligibility: the account owner must be at least 70½ as of the given date.
 * Returns false if the birth date is unknown.
 */
export function isQcdEligible(birthDate: Date | null | undefined, asOf: Date): boolean {
  if (!birthDate) return false;
  // 70 years + 6 months.
  const eligibleFrom = new Date(
    Date.UTC(
      birthDate.getUTCFullYear() + 70,
      birthDate.getUTCMonth() + 6,
      birthDate.getUTCDate(),
    ),
  );
  return asOf.getTime() >= eligibleFrom.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
