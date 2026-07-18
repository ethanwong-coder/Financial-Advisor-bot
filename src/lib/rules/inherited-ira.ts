/**
 * Inherited IRA — SECURE Act 10-year rule evaluator.
 *
 * Deterministic, pure. Produces neutral factual findings about deadlines and
 * whether distributions appear to be on track. It does NOT tell anyone to buy,
 * sell, or move investments, and it does not interpret documents.
 *
 * Rule summary (deaths after 2019-12-31):
 *  - Eligible Designated Beneficiaries (EDBs: surviving spouse, minor child of
 *    the owner, disabled, chronically ill, or someone not more than 10 years
 *    younger than the owner) are generally exempt from the 10-year rule.
 *  - A Non-Eligible Designated Beneficiary (e.g. an adult child) must empty the
 *    account by December 31 of the 10th year after the owner's death.
 *  - If the owner died ON OR AFTER their Required Beginning Date, that
 *    beneficiary must ALSO take annual RMDs in years 1–9 of the window
 *    ("at least as rapidly" rule). If the owner died BEFORE their RBD, only the
 *    year-10 full distribution is required.
 *  - The IRS waived the penalty for missed annual RMDs for 2021–2024; annual
 *    RMDs inside the window are enforced from 2025 (July 2024 final regs).
 */
import {
  ANNUAL_RMD_ENFORCEMENT_YEAR,
  SECURE_ACT_EFFECTIVE_YEAR,
} from "./constants";
import { december31, getYear, yearsYoungerThan } from "./dates";
import { diedOnOrAfterRbd, requiredBeginningDate } from "./rmd";
import {
  estimateAnnualRmd,
  reducedFactor,
  singleLifeFactor,
} from "./single-life-table";
import { ageOn } from "./dates";
import {
  EDB_CLASSES,
  InheritedIraBeneficiaryClass,
  RuleFinding,
} from "./types";

export interface InheritedIraInput {
  accountRef: string;
  ownerDateOfDeath: Date;
  /** Owner DOB — required to determine whether annual RMDs apply. */
  ownerDateOfBirth?: Date;
  beneficiaryClass: InheritedIraBeneficiaryClass;
  /** Beneficiary DOB — used to sanity-check the EDB age gap and to look up the
   * Single Life factor for the informational RMD estimate. */
  beneficiaryDateOfBirth?: Date;
  /** Total distributions the holder has recorded for the current evaluation
   * year. Used only to detect a *missing* required distribution. */
  currentYearDistribution?: number;
  /** Prior year-end fair market value, for the informational RMD estimate. */
  priorYearEndBalance?: number;
}

const RULE = "INHERITED_IRA_10YR" as const;

