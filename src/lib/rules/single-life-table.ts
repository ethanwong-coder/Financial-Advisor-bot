/**
 * IRS Single Life Expectancy Table — SAMPLE SUBSET.
 *
 * ⚠️  This is a DELIBERATELY PARTIAL, high-confidence subset of the IRS 2022
 *     Single Life Table (Treas. Reg. §1.401(a)(9)-9, as used from 2022 onward),
 *     included so the annual-RMD *estimate* works out of the box for common
 *     ages. It is NOT the full table.
 *
 *     BEFORE PRODUCTION USE: replace this with the complete Single Life Table
 *     (ages 0–120+) from the current IRS Publication 590-B, Appendix B. RMD
 *     amounts must use exact published factors — never interpolate.
 *
 * IMPORTANT: The compliance FLAGS produced by the engine do NOT depend on these
 * factors. They flag whether a required distribution appears to have been taken
 * at all. The dollar figure below is only an informational ESTIMATE; when a
 * factor is not in this subset, the estimate is simply omitted.
 */
export const SINGLE_LIFE_TABLE_2022_SAMPLE: Readonly<Record<number, number>> = {
  45: 41.0,
  50: 36.2,
  55: 31.6,
  60: 27.1,
  65: 22.9,
  70: 18.8,
  72: 17.2,
  75: 14.8,
  80: 11.2,
};

/** Returns the Single Life factor for an age, or null if not in the sample. */
export function singleLifeFactor(age: number): number | null {
  const f = SINGLE_LIFE_TABLE_2022_SAMPLE[age];
  return typeof f === "number" ? f : null;
}

/**
 * The "reduce by one" (term-certain) method used by a designated beneficiary
 * inside the 10-year window. The initial factor is the beneficiary's Single
 * Life factor for the year *after* the owner's death; each subsequent year the
 * factor is reduced by one.
 *
 * @param initialFactor factor for the first distribution year
 * @param yearsSinceFirst how many years after the first distribution year (0 = first year)
 * @returns the reduced factor, or null if it would be <= 0 (account should be
 *          fully distributed by then anyway)
 */
export function reducedFactor(initialFactor: number, yearsSinceFirst: number): number | null {
  const f = initialFactor - yearsSinceFirst;
  return f > 0 ? Number(f.toFixed(1)) : null;
}

/**
 * Estimate an annual RMD amount: prior year-end balance divided by the (reduced)
 * life-expectancy factor. Informational only.
 */
export function estimateAnnualRmd(priorYearEndBalance: number, factor: number): number {
  if (factor <= 0) return 0;
  return Math.round((priorYearEndBalance / factor) * 100) / 100;
}
