/**
 * Server-side entitlement resolution — the ONLY place tier is computed.
 *
 * getUserTier() reads the Subscription table (written solely by the Stripe
 * webhook) and returns FREE/PLUS/PRO, treating expired / canceled / past-due /
 * missing subscriptions as FREE. Route guards use requireTierFeature().
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Feature, FEATURE_MIN_TIER, hasFeature, Tier } from "./tiers";

interface SubscriptionSnapshot {
  tier: Tier;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodEnd: Date | null;
}

/**
 * Pure tier resolution from a subscription row (or null) — unit-tested.
 * Only ACTIVE/TRIALING subscriptions that haven't lapsed grant a paid tier.
 */
export function tierFromSubscription(
  sub: SubscriptionSnapshot | null,
  now: Date,
): Tier {
  if (!sub) return "FREE";
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now.getTime()) {
    return "FREE";
  }
  return sub.tier;
}

export async function getUserTier(userId: string, now: Date = new Date()): Promise<Tier> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true, currentPeriodEnd: true },
  });
  return tierFromSubscription(sub as SubscriptionSnapshot | null, now);
}

/**
 * Route guard: returns a 403 `upgrade_required` Response if the user's tier
 * doesn't include `feature`, else null. Usage:
 *   const gate = await requireTierFeature(userId, "chat"); if (gate) return gate;
 */
export async function requireTierFeature(
  userId: string,
  feature: Feature,
): Promise<NextResponse | null> {
  const tier = await getUserTier(userId);
  if (hasFeature(tier, feature)) return null;
  return NextResponse.json(
    {
      error: "upgrade_required",
      feature,
      currentTier: tier,
      requiredTier: FEATURE_MIN_TIER[feature],
    },
    { status: 403 },
  );
}
