"use client";

import { meetsTier, Tier } from "@/lib/billing/tiers";
import { useTier } from "./useTier";
import { UpgradePrompt } from "./UpgradePrompt";

/**
 * UI-level gate: renders children only if the user's tier meets `requiredTier`,
 * otherwise an upgrade prompt. This is UX only — the gated API routes enforce
 * access server-side regardless of what's rendered.
 */
export function Gate({
  requiredTier,
  label,
  children,
}: {
  requiredTier: Tier;
  label?: string;
  children: React.ReactNode;
}) {
  const tier = useTier();
  if (tier == null) {
    return (
      <div className="card">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }
  if (!meetsTier(tier, requiredTier)) {
    return <UpgradePrompt requiredTier={requiredTier} label={label} />;
  }
  return <>{children}</>;
}
