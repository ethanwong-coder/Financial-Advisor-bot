/**
 * Rules engine aggregator.
 *
 * Takes a plain snapshot of a user's financial "case file" and returns all
 * findings from every rule. This is the single entry point the application
 * calls. It is pure and deterministic — the evaluation date is injected.
 */
import {
  BeneficiaryMismatchInput,
  evaluateBeneficiaryMismatch,
} from "./beneficiary-mismatch";
import { evaluateInheritedIra, InheritedIraInput } from "./inherited-ira";
import {
  AccountType,
  BeneficiaryRelationship,
  InheritedIraBeneficiaryClass,
  MaritalStatus,
  RuleFinding,
} from "./types";

/** One account as the engine sees it (decoupled from the DB schema). */
export interface AccountSnapshot {
  /** Stable reference used to attach findings back to the account. */
  ref: string;
  accountType: AccountType;
  beneficiaryPrimaryName?: string;
  beneficiaryPrimaryRelationship?: BeneficiaryRelationship;
  beneficiaryLastConfirmed?: Date;

  /** Present only for inherited IRAs. */
  inheritedIra?: {
    ownerDateOfDeath: Date;
    ownerDateOfBirth?: Date;
    beneficiaryClass: InheritedIraBeneficiaryClass;
    beneficiaryDateOfBirth?: Date;
    currentYearDistribution?: number;
    priorYearEndBalance?: number;
  };
}

export interface CaseFileSnapshot {
  profile: {
    maritalStatus: MaritalStatus;
    currentSpouseName?: string;
    formerSpouseNames?: string[];
    lastMarriageDate?: Date;
    lastDivorceDate?: Date;
  };
  accounts: AccountSnapshot[];
}

/**
 * Run every rule against the snapshot. `today` is injected for determinism;
 * callers pass `new Date()`.
 */
export function runRulesEngine(
  snapshot: CaseFileSnapshot,
  today: Date,
): RuleFinding[] {
  const findings: RuleFinding[] = [];

  for (const account of snapshot.accounts) {
    // Beneficiary-mismatch checks apply to every account.
    const mismatchInput: BeneficiaryMismatchInput = {
      accountRef: account.ref,
      accountType: account.accountType,
      maritalStatus: snapshot.profile.maritalStatus,
      currentSpouseName: snapshot.profile.currentSpouseName,
      formerSpouseNames: snapshot.profile.formerSpouseNames,
      beneficiaryPrimaryName: account.beneficiaryPrimaryName,
      beneficiaryPrimaryRelationship: account.beneficiaryPrimaryRelationship,
      beneficiaryLastConfirmed: account.beneficiaryLastConfirmed,
      lastMarriageDate: snapshot.profile.lastMarriageDate,
      lastDivorceDate: snapshot.profile.lastDivorceDate,
    };
    findings.push(...evaluateBeneficiaryMismatch(mismatchInput));

    // Inherited-IRA checks apply only to inherited IRAs with detail attached.
    if (account.inheritedIra) {
      const iraInput: InheritedIraInput = {
        accountRef: account.ref,
        ownerDateOfDeath: account.inheritedIra.ownerDateOfDeath,
        ownerDateOfBirth: account.inheritedIra.ownerDateOfBirth,
        beneficiaryClass: account.inheritedIra.beneficiaryClass,
        beneficiaryDateOfBirth: account.inheritedIra.beneficiaryDateOfBirth,
        currentYearDistribution: account.inheritedIra.currentYearDistribution,
        priorYearEndBalance: account.inheritedIra.priorYearEndBalance,
      };
      findings.push(...evaluateInheritedIra(iraInput, today));
    }
  }

  return findings;
}
