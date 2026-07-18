/**
 * Beneficiary designation mismatch evaluator.
 *
 * Deterministic, pure. Compares the *stated* beneficiary on an account against
 * the user's *stated* marital/family status and key dates, and surfaces neutral
 * factual flags ("the beneficiary listed does not match your current marital
 * status"). It does NOT interpret legal documents and does NOT recommend who a
 * beneficiary should be — only that a combination looks worth reviewing.
 */
import { getYear } from "./dates";
import {
  BeneficiaryRelationship,
  ERISA_PLAN_TYPES,
  MaritalStatus,
  PASSES_BY_BENEFICIARY,
  RuleFinding,
  AccountType,
} from "./types";

export interface BeneficiaryMismatchInput {
  accountRef: string;
  accountType: AccountType;
  maritalStatus: MaritalStatus;
  currentSpouseName?: string;
  formerSpouseNames?: string[];
  beneficiaryPrimaryName?: string;
  beneficiaryPrimaryRelationship?: BeneficiaryRelationship;
  /** When the beneficiary designation was last confirmed/updated. */
  beneficiaryLastConfirmed?: Date;
  lastMarriageDate?: Date;
  lastDivorceDate?: Date;
}

const RULE = "BENEFICIARY_MISMATCH" as const;

/** Normalize a name for comparison: trim, collapse internal whitespace, lower. */
export function normalizeName(name?: string): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function evaluateBeneficiaryMismatch(
  input: BeneficiaryMismatchInput,
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const ref = input.accountRef;
  const passesByBeneficiary = PASSES_BY_BENEFICIARY.has(input.accountType);
  const isErisaPlan = ERISA_PLAN_TYPES.has(input.accountType);

  const relationship = input.beneficiaryPrimaryRelationship;
  const benName = normalizeName(input.beneficiaryPrimaryName);
  const spouseName = normalizeName(input.currentSpouseName);
  const formerNames = (input.formerSpouseNames ?? []).map(normalizeName).filter(Boolean);

  const hasNamedBeneficiary = benName.length > 0 || (relationship != null && relationship !== "NONE");

  // (1) No beneficiary on an account that passes by designation.
  if (passesByBeneficiary && !hasNamedBeneficiary) {
    findings.push({
      ruleId: RULE,
      code: "NO_BENEFICIARY",
      severity: "MEDIUM",
      title: "No beneficiary designated",
      detail:
        "This account type normally transfers by beneficiary designation, but " +
        "no beneficiary is on record. Without one it may pass by the plan's " +
        "default or through probate.",
      accountRef: ref,
      data: { accountType: input.accountType },
    });
    // Nothing else to compare; return early.
    return findings;
  }

  // (2) Explicitly labeled former spouse.
  if (relationship === "FORMER_SPOUSE") {
    findings.push({
      ruleId: RULE,
      code: "EX_SPOUSE_LISTED",
      severity: "HIGH",
      title: "A former spouse is listed as beneficiary",
      detail:
        "The primary beneficiary is recorded as a former spouse. Beneficiary " +
        "designations are not automatically changed by a divorce.",
      accountRef: ref,
      data: { beneficiaryName: input.beneficiaryPrimaryName },
    });
  }

  // (3) Beneficiary name matches a former spouse on record.
  if (benName && formerNames.includes(benName) && relationship !== "FORMER_SPOUSE") {
    findings.push({
      ruleId: RULE,
      code: "NAME_MATCHES_FORMER_SPOUSE",
      severity: "HIGH",
      title: "Beneficiary name matches a former spouse",
      detail:
        `The beneficiary name ("${input.beneficiaryPrimaryName}") matches a ` +
        `former spouse on record. Confirm this designation is intended.`,
      accountRef: ref,
      data: { beneficiaryName: input.beneficiaryPrimaryName },
    });
  }

  // (4) Beneficiary labeled "spouse" but marital status contradicts it.
  if (relationship === "SPOUSE") {
    if (input.maritalStatus === "DIVORCED") {
      findings.push({
        ruleId: RULE,
        code: "SPOUSE_BENEFICIARY_BUT_DIVORCED",
        severity: "HIGH",
        title: "Beneficiary is a 'spouse' but marital status is divorced",
        detail:
          "The beneficiary is labeled as a spouse, but your marital status is " +
          "divorced. This is often a former spouse still listed after a divorce.",
        accountRef: ref,
        data: { maritalStatus: input.maritalStatus },
      });
    } else if (input.maritalStatus === "WIDOWED") {
      findings.push({
        ruleId: RULE,
        code: "SPOUSE_BENEFICIARY_BUT_WIDOWED",
        severity: "MEDIUM",
        title: "Beneficiary is a 'spouse' but marital status is widowed",
        detail:
          "The beneficiary is labeled as a spouse, but your marital status is " +
          "widowed. The named person may be deceased; review the designation.",
        accountRef: ref,
        data: { maritalStatus: input.maritalStatus },
      });
    } else if (input.maritalStatus === "SINGLE") {
      findings.push({
        ruleId: RULE,
        code: "SPOUSE_BENEFICIARY_BUT_SINGLE",
        severity: "MEDIUM",
        title: "Beneficiary is a 'spouse' but marital status is single",
        detail:
          "The beneficiary is labeled as a spouse, but your marital status is " +
          "single. Review whether this designation is current.",
        accountRef: ref,
        data: { maritalStatus: input.maritalStatus },
      });
    } else if (
      input.maritalStatus === "MARRIED" &&
      spouseName &&
      benName &&
      benName !== spouseName
    ) {
      findings.push({
        ruleId: RULE,
        code: "SPOUSE_NAME_MISMATCH",
        severity: "MEDIUM",
        title: "Spouse beneficiary name doesn't match your current spouse",
        detail:
          `The beneficiary is labeled as a spouse, but the name ` +
          `("${input.beneficiaryPrimaryName}") does not match your current ` +
          `spouse ("${input.currentSpouseName}"). This may be a prior spouse.`,
        accountRef: ref,
        data: {
          beneficiaryName: input.beneficiaryPrimaryName,
          currentSpouseName: input.currentSpouseName,
        },
      });
    }
  }

  // (5) Married, but a non-spouse is the primary beneficiary of an ERISA plan.
  if (
    input.maritalStatus === "MARRIED" &&
    hasNamedBeneficiary &&
    relationship != null &&
    relationship !== "SPOUSE" &&
    relationship !== "NONE"
  ) {
    const spousalConsentNote =
      "For employer retirement plans, federal law generally requires a " +
      "spouse's written, notarized consent to name a non-spouse as primary " +
      "beneficiary.";
    findings.push({
      ruleId: RULE,
      code: isErisaPlan
        ? "MARRIED_NONSPOUSE_ERISA"
        : "MARRIED_NONSPOUSE_BENEFICIARY",
      severity: isErisaPlan ? "MEDIUM" : "INFO",
      title: "A non-spouse is the primary beneficiary while you are married",
      detail:
        `You are married, and the primary beneficiary is recorded as a ` +
        `${humanizeRelationship(relationship)} rather than your spouse. ` +
        `Confirm this is intentional.` +
        (isErisaPlan ? " " + spousalConsentNote : ""),
      accountRef: ref,
      data: { relationship, accountType: input.accountType },
    });
  }

  // (6) Designation predates the most recent marriage/divorce (stale).
  const lastEvent = mostRecentEvent(input.lastMarriageDate, input.lastDivorceDate);
  if (lastEvent) {
    if (input.beneficiaryLastConfirmed) {
      if (input.beneficiaryLastConfirmed.getTime() < lastEvent.date.getTime()) {
        findings.push({
          ruleId: RULE,
          code: "DESIGNATION_PREDATES_LIFE_EVENT",
          severity: "MEDIUM",
          title: "Beneficiary was last confirmed before a major life event",
          detail:
            `The beneficiary was last confirmed in ` +
            `${getYear(input.beneficiaryLastConfirmed)}, before your most ` +
            `recent ${lastEvent.kind} in ${getYear(lastEvent.date)}. ` +
            `Designations don't update automatically after such events.`,
          accountRef: ref,
          data: {
            lastConfirmed: input.beneficiaryLastConfirmed.toISOString(),
            eventKind: lastEvent.kind,
            eventDate: lastEvent.date.toISOString(),
          },
        });
      }
    } else if (hasNamedBeneficiary) {
      findings.push({
        ruleId: RULE,
        code: "DESIGNATION_CONFIRMATION_UNKNOWN",
        severity: "LOW",
        title: "Confirm the beneficiary is current with your recent life event",
        detail:
          `There is a record of a ${lastEvent.kind} in ` +
          `${getYear(lastEvent.date)} but no record of when the beneficiary ` +
          `was last confirmed. Verify the designation still reflects your wishes.`,
        accountRef: ref,
        data: { eventKind: lastEvent.kind, eventDate: lastEvent.date.toISOString() },
      });
    }
  }

  return findings;
}

function mostRecentEvent(
  marriage?: Date,
  divorce?: Date,
): { kind: "marriage" | "divorce"; date: Date } | null {
  const events: { kind: "marriage" | "divorce"; date: Date }[] = [];
  if (marriage) events.push({ kind: "marriage", date: marriage });
  if (divorce) events.push({ kind: "divorce", date: divorce });
  if (events.length === 0) return null;
  return events.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function humanizeRelationship(r: BeneficiaryRelationship): string {
  return r.replace(/_/g, " ").toLowerCase();
}
