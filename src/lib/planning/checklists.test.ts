import { describe, expect, it } from "vitest";
import { CHECKLISTS, checklistByKey, completionFraction } from "./checklists";

describe("life-transition checklists", () => {
  it("defines the five transitions, each with items + explanations", () => {
    const keys = CHECKLISTS.map((c) => c.key);
    expect(keys).toEqual(["marriage", "divorce", "job_change", "inheritance", "relocation"]);
    for (const c of CHECKLISTS) {
      expect(c.items.length).toBeGreaterThan(0);
      for (const item of c.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.why.length).toBeGreaterThan(0);
      }
    }
  });

  it("looks up by key", () => {
    expect(checklistByKey("divorce")?.title).toBe("Divorce");
    expect(checklistByKey("nope")).toBeUndefined();
  });

  it("computes completion fraction", () => {
    const marriage = checklistByKey("marriage")!;
    expect(completionFraction(marriage, new Set())).toBe(0);
    expect(completionFraction(marriage, new Set(["beneficiaries", "insurance"]))).toBeCloseTo(
      2 / marriage.items.length,
      5,
    );
  });
});
