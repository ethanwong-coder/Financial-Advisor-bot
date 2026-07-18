/**
 * Shared constants for the rules engine.
 *
 * The rules engine is PURE, DETERMINISTIC code. It never calls an LLM, never
 * performs I/O, and never reads the clock on its own — the evaluation date is
 * always injected so results are reproducible and testable.
 */

/**
 * The disclaimer that must accompany every user-facing surface that shows a
 * flag. The rules engine returns neutral *facts*; the presentation layer (UI +
 * LLM) is responsible for always attaching this. It is exported here so there
 * is a single source of truth.
 */
export const INFORMATIONAL_DISCLAIMER =
  "This is informational only and is not financial, tax, or legal advice. " +
  "Consult your CPA and/or estate attorney before acting.";

/**
 * The year the SECURE Act's 10-year rule took effect. It applies to account
 * owners who died AFTER 2019-12-31. Deaths before this use the older
 * stretch/5-year regime, which this MVP does not compute.
 */
export const SECURE_ACT_EFFECTIVE_YEAR = 2020;

/**
 * The IRS waived the penalty for missed *annual* RMDs inside the 10-year
 * window for 2021–2024 (Notices 2022-53, 2023-54, 2024-35). Annual RMDs inside
 * the window are enforced starting this year, per the July 2024 final
 * regulations. We therefore only flag a *missed* annual distribution for the
 * current year when that year is >= this value.
 */
export const ANNUAL_RMD_ENFORCEMENT_YEAR = 2025;
