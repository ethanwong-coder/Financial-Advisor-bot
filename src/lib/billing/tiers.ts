/**
 * Tier definitions and the feature → minimum-tier map.
 *
 * PURE and client-safe (no DB, no Stripe) so it can be imported by both the
 * server entitlement checks and the client UI gating. The DB-backed resolution
 * lives in entitlements.ts.
 */

export type Tier = "FREE" | "PLUS" | "PRO";

export const TIER_RANK: Record<Tier, number> = { FREE: 0, PLUS: 1, PRO: 2 };

export function meetsTier(userTier: Tier, required: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}

/** Every gateable capability in the app, mapped to the tier that unlocks it. */
export type Feature =
  // FREE
  | "calc_retirement"
  | "calc_budget"
  | "calc_emergency"
  // PLUS
  | "chat"
  | "unlimited_accounts"
  | "auto_reeval"
  | "calc_social_security"
  | "calc_quarterly_tax"
  | "calc_niit_amt"
  | "calc_qcd"
  | "calc_insurance"
  | "calc_debt"
  | "calc_mortgage"
  | "estate_documents"
  // PRO
  | "calc_education"
  | "calc_business_retirement"
  | "calc_equity_comp"
  | "checklists"
  | "goals"
  | "expanded_checkins"
  | "multi_user"
  | "pdf_export";

export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  calc_retirement: "FREE",
  calc_budget: "FREE",
  calc_emergency: "FREE",

  chat: "PLUS",
  unlimited_accounts: "PLUS",
  auto_reeval: "PLUS",
  calc_social_security: "PLUS",
  calc_quarterly_tax: "PLUS",
  calc_niit_amt: "PLUS",
  calc_qcd: "PLUS",
  calc_insurance: "PLUS",
  calc_debt: "PLUS",
  calc_mortgage: "PLUS",
  estate_documents: "PLUS",

  calc_education: "PRO",
  calc_business_retirement: "PRO",
  calc_equity_comp: "PRO",
  checklists: "PRO",
  goals: "PRO",
  expanded_checkins: "PRO",
  multi_user: "PRO",
  pdf_export: "PRO",
};

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return meetsTier(tier, FEATURE_MIN_TIER[feature]);
}

/** Free tier is limited to a single connected account (Plaid or manual). */
export const FREE_ACCOUNT_LIMIT = 1;
export function accountLimit(tier: Tier): number {
  return tier === "FREE" ? FREE_ACCOUNT_LIMIT : Number.POSITIVE_INFINITY;
}

// --- Pricing (display) ---
export const PRICING: Record<"PLUS" | "PRO", { monthly: number; annual: number }> = {
  PLUS: { monthly: 9, annual: 89 },
  PRO: { monthly: 24, annual: 199 },
};

export function monthlyEquivalentOfAnnual(annual: number): number {
  return Math.round((annual / 12) * 100) / 100;
}
export function annualSavingsPercent(monthly: number, annual: number): number {
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

export const TIER_LABELS: Record<Tier, string> = { FREE: "Free", PLUS: "Plus", PRO: "Pro" };
