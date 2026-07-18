import { describe, expect, it } from "vitest";
import { goalProgress } from "./goals";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("goal progress", () => {
  it("computes progress and remaining without dates", () => {
    const r = goalProgress({ targetAmount: 20000, currentSaved: 5000, now: d("2026-07-18") });
    expect(r.progressFraction).toBe(0.25);
    expect(r.remaining).toBe(15000);
    expect(r.onPace).toBeNull();
    expect(r.requiredMonthlySavings).toBeNull();
  });

  it("computes required monthly savings from the remaining months", () => {
    const r = goalProgress({
      targetAmount: 20000,
      currentSaved: 5000,
      targetDate: d("2027-07-18"), // 12 months out
      now: d("2026-07-18"),
    });
    expect(r.monthsUntilTarget).toBe(12);
    expect(r.requiredMonthlySavings).toBe(1250); // 15000 / 12
  });

  it("flags behind pace when progress trails elapsed time", () => {
    // Halfway through the window but only 25% saved -> behind.
    const r = goalProgress({
      targetAmount: 20000,
      currentSaved: 5000,
      startDate: d("2025-07-18"),
      targetDate: d("2027-07-18"),
      now: d("2026-07-18"),
    });
    expect(r.onPace).toBe(false);
  });

  it("is on pace when progress leads elapsed time", () => {
    const r = goalProgress({
      targetAmount: 20000,
      currentSaved: 15000,
      startDate: d("2025-07-18"),
      targetDate: d("2027-07-18"),
      now: d("2026-07-18"),
    });
    expect(r.onPace).toBe(true);
  });
});
