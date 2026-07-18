import { describe, expect, it } from "vitest";
import {
  BeneficiaryMismatchInput,
  evaluateBeneficiaryMismatch,
  normalizeName,
} from "./beneficiary-mismatch";
import { RuleFinding } from "./types";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const codes = (fs: RuleFinding[]) => fs.map((f) => f.code);
const byCode = (fs: RuleFinding[], code: string) =>
  fs.find((f) => f.code === code);

const base: BeneficiaryMismatchInput = {
  accountRef: "acct-1",
  accountType: "TRADITIONAL_IRA",
  maritalStatus: "MARRIED",
};

describe("normalizeName", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    expect(normalizeName("  John   Q  Public ")).toBe("john q public");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("Beneficiary mismatch — former spouse still listed", () => {
  it("flags HIGH when the relationship is explicitly a former spouse", () => {
    const findings = evaluateBeneficiaryMismatch({
      ...base,
      maritalStatus: "DIVORCED",
      beneficiaryPrimaryName: "Alex Smith",
      beneficiaryPrimaryRelationship: "FORMER_SPOUSE",
    });
    const f = byCode(findings, "EX_SPOUSE_LISTED");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("HIGH");
  });

  it("flags HIGH when the beneficiary name matches a former spouse on record", () => {
    const findings = evaluateBeneficiaryMismatch({
      ...base,
      maritalStatus: "SINGLE",
      formerSpouseNames: ["Alex Smith"],
      beneficiaryPrimaryName: "alex  smith", // different casing/spacing
      beneficiaryPrimaryRelationship: "OTHER",
    });
    expect(byCode(findings, "NAME_MATCHES_FORMER_SPOUSE")!.severity).toBe("HIGH");
  });

  it("flags HIGH when a 'spouse' beneficiary contradicts divorced status", () => {
    const findings = evaluateBeneficiaryMismatch({
      ...base,
      maritalStatus: "DIVORCED",
      beneficiaryPrimaryName: "Pat Jones",
      beneficiaryPrimaryRelationship: "SPOUSE",
    });
    expect(byCode(findings, "SPOUSE_BENEFICIARY_BUT_DIVORCED")!.severity).toBe(
      "HIGH",
    );
  });
});

describe("Beneficiary mismatch — spouse name checks", () => {
  it("no findings when a married person's spouse beneficiary matches", () => {
    const findings = evaluateBeneficiaryMismatch({
      ...base,
      maritalStatus: "MARRIED",
      currentSpouseName: "Jane Doe",
      beneficiaryPrimaryName: "jane doe",
      beneficiaryPrimaryRelationship: "SPOUSE",
    });
    expect(findings).toEqual([]);
  });

  it("flags when the spouse beneficiary name doesn't match the current spouse", () => {
    const findings = evaluateBeneficiaryMismatch({
      ...base,
      maritalStatus: "MARRIED",
      currentSpouseName: "Jane Doe",
      beneficiaryPrimaryName: "Mary Poe",
      beneficiaryPrimaryRelationship: "SPOUSE",
    });
    expect(byCode(findings, "SPOUSE_NAME_MISMATCH")!.severity).toBe("MEDIUM");
  });
});

describe("Beneficiary mismatch — missing / non-designation accounts", () => {
  it("flags a missing beneficiary on an account that passes by designation", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "PLAN_401K",
      maritalStatus: "SINGLE",
    });
    expect(byCode(findings, "NO_BENEFICIARY")!.severity).toBe("MEDIUM");
  });

  it("does not flag a missing beneficiary on a plain brokerage account", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "BROKERAGE",
      maritalStatus: "SINGLE",
    });
    expect(findings).toEqual([]);
  });
});

describe("Beneficiary mismatch — married + non-spouse primary", () => {
  it("flags MEDIUM for an ERISA plan (spousal consent note)", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "PLAN_401K",
      maritalStatus: "MARRIED",
      currentSpouseName: "Jane Doe",
      beneficiaryPrimaryName: "Kiddo Doe",
      beneficiaryPrimaryRelationship: "CHILD",
    });
    const f = byCode(findings, "MARRIED_NONSPOUSE_ERISA");
    expect(f!.severity).toBe("MEDIUM");
    expect(f!.detail).toContain("consent");
  });

  it("only informational for a non-ERISA account (e.g. IRA)", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "TRADITIONAL_IRA",
      maritalStatus: "MARRIED",
      currentSpouseName: "Jane Doe",
      beneficiaryPrimaryName: "Kiddo Doe",
      beneficiaryPrimaryRelationship: "CHILD",
    });
    expect(byCode(findings, "MARRIED_NONSPOUSE_BENEFICIARY")!.severity).toBe(
      "INFO",
    );
  });
});

describe("Beneficiary mismatch — stale designation vs life events", () => {
  it("flags a designation last confirmed before the most recent divorce", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "TRADITIONAL_IRA",
      maritalStatus: "SINGLE",
      beneficiaryPrimaryName: "Kiddo Doe",
      beneficiaryPrimaryRelationship: "CHILD",
      beneficiaryLastConfirmed: d("2015-01-01"),
      lastDivorceDate: d("2020-06-01"),
    });
    const f = byCode(findings, "DESIGNATION_PREDATES_LIFE_EVENT");
    expect(f!.severity).toBe("MEDIUM");
    expect(f!.detail).toContain("divorce");
  });

  it("flags LOW when confirmation date is unknown but a life event exists", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "TRADITIONAL_IRA",
      maritalStatus: "MARRIED",
      currentSpouseName: "Jamie Doe",
      beneficiaryPrimaryName: "Jamie Doe",
      beneficiaryPrimaryRelationship: "SPOUSE",
      lastMarriageDate: d("2022-06-01"),
    });
    expect(byCode(findings, "DESIGNATION_CONFIRMATION_UNKNOWN")!.severity).toBe(
      "LOW",
    );
  });

  it("does not flag staleness when the designation post-dates the event", () => {
    const findings = evaluateBeneficiaryMismatch({
      accountRef: "acct-1",
      accountType: "TRADITIONAL_IRA",
      maritalStatus: "SINGLE",
      beneficiaryPrimaryName: "Kiddo Doe",
      beneficiaryPrimaryRelationship: "CHILD",
      beneficiaryLastConfirmed: d("2021-01-01"),
      lastDivorceDate: d("2020-06-01"),
    });
    expect(codes(findings)).not.toContain("DESIGNATION_PREDATES_LIFE_EVENT");
  });
});
