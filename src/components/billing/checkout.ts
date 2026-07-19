"use client";

import type { Tier } from "@/lib/billing/tiers";

export type Interval = "MONTHLY" | "ANNUAL";

export type CheckoutOutcome =
  | { ok: true } // browser is being redirected to Stripe
  | { ok: false; status: number; message: string };

/**
 * Starts Stripe Checkout for a plan and redirects the browser to Stripe's hosted
 * page on success. Returns a failure outcome (with status) for the caller to show
 * — e.g. 401 (not signed in) or 503 (billing not configured yet).
 */
export async function startCheckout(
  tier: Exclude<Tier, "FREE">,
  interval: Interval,
): Promise<CheckoutOutcome> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url as string;
      return { ok: true };
    }
    return {
      ok: false,
      status: res.status,
      message: data.message ?? "Couldn't start checkout. Please try again.",
    };
  } catch {
    return { ok: false, status: 0, message: "Network error. Please try again." };
  }
}
