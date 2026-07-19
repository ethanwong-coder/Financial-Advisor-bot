/**
 * Insurance needs-analysis calculators (life, disability, long-term care).
 *
 * Each returns an estimated COVERAGE GAP only. Pure/deterministic. These never
 * recommend or price a specific policy — that requires a licensed agent.
 */
import { CareType, LTC_ANNUAL_COST } from "./ltc-costs";

// --- Life insurance (needs-based / "DIME"-style) ---
export interface LifeNeedInput {
  annualIncome: number;
  incomeReplacementYears: number;
  outstandingDebts: number;
  finalExpenses: number;
  educationGoals: number;
  existingCoverage: number;
  liquidAssets: number;
}
export interface LifeNeedResult {
  totalNeed: number;
  existingResources: number;
  gap: number; // additional coverage suggested (0 if already covered)
  surplus: number; // amount over-covered (0 if a gap exists)
}

export function lifeInsuranceNeed(input: LifeNeedInput): LifeNeedResult {
  const totalNeed =
    input.annualIncome * input.incomeReplacementYears +
    input.outstandingDebts +
    input.finalExpenses +
    input.educationGoals;
  const existingResources = input.existingCoverage + input.liquidAssets;
  const raw = totalNeed - existingResources;
  return {
    totalNeed: round2(totalNeed),
    existingResources: round2(existingResources),
    gap: round2(Math.max(0, raw)),
    surplus: round2(Math.max(0, -raw)),
  };
}

// --- Disability (income replacement) ---
export interface DisabilityNeedInput {
  annualIncome: number;
  /** Fraction of income to replace, e.g. 0.6 for 60%. */
  replacementPct: number;
  /** Existing disability benefit already in force, monthly. */
  existingMonthlyBenefit: number;
}
export interface DisabilityNeedResult {
  targetMonthlyBenefit: number;
  existingMonthlyBenefit: number;
  monthlyGap: number;
}

export function disabilityNeed(input: DisabilityNeedInput): DisabilityNeedResult {
  const targetMonthlyBenefit = (input.annualIncome / 12) * input.replacementPct;
  return {
    targetMonthlyBenefit: round2(targetMonthlyBenefit),
    existingMonthlyBenefit: round2(input.existingMonthlyBenefit),
    monthlyGap: round2(Math.max(0, targetMonthlyBenefit - input.existingMonthlyBenefit)),
  };
}

// --- Long-term care (cost-of-care gap) ---
export interface LtcNeedInput {
  careType: CareType;
  yearsOfCare: number;
  earmarkedSavings: number;
  /** Optional override of the national-average annual cost. */
  annualCostOverride?: number;
}
export interface LtcNeedResult {
  annualCost: number;
  estimatedTotalCost: number;
  earmarkedSavings: number;
  gap: number;
}

export function ltcNeed(input: LtcNeedInput): LtcNeedResult {
  const annualCost = input.annualCostOverride ?? LTC_ANNUAL_COST[input.careType];
  const estimatedTotalCost = annualCost * input.yearsOfCare;
  return {
    annualCost: round2(annualCost),
    estimatedTotalCost: round2(estimatedTotalCost),
    earmarkedSavings: round2(input.earmarkedSavings),
    gap: round2(Math.max(0, estimatedTotalCost - input.earmarkedSavings)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
