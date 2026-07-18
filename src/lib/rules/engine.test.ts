import { describe, expect, it } from "vitest";
import { runRulesEngine, CaseFileSnapshot } from "./engine";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("runRulesEngine (integration)", () => {
  it("evaluates every account and combines findings across rules", () => {
    const snapshot: CaseFileSnapshot = {
      profile: {
        maritalStatus: "DIVORCED",
        formerSpouseNames: ["Chris Rivera"],
        lastDivorceDate: d("2021-03-01"),
      },
      accounts: [
        {
          ref: "401k",
          accountType: "PLAN_401K",
          beneficiaryPrimaryName: "Chris Rivera",
          beneficiaryPrimaryRelationship: "FORMER_SPOUSE",
          beneficiaryLastConfirmed: d("2015-01-01"),
        },
        {
          ref: "inherited-ira",
          accountType: "INHERITED_IRA",
          inheritedIra: {
            ownerDateOfDeath: d("2021-08-01"),
            ownerDateOfBirth: d("1944-02-01"), // died after RBD
            beneficiaryClass: "NON_ELIGIBLE",
            currentYearDistribution: 0,
          },
        },
      ],
    };

    const findings = runRulesEngine(snapshot, d("2026-05-01"));
    const codes = findings.map((f) => f.code);

    // Beneficiary-mismatch findings on the 401(k).
    expect(codes).toContain("EX_SPOUSE_LISTED");
    expect(codes).toContain("DESIGNATION_PREDATES_LIFE_EVENT");

    // Inherited-IRA findings.
    expect(codes).toContain("TEN_YEAR_DEADLINE"); // deadline 2031
    expect(codes).toContain("BEHIND_ON_ANNUAL_RMD");

    // Every finding is tagged with its account and one of the two rules.
    for (const f of findings) {
      expect(f.accountRef).toBeDefined();
      expect(["INHERITED_IRA_10YR", "BENEFICIARY_MISMATCH"]).toContain(f.ruleId);
    }
  });
});
