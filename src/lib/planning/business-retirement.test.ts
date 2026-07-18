import { describe, expect, it } from "vitest";
import { compareBusinessPlans } from "./business-retirement";

const plan = (r: ReturnType<typeof compareBusinessPlans>, p: string) =>
  r.plans.find((x) => x.plan === p)!;

describe("business retirement plan comparison (2026 limits)", () => {
  it("computes SEP / SIMPLE / Solo 401(k) maxes at income 100k, age 40", () => {
    const r = compareBusinessPlans({ netSelfEmploymentIncome: 100000, age: 40 });
    // SEP: 20% of 100k = 20,000
    expect(plan(r, "SEP_IRA").maxContribution).toBe(20000);
    // SIMPLE: 17,000 employee + 3,000 match = 20,000
    expect(plan(r, "SIMPLE_IRA").maxContribution).toBe(20000);
    // Solo: employee 24,500 + employer 20,000 = 44,500 (under DC cap)
    expect(plan(r, "SOLO_401K").maxContribution).toBe(44500);
  });

  it("adds catch-up for age 55", () => {
    const r = compareBusinessPlans({ netSelfEmploymentIncome: 100000, age: 55 });
    // Solo employee 24,500 + 8,000 catch-up + employer 20,000 = 52,500
    expect(plan(r, "SOLO_401K").maxContribution).toBe(52500);
    // SIMPLE employee 17,000 + 4,000 catch-up + 3,000 match = 24,000
    expect(plan(r, "SIMPLE_IRA").maxContribution).toBe(24000);
  });

  it("caps the Solo 401(k) at the annual-additions limit for high income", () => {
    const r = compareBusinessPlans({ netSelfEmploymentIncome: 1000000, age: 40 });
    // employer capped at 72,000; total capped at 72,000 (no catch-up)
    expect(plan(r, "SOLO_401K").maxContribution).toBe(72000);
    expect(plan(r, "SEP_IRA").maxContribution).toBe(72000);
  });

  it("reports the tax year and a verify note", () => {
    const r = compareBusinessPlans({ netSelfEmploymentIncome: 50000, age: 30 });
    expect(r.taxYear).toBe(2026);
    expect(r.verifyNote).toMatch(/verify/i);
  });
});
