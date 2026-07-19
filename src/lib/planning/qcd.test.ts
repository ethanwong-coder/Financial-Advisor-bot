import { describe, expect, it } from "vitest";
import { isQcdEligible, summarizeQcd } from "./qcd";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("QCD vs RMD summary", () => {
  it("partially satisfies the RMD", () => {
    const s = summarizeQcd({ rmdAmount: 20000, qcdTotal: 8000 });
    expect(s.qcdAppliedToRmd).toBe(8000);
    expect(s.rmdRemaining).toBe(12000);
    expect(s.rmdFullySatisfied).toBe(false);
  });

  it("fully satisfies the RMD (QCD >= RMD)", () => {
    const s = summarizeQcd({ rmdAmount: 20000, qcdTotal: 20000 });
    expect(s.rmdRemaining).toBe(0);
    expect(s.rmdFullySatisfied).toBe(true);
    // Applied to RMD is capped at the RMD amount.
    expect(s.qcdAppliedToRmd).toBe(20000);
  });

  it("caps applied-to-RMD at the RMD even when QCD exceeds it", () => {
    const s = summarizeQcd({ rmdAmount: 15000, qcdTotal: 25000 });
    expect(s.qcdAppliedToRmd).toBe(15000);
    expect(s.rmdRemaining).toBe(0);
  });

  it("flags exceeding the annual QCD exclusion limit", () => {
    const s = summarizeQcd({ rmdAmount: 5000, qcdTotal: 120000 });
    expect(s.exceedsAnnualLimit).toBe(true);
  });
});

describe("QCD eligibility (age 70½+)", () => {
  it("is eligible at exactly 70½", () => {
    // Born 1955-01-15 -> 70½ on 2025-07-15.
    expect(isQcdEligible(d("1955-01-15"), d("2025-07-15"))).toBe(true);
  });
  it("is not eligible just before 70½", () => {
    expect(isQcdEligible(d("1955-01-15"), d("2025-07-14"))).toBe(false);
  });
  it("returns false when the birth date is unknown", () => {
    expect(isQcdEligible(null, d("2026-01-01"))).toBe(false);
  });
});
