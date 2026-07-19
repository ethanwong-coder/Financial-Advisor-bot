import { describe, expect, it } from "vitest";
import { computeDocumentStatus } from "./estate-documents";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const now = d("2026-07-18");

describe("estate document status", () => {
  it("MISSING when the document doesn't exist", () => {
    expect(computeDocumentStatus({ exists: false }, { now }).status).toBe("MISSING");
  });
  it("NEEDS_REVIEW when there is no review date", () => {
    expect(computeDocumentStatus({ exists: true, lastReviewed: null }, { now }).status).toBe(
      "NEEDS_REVIEW",
    );
  });
  it("NEEDS_REVIEW when older than 3 years", () => {
    expect(
      computeDocumentStatus({ exists: true, lastReviewed: d("2022-01-01") }, { now }).status,
    ).toBe("NEEDS_REVIEW");
  });
  it("NEEDS_REVIEW when reviewed before the latest life event", () => {
    const r = computeDocumentStatus(
      { exists: true, lastReviewed: d("2025-01-01") },
      { now, lastLifeEventDate: d("2025-06-01") },
    );
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.reason).toContain("life event");
  });
  it("UP_TO_DATE when recent and after the latest life event", () => {
    expect(
      computeDocumentStatus(
        { exists: true, lastReviewed: d("2026-01-01") },
        { now, lastLifeEventDate: d("2025-06-01") },
      ).status,
    ).toBe("UP_TO_DATE");
  });
});
