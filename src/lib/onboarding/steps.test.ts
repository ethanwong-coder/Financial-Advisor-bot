import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, ONBOARDING_VERSION } from "./steps";

const VALID_TIERS = new Set(["PLUS", "PRO"]);

describe("onboarding steps config", () => {
  it("has at least one step", () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThan(0);
  });

  it("has unique, non-empty ids", () => {
    const ids = ONBOARDING_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.trim().length).toBeGreaterThan(0);
  });

  it("every step has an icon, title, and summary", () => {
    for (const s of ONBOARDING_STEPS) {
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only valid tier values, with well-formed items", () => {
    for (const s of ONBOARDING_STEPS) {
      if (s.tier) expect(VALID_TIERS.has(s.tier)).toBe(true);
      for (const item of s.items ?? []) {
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(item.how.trim().length).toBeGreaterThan(0);
        if (item.tier) expect(VALID_TIERS.has(item.tier)).toBe(true);
      }
    }
  });

  it("exposes a positive integer version", () => {
    expect(Number.isInteger(ONBOARDING_VERSION)).toBe(true);
    expect(ONBOARDING_VERSION).toBeGreaterThan(0);
  });
});
