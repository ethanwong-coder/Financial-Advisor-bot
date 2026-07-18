import { describe, expect, it } from "vitest";
import { screenNiitAmt } from "./niit-amt";

describe("NIIT (3.8%)", () => {
  it("does not apply below the threshold", () => {
    const r = screenNiitAmt({
      filingStatus: "SINGLE",
      modifiedAgi: 180000,
      netInvestmentIncome: 30000,
    });
    expect(r.niit.applies).toBe(false);
    expect(r.niit.amount).toBe(0);
  });

  it("taxes the lesser of NII and excess MAGI (NII smaller)", () => {
    // Single threshold 200k. MAGI 260k -> excess 60k. NII 20k -> base 20k.
    const r = screenNiitAmt({
      filingStatus: "SINGLE",
      modifiedAgi: 260000,
      netInvestmentIncome: 20000,
    });
    expect(r.niit.taxableBase).toBe(20000);
    expect(r.niit.amount).toBeCloseTo(760, 2); // 3.8% of 20k
    expect(r.niit.applies).toBe(true);
  });

  it("taxes the lesser of NII and excess MAGI (excess smaller)", () => {
    // MFJ threshold 250k. MAGI 260k -> excess 10k. NII 50k -> base 10k.
    const r = screenNiitAmt({
      filingStatus: "MARRIED_FILING_JOINTLY",
      modifiedAgi: 260000,
      netInvestmentIncome: 50000,
    });
    expect(r.niit.threshold).toBe(250000);
    expect(r.niit.taxableBase).toBe(10000);
    expect(r.niit.amount).toBeCloseTo(380, 2);
  });
});

describe("AMT rough exposure flag", () => {
  it("NONE when income is below the exemption", () => {
    const r = screenNiitAmt({
      filingStatus: "SINGLE",
      modifiedAgi: 70000,
      netInvestmentIncome: 0,
    });
    expect(r.amt.exposure).toBe("NONE");
  });

  it("POSSIBLE in the mid band (above exemption, below phaseout)", () => {
    const r = screenNiitAmt({
      filingStatus: "SINGLE",
      modifiedAgi: 300000,
      netInvestmentIncome: 0,
    });
    expect(r.amt.exposure).toBe("POSSIBLE");
    expect(r.amt.exemptionReduced).toBe(false);
  });

  it("ELEVATED once the exemption starts phasing out", () => {
    const r = screenNiitAmt({
      filingStatus: "SINGLE",
      modifiedAgi: 700000, // above the 626,350 phaseout start
      netInvestmentIncome: 0,
    });
    expect(r.amt.exposure).toBe("ELEVATED");
    expect(r.amt.exemptionReduced).toBe(true);
    expect(r.amt.exemption).toBeLessThan(88100);
  });
});
