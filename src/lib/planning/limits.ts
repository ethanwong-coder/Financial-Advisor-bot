/**
 * IRS contribution limits and related figures — TAX YEAR 2026.
 *
 * ⚠️  These are inflation-indexed and change every year. The values below are
 *     documented, best-effort 2026 figures and MUST be verified against the
 *     official IRS releases (Notice / Rev. Proc.) before being relied on. They
 *     are surfaced in the UI with a "verify current-year figures" note. Update
 *     this one file each year.
 *
 * Used by the business-retirement comparison, equity-comp, and 529 tools. No
 * LLM computes any of this — it's a static, deterministic table.
 */

export const LIMITS_TAX_YEAR = 2026;

/** Elective deferral / employee contribution limits. */
export const ELECTIVE_DEFERRAL_401K = 24500; // 401(k)/403(b)/Solo-401(k) employee
export const CATCHUP_401K_50 = 8000; // age 50+ catch-up
/** SECURE 2.0 higher catch-up for ages 60–63. */
export const CATCHUP_401K_60_63 = 11250;

export const SIMPLE_DEFERRAL = 17000;
export const SIMPLE_CATCHUP_50 = 4000;

/** Overall defined-contribution annual additions limit (employee + employer). */
export const DC_ANNUAL_ADDITIONS = 72000;

/** SEP IRA: the lesser of this % of net eligible compensation or the DC cap. */
export const SEP_PERCENT_OF_COMP = 0.25;
export const SEP_MAX = DC_ANNUAL_ADDITIONS;

/** Annual gift-tax exclusion (relevant to 529 contributions / superfunding). */
export const ANNUAL_GIFT_EXCLUSION = 19000;
/** 529 "superfunding" front-loads up to 5 years of the gift exclusion. */
export const SUPERFUND_YEARS = 5;

/** Compensation cap used when applying percentage-based employer contributions. */
export const COMPENSATION_CAP = 360000;

export const LIMITS_VERIFY_NOTE =
  `Based on best-effort ${LIMITS_TAX_YEAR} IRS figures — verify current-year limits before relying on them.`;
