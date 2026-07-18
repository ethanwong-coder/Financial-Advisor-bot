import { describe, expect, it } from "vitest";
import { disabilityNeed, lifeInsuranceNeed, ltcNeed } from "./insurance";

describe("life insurance need", () => {
  it("computes the gap = total need − existing resources", () => {
    const r = lifeInsuranceNeed({
      annualIncome: 100000,
      incomeReplacementYears: 10,
      outstandingDebts: 250000,
      finalExpenses: 20000,
      educationGoals: 200000,
      existingCoverage: 500000,
      liquidAssets: 100000,
    });
    // need = 1,000,000 + 250,000 + 20,000 + 200,000 = 1,470,000
    // resources = 600,000 -> gap = 870,000
    expect(r.totalNeed).toBe(1470000);
    expect(r.gap).toBe(870000);
    expect(r.surplus).toBe(0);
  });
  it("reports a surplus when over-covered", () => {
    const r = lifeInsuranceNeed({
      annualIncome: 50000,
      incomeReplacementYears: 5,
      outstandingDebts: 0,
      finalExpenses: 10000,
      educationGoals: 0,
      existingCoverage: 500000,
      liquidAssets: 0,
    });
    expect(r.gap).toBe(0);
    expect(r.surplus).toBe(240000);
  });
});

describe("disability need", () => {
  it("targets a % of income and nets out existing coverage", () => {
    const r = disabilityNeed({
      annualIncome: 120000,
      replacementPct: 0.6,
      existingMonthlyBenefit: 2000,
    });
    expect(r.targetMonthlyBenefit).toBe(6000); // 120k/12 * 0.6
    expect(r.monthlyGap).toBe(4000);
  });
});

describe("LTC need", () => {
  it("uses the national-average table by care type", () => {
    const r = ltcNeed({ careType: "ASSISTED_LIVING", yearsOfCare: 3, earmarkedSavings: 100000 });
    expect(r.annualCost).toBe(64000);
    expect(r.estimatedTotalCost).toBe(192000);
    expect(r.gap).toBe(92000);
  });
  it("honors an override annual cost", () => {
    const r = ltcNeed({
      careType: "HOME_CARE",
      yearsOfCare: 2,
      earmarkedSavings: 50000,
      annualCostOverride: 90000,
    });
    expect(r.estimatedTotalCost).toBe(180000);
    expect(r.gap).toBe(130000);
  });
});
