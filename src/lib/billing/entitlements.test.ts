import { describe, expect, it } from "vitest";
import { tierFromSubscription } from "./entitlements";
import { hasFeature, meetsTier } from "./tiers";

const now = new Date("2026-07-18T00:00:00Z");
const future = new Date("2027-01-01T00:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");

describe("tierFromSubscription", () => {
  it("no subscription => FREE", () => {
    expect(tierFromSubscription(null, now)).toBe("FREE");
  });
  it("active, unexpired PLUS => PLUS", () => {
    expect(tierFromSubscription({ tier: "PLUS", status: "ACTIVE", currentPeriodEnd: future }, now)).toBe("PLUS");
  });
  it("active, unexpired PRO => PRO", () => {
    expect(tierFromSubscription({ tier: "PRO", status: "ACTIVE", currentPeriodEnd: future }, now)).toBe("PRO");
  });
  it("trialing counts as its tier", () => {
    expect(tierFromSubscription({ tier: "PRO", status: "TRIALING", currentPeriodEnd: future }, now)).toBe("PRO");
  });
  it("expired period => FREE even if tier is paid", () => {
    expect(tierFromSubscription({ tier: "PRO", status: "ACTIVE", currentPeriodEnd: past }, now)).toBe("FREE");
  });
  it("canceled => FREE", () => {
    expect(tierFromSubscription({ tier: "PLUS", status: "CANCELED", currentPeriodEnd: future }, now)).toBe("FREE");
  });
  it("past_due => FREE", () => {
    expect(tierFromSubscription({ tier: "PLUS", status: "PAST_DUE", currentPeriodEnd: future }, now)).toBe("FREE");
  });
  it("null currentPeriodEnd is treated as not-expired", () => {
    expect(tierFromSubscription({ tier: "PLUS", status: "ACTIVE", currentPeriodEnd: null }, now)).toBe("PLUS");
  });
});

describe("feature gating map", () => {
  it("FREE gets only the basic calculators", () => {
    expect(hasFeature("FREE", "calc_retirement")).toBe(true);
    expect(hasFeature("FREE", "calc_budget")).toBe(true);
    expect(hasFeature("FREE", "calc_emergency")).toBe(true);
    expect(hasFeature("FREE", "chat")).toBe(false);
    expect(hasFeature("FREE", "calc_social_security")).toBe(false);
    expect(hasFeature("FREE", "goals")).toBe(false);
  });
  it("PLUS unlocks Phase 1+2 but not Pro tools", () => {
    expect(hasFeature("PLUS", "chat")).toBe(true);
    expect(hasFeature("PLUS", "calc_qcd")).toBe(true);
    expect(hasFeature("PLUS", "estate_documents")).toBe(true);
    expect(hasFeature("PLUS", "unlimited_accounts")).toBe(true);
    expect(hasFeature("PLUS", "calc_equity_comp")).toBe(false);
    expect(hasFeature("PLUS", "goals")).toBe(false);
    expect(hasFeature("PLUS", "multi_user")).toBe(false);
  });
  it("PRO unlocks everything", () => {
    expect(hasFeature("PRO", "calc_equity_comp")).toBe(true);
    expect(hasFeature("PRO", "checklists")).toBe(true);
    expect(hasFeature("PRO", "goals")).toBe(true);
    expect(hasFeature("PRO", "pdf_export")).toBe(true);
    expect(hasFeature("PRO", "multi_user")).toBe(true);
  });
  it("meetsTier respects rank ordering", () => {
    expect(meetsTier("PRO", "PLUS")).toBe(true);
    expect(meetsTier("FREE", "PLUS")).toBe(false);
    expect(meetsTier("PLUS", "PLUS")).toBe(true);
  });
});
