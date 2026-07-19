import { describe, expect, it } from "vitest";
import { computeQuarterlyTax, quarterlyDueDates } from "./quarterly-tax";

describe("quarterly safe-harbor tax", () => {
  it("uses 100% of prior-year tax when AGI <= $150k", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 20000,
      priorYearAgi: 120000,
      filingStatus: "SINGLE",
      taxYear: 2026,
    });
    expect(r.priorYearMultiplier).toBe(1.0);
    expect(r.requiredAnnualPayment).toBe(20000);
    expect(r.perQuarter).toBe(5000);
    expect(r.basis).toBe("100% of prior-year tax");
  });

  it("uses 110% of prior-year tax when AGI > $150k", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 20000,
      priorYearAgi: 200000,
      filingStatus: "SINGLE",
      taxYear: 2026,
    });
    expect(r.priorYearMultiplier).toBe(1.1);
    expect(r.requiredAnnualPayment).toBe(22000);
    expect(r.perQuarter).toBe(5500);
    expect(r.basis).toBe("110% of prior-year tax");
  });

  it("MFS uses the $75k high-income threshold", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 10000,
      priorYearAgi: 90000,
      filingStatus: "MARRIED_FILING_SEPARATELY",
      taxYear: 2026,
    });
    expect(r.priorYearMultiplier).toBe(1.1);
  });

  it("prefers 90% of the current-year estimate when it is lower", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 30000,
      priorYearAgi: 200000, // -> 110% => 33,000 prior-year safe harbor
      currentYearEstimatedTax: 20000, // 90% => 18,000 (lower)
      filingStatus: "SINGLE",
      taxYear: 2026,
    });
    expect(r.basis).toBe("90% of current-year estimate");
    expect(r.requiredAnnualPayment).toBe(18000);
    expect(r.perQuarter).toBe(4500);
  });

  it("keeps the prior-year safe harbor when the current-year test is higher", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 10000,
      priorYearAgi: 100000, // 100% => 10,000
      currentYearEstimatedTax: 50000, // 90% => 45,000 (higher, so not used)
      filingStatus: "SINGLE",
      taxYear: 2026,
    });
    expect(r.requiredAnnualPayment).toBe(10000);
    expect(r.basis).toBe("100% of prior-year tax");
  });

  it("flags when prior-year AGI was not provided", () => {
    const r = computeQuarterlyTax({
      priorYearTaxLiability: 10000,
      filingStatus: "SINGLE",
    });
    expect(r.agiAssumed).toBe(true);
    expect(r.priorYearMultiplier).toBe(1.0);
  });

  it("produces the four standard due dates spanning into January", () => {
    expect(quarterlyDueDates(2026)).toEqual([
      "2026-04-15",
      "2026-06-15",
      "2026-09-15",
      "2027-01-15",
    ]);
  });
});
