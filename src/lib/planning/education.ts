/**
 * Education planning: a SIMPLIFIED financial-aid estimate, a student-loan
 * standard-vs-income-driven comparison, and 529 helpers.
 *
 * ⚠️  The aid estimate and IDR figures are ROUGH ILLUSTRATIONS using simplified
 *     public methodology and documented constants — they are NOT an official
 *     FAFSA / SAI result or a loan-servicer quote. Deterministic; no LLM.
 */
import { ANNUAL_GIFT_EXCLUSION, SUPERFUND_YEARS } from "./limits";
import { monthlyPayment } from "./mortgage";

// --- Simplified financial-aid (SAI-style) estimate ---
// Documented, simplified constants (verify against current federal methodology).
const INCOME_ALLOWANCE_BASE = 30000; // rough family income protection allowance
const INCOME_ALLOWANCE_PER_PERSON = 5000;
const INCOME_ASSESSMENT_RATE = 0.28; // simplified flat (real SAI is progressive 22–47%)
const ASSET_PROTECTION = 10000;
const ASSET_ASSESSMENT_RATE = 0.0564; // parental asset conversion rate

export interface AidInput {
  parentIncome: number;
  parentAssets: number;
  householdSize: number;
  numberInCollege: number;
}
export interface AidResult {
  estimatedSai: number;
  contributionFromIncome: number;
  contributionFromAssets: number;
  perStudent: number;
}

export function estimateAid(input: AidInput): AidResult {
  const allowance =
    INCOME_ALLOWANCE_BASE + Math.max(0, input.householdSize) * INCOME_ALLOWANCE_PER_PERSON;
  const contributionFromIncome = Math.max(0, input.parentIncome - allowance) * INCOME_ASSESSMENT_RATE;
  const contributionFromAssets = Math.max(0, input.parentAssets - ASSET_PROTECTION) * ASSET_ASSESSMENT_RATE;
  const total = contributionFromIncome + contributionFromAssets;
  const perStudent = total / Math.max(1, input.numberInCollege);
  return {
    estimatedSai: Math.round(total),
    contributionFromIncome: Math.round(contributionFromIncome),
    contributionFromAssets: Math.round(contributionFromAssets),
    perStudent: Math.round(perStudent),
  };
}

// --- Student-loan: standard vs income-driven ---
// 2025 HHS poverty guideline (48 contiguous states) — documented; verify yearly.
const POVERTY_BASE = 15060;
const POVERTY_PER_PERSON = 5380;
const IDR_DISCRETIONARY_MULTIPLE = 1.5; // 150% of the poverty guideline
const IDR_RATE = 0.1; // ~10% of discretionary income (illustrative)
const STANDARD_TERM_MONTHS = 120;

export function povertyGuideline(householdSize: number): number {
  return POVERTY_BASE + Math.max(0, householdSize - 1) * POVERTY_PER_PERSON;
}

export interface StudentLoanInput {
  balance: number;
  annualRate: number;
  annualIncome: number;
  householdSize: number;
}
export interface StudentLoanResult {
  standard: { monthly: number; totalCost: number; termMonths: number };
  incomeDriven: {
    monthly: number;
    discretionaryIncome: number;
    note: string;
  };
}

export function compareStudentLoan(input: StudentLoanInput): StudentLoanResult {
  const standardMonthly = monthlyPayment(input.balance, input.annualRate, STANDARD_TERM_MONTHS);
  const discretionary = Math.max(
    0,
    input.annualIncome - IDR_DISCRETIONARY_MULTIPLE * povertyGuideline(input.householdSize),
  );
  const idrMonthly = round2((discretionary * IDR_RATE) / 12);
  return {
    standard: {
      monthly: standardMonthly,
      totalCost: round2(standardMonthly * STANDARD_TERM_MONTHS),
      termMonths: STANDARD_TERM_MONTHS,
    },
    incomeDriven: {
      monthly: idrMonthly,
      discretionaryIncome: round2(discretionary),
      note:
        "Illustrative ~10%-of-discretionary-income estimate. Actual IDR plans, caps, and any forgiveness vary and are changing — confirm with your loan servicer.",
    },
  };
}

// --- 529 helpers ---
export function superfundMax(): number {
  return ANNUAL_GIFT_EXCLUSION * SUPERFUND_YEARS;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
