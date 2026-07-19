import { describe, expect, it } from "vitest";
import {
  claimingFactor,
  fraMonths,
  illustrateSocialSecurity,
} from "./social-security";

describe("Full Retirement Age by birth year", () => {
  it("is 66 for 1943–1954", () => {
    expect(fraMonths(1950)).toBe(66 * 12);
    expect(fraMonths(1954)).toBe(66 * 12);
  });
  it("adds 2 months per year for 1955–1959", () => {
    expect(fraMonths(1955)).toBe(66 * 12 + 2); // 66y 2m
    expect(fraMonths(1959)).toBe(66 * 12 + 10); // 66y 10m
  });
  it("is 67 for 1960+", () => {
    expect(fraMonths(1960)).toBe(67 * 12);
    expect(fraMonths(1975)).toBe(67 * 12);
  });
});

describe("claiming factors (public SSA formulas)", () => {
  it("FRA 66: claiming at 62 = 75%, at 70 = 132%", () => {
    const fra = 66 * 12;
    expect(claimingFactor(62 * 12, fra)).toBeCloseTo(0.75, 5);
    expect(claimingFactor(70 * 12, fra)).toBeCloseTo(1.32, 5);
  });
  it("FRA 67: claiming at 62 = 70%, at 70 = 124%", () => {
    const fra = 67 * 12;
    expect(claimingFactor(62 * 12, fra)).toBeCloseTo(0.7, 5);
    expect(claimingFactor(70 * 12, fra)).toBeCloseTo(1.24, 5);
  });
  it("at FRA the factor is exactly 1", () => {
    expect(claimingFactor(66 * 12, 66 * 12)).toBe(1);
  });
});

describe("illustration + breakeven", () => {
  it("scales the FRA benefit by the claiming factor", () => {
    const r = illustrateSocialSecurity({ birthYear: 1960, monthlyBenefitAtFra: 2000 });
    expect(r.fra.years).toBe(67);
    expect(r.at62.monthlyBenefit).toBeCloseTo(1400, 2); // 70% of 2000
    expect(r.atFra.monthlyBenefit).toBe(2000);
    expect(r.at70.monthlyBenefit).toBeCloseTo(2480, 2); // 124% of 2000
  });

  it("computes a plausible breakeven age between 62 and 70", () => {
    const r = illustrateSocialSecurity({ birthYear: 1954, monthlyBenefitAtFra: 2000 });
    // FRA 66: 62 -> 1500, 70 -> 2640. Breakeven ~80.5.
    expect(r.breakevens.earlyVsLate).toBeGreaterThan(78);
    expect(r.breakevens.earlyVsLate).toBeLessThan(83);
  });
});
