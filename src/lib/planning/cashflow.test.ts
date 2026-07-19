import { describe, expect, it } from "vitest";
import { emergencyFund, summarizeBudget } from "./cashflow";
import { compareRefinance, monthlyPayment } from "./mortgage";

describe("budget summary", () => {
  it("sums expenses and computes net + savings rate", () => {
    const r = summarizeBudget(8000, [
      { category: "Housing", amount: 3000 },
      { category: "Food", amount: 2000 },
    ]);
    expect(r.totalExpenses).toBe(5000);
    expect(r.net).toBe(3000);
    expect(r.savingsRate).toBe(0.375);
  });
});

describe("emergency fund", () => {
  it("computes target, gap, and months covered", () => {
    const r = emergencyFund({
      monthlyEssentialExpenses: 4000,
      monthsOfCoverage: 6,
      currentSavings: 10000,
    });
    expect(r.target).toBe(24000);
    expect(r.gap).toBe(14000);
    expect(r.monthsCovered).toBe(2.5);
    expect(r.fullyFunded).toBe(false);
  });
});

describe("mortgage / refi", () => {
  it("computes the standard amortized payment", () => {
    expect(monthlyPayment(200000, 0.06, 360)).toBeCloseTo(1199.1, 1);
  });
  it("computes payment with 0% rate as straight-line", () => {
    expect(monthlyPayment(120000, 0, 360)).toBeCloseTo(333.33, 2);
  });
  it("finds the refi breakeven from monthly savings", () => {
    const r = compareRefinance({
      currentBalance: 300000,
      currentAnnualRate: 0.07,
      currentRemainingMonths: 360,
      newAnnualRate: 0.05,
      newTermMonths: 360,
      closingCosts: 6000,
    });
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakevenMonths).toBe(Math.ceil(6000 / r.monthlySavings));
  });
  it("returns null breakeven when the refi doesn't lower the payment", () => {
    const r = compareRefinance({
      currentBalance: 300000,
      currentAnnualRate: 0.04,
      currentRemainingMonths: 360,
      newAnnualRate: 0.06,
      newTermMonths: 360,
      closingCosts: 6000,
    });
    expect(r.breakevenMonths).toBeNull();
  });
});
