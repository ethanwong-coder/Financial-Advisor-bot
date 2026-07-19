/**
 * Business-owner retirement plan comparison: SEP IRA vs SIMPLE IRA vs Solo
 * 401(k). Educational, side-by-side max-contribution estimates using documented
 * current-year IRS limits. SIMPLIFIED (uses a ~20% effective employer rate for
 * self-employed and rounded rules) — NOT a recommendation on which to choose.
 */
import {
  CATCHUP_401K_50,
  CATCHUP_401K_60_63,
  DC_ANNUAL_ADDITIONS,
  ELECTIVE_DEFERRAL_401K,
  LIMITS_TAX_YEAR,
  LIMITS_VERIFY_NOTE,
  SEP_MAX,
  SIMPLE_CATCHUP_50,
  SIMPLE_DEFERRAL,
} from "./limits";

/** Effective employer contribution rate for a self-employed person (~20% of
 * net SE income, reflecting the circular half-SE-tax / plan-deduction reduction). */
const SELF_EMPLOYED_EMPLOYER_RATE = 0.2;
const SIMPLE_MATCH_RATE = 0.03;

export interface BusinessPlanInput {
  netSelfEmploymentIncome: number;
  age: number;
}

export interface PlanEstimate {
  plan: "SEP_IRA" | "SIMPLE_IRA" | "SOLO_401K";
  maxContribution: number;
  breakdown: string;
}

export interface BusinessPlanComparison {
  taxYear: number;
  verifyNote: string;
  plans: PlanEstimate[];
}

function catchup401k(age: number): number {
  if (age >= 60 && age <= 63) return CATCHUP_401K_60_63;
  if (age >= 50) return CATCHUP_401K_50;
  return 0;
}

export function compareBusinessPlans(input: BusinessPlanInput): BusinessPlanComparison {
  const income = Math.max(0, input.netSelfEmploymentIncome);
  const employerContribution = Math.min(income * SELF_EMPLOYED_EMPLOYER_RATE, DC_ANNUAL_ADDITIONS);

  // SEP IRA — employer-only, ~20% of net SE income, capped.
  const sep = Math.min(employerContribution, SEP_MAX);

  // SIMPLE IRA — employee deferral + 3% match.
  const simpleCatch = input.age >= 50 ? SIMPLE_CATCHUP_50 : 0;
  const simpleEmployee = Math.min(SIMPLE_DEFERRAL + simpleCatch, income);
  const simpleMatch = Math.min(income * SIMPLE_MATCH_RATE, income);
  const simpleTotal = simpleEmployee + simpleMatch;

  // Solo 401(k) — employee deferral (+catch-up) + employer, capped at the DC limit (+catch-up).
  const catch401k = catchup401k(input.age);
  const soloEmployee = Math.min(ELECTIVE_DEFERRAL_401K + catch401k, income);
  const soloTotal = Math.min(soloEmployee + employerContribution, DC_ANNUAL_ADDITIONS + catch401k);

  return {
    taxYear: LIMITS_TAX_YEAR,
    verifyNote: LIMITS_VERIFY_NOTE,
    plans: [
      {
        plan: "SEP_IRA",
        maxContribution: round2(sep),
        breakdown: `~${SELF_EMPLOYED_EMPLOYER_RATE * 100}% of net self-employment income, up to $${SEP_MAX.toLocaleString()}. Employer contributions only.`,
      },
      {
        plan: "SIMPLE_IRA",
        maxContribution: round2(simpleTotal),
        breakdown: `Employee deferral $${round2(simpleEmployee).toLocaleString()} + ~3% match $${round2(simpleMatch).toLocaleString()}. Lower limits, easy to run.`,
      },
      {
        plan: "SOLO_401K",
        maxContribution: round2(soloTotal),
        breakdown: `Employee $${round2(soloEmployee).toLocaleString()} + employer $${round2(Math.min(employerContribution, soloTotal - soloEmployee)).toLocaleString()}, up to the $${DC_ANNUAL_ADDITIONS.toLocaleString()} annual-additions limit${catch401k ? ` (+$${catch401k.toLocaleString()} catch-up)` : ""}. Highest potential.`,
      },
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
