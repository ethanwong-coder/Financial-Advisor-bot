import { describe, expect, it } from "vitest";
import { evaluateInheritedIra, InheritedIraInput } from "./inherited-ira";
import {
  diedOnOrAfterRbd,
  requiredBeginningDate,
  rmdAge,
} from "./rmd";
import { reducedFactor, singleLifeFactor } from "./single-life-table";
import { RuleFinding } from "./types";

/** ISO date-only -> UTC Date. */
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const codes = (fs: RuleFinding[]) => fs.map((f) => f.code);
const byCode = (fs: RuleFinding[], code: string) =>
  fs.find((f) => f.code === code);

const base: Omit<InheritedIraInput, "beneficiaryClass"> = {
  accountRef: "acct-1",
  ownerDateOfDeath: d("2020-05-01"),
};

describe("RMD age (SECURE 2.0)", () => {
  it("uses 72 for birth years 1950 and earlier", () => {
    expect(rmdAge(1949)).toBe(72);
    expect(rmdAge(1950)).toBe(72);
  });
  it("uses 73 for birth years 1951–1959", () => {
    expect(rmdAge(1951)).toBe(73);
    expect(rmdAge(1955)).toBe(73);
    expect(rmdAge(1959)).toBe(73);
  });
  it("uses 75 for birth years 1960 and later", () => {
    expect(rmdAge(1960)).toBe(75);
    expect(rmdAge(1965)).toBe(75);
  });
});

describe("Required Beginning Date", () => {
  it("is April 1 of the year after the owner reaches RMD age", () => {
    // Born 1955 -> RMD age 73 -> turns 73 in 2028 -> RBD 2029-04-01.
    const rbd = requiredBeginningDate(d("1955-06-15"));
    expect(rbd.getUTCFullYear()).toBe(2029);
    expect(rbd.getUTCMonth()).toBe(3); // April (0-indexed)
    expect(rbd.getUTCDate()).toBe(1);
  });

  it("detects death on or after the RBD", () => {
    // Born 1950 -> age 72 in 2022 -> RBD 2023-04-01.
    expect(diedOnOrAfterRbd(d("1950-01-01"), d("2024-01-01"))).toBe(true);
    expect(diedOnOrAfterRbd(d("1950-01-01"), d("2022-06-01"))).toBe(false);
  });
});

describe("Inherited IRA 10-year rule — deadline", () => {
  it("IRS example: owner dies 2020, adult child (non-eligible) -> distribute by 12/31/2030", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NON_ELIGIBLE" },
      d("2026-03-01"),
    );
    const deadline = byCode(findings, "TEN_YEAR_DEADLINE");
    expect(deadline).toBeDefined();
    expect(deadline!.data!.deadlineYear).toBe(2030);
    expect(deadline!.data!.yearsRemaining).toBe(4);
    expect(deadline!.detail).toContain("December 31, 2030");
  });

  it("flags CRITICAL when the 10-year deadline has passed", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NON_ELIGIBLE" },
      d("2031-06-01"),
    );
    const passed = byCode(findings, "DEADLINE_PASSED");
    expect(passed).toBeDefined();
    expect(passed!.severity).toBe("CRITICAL");
    expect(codes(findings)).not.toContain("TEN_YEAR_DEADLINE");
  });

  it("raises severity to HIGH within 2 years of the deadline", () => {
    // death 2020 -> deadline 2030; evaluate in 2029 (1 year left).
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NON_ELIGIBLE" },
      d("2029-01-01"),
    );
    const deadline = byCode(findings, "TEN_YEAR_DEADLINE");
    expect(deadline!.severity).toBe("HIGH");
    expect(deadline!.data!.yearsRemaining).toBe(1);
  });
});

describe("Inherited IRA — eligible designated beneficiaries are exempt", () => {
  it("surviving spouse: 10-year rule does not apply", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "SPOUSE" },
      d("2026-01-01"),
    );
    expect(codes(findings)).toEqual(["EDB_EXEMPT"]);
    expect(codes(findings)).not.toContain("TEN_YEAR_DEADLINE");
  });

  it("beneficiary not more than 10 years younger: exempt", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NOT_MORE_THAN_10_YEARS_YOUNGER" },
      d("2026-01-01"),
    );
    expect(byCode(findings, "EDB_EXEMPT")).toBeDefined();
  });

  it("minor child of the owner: notes the clock starts at majority", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "MINOR_CHILD_OF_OWNER" },
      d("2026-01-01"),
    );
    expect(byCode(findings, "EDB_EXEMPT")!.detail).toContain("age of majority");
  });

  it("sanity-checks the 'not more than 10 years younger' age gap", () => {
    const findings = evaluateInheritedIra(
      {
        ...base,
        beneficiaryClass: "NOT_MORE_THAN_10_YEARS_YOUNGER",
        ownerDateOfBirth: d("1950-01-01"),
        beneficiaryDateOfBirth: d("1975-01-01"), // 25 years younger — inconsistent
      },
      d("2026-01-01"),
    );
    const edb = byCode(findings, "EDB_EXEMPT")!;
    expect(edb.severity).toBe("LOW");
    expect(edb.detail).toContain("more than 10 years");
  });
});

