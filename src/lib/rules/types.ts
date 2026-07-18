/**
 * Types shared across the rules engine. These are intentionally decoupled from
 * the database (Prisma) models: the engine takes a plain snapshot and returns
 * plain findings, so it can be unit-tested in isolation and, if desired,
 * extracted into a standalone package later.
 */

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RuleId = "INHERITED_IRA_10YR" | "BENEFICIARY_MISMATCH";

/** Account types we track. Some pass to heirs by *beneficiary designation*
 * (retirement accounts, life insurance) rather than through a will. */
export type AccountType =
  | "TRADITIONAL_IRA"
  | "ROTH_IRA"
  | "INHERITED_IRA"
  | "PLAN_401K"
  | "PLAN_403B"
  | "HSA"
  | "LIFE_INSURANCE"
  | "ANNUITY"
  | "BROKERAGE"
  | "BANK_CHECKING"
  | "BANK_SAVINGS"
  | "OTHER";

/** Account types that transfer by beneficiary designation and therefore make a
 * missing or stale beneficiary a real coordination gap. */
export const PASSES_BY_BENEFICIARY: ReadonlySet<AccountType> = new Set<AccountType>([
  "TRADITIONAL_IRA",
  "ROTH_IRA",
  "INHERITED_IRA",
  "PLAN_401K",
  "PLAN_403B",
  "HSA",
  "LIFE_INSURANCE",
  "ANNUITY",
]);

/** Employer retirement plans governed by ERISA, where naming a non-spouse
 * generally requires documented spousal consent. */
export const ERISA_PLAN_TYPES: ReadonlySet<AccountType> = new Set<AccountType>([
  "PLAN_401K",
  "PLAN_403B",
]);

export type MaritalStatus =
  | "SINGLE"
  | "MARRIED"
  | "DIVORCED"
  | "WIDOWED"
  | "SEPARATED";

export type BeneficiaryRelationship =
  | "SPOUSE"
  | "FORMER_SPOUSE"
  | "CHILD"
  | "GRANDCHILD"
  | "PARENT"
  | "SIBLING"
  | "TRUST"
  | "ESTATE"
  | "CHARITY"
  | "OTHER"
  | "NONE";

/**
 * Beneficiary classification for an inherited IRA. Whether the SECURE Act
 * 10-year rule applies depends entirely on this. Eligible Designated
 * Beneficiaries (EDBs) are generally exempt from the 10-year rule.
 */
export type InheritedIraBeneficiaryClass =
  // --- Eligible Designated Beneficiaries (EDBs) — 10-year rule generally does NOT apply ---
  | "SPOUSE"
  | "MINOR_CHILD_OF_OWNER"
  | "DISABLED"
  | "CHRONICALLY_ILL"
  | "NOT_MORE_THAN_10_YEARS_YOUNGER"
  // --- Non-Eligible Designated Beneficiary — the core 10-year-rule case ---
  | "NON_ELIGIBLE"
  // --- Non-person (estate, charity, non-qualifying trust) — different rules ---
  | "NON_PERSON";

export const EDB_CLASSES: ReadonlySet<InheritedIraBeneficiaryClass> =
  new Set<InheritedIraBeneficiaryClass>([
    "SPOUSE",
    "MINOR_CHILD_OF_OWNER",
    "DISABLED",
    "CHRONICALLY_ILL",
    "NOT_MORE_THAN_10_YEARS_YOUNGER",
  ]);

/**
 * A single finding produced by a rule. This is neutral, factual data. The
 * disclaimer is added by the presentation layer, never baked into `detail`.
 */
export interface RuleFinding {
  ruleId: RuleId;
  /** Stable sub-code within the rule, e.g. "BEHIND_ON_ANNUAL_RMD". Used to
   * dedupe/reconcile findings against stored flags so their resolved/dismissed
   * status survives re-evaluation. */
  code: string;
  severity: Severity;
  title: string;
  /** Plain-English statement of the fact found. No advice, no legal
   * interpretation — only what is observed. */
  detail: string;
  /** Opaque reference (nickname or id) to the account this pertains to, if any. */
  accountRef?: string;
  /** Structured facts backing the finding, passed to the explanation layer. */
  data?: Record<string, unknown>;
}
