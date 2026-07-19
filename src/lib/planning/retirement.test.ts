import { describe, expect, it } from "vitest";
import { projectRetirement } from "./retirement";

describe("retirement projection — accumulation", () => {
  it("with 0% return, FV = balance + contributions (no compounding)", () => {
    const r = projectRetirement({
      currentAge: 55,
      retirementAge: 65,
      currentBalance: 100000,
      monthlyContribution: 1000,
      expectedAnnualReturn: 0,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 0,
    });
    // 100k + 1000 * 120 months = 220k
    expect(r.projectedBalanceAtRetirement).toBe(220000);
    expect(r.yearsToRetirement).toBe(10);
  });

  it("compounds monthly contributions correctly", () => {
    // balance 0, $100/mo, 12% nominal (1%/mo), 1 year => 100 * ((1.01^12 - 1)/0.01)
    const r = projectRetirement({
      currentAge: 40,
      retirementAge: 41,
      currentBalance: 0,
      monthlyContribution: 100,
      expectedAnnualReturn: 0.12,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 0,
    });
    expect(r.projectedBalanceAtRetirement).toBeCloseTo(1268.25, 1);
  });
});

describe("retirement projection — depletion", () => {
  it("depletes in exactly N years at 0% real return", () => {
    // At retirement with $1,000,000 and no growth, spending $50k/yr net => 20 years.
    const r = projectRetirement({
      currentAge: 65,
      retirementAge: 65,
      currentBalance: 1000000,
      monthlyContribution: 0,
      expectedAnnualReturn: 0,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 50000,
    });
    expect(r.projectedBalanceAtRetirement).toBe(1000000);
    expect(r.annualWithdrawalNeeded).toBe(50000);
    expect(r.yearsBalanceLasts).toBe(20);
    expect(r.depletionAge).toBe(85);
  });

  it("never depletes when withdrawal equals the return yield", () => {
    // $1,000,000 at 5%, withdraw exactly $50k => balance holds -> lasts 60+ yrs.
    const r = projectRetirement({
      currentAge: 65,
      retirementAge: 65,
      currentBalance: 1000000,
      monthlyContribution: 0,
      expectedAnnualReturn: 0.05,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 50000,
    });
    expect(r.yearsBalanceLasts).toBeNull();
    expect(r.depletionAge).toBeNull();
  });

  it("flags when Social Security fully covers desired spending", () => {
    const r = projectRetirement({
      currentAge: 65,
      retirementAge: 65,
      currentBalance: 500000,
      monthlyContribution: 0,
      expectedAnnualReturn: 0.06,
      estimatedAnnualSocialSecurity: 60000,
      desiredAnnualSpending: 50000,
    });
    expect(r.socialSecurityCoversSpending).toBe(true);
    expect(r.annualWithdrawalNeeded).toBe(0);
    expect(r.yearsBalanceLasts).toBeNull();
  });

  it("uses the real return when inflation is supplied", () => {
    const nominal = projectRetirement({
      currentAge: 65,
      retirementAge: 65,
      currentBalance: 1000000,
      monthlyContribution: 0,
      expectedAnnualReturn: 0.06,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 60000,
    });
    const real = projectRetirement({
      currentAge: 65,
      retirementAge: 65,
      currentBalance: 1000000,
      monthlyContribution: 0,
      expectedAnnualReturn: 0.06,
      annualInflation: 0.03,
      estimatedAnnualSocialSecurity: 0,
      desiredAnnualSpending: 60000,
    });
    // Inflation-adjusted money erodes faster -> depletes sooner (or nominal lasts longer).
    expect(real.realReturnUsed).toBeCloseTo((1.06 / 1.03) - 1, 6);
    const nominalYears = nominal.yearsBalanceLasts ?? 999;
    const realYears = real.yearsBalanceLasts ?? 999;
    expect(realYears).toBeLessThanOrEqual(nominalYears);
  });
});
