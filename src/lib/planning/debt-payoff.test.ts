import { describe, expect, it } from "vitest";
import { comparePayoff } from "./debt-payoff";

describe("debt payoff", () => {
  it("with 0% interest, pays off on schedule (both methods identical)", () => {
    const c = comparePayoff(
      [
        { name: "A", balance: 1000, rate: 0, minPayment: 100 },
        { name: "B", balance: 1000, rate: 0, minPayment: 100 },
      ],
      0,
    );
    expect(c.avalanche.months).toBe(10);
    expect(c.avalanche.totalInterest).toBe(0);
    expect(c.snowball.months).toBe(10);
  });

  it("avalanche costs less interest than snowball when they target different debts", () => {
    // Avalanche attacks the high-rate big debt; snowball attacks the small debt.
    const c = comparePayoff(
      [
        { name: "BigHighRate", balance: 8000, rate: 0.24, minPayment: 160 },
        { name: "SmallLowRate", balance: 800, rate: 0.05, minPayment: 25 },
      ],
      300,
    );
    expect(c.avalanche.amortizes).toBe(true);
    expect(c.snowball.amortizes).toBe(true);
    expect(c.avalanche.totalInterest).toBeLessThan(c.snowball.totalInterest);
    expect(c.interestSavedByAvalanche).toBeGreaterThan(0);
  });

  it("extra payments shorten the timeline", () => {
    const debts = [{ name: "Card", balance: 5000, rate: 0.2, minPayment: 100 }];
    const noExtra = comparePayoff(debts, 0).avalanche;
    const withExtra = comparePayoff(debts, 200).avalanche;
    expect(withExtra.months).toBeLessThan(noExtra.months);
    expect(withExtra.totalInterest).toBeLessThan(noExtra.totalInterest);
  });
});
