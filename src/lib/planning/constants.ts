/**
 * Planning-tools shared constants.
 *
 * Phase 1 of the financial-planning expansion. Every calculator here is PURE,
 * DETERMINISTIC code with unit tests — NO LLM is ever involved in the math,
 * exactly like the compliance rules engine. These tools are informational and
 * educational only; nothing here is a personalized recommendation.
 *
 * This module is fully separate from src/lib/rules and src/lib/flags.
 */

/** The disclaimer shown on every planning result screen. */
export const PLANNING_DISCLAIMER =
  "Informational estimate only — not financial or tax advice. Consult a CPA or financial advisor before making decisions.";

/** Default conservative nominal return for the retirement projection (user-adjustable). */
export const DEFAULT_EXPECTED_RETURN = 0.06;

/** Tax year the tax-oriented tools target (due dates, constants). Update yearly. */
export const PLANNING_TAX_YEAR = 2026;

export type FilingStatus =
  | "SINGLE"
  | "MARRIED_FILING_JOINTLY"
  | "MARRIED_FILING_SEPARATELY"
  | "HEAD_OF_HOUSEHOLD"
  | "QUALIFYING_SURVIVING_SPOUSE";

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  SINGLE: "Single",
  MARRIED_FILING_JOINTLY: "Married filing jointly",
  MARRIED_FILING_SEPARATELY: "Married filing separately",
  HEAD_OF_HOUSEHOLD: "Head of household",
  QUALIFYING_SURVIVING_SPOUSE: "Qualifying surviving spouse",
};