export function evaluateInheritedIra(
  input: InheritedIraInput,
  today: Date,
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const ref = input.accountRef;
  const deathYear = getYear(input.ownerDateOfDeath);
  const todayYear = getYear(today);

  // --- Pre-SECURE deaths are out of scope for the 10-year computation. ---
  if (deathYear < SECURE_ACT_EFFECTIVE_YEAR) {
    findings.push({
      ruleId: RULE,
      code: "PRE_SECURE_DEATH",
      severity: "INFO",
      title: "Inherited before the 10-year rule (pre-2020 death)",
      detail:
        `The original owner died in ${deathYear}, before the SECURE Act's ` +
        `10-year rule took effect (deaths after 2019). Older stretch/5-year ` +
        `rules apply and are not calculated here.`,
      accountRef: ref,
      data: { deathYear },
    });
    return findings;
  }

  // --- Non-person beneficiaries (estate, charity, non-qualifying trust) have
  //     their own rules (5-year or the decedent's remaining life expectancy).
  if (input.beneficiaryClass === "NON_PERSON") {
    findings.push({
      ruleId: RULE,
      code: "NON_PERSON_BENEFICIARY",
      severity: "LOW",
      title: "Non-person beneficiary — special distribution rules",
      detail:
        "The beneficiary is an estate, charity, or non-qualifying trust. " +
        "These use a 5-year rule or the decedent's remaining life expectancy " +
        "rather than the 10-year rule, and are not calculated here.",
      accountRef: ref,
      data: { deathYear },
    });
    return findings;
  }

  // --- EDBs are generally exempt from the 10-year rule. ---
  if (EDB_CLASSES.has(input.beneficiaryClass)) {
    // Optional transparency check on the "not more than 10 years younger" class.
    let ageGapNote: string | undefined;
    if (
      input.beneficiaryClass === "NOT_MORE_THAN_10_YEARS_YOUNGER" &&
      input.beneficiaryDateOfBirth &&
      input.ownerDateOfBirth
    ) {
      const younger = yearsYoungerThan(
        input.beneficiaryDateOfBirth,
        input.ownerDateOfBirth,
      );
      if (younger > 10) {
        ageGapNote =
          ` The recorded birth dates show the beneficiary is about ${younger} ` +
          `years younger than the owner, which is more than 10 years — this ` +
          `classification may not fit. Please re-check.`;
      }
    }

    const minorNote =
      input.beneficiaryClass === "MINOR_CHILD_OF_OWNER"
        ? " Note: for a minor child of the owner, the 10-year clock generally " +
          "begins once the child reaches the age of majority."
        : "";

    findings.push({
      ruleId: RULE,
      code: "EDB_EXEMPT",
      severity: ageGapNote ? "LOW" : "INFO",
      title: "Eligible designated beneficiary — 10-year rule may not apply",
      detail:
        `The beneficiary is recorded as an eligible designated beneficiary ` +
        `(${humanizeClass(input.beneficiaryClass)}), so the 10-year rule ` +
        `generally does not apply and life-expectancy distributions may be ` +
        `available.${minorNote}${ageGapNote ?? ""}`,
      accountRef: ref,
      data: { beneficiaryClass: input.beneficiaryClass, deathYear },
    });
    return findings;
  }

  // --- Core case: Non-Eligible Designated Beneficiary, 10-year rule applies. ---
  const deadlineYear = deathYear + 10;
  const deadlineDate = december31(deadlineYear);
  const yearsRemaining = deadlineYear - todayYear;

  // (1) The final deadline — always surface it as a fact.
  if (todayYear > deadlineYear) {
    findings.push({
      ruleId: RULE,
      code: "DEADLINE_PASSED",
      severity: "CRITICAL",
      title: "10-year distribution deadline has passed",
      detail:
        `The account was required to be fully distributed by ` +
        `December 31, ${deadlineYear} (10 years after the owner's ${deathYear} ` +
        `death). That date has passed.`,
      accountRef: ref,
      data: { deathYear, deadlineYear, yearsRemaining },
    });
  } else {
    const severity = yearsRemaining <= 2 ? "HIGH" : "MEDIUM";
    findings.push({
      ruleId: RULE,
      code: "TEN_YEAR_DEADLINE",
      severity,
      title: `Must be fully distributed by December 31, ${deadlineYear}`,
      detail:
        `Because the owner died in ${deathYear}, the entire account must be ` +
        `distributed by December 31, ${deadlineYear} ` +
        `(${yearsRemaining} year${yearsRemaining === 1 ? "" : "s"} remaining).`,
      accountRef: ref,
      data: { deathYear, deadlineYear, yearsRemaining },
    });
  }

  // (2) Whether annual RMDs are required inside the window depends on whether
  //     the owner had reached their Required Beginning Date at death.
  if (!input.ownerDateOfBirth) {
    findings.push({
      ruleId: RULE,
      code: "MISSING_OWNER_DOB",
      severity: "LOW",
      title: "Add the original owner's birth date",
      detail:
        "Whether annual distributions are required during the 10-year window " +
        "depends on whether the original owner had reached their required " +
        "beginning date. Add the owner's date of birth so this can be checked.",
      accountRef: ref,
      data: { deathYear, deadlineYear },
    });
    return findings;
  }

  const annualRequired = diedOnOrAfterRbd(
    input.ownerDateOfBirth,
    input.ownerDateOfDeath,
  );
  const rbd = requiredBeginningDate(input.ownerDateOfBirth);

  if (!annualRequired) {
    findings.push({
      ruleId: RULE,
      code: "NO_ANNUAL_RMD_REQUIRED",
      severity: "INFO",
      title: "No annual distributions required before year 10",
      detail:
        `The owner died before their required beginning date ` +
        `(${formatDate(rbd)}), so no annual distributions are required in ` +
        `years 1–9. The only requirement is to fully distribute the account by ` +
        `December 31, ${deadlineYear}.`,
      accountRef: ref,
      data: { requiredBeginningDate: rbd.toISOString(), deadlineYear },
    });
    return findings;
  }

  // Annual RMDs ARE required inside the window.
  const withinWindow = todayYear > deathYear && todayYear < deadlineYear;

  // Informational estimate of this year's required amount (best-effort).
  let estimate: number | undefined;
  let estimateFactor: number | null = null;
  if (input.beneficiaryDateOfBirth) {
    const firstDistYear = deathYear + 1;
    const ageInFirstYear = ageOn(
      input.beneficiaryDateOfBirth,
      december31(firstDistYear),
    );
    const initialFactor = singleLifeFactor(ageInFirstYear);
    if (initialFactor != null) {
      estimateFactor = reducedFactor(initialFactor, todayYear - firstDistYear);
      if (estimateFactor != null && input.priorYearEndBalance != null) {
        estimate = estimateAnnualRmd(input.priorYearEndBalance, estimateFactor);
      }
    }
  }

  if (
    withinWindow &&
    todayYear >= ANNUAL_RMD_ENFORCEMENT_YEAR &&
    !hasTakenDistribution(input.currentYearDistribution)
  ) {
    // A required annual distribution appears to be missing for this year.
    findings.push({
      ruleId: RULE,
      code: "BEHIND_ON_ANNUAL_RMD",
      severity: "HIGH",
      title: `Annual distribution appears to be missing for ${todayYear}`,
      detail:
        `Because the owner died on or after their required beginning date, ` +
        `an annual distribution is required for ${todayYear}, but none is ` +
        `recorded.` +
        (estimate != null
          ? ` A rough informational estimate is about ` +
            `$${estimate.toLocaleString()} (prior year-end balance ÷ factor ` +
            `${estimateFactor}); confirm the exact amount with your advisor.`
          : ""),
      accountRef: ref,
      data: {
        year: todayYear,
        recordedDistribution: input.currentYearDistribution ?? 0,
        estimatedRmd: estimate ?? null,
        estimateFactor,
      },
    });
  } else if (withinWindow) {
    // On track (or a pre-2025 year the IRS waived). Surface the obligation.
    findings.push({
      ruleId: RULE,
      code: "ANNUAL_RMD_REQUIRED",
      severity: "INFO",
      title: "Annual distributions required during the 10-year window",
      detail:
        `Because the owner died on or after their required beginning date ` +
        `(${formatDate(rbd)}), an annual distribution is required each year in ` +
        `addition to fully emptying the account by December 31, ${deadlineYear}.` +
        (todayYear < ANNUAL_RMD_ENFORCEMENT_YEAR
          ? ` The IRS waived the penalty for missed annual distributions for ` +
            `2021–2024; they are enforced from ${ANNUAL_RMD_ENFORCEMENT_YEAR}.`
          : ""),
      accountRef: ref,
      data: {
        requiredBeginningDate: rbd.toISOString(),
        deadlineYear,
        recordedDistribution: input.currentYearDistribution ?? null,
      },
    });
  }

  return findings;
}

function hasTakenDistribution(amount?: number): boolean {
  return typeof amount === "number" && amount > 0;
}

function humanizeClass(c: InheritedIraBeneficiaryClass): string {
  switch (c) {
    case "SPOUSE":
      return "surviving spouse";
    case "MINOR_CHILD_OF_OWNER":
      return "minor child of the owner";
    case "DISABLED":
      return "disabled individual";
    case "CHRONICALLY_ILL":
      return "chronically ill individual";
    case "NOT_MORE_THAN_10_YEARS_YOUNGER":
      return "not more than 10 years younger than the owner";
    default:
      return c;
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
