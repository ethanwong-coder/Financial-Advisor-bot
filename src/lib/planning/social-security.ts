/**
 * Social Security claiming illustrator.
 *
 * Uses the PUBLIC SSA early-claiming reduction and delayed-retirement-credit
 * formulas to show the estimated monthly benefit at 62, at Full Retirement Age
 * (FRA), and at 70, plus simple breakeven ages. This is rules-based public math
 * — NOT a "you should claim at X" recommendation.
 *
 * Formulas:
 *  - FRA by birth year: 66 for 1943–1954; +2 months per year 1955–1959; 67 for 1960+.
 *  - Early (before FRA): 5/9 of 1% per month for the first 36 months, then
 *    5/12 of 1% per month beyond 36 (≈6.67%/yr then 5%/yr).
 *  - Delayed (after FRA, up to 70): 2/3 of 1% per month (8%/yr).
 *
 * Note: ignores the Jan-1 birthday edge case and cost-of-living adjustments
 * (COLA) — a documented simplification for this illustration.
 */

export interface SocialSecurityInput {
  birthYear: number;
  /** The user's estimated MONTHLY benefit at FRA (from their SSA statement). */
  monthlyBenefitAtFra: number;
}

export interface ClaimOption {
  /** Whole-year claim age used for the illustration (62, FRA whole years, 70). */
  ageYears: number;
  ageMonths: number;
  factor: number;
  monthlyBenefit: number;
}

export interface SocialSecurityResult {
  fra: { years: number; months: number; totalMonths: number };
  at62: ClaimOption;
  atFra: ClaimOption;
  at70: ClaimOption;
  breakevens: {
    /** Age (years, decimal) at which claiming at FRA overtakes claiming at 62. */
    earlyVsFra: number | null;
    /** Age at which claiming at 70 overtakes claiming at 62. */
    earlyVsLate: number | null;
    /** Age at which claiming at 70 overtakes claiming at FRA. */
    fraVsLate: number | null;
  };
}

/** Full Retirement Age, in whole months. */
export function fraMonths(birthYear: number): number {
  if (birthYear <= 1954) return 66 * 12;
  if (birthYear >= 1960) return 67 * 12;
  return 66 * 12 + (birthYear - 1954) * 2; // 1955..1959
}

/** Benefit multiplier vs. the FRA benefit for a claim age given in months. */
export function claimingFactor(claimMonths: number, fra: number): number {
  if (claimMonths < fra) {
    const early = fra - claimMonths;
    const first = Math.min(36, early);
    const beyond = Math.max(0, early - 36);
    const reduction = first * (5 / 9 / 100) + beyond * (5 / 12 / 100);
    return 1 - reduction;
  }
  if (claimMonths > fra) {
    const delayed = Math.min(claimMonths, 70 * 12) - fra;
    const credit = delayed * (2 / 3 / 100); // 8%/yr
    return 1 + credit;
  }
  return 1;
}

export function illustrateSocialSecurity(
  input: SocialSecurityInput,
): SocialSecurityResult {
  const fra = fraMonths(input.birthYear);
  const fraYears = Math.floor(fra / 12);
  const fraExtraMonths = fra % 12;

  const option = (claimMonths: number): ClaimOption => {
    const factor = claimingFactor(claimMonths, fra);
    return {
      ageYears: Math.floor(claimMonths / 12),
      ageMonths: claimMonths,
      factor: round4(factor),
      monthlyBenefit: round2(input.monthlyBenefitAtFra * factor),
    };
  };

  const at62 = option(62 * 12);
  const atFra = option(fra);
  const at70 = option(70 * 12);

  return {
    fra: { years: fraYears, months: fraExtraMonths, totalMonths: fra },
    at62,
    atFra,
    at70,
    breakevens: {
      earlyVsFra: breakevenAge(at62, atFra),
      earlyVsLate: breakevenAge(at62, at70),
      fraVsLate: breakevenAge(atFra, at70),
    },
  };
}

/**
 * Age (in years) at which the higher, later-starting benefit's cumulative total
 * overtakes the lower, earlier-starting one. Returns null if the later option
 * isn't actually higher.
 */
export function breakevenAge(earlier: ClaimOption, later: ClaimOption): number | null {
  const em = earlier.monthlyBenefit;
  const lm = later.monthlyBenefit;
  if (lm <= em) return null;
  const es = earlier.ageMonths / 12;
  const ls = later.ageMonths / 12;
  // em*(t-es) = lm*(t-ls)  ->  t = (lm*ls - em*es) / (lm - em)
  const t = (lm * ls - em * es) / (lm - em);
  return round2(t);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
