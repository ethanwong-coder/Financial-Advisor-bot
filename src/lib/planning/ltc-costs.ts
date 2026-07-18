/**
 * Long-term-care cost reference — NATIONAL AVERAGE (annual, USD).
 *
 * ⚠️  Illustrative national-average figures only. Actual costs vary widely by
 *     region and provider and rise over time. These are a documented default;
 *     the LTC tool lets the user override the annual cost. Verify against a
 *     current cost-of-care survey before relying on them.
 */

export type CareType = "HOME_CARE" | "ASSISTED_LIVING" | "NURSING_HOME_SEMI" | "NURSING_HOME_PRIVATE";

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  HOME_CARE: "Home health aide",
  ASSISTED_LIVING: "Assisted living",
  NURSING_HOME_SEMI: "Nursing home (semi-private)",
  NURSING_HOME_PRIVATE: "Nursing home (private)",
};

/** Approximate national average ANNUAL cost by care type (documented default). */
export const LTC_ANNUAL_COST: Record<CareType, number> = {
  HOME_CARE: 75000,
  ASSISTED_LIVING: 64000,
  NURSING_HOME_SEMI: 104000,
  NURSING_HOME_PRIVATE: 120000,
};

export const LTC_VERIFY_NOTE =
  "National-average figures, illustrative only. Regional costs vary widely — adjust the annual cost to your area.";