describe("Inherited IRA — annual RMDs inside the window", () => {
  // Owner born 1945, died 2023 at ~78 => died well after RBD => annual RMDs required.
  const ownerDiedAfterRbd = {
    accountRef: "acct-2",
    ownerDateOfDeath: d("2023-06-01"),
    ownerDateOfBirth: d("1945-03-01"),
    beneficiaryClass: "NON_ELIGIBLE" as const,
  };

  it("owner died after RBD + missed current-year distribution -> HIGH 'behind' flag", () => {
    const findings = evaluateInheritedIra(
      { ...ownerDiedAfterRbd, currentYearDistribution: 0 },
      d("2026-04-01"),
    );
    const behind = byCode(findings, "BEHIND_ON_ANNUAL_RMD");
    expect(behind).toBeDefined();
    expect(behind!.severity).toBe("HIGH");
    expect(behind!.title).toContain("2026");
  });

  it("owner died after RBD + a distribution was taken -> on track, not behind", () => {
    const findings = evaluateInheritedIra(
      { ...ownerDiedAfterRbd, currentYearDistribution: 5000 },
      d("2026-04-01"),
    );
    expect(codes(findings)).not.toContain("BEHIND_ON_ANNUAL_RMD");
    expect(byCode(findings, "ANNUAL_RMD_REQUIRED")).toBeDefined();
  });

  it("owner died BEFORE RBD -> no annual RMDs, only the year-10 deadline", () => {
    const findings = evaluateInheritedIra(
      {
        accountRef: "acct-3",
        ownerDateOfDeath: d("2023-06-01"),
        ownerDateOfBirth: d("1965-03-01"), // RMD age 75, RBD ~2041 -> died before
        beneficiaryClass: "NON_ELIGIBLE",
        currentYearDistribution: 0,
      },
      d("2026-04-01"),
    );
    expect(codes(findings)).not.toContain("BEHIND_ON_ANNUAL_RMD");
    expect(byCode(findings, "NO_ANNUAL_RMD_REQUIRED")).toBeDefined();
  });

  it("does not flag a missed annual RMD for the IRS-waived years (2021–2024)", () => {
    const findings = evaluateInheritedIra(
      { ...ownerDiedAfterRbd, currentYearDistribution: 0 },
      d("2024-04-01"),
    );
    expect(codes(findings)).not.toContain("BEHIND_ON_ANNUAL_RMD");
    expect(byCode(findings, "ANNUAL_RMD_REQUIRED")).toBeDefined();
  });

  it("includes an informational RMD estimate using the reduce-by-one method", () => {
    // death 2023 -> first distribution year 2024. Beneficiary born 1969 -> age 55
    // in 2024 -> Single Life factor 31.6. Evaluate in 2026 -> reduce by 2 -> 29.6.
    // prior balance 296,000 / 29.6 = 10,000.
    const findings = evaluateInheritedIra(
      {
        ...ownerDiedAfterRbd,
        beneficiaryDateOfBirth: d("1969-01-01"),
        priorYearEndBalance: 296000,
        currentYearDistribution: 0,
      },
      d("2026-04-01"),
    );
    const behind = byCode(findings, "BEHIND_ON_ANNUAL_RMD")!;
    expect(behind.data!.estimateFactor).toBe(29.6);
    expect(behind.data!.estimatedRmd).toBe(10000);
  });
});

describe("Inherited IRA — data gaps and out-of-scope cases", () => {
  it("asks for the owner's DOB when it is missing (annual-RMD status unknown)", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NON_ELIGIBLE" },
      d("2026-01-01"),
    );
    expect(byCode(findings, "MISSING_OWNER_DOB")).toBeDefined();
    // The deadline is still surfaced even without the DOB.
    expect(byCode(findings, "TEN_YEAR_DEADLINE")).toBeDefined();
  });

  it("treats pre-2020 deaths as out of scope", () => {
    const findings = evaluateInheritedIra(
      {
        ...base,
        ownerDateOfDeath: d("2018-05-01"),
        beneficiaryClass: "NON_ELIGIBLE",
      },
      d("2026-01-01"),
    );
    expect(codes(findings)).toEqual(["PRE_SECURE_DEATH"]);
  });

  it("routes non-person beneficiaries to special rules", () => {
    const findings = evaluateInheritedIra(
      { ...base, beneficiaryClass: "NON_PERSON" },
      d("2026-01-01"),
    );
    expect(codes(findings)).toEqual(["NON_PERSON_BENEFICIARY"]);
  });
});

describe("Single Life table sample", () => {
  it("anchors on the widely-published 2022 factor for age 72", () => {
    expect(singleLifeFactor(72)).toBe(17.2);
  });
  it("reduce-by-one subtracts a whole year each subsequent year", () => {
    expect(reducedFactor(31.6, 0)).toBe(31.6);
    expect(reducedFactor(31.6, 2)).toBe(29.6);
  });
  it("returns null once the factor would be exhausted", () => {
    expect(reducedFactor(2, 3)).toBeNull();
  });
});
