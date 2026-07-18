import { describe, expect, it } from "vitest";
import { esppPurchase, isoExercise, nsoExercise, rsuVesting } from "./equity-comp";

describe("NSO / ISO exercise", () => {
  it("NSO bargain element is ordinary income", () => {
    const r = nsoExercise({ strikePrice: 10, fairMarketValue: 30, shares: 1000 });
    expect(r.bargainElement).toBe(20000);
    expect(r.ordinaryIncome).toBe(20000);
  });
  it("ISO has no ordinary income at exercise, bargain is an AMT preference", () => {
    const r = isoExercise({ strikePrice: 10, fairMarketValue: 30, shares: 1000 });
    expect(r.ordinaryIncomeAtExercise).toBe(0);
    expect(r.amtPreferenceItem).toBe(20000);
    expect(r.amtExposure).toBeNull(); // no filing info supplied
  });
  it("ISO reuses the Phase 1 AMT screen when income info is supplied", () => {
    const r = isoExercise({
      strikePrice: 10,
      fairMarketValue: 30,
      shares: 1000,
      filingStatus: "SINGLE",
      otherModifiedAgi: 300000, // + 20k preference = 320k -> above exemption, below phaseout
    });
    expect(r.amtExposure).toBe("POSSIBLE");
  });
  it("underwater options produce no income", () => {
    expect(nsoExercise({ strikePrice: 30, fairMarketValue: 10, shares: 100 }).ordinaryIncome).toBe(0);
  });
});

describe("RSU / ESPP", () => {
  it("RSU ordinary income at vest = shares * FMV", () => {
    expect(rsuVesting({ sharesVesting: 200, fairMarketValueAtVest: 50 }).ordinaryIncome).toBe(10000);
  });
  it("ESPP disqualifying ordinary income = bargain element", () => {
    const r = esppPurchase({ purchasePrice: 8.5, fairMarketValueAtPurchase: 10, shares: 500 });
    expect(r.bargainElement).toBe(750);
    expect(r.disqualifyingOrdinaryIncome).toBe(750);
  });
});
