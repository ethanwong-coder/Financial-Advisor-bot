import { describe, expect, it } from "vitest";
import { compareStudentLoan, estimateAid, povertyGuideline, superfundMax } from "./education";

describe("simplified aid estimate", () => {
  it("computes income + asset contributions and divides by students", () => {
    const r = estimateAid({
      parentIncome: 130000,
      parentAssets: 60000,
      householdSize: 4,
      numberInCollege: 2,
    });
    // allowance = 30000 + 4*5000 = 50000; income contrib = (130000-50000)*0.28 = 22400
    // asset contrib = (60000-10000)*0.0564 = 2820; total = 25220; per student = 12610
    expect(r.contributionFromIncome).toBe(22400);
    expect(r.contributionFromAssets).toBe(2820);
    expect(r.estimatedSai).toBe(25220);
    expect(r.perStudent).toBe(12610);
  });
  it("floors contributions at zero for low income/assets", () => {
    const r = estimateAid({ parentIncome: 20000, parentAssets: 5000, householdSize: 3, numberInCollege: 1 });
    expect(r.estimatedSai).toBe(0);
  });
});

describe("student loan comparison", () => {
  it("standard is a 10-year amortization", () => {
    const r = compareStudentLoan({ balance: 30000, annualRate: 0.06, annualIncome: 60000, householdSize: 1 });
    expect(r.standard.termMonths).toBe(120);
    expect(r.standard.monthly).toBeCloseTo(333.06, 1);
  });
  it("IDR is ~10% of discretionary income", () => {
    // household 1 -> poverty 15060; 150% = 22590; discretionary = 60000-22590 = 37410
    // idr monthly = 37410 * 0.10 / 12 = 311.75
    const r = compareStudentLoan({ balance: 30000, annualRate: 0.06, annualIncome: 60000, householdSize: 1 });
    expect(r.incomeDriven.discretionaryIncome).toBe(37410);
    expect(r.incomeDriven.monthly).toBeCloseTo(311.75, 1);
  });
  it("poverty guideline grows with household size", () => {
    expect(povertyGuideline(1)).toBe(15060);
    expect(povertyGuideline(3)).toBe(15060 + 2 * 5380);
  });
});

describe("529 helpers", () => {
  it("superfunding is 5x the annual gift exclusion", () => {
    expect(superfundMax()).toBe(19000 * 5);
  });
});
