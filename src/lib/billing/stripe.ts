/**
 * Server-only Stripe helpers. Centralizes the client, the price-id ⇄ tier/interval
 * mapping, and Stripe→our-enum status mapping so the routes stay thin.
 *
 * Never import this from client code. Card data is never handled here — we only
 * create hosted Checkout / Billing Portal sessions and read subscription state.
 */
import Stripe from "stripe";
import type { Tier } from "./tiers";

export type Interval = "MONTHLY" | "ANNUAL";
export type SubStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) {
    // Pin the SDK's bundled API version (omit apiVersion) for forward-compat.
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** env var name holding each price id. */
const PRICE_ENV: Record<`${Exclude<Tier, "FREE">}_${Interval}`, string> = {
  PLUS_MONTHLY: "STRIPE_PLUS_MONTHLY_PRICE_ID",
  PLUS_ANNUAL: "STRIPE_PLUS_ANNUAL_PRICE_ID",
  PRO_MONTHLY: "STRIPE_PRO_MONTHLY_PRICE_ID",
  PRO_ANNUAL: "STRIPE_PRO_ANNUAL_PRICE_ID",
};

/** The configured Stripe price id for a {tier, interval}, or null if unset. */
export function priceIdFor(tier: "PLUS" | "PRO", interval: Interval): string | null {
  return process.env[PRICE_ENV[`${tier}_${interval}`]] ?? null;
}

/** Reverse-map a Stripe price id back to our {tier, interval} (webhook uses this). */
export function tierIntervalForPriceId(
  priceId: string | null | undefined,
): { tier: "PLUS" | "PRO"; interval: Interval } | null {
  if (!priceId) return null;
  for (const [key, envName] of Object.entries(PRICE_ENV)) {
    if (process.env[envName] && process.env[envName] === priceId) {
      const [tier, interval] = key.split("_") as ["PLUS" | "PRO", Interval];
      return { tier, interval };
    }
  }
  return null;
}

/** Map a Stripe subscription status to our stored enum. Unknown/incomplete → no access. */
export function statusFromStripe(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "CANCELED";
    default:
      return "CANCELED";
  }
}

/**
 * The period end for a subscription. In current Stripe API versions this lives on
 * the subscription item (not the top level), so read it from the first item.
 */
export function periodEndOf(sub: Stripe.Subscription): Date | null {
  const secs = sub.items?.data?.[0]?.current_period_end;
  return typeof secs === "number" ? new Date(secs * 1000) : null;
}

/** The active price id on a subscription (single-item subscriptions in our model). */
export function priceIdOf(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.id ?? null;
}
